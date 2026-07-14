import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    category = Column(String(50), index=True, nullable=False)
    image_url = Column(String(255), nullable=True)
    is_retro = Column(Boolean, default=False)
    
    # Diferencial Oficial: Soft Delete para integridade histórica
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price}, stock={self.stock})>"