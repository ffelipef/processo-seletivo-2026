from asyncio.log import logger
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID
from decimal import Decimal

from src.orders.models import Order, OrderItem, OrderStatus, Coupon, CouponUsage, DiscountType
from src.orders.schemas import CheckoutResponse, OrderResponse, CouponValidateResponse
from src.cart.models import CartItem
from src.catalog.models import Product


class OrderService:

    async def _validate_and_calculate_coupon(
        self, user_id: UUID, coupon_code: str, subtotal: Decimal, db: AsyncSession
    ) -> tuple[Coupon, Decimal]:
        """
        Fonte única de verdade para validação e cálculo de desconto de cupom.
        Usado tanto pelo checkout real quanto pelo preview (/coupons/validate).
        """
        coupon_query = select(Coupon).where(Coupon.code == coupon_code)
        coupon = (await db.execute(coupon_query)).scalar_one_or_none()

        if not coupon or not coupon.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cupom inválido ou inativo.")

        if coupon.expires_at and coupon.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este cupom já expirou.")

        if subtotal < coupon.min_order_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O valor mínimo para este cupom é R$ {coupon.min_order_value}"
            )

        usage_query = select(CouponUsage).where(
            CouponUsage.user_id == user_id, CouponUsage.coupon_id == coupon.id
        )
        if (await db.execute(usage_query)).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você já utilizou este cupom.")

        if coupon.discount_type == DiscountType.percentage:
            discount_amount = subtotal * (coupon.discount_value / Decimal("100.0"))
        else:
            discount_amount = coupon.discount_value

        discount_amount = min(discount_amount, subtotal)
        return coupon, discount_amount

    async def validate_coupon(self, user_id: UUID, coupon_code: str, db: AsyncSession) -> CouponValidateResponse:
        """Calcula o desconto de um cupom para o carrinho atual, sem criar pedido nem travar estoque."""
        cart_query = (
            select(CartItem)
            .filter(CartItem.user_id == user_id)
            .options(selectinload(CartItem.product))
        )
        cart_items = (await db.execute(cart_query)).scalars().all()

        if not cart_items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Carrinho vazio.")

        subtotal = sum(
            (item.product.price * item.quantity for item in cart_items if item.product),
            Decimal("0.0")
        )

        _, discount_amount = await self._validate_and_calculate_coupon(user_id, coupon_code, subtotal, db)

        return CouponValidateResponse(
            valid=True,
            subtotal=float(subtotal),
            discount_amount=float(discount_amount),
            total_price=float(subtotal - discount_amount),
        )

    async def checkout(self, user_id: UUID, db: AsyncSession, coupon_code: str = None) -> CheckoutResponse:
        """
        UC16 - Finalizar Compra.
        Processa o carrinho, reduz estoque, aplica cupons e gera o pedido.
        """
        try:
            cart_query = (
                select(CartItem)
                .filter(CartItem.user_id == user_id)
                .options(selectinload(CartItem.product))
            )
            cart_items = (await db.execute(cart_query)).scalars().all()

            if not cart_items:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não é possível finalizar um pedido com o carrinho vazio"
                )

            total_price = Decimal("0.0")
            order_items_to_create = []

            product_ids = [item.product_id for item in cart_items]
            locked_products_query = select(Product).filter(Product.id.in_(product_ids)).with_for_update()
            locked_products_result = await db.execute(locked_products_query)
            locked_products = {p.id: p for p in locked_products_result.scalars().all()}

            for item in cart_items:
                product = locked_products.get(item.product_id)

                if not product or product.is_deleted:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"O produto '{item.product.name if item.product else 'desconhecido'}' não está mais disponível no catálogo."
                    )

                if product.stock < item.quantity:
                    logger.error(f"Estoque insuficiente! Produto: {product.name}, Pedido: {item.quantity}, Estoque: {product.stock}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Estoque insuficiente para '{product.name}'. Pedido: {item.quantity}, Disponível: {product.stock}"
                    )

                product.stock -= item.quantity
                total_price += product.price * item.quantity

                order_item = OrderItem(
                    product_id=product.id,
                    price_at_purchase=product.price,
                    quantity=item.quantity
                )
                order_items_to_create.append(order_item)

            # Validação de cupom — usa o mesmo método do preview
            applied_coupon = None
            if coupon_code:
                applied_coupon, discount_amount = await self._validate_and_calculate_coupon(
                    user_id, coupon_code, total_price, db
                )
                total_price = max(Decimal("0.0"), total_price - discount_amount)

            new_order = Order(
                user_id=user_id,
                total_price=total_price,
                status=OrderStatus.PENDING
            )
            db.add(new_order)
            await db.flush()

            if applied_coupon:
                new_usage = CouponUsage(
                    user_id=user_id,
                    coupon_id=applied_coupon.id,
                    order_id=new_order.id
                )
                db.add(new_usage)

            for order_item in order_items_to_create:
                order_item.order_id = new_order.id
                db.add(order_item)

            for item in cart_items:
                await db.delete(item)

            await db.commit()
            await db.refresh(new_order)
            
            # Limpa o cache após o checkout (estoque caiu)
            from src.catalog.service import CatalogService
            from src.cache import redis_client

            catalog_service = CatalogService(redis_client) 
            await catalog_service.invalidate_cache()

            return CheckoutResponse(
                message="Pedido criado com sucesso! Aguardando pagamento.",
                order_id=new_order.id,
                status=new_order.status,
                total_price=float(new_order.total_price)
            )
        except Exception:
            await db.rollback()
            raise

    async def get_order_by_id_for_user(self, order_id: UUID, user_id: UUID, db: AsyncSession) -> Order | None:
        query = (
            select(Order)
            .filter(Order.id == order_id, Order.user_id == user_id)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
        )
        return (await db.execute(query)).scalar_one_or_none()

    async def handle_payment_status(self, order_id: UUID, payment_status: str, current_user_id: UUID, db: AsyncSession) -> Order:
        try:
            query = select(Order).filter(Order.id == order_id).options(
                selectinload(Order.items).selectinload(OrderItem.product)
            ).with_for_update()
            order = (await db.execute(query)).scalar_one_or_none()

            if not order:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

            if order.user_id != current_user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não tem permissão para alterar o status deste pedido.")

            if order.status != OrderStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pedido já está em status '{order.status}'. Não é possível alterar o status de pagamento."
                )

            if payment_status == "success":
                order.status = OrderStatus.PAID
            elif payment_status == "fail":
                order.status = OrderStatus.FAILED
                for item in order.items:
                    if item.product:
                        item.product.stock += item.quantity
                    else:
                        print(f"⚠️ Alerta: Produto {item.product_id} do pedido {order_id} não encontrado para devolução de estoque. Estoque pode estar inconsistente.")
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status de pagamento inválido.")

            order.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(order)

            # 🚀 CORREÇÃO: Limpa o cache se o pagamento falhou e o estoque voltou
            if payment_status == "fail":
                from src.catalog.service import CatalogService
                from src.cache import redis_client
                catalog_service = CatalogService(redis_client)
                await catalog_service.invalidate_cache()

            return order
        except Exception:
            await db.rollback()
            raise

    async def get_user_orders(self, user_id: UUID, db: AsyncSession) -> list[Order]:
        query = (
            select(Order)
            .filter(Order.user_id == user_id)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()

    async def get_all_orders_admin(self, db: AsyncSession) -> list[Order]:
        query = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()
    
    async def update_status_by_admin(self, order_id: UUID, new_status: OrderStatus, db: AsyncSession) -> Order:
        query = (
            select(Order)
            .filter(Order.id == order_id)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
        )
        order = (await db.execute(query)).scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado.")
            
        # Máquina de estados blindada
        if new_status.value == "shipped" and order.status != "paid":
            raise HTTPException(status_code=400, detail="Pedido precisa estar PAGO para ser enviado.")
            
        if new_status.value == "delivered" and order.status != "shipped":
            raise HTTPException(status_code=400, detail="Pedido precisa ter sido ENVIADO para ser entregue.")
            
        order.status = new_status
        order.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(order)
        
        return order

    async def cancel_order_by_user(self, order_id: UUID, current_user_id: UUID, db: AsyncSession) -> Order:
        """
        Permite ao usuário cancelar um pedido antes do envio, devolvendo o estoque.
        """
        try:
            query = select(Order).filter(Order.id == order_id).options(
                selectinload(Order.items).selectinload(OrderItem.product)
            ).with_for_update()
            order = (await db.execute(query)).scalar_one_or_none()

            if not order:
                raise HTTPException(status_code=404, detail="Pedido não encontrado.")

            if order.user_id != current_user_id:
                raise HTTPException(status_code=403, detail="Você não tem permissão para cancelar este pedido.")

            if order.status in ["shipped", "delivered"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Não é possível cancelar um pedido que já foi {order.status}."
                )
                
            if order.status == "canceled":
                return order

            # Altera o status e devolve os itens ao estoque de forma atômica
            order.status = OrderStatus.CANCELED
            for item in order.items:
                if item.product:
                    item.product.stock += item.quantity

            order.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(order)

            # 🚀 CORREÇÃO: Limpa o cache para a vitrine ser atualizada imediatamente
            from src.catalog.service import CatalogService
            from src.cache import redis_client
            catalog_service = CatalogService(redis_client)
            await catalog_service.invalidate_cache()

            return order
        except Exception:
            await db.rollback()
            raise