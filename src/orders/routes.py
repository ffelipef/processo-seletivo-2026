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

@router.post("/coupons/validate", response_model=schemas.CouponValidateResponse)
async def validate_coupon(
    payload: schemas.CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """Calcula o desconto de um cupom para o carrinho atual do usuário, sem finalizar a compra."""
    return await service.validate_coupon(current_user.id, payload.coupon_code, db)

@router.post("/checkout", response_model=schemas.CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def create_order_checkout(
    payload: schemas.CheckoutRequest = None, # 🚀 NOVO: Aceita o body com o cupom
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """
    Processa o carrinho ativo do usuário logado, valida o estoque de cada item,
    aplica o cupom de desconto (se existir), cria o pedido e limpa o carrinho.
    """
    coupon = payload.coupon_code if payload else None
    return await service.checkout(current_user.id, db, coupon_code=coupon)

@router.get("/{order_id}", response_model=schemas.OrderResponse) # Novo endpoint para detalhes de um pedido
async def get_single_order_details(
    order_id: UUID,
    current_user: User = Depends(get_current_user), # UC14 - Visualizar Detalhes do Pedido
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """Retorna os detalhes de um pedido específico do usuário autenticado."""
    order = await service.get_order_by_id_for_user(order_id, current_user.id, db)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado ou você não tem permissão para vê-lo.")
    return order

@router.post("/{order_id}/simulate-payment", response_model=schemas.PaymentSimulationResponse)
async def simulate_payment_webhook(
    order_id: UUID,
    payment_in: schemas.PaymentSimulationRequest, # UC17 - Simular Pagamento
    current_user: User = Depends(get_current_user), # Permitir que o próprio usuário simule o pagamento do seu pedido
    db: AsyncSession = Depends(get_db),
    service: OrderService = Depends(get_order_service)
):
    """
    Simula o resultado de um pagamento para um pedido.
    Altera o status do pedido para PAID ou FAILED e ajusta o estoque se for FAILED.
    """
    updated_order = await service.handle_payment_status(order_id, payment_in.status, current_user.id, db) # Passar user_id
    
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