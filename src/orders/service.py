from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID

from src.orders.models import Order, OrderItem, OrderStatus
from src.orders.schemas import CheckoutResponse, OrderResponse
from src.cart.models import CartItem
from src.catalog.models import Product

class OrderService:

    async def checkout(self, user_id: UUID, db: AsyncSession) -> CheckoutResponse:
        """
        UC16 - Finalizar Compra & UC17 - Simular Pagamento.
        Processa o carrinho, reduz estoque, limpa o carrinho e gera o pedido pago.
        """
        # 1. Busca todos os itens do carrinho do usuário com os dados do produto
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

        total_price = 0.0
        order_items_to_create = []

        # 2. Varre os itens validando estoque e calculando valores históricos
        for item in cart_items:
            product = item.product
            
            # Garante que o produto não foi deletado no meio do processo
            if product.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O produto '{product.name}' não está mais disponível no catálogo."
                )

            # Validação crítica de estoque antes da baixa
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Estoque insuficiente para o produto '{product.name}'. Disponível: {product.stock}"
                )

            # Executa a baixa real no estoque do produto
            product.stock -= item.quantity
            db.add(product)

            # Calcula o valor totalacumulado
            total_price += float(product.price * item.quantity)

            # Instancia o item do pedido com o preço congelado daquele instante
            order_item = OrderItem(
                product_id=product.id,
                price_at_purchase=product.price,
                quantity=item.quantity
            )
            order_items_to_create.append(order_item)

        # 3. Cria a entidade do Pedido principal (Status inicial PENDING)
        new_order = Order(
            user_id=user_id,
            total_price=total_price,
            status=OrderStatus.PENDING
        )
        db.add(new_order)
        await db.flush()  # Executa o flush para gerar o ID do pedido antes de salvar os filhos

        # Vincular os itens ao pedido criado
        for order_item in order_items_to_create:
            order_item.order_id = new_order.id
            db.add(order_item)

        # 4. Simulação de Pagamento Integrada (PIX/Cartão automática)
        # Em um cenário real, aqui chamaríamos um gateway. No fluxo simplificado, aprovamos na hora.
        new_order.status = OrderStatus.PAID

        # 5. Esvazia completamente o carrinho do usuário (Limpeza pós-venda)
        for item in cart_items:
            await db.delete(item)

        # 6. Commita todas as alterações de uma vez só (Garante atomicidade)
        await db.commit()
        await db.refresh(new_order)

        return CheckoutResponse(
            message="Pedido finalizado e pagamento aprovado com sucesso!",
            order_id=new_order.id,
            status=new_order.status,
            total_paid=float(new_order.total_price)
        )

    async def get_user_orders(self, user_id: UUID, db: AsyncSession) -> list[Order]:
        """UC14 - Visualizar Histórico de Pedidos (Cliente)."""
        query = (
            select(Order)
            .filter(Order.user_id == user_id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()

    async def get_all_orders_admin(self, db: AsyncSession) -> list[Order]:
        """UC15 - Gerenciar Pedidos da Plataforma (Admin)."""
        query = (
            select(Order)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()