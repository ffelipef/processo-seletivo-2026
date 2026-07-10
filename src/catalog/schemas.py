from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

# Esquema base com os campos do produto (UC07)
class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Nome do produto")
    description: Optional[str] = Field(None, description="Descrição detalhada do produto")
    price: float = Field(..., gt=0, description="Preço do produto (deve ser maior que zero)")
    stock: int = Field(..., ge=0, description="Quantidade em estoque (não pode ser negativa)")
    category: str = Field(..., min_length=2, max_length=50, description="Categoria do produto")
    image_url: Optional[str] = Field(None, max_length=255, description="URL da imagem do produto")

# Schema para criação e atualização completa (Admin - UC07)
class ProductCreate(ProductBase):
    pass

# Schema de resposta da API (UC07 / UC08)
class ProductResponse(ProductBase):
    id: UUID
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema para paginação e envelopamento da lista de produtos (UC08)
class ProductPaginatedResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    size: int
    pages: int