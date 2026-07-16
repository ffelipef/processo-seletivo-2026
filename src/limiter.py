from slowapi import Limiter
from slowapi.util import get_remote_address

# Instância única para ser importada nas rotas
limiter = Limiter(key_func=get_remote_address)