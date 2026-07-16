import time
import json
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

# --- Imports do SlowAPI (Rate Limiting) ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.database import AsyncSessionLocal
from src.auth.utils import seed_initial_admin
from src.database import async_engine as engine 
from src.database import Base

from src.auth.routes import router as auth_router
from src.catalog.routes import router as catalog_router
from src.cart.routes import router as cart_router
from src.orders.routes import router as orders_router

# Configuração de logging básica
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do Logger JSON (Requisito do Edital)
json_logger = logging.getLogger("json_logger")
json_logger.setLevel(logging.INFO)
json_logger.handlers = []  # Limpa para evitar duplicação
json_logger.addHandler(logging.StreamHandler())

# O lifespan permanece o mesmo
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

# --- CONFIGURAÇÃO DO RATE LIMITER ---
# Define que a limitação será baseada no IP do usuário
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# --- MIDDLEWARE DE LOGS EM JSON ---
@app.middleware("http")
async def json_logging_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Repassa a requisição para a rota correspondente
    response = await call_next(request)
    
    # Calcula o tempo total de processamento
    process_time = time.time() - start_time
    
    # Monta o log estruturado em JSON conforme exigido
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration_ms": round(process_time * 1000, 2),
        "client_ip": request.client.host if request.client else "unknown"
    }
    
    # Imprime no console (e nos logs do docker) em formato JSON
    json_logger.info(json.dumps(log_data))
    
    return response

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

# --- HANDLERS DE EXCEÇÕES ---
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