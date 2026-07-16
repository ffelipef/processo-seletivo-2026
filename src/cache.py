import os
from redis.asyncio import Redis

# Ajuste aqui para o nome exato do seu serviço de redis no compose (geralmente 'redis')
redis_client = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)