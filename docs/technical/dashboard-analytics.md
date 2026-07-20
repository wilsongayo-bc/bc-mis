# Dashboard Analytics (Live)

This document describes the live role dashboards and the backend analytics endpoints they use.

## Endpoints

All endpoints require a valid JWT access token and enforce RBAC server-side.

- `GET /api/analytics/admin-dashboard`
- `GET /api/analytics/registrar-dashboard`
- `GET /api/analytics/teacher-dashboard`
- `GET /api/analytics/student-dashboard`

### Query Parameters

All endpoints accept optional term-scoping query parameters:

- `academicYear` (example: `2025-2026`)
- `semester` (accepted values: `First Semester`, `Second Semester`, `Summer`; also supports `1`, `2`, `3` and `first`, `second`)

If omitted:
- `academicYear` defaults to the active year from `academic_years.isActive=true` (fallback: `2024-2025`).
- `semester` defaults to `settings.key='semester'` (fallback: `First Semester`).

## Response Envelope

All endpoints return a stable, versionable shape:

```json
{
  "success": true,
  "meta": {
    "version": 1,
    "generatedAt": "2026-07-10T00:00:00.000Z",
    "academicYear": "2025-2026",
    "semester": "First Semester"
  },
  "data": {}
}
```

## Role Dashboards

### Admin / Superadmin

Metrics:
- Active users by role
- New users (last 7d / last 30d)
- Enrollment counts by status for the selected term
- Payments totals (today / 7d / 30d)
- Top 5 activity modules (from `activity_logs`, last 30d)

### Registrar

Metrics:
- Enrollment pipeline counts by status for the selected term
- Pending/unverified student documents (from `student_documents` status `pending` + `submitted`)
- Section utilization for the selected term (enrolled count vs `course_sections.maxStudents`)
- Scheduling readiness: course sections with ENROLLED students but no active schedules for the selected term

### Teacher

Metrics:
- Today’s next 3 classes (term-scoped)
- Distinct student count across the teacher’s classes (term-scoped; deduped by `studentId`)
- Quick links to class lists (`/schedules/:id/class-list`)

### Student

Metrics:
- Current enrollment status for the selected term
- Payment summary from enrollment fields (`totalAssessed`, `totalPaid`, `balance`, `downpaymentRequired`, `downpaymentMet`)
- Today schedule summary (count) and next class (if available)
- Alerts: `mustChangePassword`, `emailNotVerified`

## Performance Notes

- Queries are designed to be aggregate-first (counts/sums) and to limit top lists.
- Each endpoint uses a small in-memory TTL cache (15s–30s) to reduce load on repeated dashboard refreshes.

