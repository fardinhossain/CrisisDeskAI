# CrisisDesk AI 🚨
**Intelligent Backend API for Emergency & Service Request Triage with Multi-Provider AI Fallback, Hybrid Deduplication, and Real-Time Weather Enrichment.**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL (Neon)](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Jest Tests](https://img.shields.io/badge/Tests-38%20Passing-10B981?logo=jest&logoColor=white)](#testing-suite--verification)
[![Swagger API Docs](https://img.shields.io/badge/Swagger_UI-%2Fdocs-85EA2D?logo=swagger&logoColor=black)](#api-endpoints--swagger-documentation)

---

## 📖 Overview & Mission

When natural disasters, fires, or infrastructure failures strike, emergency call centers and digital intake portals are instantly flooded with thousands of incoming citizen reports. Traditional human triage struggles to process this volume quickly, often missing critical incidents, duplicating dispatch requests, or failing to recognize escalating environmental dangers.

**CrisisDesk AI** solves this critical bottleneck by providing an enterprise-grade, highly resilient backend API that automatically intakes, cleans, triages, deduplicates, and enriches citizen reports in milliseconds. Built with clean **SOLID architecture** (`Controller → Service → Repository`), CrisisDesk AI seamlessly processes reports across both **English (`en`)** and **Bengali (`bn`)**, elevating emergency response workflows through resilient AI fallbacks and live environmental data ingestion.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Layer
        Citizens([Citizens / Mobile Apps])
        Admins([Emergency Dispatch Admins])
    end

    subgraph API Gateway & Security
        Helmet[Helmet Security Headers]
        RateLimit[Dual-Tier Rate Limiting]
        AuthGuard[JWT Admin Middleware]
        ZodValidator[Zod Schema Guard]
    end

    subgraph Core Triage & Enrichment Engine
        ReportCtrl[Report Controller]
        ReportSvc[Report Service]
        
        subgraph AI Router 3-Tier Fallback Chain
            Gemini[Google Gemini 2.5 Flash]
            Groq[Groq Llama-3.3 70B]
            OpenRouter[OpenRouter Mistral-7B]
            AiGuard[Zod AI Output Guard]
        end
        
        subgraph External Enrichment Layer
            Nominatim[Nominatim Geocoder]
            OpenMeteo[Open-Meteo Weather API]
            UrgencyNudge[Urgency Weather Nudger]
        end

        subgraph Deduplication Engine
            DupeSvc[Duplicate Service]
            HybridStrategy[Hybrid Heuristic & Cosine Strategy]
        end

        subgraph Notification Engine
            NoteSvc[Notification Service]
            Resend[Resend Email Alert API]
        end
    end

    subgraph Persistence Layer
        Prisma[Prisma ORM]
        Neon[(Neon Serverless PostgreSQL)]
    end

    Citizens -->|POST /api/reports| Helmet
    Admins -->|GET / PATCH / DELETE| Helmet
    Helmet --> RateLimit
    RateLimit --> AuthGuard
    AuthGuard --> ZodValidator
    ZodValidator --> ReportCtrl
    ReportCtrl --> ReportSvc

    ReportSvc --> Nominatim
    Nominatim --> AiGuard
    AiGuard -->|1st Choice| Gemini
    Gemini -.->|Timeout / Error| Groq
    Groq -.->|Timeout / Error| OpenRouter
    AiGuard --> OpenMeteo
    OpenMeteo --> UrgencyNudge

    ReportSvc --> DupeSvc
    DupeSvc --> HybridStrategy
    HybridStrategy --> Prisma

    ReportSvc -->|If Urgency == Critical| NoteSvc
    NoteSvc --> Resend
    NoteSvc --> Prisma
    ReportSvc --> Prisma
    Prisma <--> Neon
```

---

## 🌟 Key Innovations & Architectural Highlights

### 1. 🛡️ Multi-Provider AI Router & Output Guard (`src/services/ai/`)
Relying on a single AI provider during a major crisis creates a single point of failure. CrisisDesk AI implements a **resilient 3-tier fallback chain**:
- **Primary**: Google Gemini (`gemini-2.5-flash`) for low-latency classification and 768-dimensional vector embedding generation.
- **Secondary**: Groq (`llama-3.3-70b-versatile`) for ultra-fast fallback parsing.
- **Tertiary**: OpenRouter (`mistralai/mistral-7b-instruct`) as the final safeguard.
- **AI Output Guard**: LLM outputs are piped through an automated JSON cleaner (`parseOrCleanJson`) and strict `Zod` domain schema (`aiOutputGuard`). If any provider returns invalid enum categories or out-of-bounds confidence intervals, the guard clamps values or triggers instant retry/fallback before throwing structured unprocessable errors.

### 2. 🧬 Hybrid Heuristic & Embedding Deduplication (`src/services/duplicate/`)
To prevent dispatch duplication when dozens of citizens report the exact same incident from slightly different street angles, CrisisDesk AI implements a modular **Strategy Pattern** (`SimilarityStrategy` / `HybridHeuristicStrategy`).
- **Scoring Formula**: `0.55 * Text Overlap + 0.25 * Location Proximity + 0.20 * Category Exact Match`.
- **Script-Aware Tokenization**: Uses Unicode-normalized regex (`\p{L}\p{M}\p{N}`) preserving Bengali diacritics (`bn`) while calculating precise Jaccard word intersection and Cosine vector distance against candidate records (`threshold >= 0.70`).
- **Automated Linking**: Near-duplicate reports are automatically marked (`possibleDuplicate: true`) and linked to the master incident ID (`matchedReportId`) in PostgreSQL.

### 3. ⛈️ Live Weather Enrichment & Urgency Nudging (`src/services/external/`)
Environmental factors drastically alter incident severity. CrisisDesk AI automatically enriches every report:
- **Geocoding**: Converts raw citizen location strings (e.g., *"Mirpur 10, Dhaka"*) into precise WGS84 coordinates (`latitude`, `longitude`) and `formattedAddress` using Nominatim API with intelligent 1.1s rate limiting.
- **Weather Nudging (`adjustUrgency()`)**: Queries Open-Meteo for live 24-hour rainfall and severe weather codes at the report's exact coordinates. If a `flood` or `infrastructure` report is submitted during heavy rain conditions (`rain24hMm >= 50` or severe storm codes), the system **automatically nudges urgency upward** (e.g., elevating a `high` flood report directly to `critical`), ensuring immediate dispatch priority.

### 4. 🚨 Resend Notification Engine & Audit Trails (`src/services/notification/`)
Whenever a report is triaged with `critical` urgency (or nudged to `critical` via severe weather), the `NotificationService` dispatches real-time HTML email alerts to emergency response command centers (`env.ALERT_RECIPIENT`) via Resend API. Delivery status, subject lines, and error logs are immutably written to the `Notification` table in PostgreSQL for full operational auditing (`markAlertSent`).

### 5. 📊 High-Performance Aggregation Engine (`src/services/analytics.service.ts`)
Admin dashboards require instant situational awareness. The `AnalyticsService` executes optimized Prisma aggregate queries (`groupBy`, `count`, `aggregate`) across non-deleted rows, returning sub-10ms breakdowns of total reports, category distributions (`fire`, `flood`, `medical`, `infrastructure`, `security`), urgency breakdowns, and average triage confidence without pulling large table scans into application memory.

### 6. 🔒 Enterprise Security & Defense-in-Depth (`src/middleware/`)
- **Stateless JWT Authentication**: Signed `Bearer` tokens (`sub: email, role: "admin"`) with strict expiration (`24h`).
- **Granular Authorization**: Public intake (`POST /api/reports`) remains open for citizen accessibility, while all administrative management routes (`GET`, `PATCH /status`, `DELETE`, `/stats/summary`) strictly mandate `requireAdmin` validation.
- **Dual-Tier Rate Limiting**: General API traffic is limited by `apiLimiter` (`60 req/min`), while login attempts (`POST /api/auth/login`) are protected by a strict `loginLimiter` (`10 req/15min`) preventing dictionary or brute-force attacks.
- **Payload & SQLi Hardening**: `Zod` schemas validate all body/query/parameter inputs (`validateMiddleware`), throwing clear `400 Bad Request` arrays. Prisma parameterization guarantees immunity to SQL injection.

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Node.js** (`>= 20.x`)
- **npm** (`>= 10.x`)
- **PostgreSQL / Neon Serverless DB** instance

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/fardinhossain/CrisisDeskAI.git
cd "CrisisDesk AI"
npm ci
```

### 2. Environment Configuration (`.env`)
Copy the provided `.env.example` file to `.env`:
```bash
cp .env.example .env
```

#### Complete Environment Variable Reference Table
| Variable | Required | Default / Example | Description |
|---|:---:|---|---|
| `PORT` | Optional | `4000` | HTTP server listening port |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@pooler.neon.tech/crisisdesk` | PgBouncer / Connection pooled URL for Prisma runtime queries |
| `DIRECT_URL` | **Yes** | `postgresql://user:pass@direct.neon.tech/crisisdesk` | Direct PostgreSQL connection string required for migrations (`prisma migrate`) |
| `JWT_SECRET` | **Yes** | `super-secret-jwt-key...` | Cryptographic secret for signing and verifying Admin JWT tokens |
| `JWT_EXPIRES_IN` | Optional | `24h` | Token expiration lifespan |
| `ADMIN_EMAIL` | Optional | `admin@crisisdesk.ai` | Designated administrator email address for login verification |
| `ADMIN_PASSWORD_HASH`| Optional | `$2a$10$...` (bcrypt hash) | Bcrypt hash of admin password (dev fallback: `admin123` / `password`) |
| `GEMINI_API_KEY` | Optional* | `AIzaSy...` | Google Gemini API key (*Required unless `MOCK_AI=true`) |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq API key for secondary LLM parsing fallback |
| `OPENROUTER_API_KEY` | Optional | `sk-or-v1-...` | OpenRouter API key for tertiary LLM parsing fallback |
| `RESEND_API_KEY` | Optional | `re_123...` | Resend API key for dispatching critical email alerts |
| `ALERT_RECIPIENT` | Optional | `alert@crisisdesk.ai` | Target email address where critical emergency notifications are sent |
| `MOCK_AI` | Optional | `false` | Set `true` to bypass LLM APIs and return deterministic classifications locally |
| `MOCK_EXTERNAL` | Optional | `false` | Set `true` to bypass external Nominatim/Open-Meteo calls locally |
| `RATE_LIMIT_MAX` | Optional | `60` | Maximum requests per minute allowed across general API endpoints |

### 3. Database Migration & Seeding
Generate the Prisma client, run initial schema migrations against your Neon Postgres database, and seed the database with realistic test incidents:
```bash
# 1. Generate TypeScript Prisma Client
npm run prisma:generate

# 2. Run schema migrations against Neon Postgres
npm run prisma:migrate

# 3. Seed database with 15+ realistic Bengali & English reports + near-duplicate pair
npm run seed
```

### 4. Boot Development Server
```bash
npm run dev
```
You should see:
```
[INFO] 🚀 CrisisDesk AI listening on http://localhost:4000 (env: development)
[INFO] 📦 Swagger API Documentation available at http://localhost:4000/docs
```

---

## 🔌 API Endpoints & Swagger Documentation

Once booted, explore the interactive **OpenAPI 3.0 Swagger UI Dashboard** by visiting:
👉 **`http://localhost:4000/docs`**

### Summary of REST Endpoints

| Method | Endpoint | Auth Required | Description |
|:---:|---|:---:|---|
| **GET** | `/` | No | API metadata summary & documentation links |
| **GET** | `/api/health` | No | System health check (pings Postgres `SELECT 1` & active AI provider) |
| **POST** | `/api/auth/login` | No | Admin login issuing signed `Bearer` JWT token |
| **POST** | `/api/reports` | No | Submit & triage a new citizen emergency report (`en` or `bn`) |
| **GET** | `/api/reports` | **Yes (Admin)** | List active reports with filtering, pagination (`page`, `limit`), & sorting |
| **GET** | `/api/reports/:id` | **Yes (Admin)** | Retrieve full triage details for a specific report UUID |
| **PATCH** | `/api/reports/:id/status`| **Yes (Admin)** | Update report workflow status (`pending` → `assigned` → `in_progress` → `resolved`) |
| **DELETE**| `/api/reports/:id` | **Yes (Admin)** | Perform soft-deletion (`deletedAt = now()`) of a report |
| **GET** | `/api/reports/stats/summary`| **Yes (Admin)** | Retrieve aggregate real-time analytics across categories, urgencies, & statuses |

---

## 💻 Example Usage (`cURL`)

### 1. Submit a Citizen Emergency Report (English)
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Sylhet, Bangladesh",
    "description": "Massive flash flood submerging residential houses near Surma river bank. People trapped on rooftops needing immediate boat rescue.",
    "contact": "+8801712345678"
  }'
```
**Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Emergency report triaged and submitted successfully.",
  "data": {
    "report": {
      "id": "c83f191b-8d14-41b3-a12b-312948e92026",
      "category": "flood",
      "urgency": "critical",
      "status": "pending",
      "language": "en",
      "summary": "Massive flash flood in Sylhet with residents trapped on rooftops.",
      "confidence": 0.96,
      "latitude": 24.8949,
      "longitude": 91.8687,
      "formattedAddress": "Sylhet, Sylhet Division, Bangladesh",
      "possibleDuplicate": false,
      "weatherContext": "Recent rainfall: 65mm in last 24h. Condition: Heavy rain",
      "weatherAdjusted": true,
      "alertSent": true,
      "createdAt": "2026-07-12T17:00:00.000Z"
    }
  }
}
```

### 2. Submit a Citizen Report in Bengali (`bn`)
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Mirpur 10, Dhaka",
    "description": "মিরপুর ১০ নম্বর গোলচত্বরে একটি বড় বাণিজ্যিক ভবনে ভয়াবহ আগুন লেগেছে। প্রচুর ধোঁয়া বের হচ্ছে, ফায়ার সার্ভিস জরুরি প্রয়োজন।",
    "contact": "+8801812345678"
  }'
```
*The AI Router automatically detects `"bn"`, classifies category `"fire"`, urgency `"critical"`, and normalizes the Bengali summary accurately!*

### 3. Authenticate as Administrator
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crisisdesk.ai",
    "password": "admin123"
  }'
```
**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Authentication successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "email": "admin@crisisdesk.ai", "role": "admin" }
  }
}
```

### 4. Query Filtered Reports with Pagination (Admin Auth Required)
```bash
curl -X GET "http://localhost:4000/api/reports?category=fire&urgency=critical&page=1&limit=10&sort=newest" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🧪 Testing Suite & Verification

