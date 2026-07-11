from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID
from datetime import datetime

# Esquema base com campos comuns
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nome do usuário")
    email: EmailStr = Field(..., description="E-mail válido do usuário")

# Dados necessários para a criação (Registro - UC01)
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=50, description="Senha de acesso")

# Dados necessários para o Login (UC04)
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Resposta da API ao retornar um usuário (Protegendo dados sensíveis)
class UserResponse(UserBase):
    id: UUID
    is_admin: bool
    created_at: datetime

    # Configuração explícita Pydantic V2 (Certifique-se de remover qualquer sub-classe 'class Config' antiga se houver)
    model_config = ConfigDict(from_attributes=True)

# Estrutura do Token JWT retornado no login
class Token(BaseModel):
    access_token: str
    token_type: str

# Dados contidos dentro do Payload do Token JWT (Para validação de rotas)
class TokenData(BaseModel):
    user_id: UUID | None = None
    is_admin: bool = False