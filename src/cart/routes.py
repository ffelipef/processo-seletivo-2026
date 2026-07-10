from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from src.database import get_db
from src.cart import schemas
from src.cart.service import CartService
from src.auth.utils import get_current_user
from src.auth.models import User

router = APIRouter(prefix="/cart", tags=["cart"])

# Injeção limpa do serviço do carrinho
def get_cart_service() -> CartService:
    return CartService()

@router.get("", response_model=schemas.CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user), # UC12 - Requer autenticação
    db: AsyncSession = Depends(get_db),
    service: CartService = Depends(get_cart_service)
):
    """Retorna todos os itens do carrinho do usuário autenticado com os valores totais calculados."""
    return await service.get_user_cart(current_user.id, db)

@router.post("/items", status_code=status.HTTP_201_CREATED)
async def add_item(
    item_in: schemas.CartItemAdd, # UC10 - Adicionar Item
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: CartService = Depends(get_cart_service)
):
    """Adiciona um produto ao carrinho ou incrementa sua quantidade caso já exista (Valida estoque)."""
    try:
        return await service.add_item_to_cart(current_user.id, item_in, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/items/{item_id}")
async def update_item_quantity(
    item_id: UUID,
    item_update: schemas.CartItemUpdate, # UC11 - Alterar Quantidade
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: CartService = Depends(get_cart_service)
):
    """Atualiza a quantidade de um item específico do carrinho validando o estoque atual."""
    try:
        return await service.update_item_quantity(current_user.id, item_id, item_update, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: UUID, # UC13 - Remover Item
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: CartService = Depends(get_cart_service)
):
    """Remove definitivamente um item do carrinho do usuário autenticado."""
    success = await service.remove_item_from_cart(current_user.id, item_id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Item do carrinho não encontrado ou não pertence a este usuário"
        )
    return None