# Use uma imagem oficial do Python como base
FROM python:3.11-slim-bookworm

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o arquivo de dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código da aplicação
COPY . .

# Expõe a porta que o FastAPI irá rodar
EXPOSE 8000

# Comando para rodar a aplicação Uvicorn
# O comando completo 'uvicorn src.main:app --host 0.0.0.0 --port 8000'
# já está definido no docker-compose.yml, então o CMD aqui serve
# como um fallback ou para rodar o container diretamente sem compose.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
