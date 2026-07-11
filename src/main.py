from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from pydantic import ValidationError
import logging

from src.auth.routes import router as auth_router
from src.catalog.routes import router as catalog_router
from src.cart.routes import router as cart_router
from src.orders.routes import router as orders_router

# Configuração de logging básica
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NOVA Sphere API",
    description="Backend para a plataforma de e-commerce NOVA Sphere.",
    version="0.1.0",
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