from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from src.orders.models import OrderStatus

# Dados de cada item dentro do detalhe do pedido
class OrderItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID]
    price_at_purchase: float
    quantity: int
    
    @property
    def subtotal(self) -> float:
        return float(self.price_at_purchase * self.quantity)

    model_config = ConfigDict(from_attributes=True, json_encoders={property: lambda p: p()})

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
