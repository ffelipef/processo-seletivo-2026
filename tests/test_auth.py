import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.models import User
from src.auth.utils import get_password_hash, verify_password, create_access_token, decode_access_token

# ==========================================
# 1. TESTES UNITÁRIOS (Criptografia e Tokens)
# ==========================================

def test_password_hashing():
    """Garante que a senha é hashada e validada corretamente com bcrypt puro."""
    password = "minhasenhateste"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("senha_errada", hashed) is False

def test_jwt_generation_and_decoding():
    """Garante que o token JWT é gerado com os claims corretos e decodificado com sucesso."""
    user_data = {"sub": "12345-uuid-teste"}
    token = create_access_token(data=user_data)
    
    assert isinstance(token, str)
    
    payload = decode_access_token(token)
    assert payload.get("sub") == "12345-uuid-teste"

# ==========================================
# 2. TESTES DE INTEGRAÇÃO (Rotas da API)
# ==========================================

@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient, db_session: AsyncSession):
    """Testa o fluxo completo de registro de um novo usuário via rota HTTP."""
    payload = {
        "name": "Felipe Freitas",
        "email": "felipe@teste.com",
        "password": "SenhaSegura123"
    }
    
    response = await client.post("/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "felipe@teste.com"
    assert "id" in data
    
    query = select(User).filter(User.email == "felipe@teste.com")
    result = await db_session.execute(query)
    user_in_db = result.scalar_one_or_none()
    
    assert user_in_db is not None
    assert user_in_db.name == "Felipe Freitas"

@pytest.mark.asyncio
async def test_prevent_duplicate_email_registration(client: AsyncClient):
    """Garante que o sistema bloqueia cadastros duplicados com o mesmo e-mail."""
    payload = {
        "name": "Usuario Teste",
        "email": "duplicado@teste.com",
        "password": "SenhaSegura123"
    }
    
    res1 = await client.post("/auth/register", json=payload)
    assert res1.status_code == 201
    
    res2 = await client.post("/auth/register", json=payload)
    assert res2.status_code == 400