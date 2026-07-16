import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.catalog.models import Product
from src.auth.models import User

# Função auxiliar para não repetir código nos testes
async def setup_user_and_get_headers(client: AsyncClient, email: str):
    await client.post("/auth/register", json={"name": "Tester", "email": email, "password": "password"})
    res = await client.post("/auth/login", json={"email": email, "password": "password"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_full_purchase_and_inventory_decrement_flow(client: AsyncClient, db_session: AsyncSession):
    """Testa adicionar ao carrinho e fazer checkout (diminuindo estoque)."""
    headers = await setup_user_and_get_headers(client, "comprador1@teste.com")
    
    test_product = Product(name="Walkman", description="Retro", price=100.0, stock=5, category="retro")
    db_session.add(test_product)
    await db_session.commit()
    await db_session.refresh(test_product)

    await client.post("/cart/items", json={"product_id": str(test_product.id), "quantity": 1}, headers=headers)
    
    checkout_res = await client.post("/orders/checkout", headers=headers)
    assert checkout_res.status_code in [200, 201]

    await db_session.refresh(test_product)
    assert test_product.stock == 4  # Estoque caiu

# 🚀 NOVO: TESTE DE CANCELAMENTO (Devolução de Estoque)
@pytest.mark.asyncio
async def test_order_cancellation_restores_inventory(client: AsyncClient, db_session: AsyncSession):
    headers = await setup_user_and_get_headers(client, "cancelador@teste.com")
    
    product = Product(name="Fita K7", description="Fita", price=10.0, stock=10, category="retro")
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    # Compra 2 unidades
    await client.post("/cart/items", json={"product_id": str(product.id), "quantity": 2}, headers=headers)
    checkout_res = await client.post("/orders/checkout", headers=headers)
    order_id = checkout_res.json()["order_id"]

    await db_session.refresh(product)
    assert product.stock == 8
    
    # Cancela o pedido
    cancel_res = await client.post(f"/orders/{order_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "canceled"

    # Verifica devolução de estoque
    await db_session.refresh(product)
    assert product.stock == 10  # Voltou para 10!

# 🚀 NOVO: TESTE DE MÁQUINA DE ESTADOS (Admin)
@pytest.mark.asyncio
async def test_admin_state_machine_validation(client: AsyncClient, db_session: AsyncSession):
    user_email = "admin@teste.com"
    headers = await setup_user_and_get_headers(client, user_email)
    
    # Promove a Admin fisicamente no banco
    user = (await db_session.execute(select(User).filter(User.email == user_email))).scalar_one()
    user.is_admin = True
    await db_session.commit()
    
    # Faz login de novo para pegar o token com is_admin = True
    headers = await setup_user_and_get_headers(client, user_email)

    product = Product(name="Teclado", description="Mecânico", price=200.0, stock=5, category="acessorios")
    db_session.add(product)
    await db_session.commit()

    await client.post("/cart/items", json={"product_id": str(product.id), "quantity": 1}, headers=headers)
    order_id = (await client.post("/orders/checkout", headers=headers)).json()["order_id"]

    # Tenta pular para DELIVERED antes de SHIPPED (Deve falhar 400)
    res_fail = await client.patch(f"/orders/{order_id}/status?new_status=delivered", headers=headers)
    assert res_fail.status_code == 400
    
    # Avança corretamente: PENDING -> PAID -> SHIPPED -> DELIVERED
    await client.patch(f"/orders/{order_id}/status?new_status=paid", headers=headers)
    await client.patch(f"/orders/{order_id}/status?new_status=shipped", headers=headers)
    res_success = await client.patch(f"/orders/{order_id}/status?new_status=delivered", headers=headers)
    
    assert res_success.status_code == 200
    assert res_success.json()["status"] == "delivered"

# 🚀 NOVO: TESTE DE CONCORRÊNCIA (Overselling)
@pytest.mark.asyncio
async def test_concurrency_prevents_overselling(client: AsyncClient, db_session: AsyncSession):
    # Produto com apenas 1 no estoque
    product = Product(name="Item Raro", description="Último", price=100.0, stock=1, category="retro")
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)

    h1 = await setup_user_and_get_headers(client, "concorrente1@teste.com")
    h2 = await setup_user_and_get_headers(client, "concorrente2@teste.com")

    # Ambos adicionam o último item ao carrinho
    await client.post("/cart/items", json={"product_id": str(product.id), "quantity": 1}, headers=h1)
    await client.post("/cart/items", json={"product_id": str(product.id), "quantity": 1}, headers=h2)

    # Dispara os dois checkouts exatamente ao mesmo tempo usando asyncio
    req1 = client.post("/orders/checkout", headers=h1)
    req2 = client.post("/orders/checkout", headers=h2)
    responses = await asyncio.gather(req1, req2)

    status_codes = [res.status_code for res in responses]
    
    # Um deve ter sucesso (201 ou 200) e o outro falhar (400 - Estoque insuficiente)
    assert 400 in status_codes
    assert (201 in status_codes) or (200 in status_codes)
    
    # Estoque final deve ser 0 (nunca negativo)
    await db_session.refresh(product)
    assert product.stock == 0