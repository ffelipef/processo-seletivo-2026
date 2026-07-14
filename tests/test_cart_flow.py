import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.catalog.models import Product  # Importe o modelo de produto do seu catálogo
from src.auth.models import User

@pytest.mark.asyncio
async def test_full_purchase_and_inventory_decrement_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Simula o ciclo de vida de uma compra real no NovaSphere:
    1. Registra e loga um usuário de testes (obtendo o Token JWT).
    2. Garante um produto (Walkman Sony) no banco com estoque controlado.
    3. Adiciona o produto ao carrinho (POST /cart/items) usando o Bearer Token.
    4. Consulta o carrinho (GET /cart) para certificar a presença e quantidade.
    5. Finaliza a compra (POST /orders) e valida se o estoque decrementou de 5 para 4.
    """

    # ==========================================
    # PASSO 1: Cadastrar e Logar Usuário de Testes
    # ==========================================
    user_payload = {
        "name": "Comprador de Teste",
        "email": "comprador.teste@novasphere.com",
        "password": "SenhaSuperSegura123"
    }
    
    # Cadastra
    register_res = await client.post("/auth/register", json=user_payload)
    assert register_res.status_code in [200, 201]

    # Loga
    login_res = await client.post("/auth/login", json={
        "email": user_payload["email"],
        "password": user_payload["password"]
    })
    assert login_res.status_code == 200
    
    token = login_res.json()["access_token"]
    # 🚀 O cabeçalho Bearer que ajustamos no Swagger agora é testado via código:
    headers = {"Authorization": f"Bearer {token}"}

    # ==========================================
    # PASSO 2: Garantir Produto no Banco de Teste
    # ==========================================
    # O Pytest roda em um banco isolado, então precisamos inserir o produto de teste
    test_product = Product(
        name="Walkman Sony Cassette Player",
        description="Clássico toca-fitas dos anos 90.",
        price=289.90,
        stock=5,  # Estoque inicial controlado
        category="retro",
        is_retro=True
    )
    db_session.add(test_product)
    await db_session.commit()
    await db_session.refresh(test_product)
    
    product_id = test_product.id

    # ==========================================
    # PASSO 3: Adicionar ao Carrinho (POST /cart/items)
    # ==========================================
    cart_payload = {
        "product_id": str(product_id),
        "quantity": 1
    }
    
    add_res = await client.post("/cart/items", json=cart_payload, headers=headers)
    assert add_res.status_code == 201

    # ==========================================
    # PASSO 4: Validar o Carrinho (GET /cart)
    # ==========================================
    get_cart_res = await client.get("/cart", headers=headers)
    assert get_cart_res.status_code == 200
    
    cart_data = get_cart_res.json()
    assert len(cart_data["items"]) == 1
    assert cart_data["items"][0]["quantity"] == 1
    # Verifica se o ID do produto no carrinho bate com o nosso Walkman
    assert cart_data["items"][0]["product_id"] == str(product_id)

    # ==========================================
    # PASSO 5: Finalizar a Compra (POST /orders) e Decrementar Estoque
    # ==========================================
    # *(Nota: Ajuste a rota abaixo de acordo com o endpoint de checkout real do seu /orders)*
    checkout_res = await client.post("/orders/checkout", headers=headers)
    assert checkout_res.status_code in [200, 201]

    # Força o banco de dados a expirar o cache para podermos reler o estoque real atualizado
    db_session.expire_all()

    # Busca o produto novamente no banco de dados para checar o estoque
    query = select(Product).filter(Product.id == product_id)
    product_after_purchase = (await db_session.execute(query)).scalar_one()

    # 🎯 O teste de fogo: O estoque DEVE ter caído de 5 para 4
    assert product_after_purchase.stock == 4