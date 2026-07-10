from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nome do usuário")
    email: EmailStr = Field(..., description="E-mail válido do usuário")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=50, description="Senha de acesso")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: UUID | None = None
    is_admin: bool = False
