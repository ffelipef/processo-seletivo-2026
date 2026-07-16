import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.catalog.models import Product

@pytest.mark.asyncio
async def test_integration_customer_journey(client: AsyncClient, db_session: AsyncSession):
    """
    TESTE E2E: Simula o fluxo de ponta a ponta do sistema na perspectiva do cliente.
    """
    # 1. Registro do Consumidor
    reg_payload = {"name": "Felipe E2E", "email": "felipe.e2e@teste.com", "password": "SuperSenha123"}
    reg_res = await client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # 2. Autenticação (Login)
    login_res = await client.post("/auth/login", json={
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Garante o produto e consulta o Catálogo
    product = Product(name="GameBoy Color", description="Handheld", price=500.0, stock=2, category="consoles")
    db_session.add(product)
    await db_session.commit()
    
    catalog_res = await client.get("/products")
    assert catalog_res.status_code == 200

    # 4. Adiciona ao Carrinho
    await client.post("/cart/items", json={"product_id": str(product.id), "quantity": 1}, headers=headers)

    # 5. Valida se está no carrinho
    cart_res = await client.get("/cart", headers=headers)
    assert len(cart_res.json()["items"]) == 1

    # 6. Finaliza a Compra (Checkout)
    checkout_res = await client.post("/orders/checkout", headers=headers)
    assert checkout_res.status_code in [200, 201]
    order_id = checkout_res.json()["order_id"]

    # 7. Cliente desiste e Cancela o pedido (Antes do envio)
    cancel_res = await client.post(f"/orders/{order_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "canceled"

    # 8. Validação de consistência do banco pós-jornada (Estoque precisa ter retornado intacto)
    await db_session.refresh(product)
    assert product.stock == 2