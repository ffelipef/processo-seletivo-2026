import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.database import Base
from src.catalog.models import Product
import os

# Puxa credenciais do .env ou usa defaults
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = "db"
DB_PORT = "5432"
DB_NAME = os.getenv("POSTGRES_DB", "novasphere_prod_db")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# Nossa curadoria de produtos Old Tech e Modernos para expressão pessoal
PRODUCTS_SEED = [
    # 📻 CATEGORIA: RETRO / NOSTALGIA
    {
        "name": "Walkman Sony Cassette Player",
        "description": "Clássico toca-fitas dos anos 90. Perfeito para ouvir sua mixtape favorita com aquele som analógico caloroso.",
        "price": 289.90,
        "stock": 5,
        "category": "retro",
        "image_url": "https://placehold.co/400x400?text=Walkman+Sony",
        "is_retro": True
    },
    {
        "name": "MP3 Player Neon Blue (2GB)",
        "description": "Relembre o início dos anos 2000 com o MP3 de visor azul de uma única linha. Inclui rádio FM e gravação de voz.",
        "price": 89.90,
        "stock": 15,
        "category": "retro",
        "image_url": "https://placehold.co/400x400?text=MP3+Neon",
        "is_retro": True
    },
    {
        "name": "Fita Cassete Virgem TDK D90 (Kit c/ 3)",
        "description": "Fitas cassete de 90 minutos para você gravar suas próprias seleções e expressar sua identidade física.",
        "price": 75.00,
        "stock": 30,
        "category": "retro",
        "image_url": "https://placehold.co/400x400?text=Fita+TDK",
        "is_retro": True
    },
    # ⚡ CATEGORIA: MODERN / EXPRESSION / DIY
    {
        "name": "Módulo ESP32 NodeMCU WiFi + Bluetooth",
        "description": "Microcontrolador perfeito para entusiastas de IoT e automação. Solte sua criatividade e programe seus próprios gadgets.",
        "price": 42.50,
        "stock": 50,
        "category": "hardware",
        "image_url": "https://placehold.co/400x400?text=ESP32",
        "is_retro": False
    },
    {
        "name": "Gabinete Retrô Mini-ITX Beige 1998",
        "description": "Gabinete moderno por dentro, mas com o visual bege clássico de um computador de 1998 com direito ao botão Fake Turbo.",
        "price": 450.00,
        "stock": 3,
        "category": "hardware",
        "image_url": "https://placehold.co/400x400?text=Gabinete+Retro",
        "is_retro": False
    },
    {
        "name": "Fita de LED RGB Digital Neopixel (1m)",
        "description": "LEDs endereçáveis individualmente para decorar seu setup retro-futurista ou integrar com projetos de ESP32.",
        "price": 55.00,
        "stock": 25,
        "category": "accessories",
        "image_url": "https://placehold.co/400x400?text=LED+RGB",
        "is_retro": False
    },
    {
        "name": "Powerbank Transparente Cyberpunk (10000mAh)",
        "description": "Carregador portátil que deixa toda a sua placa de circuitos e bobinas de indução à mostra. Estética pura.",
        "price": 189.90,
        "stock": 12,
        "category": "accessories",
        "image_url": "https://placehold.co/400x400?text=Powerbank+Cyber",
        "is_retro": False
    }
]

async def seed():
    async with SessionLocal() as session:
        async with session.begin():
            for p_data in PRODUCTS_SEED:
                product = Product(**p_data)
                session.add(product)
        print("🌱 Banco de dados povoado com sucesso no NovaSphere!")

if __name__ == "__main__":
    asyncio.run(seed())