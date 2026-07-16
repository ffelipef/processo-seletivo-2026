from pydantic import BaseModel, ConfigDict, Field # Field adicionado
from uuid import UUID
from datetime import datetime
from typing import Optional
from src.orders.models import OrderStatus
from pydantic import computed_field
# Dados de cada item dentro do detalhe do pedido
class OrderItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID]
    price_at_purchase: float
    quantity: int

    @computed_field
    @property
    def subtotal(self) -> float:
        return round(self.price_at_purchase * self.quantity, 2)

    model_config = ConfigDict(from_attributes=True)


# Schema de resposta detalhada do Pedido (UC14 / UC15)
class OrderResponse(BaseModel):
    id: UUID
    user_id: UUID
    total_price: float
    status: OrderStatus
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)

# Payload retornado após uma simulação de checkout/pagamento bem-sucedida
class CheckoutResponse(BaseModel):
    message: str
    order_id: UUID
    status: OrderStatus
    total_price: float # Alterado para total_price para refletir o status PENDING inicial

class PaymentSimulationRequest(BaseModel):
    status: str = Field(..., pattern="^(success|fail)$", description="Resultado da simulação de pagamento: 'success' ou 'fail'")

class PaymentSimulationResponse(BaseModel):
    message: str
    order_id: UUID
    new_status: OrderStatus

# para aceitar o cupom
class CheckoutRequest(BaseModel):
    coupon_code: Optional[str] = None

class CouponValidateRequest(BaseModel):
    coupon_code: str

class CouponValidateResponse(BaseModel):
    valid: bool
    subtotal: float
    discount_amount: float
    total_price: float