# ADR 001: Admin Activity Log Module

## Context
Administrators need visibility over privileged changes across the system (settings updates, user management, etc.). Logging should avoid capturing sensitive secrets and keep read-only noise low.

## Decision
- Create an `ActivityLog` entity/table and an Express middleware that records metadata for write operations (POST/PUT/PATCH/DELETE) across protected routes.
- Scrub sensitive fields before persistence.
- Provide an Admin-only API and UI with filters, pagination, and per-log details.
- Resolve login/register identities based on request payload to avoid anonymous entries.

## Status
Accepted – implemented 2025-12-07.

## Consequences
- Low overhead and consistent audit trail for privileged changes.
- Reduced noise by excluding GET requests.
- Exposure of usernames in logs improves traceability; scrubbing mitigates secret leakage risk.

## Implementation References
- Entity: `api/entities/ActivityLog.ts`
- Middleware: `api/middleware/activityLog.ts`
- API: `api/routes/activity-logs.ts`
- Migration: `api/migrations/1765091165000-CreateActivityLogsTable.ts`
- Frontend: `src/pages/ActivityLogs.tsx`, `src/services/activityLogService.ts`, `src/components/Sidebar.tsx`, `src/App.tsx`

