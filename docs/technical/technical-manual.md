# Technical Manual

## Overview
Comprehensive technical documentation for the MIS covering architecture, environments, repository structure, setup, APIs, build/deploy, testing, operations, security, and maintenance.

## Audience
- IT administrators, DevOps engineers, backend/frontend developers, QA engineers

## Technology Stack
- Frontend: React 18, Vite, Tailwind CSS
- Backend: NestJS 10, TypeScript
- Database: MySQL 8, TypeORM
- Auth: JWT access + refresh tokens, RBAC
- Testing: Jest (unit), Playwright/Cypress (E2E)

## Architecture
- Client (React/Vite) communicates with API (NestJS) via HTTPS JSON endpoints.
- Auth service issues JWT access tokens and refresh tokens.
- TypeORM manages entities, repositories, and migrations against MySQL.
- Background jobs (if configured) use queues for email/SMS notifications.

Illustrative diagrams should be added under `docs/technical/images/`:
- `system-architecture.png` (client, API, DB, external providers)
- `module-boundaries.png` (NestJS modules: Auth, Users, Enrollment, Finance, Reports)

## Repository Structure
- `frontend/` React app (components, pages, hooks, state, routes)
- `backend/` NestJS app (modules, controllers, services, guards, interceptors)
- `backend/src/entities/` TypeORM entities
- `backend/src/migrations/` database migrations
- `docs/` documentation (user guides, technical manual, runbook)

## Environment Setup
Requirements:
- Node.js 20.x, npm 10+
- MySQL 8.x
- MacOS (Apple Silicon) compatible toolchain

Environment variables (`.env.example`):
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=letmein25` (local dev only; do not use in production)
- `DB_NAME=bc_mis`
- `JWT_SECRET=replace_me`
- `JWT_REFRESH_SECRET=replace_me`
- `NODE_ENV=development`
- `MAIL_PROVIDER=smtp`
- `MAIL_HOST=localhost`
- `MAIL_USER=`
- `MAIL_PASSWORD=`

Setup steps:
1. Create `.env.local` from `.env.example` and adjust values.
2. Start MySQL and ensure `DB_NAME` exists.
3. Install dependencies: `npm install` in both frontend and backend.
4. Run migrations: `npm run migration:run` in backend.
5. Start services: `npm run dev` (frontend and backend concurrently or via workspace script).

## Database & Migrations
- Entities defined under `backend/src/entities` and must align with naming conventions.
- Use `typeorm` or Nest CLI migration commands to generate and run migrations.
- Apply indexes on frequently queried fields (student_id, invoice_id, created_at).
- Seed scripts may be provided for local data; never seed production with test data.

## Authentication & Authorization
- JWT access token with short TTL (e.g., 15m); refresh token with longer TTL.
- Refresh token rotation on use; store securely (HTTP-only cookie or secure storage).
- Guards enforce authentication; RBAC guards enforce role permissions per route.
- Roles: `admin`, `teacher`, `student`, `librarian`, `registrar` with module-specific scopes.

## API Documentation
Conventions:
- RESTful endpoints under `/api/v1/*`
- JSON request/response; errors include `code`, `message`, optional `details`
- Pagination with `page`, `pageSize`, `total`

Examples:
- Auth: `POST /api/v1/auth/login` → `{ email, password }`
- Students: `GET /api/v1/students` → list; `POST /api/v1/students` → create
- Enrollment: `POST /api/v1/enrollments` → enroll student
- Finance: `POST /api/v1/invoices` → create invoice; `POST /api/v1/payments` → record payment
- Reports: `GET /api/v1/reports/enrollment` with filters

Error Handling:
- Standardized error responses; map internal errors to consistent codes
- Retry logic for transient failures (network, provider timeouts) where appropriate

## Frontend Implementation Notes
- React 18 with functional components and hooks
- Routing via `react-router` (or project’s chosen router) with protected routes
- State management: local state + query caching layer if used
- Tailwind CSS best practices; prefer `@apply` for reusable patterns
- Accessibility: semantic HTML, keyboard navigation, ARIA labels

## Backend Implementation Notes
- NestJS modules with clear boundaries
- Controllers for HTTP transport; Services for business logic
- DTOs with validation decorators; global validation pipe
- Interceptors for logging/transform; Filters for exception handling
- Config module loads environment variables with schema validation

## Build & Deployment
- Frontend: `npm run build` in `frontend/` → Vite artifact in `dist/`
- Backend: `npm run build` in `backend/` → compiled TypeScript in `dist/`
- Migrations: run before new backend deploy on each environment
- CI/CD: lint, test, build, artifact publish; deploy steps per environment

Pre-deploy Checklist:
- Lint passes (ESLint + Prettier)
- Unit test coverage ≥80%
- E2E tests green
- Migrations reviewed and applied on staging

Post-deploy Smoke Tests:
- Health endpoints return 200
- Core flows: login, enrollment, invoice creation, reports

## Testing Strategy
- Unit tests: Jest for services, controllers, utilities
- Integration tests: API endpoints with test database
- E2E tests: Playwright/Cypress simulating user roles and workflows
- Coverage: maintain ≥80% across modules
- Test data: anonymized fixtures; cleanup between tests

## Observability
- Logging: structured logs with request IDs; redact sensitive fields
- Monitoring: metrics for error rates, latency, DB connections
- Alerts: thresholds for API 5xx, auth failures, queue backlogs
- Dashboards per role (Ops, Dev) with key KPIs

## Operations Runbook (Summary)
- Deploy: build, apply migrations, restart services, smoke test
- Backup: scheduled MySQL backups; verify restores monthly
- Restore: documented procedure with validation
- Incident Response: severity levels, escalation contacts, rollback

## Performance Guidelines
- Use indexes; avoid N+1 queries; apply pagination everywhere
- Cache expensive computations where possible
- Optimize React renders; memoization and lazy loading

## Security Practices
- Never commit secrets; use environment files and secret managers
- Input validation and output escaping
- Token rotation; short-lived access tokens
- Audit logging for sensitive actions

## ADRs (Architecture Decision Records)
- Store ADRs under `docs/adr/`
- Each ADR: context, decision, alternatives, consequences
- Include entries for: stack selection, auth model, data model patterns

### Relevant ADRs
- `docs/adr/002-page-size-dropdown-standardization.md` — shared UI component for pagination size

### Shared UI Conventions
- Shared Page Size Dropdown component reference: `docs/setup.md`

## Release Notes
- Maintain `docs/release-notes/FINAL.md` for the final build
- Include versions, changes, known issues, mitigations

## Known Limitations & Backlog
- Document deferred items and recommended next steps

## Appendices
- Entity Index: list key TypeORM entities (Students, Enrollment, Invoice, Payment, LibraryItem, Loan)
- Migration Guidelines: naming conventions, up/down requirements
- Configuration Reference: environment variables and defaults
- Vite Production Config: tunings for bundle size and caching

## Document Maintenance
- Version this manual; update on each release
- Export PDF for distribution; keep Markdown as source of truth
