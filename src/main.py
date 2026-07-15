from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from pydantic import ValidationError
from src.database import AsyncSessionLocal
from src.auth.utils import seed_initial_admin
from fastapi.middleware.cors import CORSMiddleware
import logging

from src.database import async_engine as engine 
from src.database import Base

from src.auth.routes import router as auth_router
from src.catalog.routes import router as catalog_router
from src.cart.routes import router as cart_router
from src.orders.routes import router as orders_router

# Configuração de logging básica
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# O lifespan permanece o mesmo, agora usando o 'engine' apelidado corretamente
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicializando o banco de dados e criando tabelas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tabelas verificadas/criadas com sucesso.")
    
    # Executa o seed de admin se o banco estiver vazio
    async with AsyncSessionLocal() as session:
        await seed_initial_admin(session)
        
    yield

app = FastAPI(
    title="NOVA Sphere API",
    description="Backend para a plataforma de e-commerce NOVA Sphere.",
    version="0.1.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(cart_router)
app.include_router(orders_router)

@app.exception_handler(FastAPIHTTPException)
async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    logger.warning(f"HTTPException: {exc.detail} - Status: {exc.status_code}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning(f"ValidationError: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": "Erro de validação", "details": exc.errors()},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Erro interno do servidor: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Erro interno do servidor. Por favor, tente novamente mais tarde."},
    )

@app.get("/")
async def root():
    return {"message": "Bem-vindo à NOVA Sphere API!"}