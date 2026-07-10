from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from src.cart.models import CartItem
from src.cart.schemas import CartItemAdd, CartItemUpdate, CartResponse, CartItemResponse
from src.catalog.models import Product

class CartService:
    
    async def get_user_cart(self, user_id: UUID, db: AsyncSession) -> CartResponse:
        """UC12 - Visualizar Carrinho: Retorna todos os itens do usuário com os totais calculados."""
        # selectinload carrega o relacionamento 'product' de forma assíncrona e segura
        query = (
            select(CartItem)
            .filter(CartItem.user_id == user_id)
            .options(selectinload(CartItem.product))
        )
        result = await db.execute(query)
        items = result.scalars().all()
        
        # Filtra e remove itens cujo produto foi marcado com Soft Delete no catálogo
        active_items = [item for item in items if not item.product.is_deleted]
        
        # Calcula os totais consolidados para o payload de retorno
        total_items = sum(item.quantity for item in active_items)
        total_price = sum(float(item.product.price * item.quantity) for item in active_items)
        
        return CartResponse(
            items=[CartItemResponse.model_validate(item) for item in active_items],
            total_items=total_items,
            total_price=total_price
        )

    async def add_item_to_cart(self, user_id: UUID, item_in: CartItemAdd, db: AsyncSession) -> CartItem:
        """UC10 - Adicionar Item: Valida estoque e insere ou incrementa a quantidade."""
        # 1. Verifica se o produto existe e está ativo
        prod_query = select(Product).filter(Product.id == item_in.product_id, Product.is_deleted == False)
        product = (await db.execute(prod_query)).scalar_one_or_none()
        
        if not product:
            raise ValueError("Produto não encontrado ou indisponível")
            
        # 2. Verifica se há estoque suficiente
        if product.stock < item_in.quantity:
            raise ValueError(f"Estoque insuficiente. Disponível: {product.stock}")

        # 3. Verifica se o item já existe no carrinho do usuário
        cart_query = select(CartItem).filter(
            CartItem.user_id == user_id, 
            CartItem.product_id == item_in.product_id
        )
        existing_item = (await db.execute(cart_query)).scalar_one_or_none()

        if existing_item:
            # Se já existe, valida se a soma não estoura o estoque total
            new_quantity = existing_item.quantity + item_in.quantity
            if product.stock < new_quantity:
                raise ValueError(f"Não é possível adicionar mais unidades. Estoque máximo atingido.")
            existing_item.quantity = new_quantity
            db.add(existing_item)
            await db.commit()
            await db.refresh(existing_item)
            return existing_item
        else:
            # Se não existe, cria um novo registro
            new_item = CartItem(
                user_id=user_id,
                product_id=item_in.product_id,
                quantity=item_in.quantity
            )
            db.add(new_item)
            await db.commit()
            await db.refresh(new_item)
            return new_item

    async def update_item_quantity(self, user_id: UUID, item_id: UUID, item_update: CartItemUpdate, db: AsyncSession) -> CartItem:
        """UC11 - Alterar Quantidade: Atualiza a quantidade validando os limites de estoque."""
        query = (
            select(CartItem)
            .filter(CartItem.id == item_id, CartItem.user_id == user_id)
            .options(selectinload(CartItem.product))
        )
        cart_item = (await db.execute(query)).scalar_one_or_none()
        
        if not cart_item or cart_item.product.is_deleted:
            raise ValueError("Item do carrinho não encontrado")
            
        # Valida a nova quantidade contra o estoque atual do produto
        if cart_item.product.stock < item_update.quantity:
            raise ValueError(f"Estoque insuficiente. Disponível: {cart_item.product.stock}")
            
        cart_item.quantity = item_update.quantity
        db.add(cart_item)
        await db.commit()
        await db.refresh(cart_item)
        return cart_item

    async def remove_item_from_cart(self, user_id: UUID, item_id: UUID, db: AsyncSession) -> bool:
        """UC13 - Remover Item: Exclui fisicamente o registro do carrinho."""
        query = select(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user_id)
        cart_item = (await db.execute(query)).scalar_one_or_none()
        
        if not cart_item:
            return False
            
        await db.delete(cart_item)
        await db.commit()
        return True