from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from src.database import get_db
from src.auth import schemas, models, utils

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_create: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # UC01 - Registrar Usuário (Consumidor padrão)
    query = select(models.User).filter(models.User.email == user_create.email)
    existing_user = (await db.execute(query)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado")

    hashed_password = utils.get_password_hash(user_create.password)
    new_user = models.User(
        name=user_create.name,
        email=user_create.email, 
        password_hash=hashed_password, 
        is_admin=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(user_login: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    # UC04 - Efetuar Login
    query = select(models.User).filter(models.User.email == user_login.email)
    user = (await db.execute(query)).scalar_one_or_none()

    if not user or not utils.verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # settings deve ser importado de src.config
    from src.config import settings
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(utils.get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
async def update_user_me(
    user_update: schemas.UserCreate, # Reaproveitando o schema para validação de dados
    current_user: models.User = Depends(utils.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # UC02 - Editar Usuário
    current_user.name = user_update.name
    current_user.email = user_update.email
    current_user.password_hash = utils.get_password_hash(user_update.password)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.patch("/promote/{user_id}", response_model=schemas.UserResponse)
async def promote_to_admin(
    user_id: UUID, 
    current_user: models.User = Depends(utils.get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    # UC03 - Registrar/Promover Admin (Apenas admin pode executar)
    query = select(models.User).filter(models.User.id == user_id)
    user_to_promote = (await db.execute(query)).scalar_one_or_none()
    
    if not user_to_promote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        
    user_to_promote.is_admin = True
    await db.commit()
    await db.refresh(user_to_promote)
    return user_to_promote

@router.delete("/account/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    user_id: UUID,
    current_user: models.User = Depends(utils.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # UC06 - Deletar conta (Validação de permissão)
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Você não tem permissão para deletar esta conta"
        )
        
    query = select(models.User).filter(models.User.id == user_id)
    user_to_delete = (await db.execute(query)).scalar_one_or_none()
    
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        
    await db.delete(user_to_delete)
    await db.commit()
    return None