import uuid
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    # Relacionamentos para facilitar buscas (Lazy loading / Async-safe)
    user = relationship("User", back_populates="cart_items", lazy="raise")
    product = relationship("Product", lazy="raise")

    __table_args__ = (
        # Requisito Técnico: Impedir quantidade negativa ou zerada no banco
        CheckConstraint("quantity > 0", name="check_quantity_positive"),
        
        # Engenharia: Garante fisicamente que o mesmo usuário não tenha linhas duplicadas do mesmo produto
        UniqueConstraint("user_id", product_id, name="uq_user_product_cart"),
    )

    def __repr__(self):
        return f"<CartItem(id={self.id}, user_id={self.user_id}, product_id={self.product_id}, quantity={self.quantity})>"