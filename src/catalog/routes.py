from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

from src.database import get_db
# Supondo que você tenha uma factory ou dependência para injetar o cliente Redis assíncrono
from src.database import get_redis  

from src.catalog import schemas, models
from src.catalog.service import CatalogService
from src.auth.utils import get_current_admin_user
from src.auth.models import User

router = APIRouter(prefix="/products", tags=["products"])

# Dependência rápida para instanciar o serviço do catálogo injetando o Redis
async def get_catalog_service(redis_client = Depends(get_redis)) -> CatalogService:
    return CatalogService(redis_client)

@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: schemas.ProductCreate,
    current_user: User = Depends(get_current_admin_user), # UC07 - Apenas Admin
    db: AsyncSession = Depends(get_db),
    service: CatalogService = Depends(get_catalog_service)
):
    """Registra um novo produto no catálogo (Apenas Administradores)."""
    return await service.create_product(product_in, db)

@router.get("", response_model=schemas.ProductPaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(10, ge=1, le=100, description="Quantidade de itens por página"),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    min_price: Optional[float] = Query(None, ge=0, description="Preço mínimo"),
    max_price: Optional[float] = Query(None, ge=0, description="Preço máximo"),
    name: Optional[str] = Query(None, description="Buscar por parte do nome"),
    db: AsyncSession = Depends(get_db),
    service: CatalogService = Depends(get_catalog_service)
):
    """
    Lista os produtos de forma paginada com suporte a filtros dinâmicos.
    Consulta o cache do Redis antes de tocar no banco de dados (UC08 e UC09).
    """
    return await service.get_products_paginated(
        db, page, size, category, min_price, max_price, name
    )

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_admin_user), # UC07 - Apenas Admin
    db: AsyncSession = Depends(get_db),
    service: CatalogService = Depends(get_catalog_service)
):
    """Remove logicamente um produto do catálogo usando Soft Delete (Apenas Administradores)."""
    success = await service.soft_delete_product(product_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Produto não encontrado ou já removido"
        )
    return None