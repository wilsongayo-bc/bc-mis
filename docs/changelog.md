# Changelog – 2025-12-07

## Activity Logs (Admin-only)
- Added `ActivityLog` entity and table with migration.
- Implemented request logging middleware capturing create/update/delete only (POST/PUT/PATCH/DELETE), excluding GET.
- Sensitive fields scrubbed: `password`, `newPassword`, `oldPassword`, `token`, `accessToken`, `refreshToken`, `secret`.
- Admin-only API: `GET /api/activity-logs` with filters (`username`, `role`, `method`, `endpoint`, `statusCode`, `from`, `to`, `page`, `limit`). Returns `username` and `email` joined from `users`.
- Frontend page `/activity-logs` under Settings for `ADMIN`/`SUPERADMIN` with filters, pagination and a details modal.

## Authentication logging improvements
- For unauthenticated login/register requests, logger resolves the user using payload (`login`/`email`) so entries show correct `userId`/role when possible; falls back to the attempted `login` string.

## Sidebar visibility
- `STAFF` role now sees Dashboard and My Profile in sidebar.

## Branding
- Updated school logo setting to `/uploads/logo-bc-2.jpeg`.
- Increased login page logo size for clarity.

## Migration
- Added `1765091165000-CreateActivityLogsTable.ts` for `activity_logs` table and indexes.
- Run migrations locally via API: `POST /api/migrate` or rely on dev `synchronize: ON`.

## Verification (local)
- Start dev: `npm run dev`.
- Register/login as Admin, perform setting updates and user CRUD to generate logs.
- Fetch logs: `GET /api/activity-logs?limit=50`.
- UI: Navigate to Settings → Activity Logs.

## Deployment considerations
- Ensure production `.env` includes JWT and database creds; do not commit secrets.
- Run migrations on the production database before enabling the UI.
- Review CORS and `FRONTEND_URL` environment variables.

