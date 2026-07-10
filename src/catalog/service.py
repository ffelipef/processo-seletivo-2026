import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from redis.asyncio import Redis
from uuid import UUID

from src.catalog.models import Product
from src.catalog.schemas import ProductCreate, ProductResponse

CACHE_KEY_PREFIX = "catalog:products"
CACHE_EXPIRE_SECONDS = 3600  # 1 hora de cache padrão

class CatalogService:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    async def _invalidate_catalog_cache(self):
        """Remove todas as chaves de cache do catálogo para garantir consistência após alterações."""
        # Como temos filtros dinâmicos, o jeito mais seguro é deletar as chaves do catálogo
        # Em produção, gerenciaríamos chaves de paginação específicas, mas o flush/delete por padrão resolve aqui
        keys = await self.redis.keys(f"{CACHE_KEY_PREFIX}:*")
        if keys:
            await self.redis.delete(*keys)

    async def create_product(self, product_in: ProductCreate, db: AsyncSession) -> Product:
        # UC07 - Criar Produto (Admin)
        new_product = Product(**product_in.model_dump())
        db.add(new_product)
        await db.commit()
        await db.refresh(new_product)
        
        # Requisito Obrigatório: Invalidar cache ao criar
        await self._invalidate_catalog_cache()
        return new_product

    async def get_products_paginated(
        self, db: AsyncSession, page: int, size: int, category: str | None, min_price: float | None, max_price: float | None, name: str | None
    ):
        # UC08 & UC09 - Listagem com Filtros Dinâmicos e Cache
        # Criamos um identificador único para o cache baseado nos filtros que o usuário enviou
        cache_key = f"{CACHE_KEY_PREFIX}:page:{page}:size:{size}:cat:{category}:min:{min_price}:max:{max_price}:name:{name}"
        
        # Tenta buscar no Redis primeiro
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data) # Retorno instantâneo em caso de cache hit

        # Cache Miss: Se não estiver no Redis, constrói a query no Postgres
        offset = (page - 1) * size
        query = select(Product).filter(Product.is_deleted == False) # Filtra removendo os soft deleted

        # Filtros dinâmicos aplicados conforme requisição
        if category:
            query = query.filter(Product.category == category)
        if min_price:
            query = query.filter(Product.price >= min_price)
        if max_price:
            query = query.filter(Product.price <= max_price)
        if name:
            query = query.filter(Product.name.ilike(f"%{name}%")) # ilike faz busca case-insensitive

        # Executa contagem total para a paginação
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        # Aplica paginação (Limit/Offset)
        query = query.offset(offset).limit(size)
        result = await db.execute(query)
        products = result.scalars().all()

        # Monta a resposta estruturada
        pages = (total + size - 1) // size
        
        # Converte para dicionário para serializar no Redis
        response_data = {
            "items": [ProductResponse.model_validate(p).model_dump() for p in products],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }

        # Salva o resultado no Redis para as próximas requisições parecidas
        await self.redis.setex(cache_key, CACHE_EXPIRE_SECONDS, json.dumps(response_data, default=str))
        
        return response_data

    async def soft_delete_product(self, product_id: UUID, db: AsyncSession) -> bool:
        # Diferencial Oficial: Soft Delete
        query = select(Product).filter(Product.id == product_id, Product.is_deleted == False)
        product = (await db.execute(query)).scalar_one_or_none()
        
        if not product:
            return False
            
        product.is_deleted = True
        await db.commit()
        
        # Requisito Obrigatório: Invalidar cache ao remover
        await self._invalidate_catalog_cache()
        return True