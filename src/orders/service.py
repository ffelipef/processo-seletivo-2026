from datetime import datetime, timezone # Importações adicionadas
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
        UC16 - Finalizar Compra.
        Processa o carrinho, reduz estoque atomicamente, limpa o carrinho e gera o pedido com status PENDING.
        """
        async with db.begin(): # Garante atomicidade da transação
            # 1. Busca todos os itens do carrinho do usuário com os dados do produto, COM LOCK PESSIMISTA
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
            
            # Para garantir o lock pessimista nos produtos
            product_ids = [item.product_id for item in cart_items]
            # SELECT ... FOR UPDATE nos produtos para travar o estoque
            locked_products_query = select(Product).filter(Product.id.in_(product_ids)).with_for_update()
            locked_products_result = await db.execute(locked_products_query)
            locked_products = {p.id: p for p in locked_products_result.scalars().all()}

            # 2. Varre os itens validando estoque e calculando valores históricos
            for item in cart_items:
                product = locked_products.get(item.product_id)
                
                # Garante que o produto existe e não foi deletado no meio do processo
                if not product or product.is_deleted:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"O produto '{item.product.name if item.product else 'desconhecido'}' não está mais disponível no catálogo."
                    )

                # Validação crítica de estoque antes da baixa
                if product.stock < item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Estoque insuficiente para o produto '{product.name}'. Disponível: {product.stock}"
                    )

                # Executa a baixa real no estoque do produto
                product.stock -= item.quantity
                # Não é necessário db.add(product) aqui, pois o objeto já está rastreado pela sessão e `with_for_update`

                # Calcula o valor total acumulado
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
                status=OrderStatus.PENDING # Status inicial PENDING
            )
            db.add(new_order)
            await db.flush()  # Executa o flush para gerar o ID do pedido antes de salvar os filhos

            # Vincular os itens ao pedido criado
            for order_item in order_items_to_create:
                order_item.order_id = new_order.id
                db.add(order_item)

            # 4. Esvazia completamente o carrinho do usuário (Limpeza pós-venda)
            for item in cart_items:
                await db.delete(item)

            # O commit é feito automaticamente ao sair do bloco `async with db.begin():`
            await db.refresh(new_order)

            return CheckoutResponse(
                message="Pedido criado com sucesso! Aguardando pagamento.",
                order_id=new_order.id,
                status=new_order.status,
                total_price=float(new_order.total_price) # Alterado para total_price
            )

    async def handle_payment_status(self, order_id: UUID, payment_status: str, db: AsyncSession) -> Order:
        """
        UC17 - Simular Pagamento:
        Atualiza o status do pedido e ajusta o estoque em caso de falha/cancelamento.
        """
        async with db.begin(): # Garante atomicidade da transação
            query = select(Order).filter(Order.id == order_id).options(selectinload(Order.items).selectinload(OrderItem.product)).with_for_update()
            order = (await db.execute(query)).scalar_one_or_none()

            if not order:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")

            if order.status != OrderStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pedido já está em status '{order.status}'. Não é possível alterar o status de pagamento."
                )

            if payment_status == "success":
                order.status = OrderStatus.PAID
                message = "Pagamento aprovado com sucesso."
            elif payment_status == "fail":
                order.status = OrderStatus.FAILED
                message = "Pagamento falhou. Pedido cancelado e estoque devolvido."
                
                # Devolve o estoque para cada produto
                for item in order.items:
                    if item.product: # Garante que o produto ainda existe
                        item.product.stock += item.quantity
                        # Não é necessário db.add(item.product) pois o objeto já está rastreado
                    else:
                        # Log ou aviso se o produto original não for encontrado
                        print(f"Produto {item.product_id} do pedido {order_id} não encontrado para devolução de estoque.")
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status de pagamento inválido.")

            order.updated_at = datetime.now(timezone.utc) # Atualiza o timestamp
            # db.add(order) # Não necessário, objeto já rastreado
            await db.refresh(order) # Atualiza o objeto para pegar o status mais recente

            return order # Retorna o pedido atualizado

    async def get_user_orders(self, user_id: UUID, db: AsyncSession) -> list[Order]:
        """UC14 - Visualizar Histórico de Pedidos (Cliente)."""
        query = (
            select(Order)
            .filter(Order.user_id == user_id)
            .options(selectinload(Order.items).selectinload(OrderItem.product)) # Carrega produtos para exibição
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()

    async def get_all_orders_admin(self, db: AsyncSession) -> list[Order]:
        """UC15 - Gerenciar Pedidos da Plataforma (Admin)."""
        query = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product)) # Carrega produtos para exibição
            .order_by(Order.created_at.desc())
        )
        return (await db.execute(query)).scalars().all()
