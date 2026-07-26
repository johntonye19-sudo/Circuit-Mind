Here is a verified, comprehensive **`README.md`** tailored specifically for **CircuitMind**. It details the architecture, prerequisites, environment setup, step-by-step installation options (Docker, local native, and cloud-based mobile via GitHub Codespaces), API documentation, and testing procedures.

---

# 📄 `README.md`

```markdown
# ⚡ CircuitMind | Autonomous AI Electronic Design Automation Engine

CircuitMind is an AI-first Hardware Engineering and Electronic Design Automation (EDA) platform. It orchestrates multi-agent workflows to translate high-level natural language design specifications into fully simulated SPICE netlists and 3D PCB layouts.

---

## 🏗️ Architecture Overview

```text
                  +-----------------------------------+
                  |   Next.js 14 Frontend Studio     |
                  |  (Three.js Viewport & Telemetry)  |
                  +-----------------+-----------------+
                                    |
                            WebSocket / REST
                                    |
                  +-----------------v-----------------+
                  |      FastAPI Backend Gateway      |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
   +--------v-------+      +--------v-------+      +--------v-------+
   |   RAG Agent    |      |  Schematic     |      | Layout Agent   |
   | (pgvector DB)  |      |  & SPICE Agent |      | (Simulated     |
   +----------------+      +----------------+      |  Annealing)    |
                                                   +----------------+
                                                            |
                                                    +-------v--------+
                                                    | KiCad / Ngspice|
                                                    | Headless Engine|
                                                    +----------------+

```

---

## 🛠️ Features

* **Multi-Agent DAG Pipeline**: Autonomous coordination between domain-specific sub-agents (`RAGAgent`, `SchematicAgent`, `SimulationAgent`, and `LayoutAgent`).
* **Retrieval-Augmented Component Selection**: Vector similarity search over component datasheets using PostgreSQL and `pgvector`.
* **Headless SPICE Simulation**: Batch execution of transient simulations via `ngspice` with fallbacks for convergence verification.
* **Algorithmic Board Placement**: Simulated Annealing algorithm for component placement on an FR-4 board.
* **Interactive 3D PCB Viewport**: Real-time rendering of generated circuit boards, copper traces, and component packages using Next.js 14, Three.js, and `@react-three/fiber`.

---

## 🚀 Prerequisites

Before installing, ensure you have the following installed on your system:

* **Docker & Docker Compose** (Recommended): Version 24.0+ / Compose v2.20+
* **Node.js** (For local frontend dev): Version 18.0+ or 20.0+
* **Python** (For local backend dev): Version 3.10+
* **System Utilities**: `ngspice` and `kicad` (if running backend outside Docker)

---

## 📦 Environment Configuration

Create a `.env` file in the root directory by copying the example environment file:

```bash
cp .env.example .env

```

Ensure your `.env` contains the following default variables:

```env
# Backend Service Configuration
POSTGRES_USER=circuitmind
POSTGRES_PASSWORD=circuitmind_secure_pass
POSTGRES_DB=circuitmind_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

REDIS_URL=redis://redis:6379/0

# Optional AI / LLM Integration Keys
OPENAI_API_KEY=your_openai_api_key_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/design

```

---

## 📥 Step-by-Step Installation Guide

### Option 1: Docker Compose Deployment (Recommended)

This method sets up the entire stack—including PostgreSQL with `pgvector`, Redis, FastAPI backend, KiCad/Ngspice binaries, Celery workers, and the Next.js frontend—inside isolated containers.

#### Step 1: Clone the Repository

```bash
git clone [https://github.com/your-username/Circuit-Mind.git](https://github.com/your-username/Circuit-Mind.git)
cd Circuit-Mind

```

#### Step 2: Build and Boot Containers

```bash
docker-compose up --build -d

```

#### Step 3: Verify Running Services

```bash
docker-compose ps

```

You should see all 5 core containers active and healthy:

* `circuitmind-db`
* `circuitmind-redis`
* `circuitmind-backend`
* `circuitmind-celery`
* `circuitmind-frontend`

#### Step 4: Access the Application

* **Frontend Web Studio**: Open [http://localhost:3000](http://localhost:3000)
* **Interactive API Docs (Swagger)**: Open [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check**: Open [http://localhost:8000/health](http://localhost:8000/health)

---

### Option 2: Local Native Development (Without Docker)

#### Step 1: Set Up PostgreSQL & Vector Extension

Ensure PostgreSQL 16 is installed and running, then enable `pgvector`:

```sql
CREATE DATABASE circuitmind_db;
\c circuitmind_db;
CREATE EXTENSION IF NOT EXISTS vector;

```

#### Step 2: Set Up Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

```

#### Step 3: Set Up Frontend

Open a new terminal window:

```bash
cd frontend

# Install Node modules
npm install

# Run Development Server
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 3: Mobile / Cloud Setup (GitHub Codespaces or iSH Terminal)

Because mobile environments (like iSH on iOS) do not support direct `dockerd` kernel virtualization, you can run CircuitMind in the cloud via GitHub Codespaces:

1. Push your repository to **GitHub**.
2. Navigate to your repository in a browser, click **Code** -> **Codespaces** -> **Create codespace on main**.
3. Once the cloud terminal loads, run:
```bash
docker-compose up --build

```


4. Click the forwarded port notification to open port `3000` in your browser.

---

## 🧪 Verification & Testing

### 1. Test Backend Health Endpoint

```bash
curl http://localhost:8000/health

```

### 2. Verify Frontend Type-Checking & Linting

```bash
cd frontend
npm run type-check
npm run lint

```

### 3. Test Headless SPICE Engine Execution

```bash
docker exec -it circuitmind-backend python -c "
import asyncio
from app.simulation.spice_runner import SpiceRunner

async def test():
    runner = SpiceRunner()
    res = await runner.run_transient_simulation('V1 in 0 400\nR1 in out 10\n.end')
    print('Simulation Success:', res.success)
    print('Metrics:', res.metrics)

asyncio.run(test())
"

```

---

## 📁 Repository Structure

```text
Circuit-Mind/
├── .github/
│   └── workflows/
│       └── ci.yml             # Continuous Integration pipeline
├── docker/
│   ├── Dockerfile.backend     # Multi-stage image with KiCad & Ngspice
│   └── init_db.sql            # Automated SQL pgvector initializer
├── docker-compose.yml         # Container orchestration spec
├── backend/
│   ├── requirements.txt       # Python package requirements
│   └── app/
│       ├── main.py            # FastAPI entrypoint
│       ├── agents/            # Multi-agent DAG execution logic
│       ├── db/                # Async SQLAlchemy models & session factory
│       ├── routers/           # REST and WebSocket handlers
│       └── simulation/        # Async Ngspice runner
├── frontend/
│   ├── package.json           # Next.js 14, Three.js, & Tailwind dependencies
│   ├── tailwind.config.js     # EDA workspace theme configuration
│   ├── app/                   # Next.js App Router (Studio & Workspace pages)
│   └── components/            # Reusable 3D PCB Viewport components
├── .gitignore
└── README.md

```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

```

```
