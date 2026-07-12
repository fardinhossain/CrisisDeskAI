# CrisisDesk AI — Build Status

## ✅ Phase 0 (Bootstrap) & Phase 1 (Prisma + Neon) — SCAFFOLDED

Code lives at the project root (this folder); specs live in `context/`.

### What was created
```
package.json            # deps + scripts (dev/build/start/prisma/seed/test)
tsconfig.json           # strict TypeScript
.gitignore .dockerignore
.env.example            # every env var documented
Dockerfile              # multi-stage, runs prisma migrate deploy on start
docker-compose.yml      # api + local postgres
prisma/schema.prisma    # Report + Notification + AdminUser, UUID PK, soft delete, indexes
src/
  config/env.ts         # Zod-validated env (boots even before Neon is set up)
  config/logger.ts      # Pino (pretty in dev, redacts secrets/PII)
  config/prisma.ts      # PrismaClient singleton + connectDb/pingDb/disconnectDb
  constants/enums.ts    # categories/urgencies/statuses/languages (matches Prisma)
  constants/messages.ts # standard response messages
  utils/ApiError.ts ApiResponse.ts asyncHandler.ts
  middleware/error.middleware.ts requestLogger.ts
  controllers/health.controller.ts
  routes/health.routes.ts index.ts
  app.ts                # helmet, cors, rate-limit, logging, routes, error handler
  server.ts             # bootstrap + graceful shutdown
```

### ⚠️ Could NOT run here
The sandbox **blocks the npm registry (403 Forbidden)**, so dependencies could not be installed
and the code could not be compiled/booted in this environment. All files passed a structural
sanity check (brace balance, imports). You must run the toolchain on your own machine.

### ▶️ Do this on your machine to finish verifying Phase 0–1
```bash
# 1. install
npm install

# 2. set up env
cp .env.example .env
#   fill DATABASE_URL + DIRECT_URL from your Neon dashboard
#   (JWT_SECRET has a dev fallback; AI keys optional for now)

# 3. generate client + run first migration against Neon
npx prisma generate
npx prisma migrate dev --name init

# 4. typecheck + boot
npm run typecheck        # expect: no errors
npm run dev              # expect: "🚀 CrisisDesk AI listening on http://localhost:4000"

# 5. smoke test
curl http://localhost:4000/api/health
#   -> { "success": true, "message": "OK",
#        "data": { "status": "up", "db": "connected", ... } }
```
✅ Phase 0–1 "done" when `/api/health` shows `db: connected` and typecheck is clean.

### Next: Phase 2 (utils/error already partly done) → 3 (validation) → 4 (CRUD)…
Follow `context/build-plan.md`. Update `context/progress-tracker.md` as you go.

> Note: `package.json` pins reasonable versions but they were not installed/tested here.
> If any version fails to resolve, run `npm install <pkg>@latest` for that package.

---

## ✅ Phase 2 (Utils/errors) & Phase 3 (Validation) & Phase 4-CRUD (Repository + Report CRUD) — SCAFFOLDED

> Phases 2 and 3 from build-plan.md, plus the repository/CRUD portion of Phase 4 (AI still stubbed).

### Added
```
src/types/report.types.ts            # DTOs, filters, ReportResponse, pagination
src/validators/report.validator.ts   # Zod: createReport, updateStatus, listQuery, idParam
src/middleware/validate.middleware.ts # runs a Zod schema on body/query/params -> 400 + errors[]
                                      #   (message "Description and location are required." when both missing)
src/repositories/report.repository.ts # ALL Prisma queries, soft-delete aware, toReportResponse mapper,
                                      #   findMany (filters+pagination+sort), findDuplicateCandidates
src/services/report.service.ts        # create/list/getById/updateStatus/remove
                                      #   AI + duplicate detection STUBBED (replaced in Phase 4/6)
src/controllers/report.controller.ts  # HTTP only; validated-input helper; envelope responses
src/routes/report.routes.ts           # POST/GET/GET:id/PATCH:id/status/DELETE:id
src/routes/index.ts                   # mounts /reports
```

### Endpoints now live (once running)
- `POST   /api/reports`            → 201, report triaged with stub AI (category "other")
- `GET    /api/reports`            → 200, filters: category/urgency/status/search/from/to + page/limit/sort
- `GET    /api/reports/:id`        → 200 or 404 "Report not found."
- `PATCH  /api/reports/:id/status` → 200 or 400 (invalid enum) or 404
- `DELETE /api/reports/:id`        → 200 (soft delete) or 404

### Verify (after npm install + migrate, on your machine)
```bash
npm run typecheck
npm run dev
# create
curl -X POST localhost:4000/api/reports -H "Content-Type: application/json" \
  -d '{"location":"Sylhet","description":"Fire near a shop, people trapped"}'
# validation error (expect 400 "Description and location are required.")
curl -X POST localhost:4000/api/reports -H "Content-Type: application/json" -d '{}'
# list with filters
curl "localhost:4000/api/reports?urgency=medium&page=1&limit=10"
```

### Notes / deferred
- AI fields are stubbed (`category:"other"`, `confidence:0`, `aiProvider:"stub"`) until Phase 4.
- Duplicate detection returns false until Phase 6.
- Admin JWT guard not yet applied to list/detail/status/delete (Phase 8) — currently open.
- Phase 7 will register `/api/reports/stats/summary` BEFORE `/:id`.
