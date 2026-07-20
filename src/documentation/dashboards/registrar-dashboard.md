---
title: "Registrar Dashboard (Live Analytics)"
description: "Meaning of each metric shown on the Registrar dashboard and how it is computed."
roles: ["REGISTRAR", "ADMIN", "SUPERADMIN"]
category: "dashboards"
order: 2
tags: ["dashboard", "analytics", "registrar", "enrollment"]
lastUpdated: "2026-07-10"
---

## What this dashboard is for

The Registrar Dashboard focuses on enrollment flow, document backlog, and scheduling readiness for the current term.

## Term scope

Unless overridden, enrollment and section metrics are scoped to the current academic year and semester.

## Metrics

### Enrollment pipeline counts (term-scoped)

Counts enrollments grouped by `enrollments.status` for the selected term.

Key statuses:
- `PENDING` → in-progress / awaiting verification
- `VERIFIED` → verified by registrar but not yet fully enrolled
- `ENROLLED` → FOR SCHEDULING / officially enrolled

### Pending / unverified student documents

Counts `student_documents` by status:
- `pending`
- `submitted`

This is a queue indicator for documents that still need review or verification.

### Section utilization (term-scoped)

For active course sections in the selected term (`course_sections.isActive=true`), this shows:
- enrolled student count (ENROLLED status)
- maximum capacity (`course_sections.maxStudents`)

### Scheduling readiness (term-scoped)

Lists sections that:
- have at least 1 `ENROLLED` enrollment in the selected term, and
- have no active schedules (`schedules.isActive=true`) for the same term.

These sections are blocked for scheduling/timetable completeness until schedules are created.

