# 🌌 NovaSphere — Retro-Modern Tech E-Commerce

> **NovaSphere** é um e-commerce retro-moderno focado em tecnologia. Ele mescla a nostalgia dos anos 80, 90 e 2000 (como Walkmans, fitas cassete e MP3 players) com hardware e acessórios de última geração (como ESP32s, gabinetes cibernéticos e fitas de LED RGB). Tudo isso sob uma arquitetura robusta, segura, resiliente e altamente escalável.

Este projeto faz parte do **Processo Seletivo LAPES 2026** (Trilha de Desenvolvimento / DevOps).

---

## 👥 Candidato(s) e Trilha
* **Candidato:** Felipe de Freitas da Silva
* **Contato:** felipe24070063@aluno.cesupa.br
* **Telefone:** (91) 983637153
* **Trilha Escolhida:** Trilha de Desenvolvimento (Fullstack + DevOps)

---

## 🛠️ Stack Tecnológica

O ecossistema do **NovaSphere** foi desenvolvido utilizando ferramentas modernas do mercado:

### 🟢 Backend (API)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11/3.12) - Rápido, assíncrono e documentado automaticamente via Swagger/OpenAPI.
* **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) com driver assíncrono `asyncpg`.
* **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) com suporte completo a asyncio.
* **Cache & Limiter:** [Redis](https://redis.io/) (para invalidação de cache e cache de catálogo) + [SlowAPI](https://github.com/laurentS/slowapi) (para rate limiting).
* **Autenticação:** JWT (JSON Web Tokens) com segurança baseada em Bearer Token e hash de senhas via `bcrypt` direto.

### 🔵 Frontend (Client)
* **Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/) (TypeScript).
* **Roteamento & State:** [TanStack Router](https://tanstack.com/router) & [TanStack Start](https://tanstack.com/start) + [TanStack Query v5](https://tanstack.com/query) (React Query).
* **Estilização:** [TailwindCSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) para componentes acessíveis e fluidos.
* **Alertas & Notificações:** [Sonner](https://sonner.emilkowal.ski/).

### 🐳 DevOps & Qualidade
* **Orquestração:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (ambientes multi-containers).
* **Análise Estática:** [SonarQube](https://www.sonarqube.org/) & [Sonar Scanner](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/) para qualidade de código e conformidade de segurança.
* **Segurança de Transporte:** Banco de dados PostgreSQL configurado para exigir conexões criptografadas (**SSL ativo**).

---

## ⚙️ Instruções de Setup

O projeto foi totalmente containerizado. Siga os passos abaixo para executá-lo localmente:

### 📋 Pré-requisitos
* **Docker** instalado e rodando.
* **Docker Compose** habilitado.

### 🚀 Executando a Aplicação

1. **Clonar o repositório** e entrar na pasta raiz:
   ```bash
   git clone https://github.com/ffelipef/processo-seletivo-2026
   cd processo-seletivo-2026
   ```

2. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo `.env.example` para `.env` na raiz do projeto:
   ```bash
   cp .env.example .env
   ```
   > [!NOTE]
   > O arquivo padrão `.env` já vem pré-configurado com credenciais prontas para o ambiente Docker de desenvolvimento.

3. **Subir os Containers via Docker Compose:**
   ```bash
   docker compose up --build -d
   ```
   Este comando criará e executará:
   - **`nova_sphere_db`**: Banco PostgreSQL 16 (SSL habilitado).
   - **`nova_sphere_redis`**: Redis Cache.
   - **`nova_sphere_web`**: API Backend FastAPI (Porta `8000`).
   - **`nova_sphere_frontend`**: App Frontend React (Porta `3000`).
   - **`nova_sphere_sonar_db`** & **`nova_sphere_sonarqube`**: Servidor SonarQube para análise estática (Porta `9000`).

4. **Popular o Banco de Dados (Seeding):**
   O script de inicialização do banco (`init.sql`) e a aplicação FastAPI automaticamente criam as tabelas e povoam o banco com o primeiro Administrador. Se desejar popular o catálogo de produtos vintage e cupons de teste, execute o script de sementes (`seed.py`):
   ```bash
   docker exec -it nova_sphere_web python seed.py
   ```

---

## 🔗 Endpoints Principais (Acesso Local)

* **Frontend App:** [http://localhost:3000](http://localhost:3000)
* **Backend API Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend API Redoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Painel do SonarQube:** [http://localhost:9000](http://localhost:9000)

---

## 🧪 Executando os Testes Automatizados

O projeto conta com um conjunto completo de testes unitários e de integração focados em fluxos críticos (Autenticação, Carrinho, Compra Concorrente, Cancelamento e Máquina de Estados).

Como o banco de dados exige conexão SSL por segurança e o Redis é utilizado no checkout, a melhor maneira de rodar os testes sem conflito de portas locais é executá-los diretamente dentro do container do backend:

```bash
docker exec nova_sphere_web python -m pytest
```

> [!TIP]
> Caso queira rodar os testes localmente na máquina host, certifique-se de que os serviços do Docker Compose estão de pé (para que as portas `5432` e `6379` estejam expostas) e execute:
> ```powershell
> $env:POSTGRES_HOST="127.0.0.1"; $env:REDIS_HOST="127.0.0.1"; $env:POSTGRES_USER="novasphere_user"; $env:POSTGRES_PASSWORD="password"; python -m pytest
> ```

---

## 🧠 Decisões Técnicas & Arquitetura

O sistema foi arquitetado focando nas melhores práticas de engenharia de software assíncrona. Abaixo estão listadas as decisões técnicas de maior relevância:

### 1. Prevenção Absoluta de Overselling (Concorrência Segura)
Para evitar que dois clientes comprem o último item do estoque de forma simultânea (gerando estoque negativo), foi implementado o bloqueio pessimista a nível de banco de dados (`SELECT ... FOR UPDATE`).
> [!IMPORTANT]
> **Resolução de Cache de Sessão:** Durante testes concorrentes reais com SQLAlchemy, se o produto já estiver carregado no mapa de identidade da sessão (por exemplo, via `selectinload` do carrinho), a query `FOR UPDATE` pode retornar o dado atualizado do banco, mas o SQLAlchemy retornará a instância em cache (desatualizada).
> 
> Para solucionar este comportamento crítico, o backend utiliza explicitamente `.execution_options(populate_existing=True)` na query de lock. Isso garante que a instância em memória seja atualizada com o estoque real após o desbloqueio da linha.

### 2. Máquina de Estados Rígida para Pedidos (Checkout Flow)
O status de um pedido segue um fluxo sequencial rígido:
$$\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{SHIPPED} \longrightarrow \text{DELIVERED}$$
Qualquer tentativa de pular etapas (por exemplo, de `PENDING` para `DELIVERED`) ou realizar transições inválidas (como atualizar um pedido cancelado) é imediatamente rejeitada com um erro `400 Bad Request` pelo validador do backend. Atualizações de status são restritas a usuários com privilégios de **Admin**.

### 3. Mecanismo de Cancelamento com Restauração de Estoque
Ao cancelar um pedido com status `PENDING` ou `PAID`, o sistema automaticamente devolve as quantidades dos itens comprados ao estoque do produto correspondente, garantindo a integridade dos dados e o retorno correto do produto para venda.

### 4. Estratégia de Caching e Invalidação (Redis)
Para otimizar o tempo de resposta e evitar sobrecarga de leituras no PostgreSQL, a API de consulta do catálogo realiza cache no Redis. Para evitar dados inconsistentes (stale data), o cache é invalidado imediatamente sempre que:
* Um novo produto é adicionado, alterado ou excluído.
* Um checkout é concluído com sucesso (pois há redução do estoque físico dos produtos).
* Um pedido é cancelado (pois há devolução física de estoque).

### 5. Segurança do Banco de Dados (SSL Require)
Para evitar interceptação de dados de pagamento ou credenciais de usuários em trânsito, o container PostgreSQL exige conexões seguras. As conexões locais são configuradas com certificados auto-assinados montados em volume (`/var/lib/postgresql/ssl/`). O backend se conecta utilizando o parâmetro `connect_args={"ssl": "require"}`.

### 6. Observabilidade e Logs Estruturados
O backend utiliza um logger customizado que intercepta todas as requisições HTTP e as registra no console em formato estruturado **JSON**. Isso facilita a ingestão em ferramentas de agregação de logs (como Kibana, Grafana Loki ou Datadog) e permite monitorar o tempo de resposta (`duration_ms`), status HTTP e origem dos acessos em tempo real.

---

## 📁 Estrutura de Pastas

```
processo-seletivo-2026/
├── certs/                      # Certificados SSL para criptografia do PostgreSQL
├── dev/                        # PDFs de especificação do desafio
├── init-scripts/               # Scripts SQL executados na inicialização do Postgres
├── novasphere-frontend/        # Aplicação Cliente (Vite/React/TS/TanStack)
│   ├── src/                    # Código fonte do frontend
│   └── package.json            # Dependências do frontend
├── src/                        # Aplicação API Backend (FastAPI/SQLAlchemy)
│   ├── auth/                   # Módulo de Autenticação, Usuários e Sessões
│   ├── cart/                   # Módulo de Carrinho de Compras
│   ├── catalog/                # Módulo de Catálogo de Produtos e Caching
│   ├── orders/                 # Módulo de Pedidos, Checkout e Cupons
│   ├── config.py               # Variáveis de ambiente com Pydantic Settings
│   ├── database.py             # Configuração da conexão com Postgres e Redis
│   ├── limiter.py              # Configuração global de Rate Limiting
│   └── main.py                 # Ponto de entrada FastAPI e Middlewares
├── tests/                      # Suite de Testes Automatizados (Pytest)
├── Dockerfile                  # Dockerfile do Backend
├── Dockerfile.db               # Dockerfile do PostgreSQL com suporte a SSL
├── Dockerfile.frontend         # Dockerfile do Frontend React
├── docker-compose.yml          # Definição dos containers de desenvolvimento
├── requirements.txt            # Dependências Python (Backend)
└── seed.py                     # Script de população do banco de dados (seeding)
```

---

*NovaSphere — Tecnologia com alma retrô e potência moderna.*