CrisisDesk AI includes a comprehensive, deterministic test suite (`38 tests across 8 suites`) built with **Jest** and **Supertest**.
All tests run with isolated environment flags (`MOCK_AI=true` and `MOCK_EXTERNAL=true`), guaranteeing zero network latency or external API key dependencies during Continuous Integration (CI).

### Run Test Suite
```bash
npm test -- --detectOpenHandles
```
**Test Results Output**:
```bash
PASS tests/integration/app.api.test.ts (8 tests)
PASS tests/unit/jwt.test.ts (2 tests)
PASS tests/unit/external.test.ts (4 tests)
PASS tests/unit/aiRouter.test.ts (2 tests)
PASS tests/unit/duplicate.test.ts (2 tests)
PASS tests/unit/validator.test.ts (7 tests)
PASS tests/unit/similarity.test.ts (10 tests)
PASS tests/unit/language.test.ts (3 tests)

Test Suites: 8 passed, 8 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        5.864 s
```

---

## 🐳 Docker & Cloud Deployment (`Render` + `Neon`)

### 1. Multi-Stage Production Docker Build
CrisisDesk AI ships with a production-optimized multi-stage `Dockerfile` that automatically copies pre-generated Prisma client binaries and runs database migrations on startup (`npx prisma migrate deploy && node dist/server.js`).

