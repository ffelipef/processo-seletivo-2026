import enum
import uuid
from enum import Enum
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, func, CheckConstraint, Integer, Boolean, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime

class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered" # 🚀 CORREÇÃO: O status DELIVERED foi adicionado!
    FAILED = "failed"
    CANCELED = "canceled"

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default=OrderStatus.PENDING, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relacionamentos assíncronos seguros
    user = relationship("User", lazy="raise")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="raise")

    __table_args__ = (
        CheckConstraint("total_price >= 0", name="check_order_total_positive"),
    )

    def __repr__(self):
        return f"<Order(id={self.id}, user_id={self.user_id}, status='{self.status}', total={self.total_price})>"

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Preço estático daquele momento histórico da compra
    price_at_purchase = Column(Numeric(10, 2), nullable=False)
    
    # 🚀 SINTAXE CORRIGIDA AQUI:
    quantity = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items", lazy="raise")
    product = relationship("Product", lazy="raise")

    __table_args__ = (
        CheckConstraint("price_at_purchase >= 0", name="check_item_price_positive"),
        CheckConstraint("quantity > 0", name="check_item_quantity_positive"),
    )

    def __repr__(self):
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, quantity={self.quantity})>"

class DiscountType(enum.Enum):
    percentage = "percentage"
    fixed = "fixed"

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_type = Column(SAEnum(DiscountType), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_value = Column(Numeric(10, 2), nullable=False, default=0.0)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

class CouponUsage(Base):
    __tablename__ = "coupon_usages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    coupon_id = Column(UUID(as_uuid=True), ForeignKey("coupons.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow)