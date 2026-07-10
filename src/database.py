from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
import os
from dotenv import load_dotenv
from redis.asyncio import Redis
from src.config import settings

load_dotenv()

# Usar a URL de conexão do objeto settings para consistência
DATABASE_URL = settings.DATABASE_URL

async_engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_redis():
    """Yields um cliente Redis assíncrono para injeção de dependência."""
    async with Redis.from_url(settings.REDIS_URL, decode_responses=True) as redis:
        yield redis