#### Build & Run Container Locally
```bash
# Build multi-stage Docker image
docker build -t crisisdesk-ai:latest .

# Run container with environment variables
docker run -p 4000:4000 --env-file .env crisisdesk-ai:latest
```

### 2. Local Container Orchestration (`docker-compose.yml`)
To boot the full application stack alongside a dedicated local PostgreSQL container (`postgres:16-alpine`):
```bash
docker-compose up --build -d
```

### 3. One-Click Cloud Deployment (`Render.com` Blueprint)
CrisisDesk AI includes an automated `render.yaml` Blueprint designed for **Render.com** paired with **Neon Serverless Postgres**:
1. Push your code repository to **GitHub**.
2. Log into your **Render Dashboard** → click **New** → **Blueprint**.
3. Connect your GitHub repository. Render will automatically detect `render.yaml` and configure:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Health Check Path**: `/api/health`
4. Set your `DATABASE_URL` and `DIRECT_URL` environment variables in the Render console pointing to your Neon database instance.
5. Click **Apply** — your production API will be live globally with automated HTTPS and zero-downtime deployments!

---

## 🛠️ Prisma Command Reference Table

Here is a quick command reference for managing your Prisma schema (`prisma/schema.prisma`) and database state:

| Command | Purpose | When to Use |
|---|---|---|
| `npm run prisma:generate` | Generates `@prisma/client` types from `schema.prisma` | After pulling new code or modifying schema |
| `npm run prisma:migrate` | Creates a new SQL migration file and applies it to dev DB | When creating new tables or columns locally |
| `npm run prisma:deploy` | Applies all pending migrations cleanly without resetting data | Used in production CI/CD pipelines & Docker `CMD` |
| `npm run seed` | Runs `prisma/seed.ts` inserting 15+ test scenarios | To populate an empty DB with test/demo incidents |
| `npm run prisma:studio` | Launches visual web GUI on `http://localhost:5555` | For viewing, editing, and debugging raw table rows |

---

## 📜 License & Acknowledgments
Built with ❤️ by the **CrisisDesk AI Team** for resilient, state-of-the-art citizen emergency management.
Licensed under the **MIT License**.
