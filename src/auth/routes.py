from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database import get_db
from src.auth import schemas, models, utils
from src.config import Settings

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
settings = Settings()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_create: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Verificar se o usuário já existe
    query = select(models.User).filter(models.User.email == user_create.email)
    existing_user = (await db.execute(query)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_password = utils.get_password_hash(user_create.password)
    new_user = models.User(email=user_create.email, password_hash=hashed_password, is_admin=False) # UC01 - default customer
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(user_login: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(models.User).filter(models.User.email == user_login.email)
    user = (await db.execute(query)).scalar_one_or_none()

    if not user or not utils.verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(utils.get_current_active_user)):
    return current_user

@router.get("/admin-only")
async def admin_only_route(current_user: models.User = Depends(utils.get_current_admin_user)):
    return {"message": f"Bem-vindo, admin {current_user.email}!"}
