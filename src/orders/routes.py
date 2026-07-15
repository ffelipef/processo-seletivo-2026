from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID # Importação adicionada

from src.database import get_db
from src.orders import schemas
from src.orders.service import OrderService
from src.auth.utils import get_current_user, get_current_admin_user
from src.auth.models import User

router = APIRouter(prefix="/orders", tags=["orders"])

def get_order_service() -> OrderService:
    return OrderService()

@router.post("/checkout", response_model=schemas.CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_order_checkout(
    current_user: User = Depends(get_current_user), # UC16 / UC17
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """
    Processa o carrinho ativo do usuário logado, valida o estoque de cada item,
    conclui a venda dando a baixa real e simula a aprovação imediata do pagamento.
    """
    return await service.checkout(current_user.id, db)

@router.post("/{order_id}/simulate-payment", response_model=schemas.PaymentSimulationResponse)
async def simulate_payment_webhook(
    order_id: UUID,
    payment_in: schemas.PaymentSimulationRequest, # UC17 - Simular Pagamento
    current_user: User = Depends(get_current_admin_user), # Apenas admin pode simular pagamentos
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """
    Simula o resultado de um pagamento para um pedido.
    Altera o status do pedido para PAID ou FAILED e ajusta o estoque se for FAILED.
    """
    updated_order = await service.handle_payment_status(order_id, payment_in.status, db)
    
    return schemas.PaymentSimulationResponse(
        message=f"Status do pedido atualizado para {updated_order.status}.",
        order_id=updated_order.id,
        new_status=updated_order.status
    )

@router.get("", response_model=List[schemas.OrderResponse])
async def list_user_orders(
    current_user: User = Depends(get_current_user), # UC14 - Histórico do Cliente
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """Retorna a lista completa de pedidos realizados pelo usuário autenticado."""
    return await service.get_user_orders(current_user.id, db)

@router.get("/dashboard", response_model=List[schemas.OrderResponse])
async def admin_list_all_orders(
    current_user: User = Depends(get_current_admin_user), # UC15 - Painel do Admin
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """Retorna o histórico global de vendas de toda a plataforma (Apenas Administradores)."""
    return await service.get_all_orders_admin(db)
