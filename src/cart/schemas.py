from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from typing import Optional
from src.catalog.schemas import ProductResponse

# Schema para adicionar um item ao carrinho (UC10)
class CartItemAdd(BaseModel):
    product_id: UUID = Field(..., description="ID do produto a ser adicionado")
    quantity: int = Field(1, gt=0, description="Quantidade do produto (deve ser maior que zero)")

# Schema para atualizar apenas a quantidade de um item existente (UC11)
class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0, description="Nova quantidade do produto")

# Schema que envelopa o produto e os dados do item dentro do carrinho
class CartItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    product: ProductResponse  # Injeta os dados do produto (nome, preço, etc.)
    
    # Campo calculado dinamicamente na borda da API para o frontend usar
    @property
    def subtotal(self) -> float:
        return float(self.product.price * self.quantity)

    model_config = ConfigDict(from_attributes=True, json_encoders={property: lambda p: p()})

# Schema completo do Carrinho devolvido para o usuário (UC12)
class CartResponse(BaseModel):
    items: list[CartItemResponse]
    total_items: int
    total_price: float