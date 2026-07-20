---
title: "Admin Dashboard (Live Analytics)"
description: "Meaning of each metric shown on the Admin/Superadmin dashboard and how it is computed."
roles: ["ADMIN", "SUPERADMIN"]
category: "dashboards"
order: 1
tags: ["dashboard", "analytics", "admin"]
lastUpdated: "2026-07-10"
---

## What this dashboard is for

The Admin Dashboard is a high-level operational overview for the current term. It is designed to answer:
- How many users are active by role?
- What is the enrollment pipeline volume for this term?
- How much has been collected in payments recently?
- Which modules are being used the most?

## Term scope

Unless overridden, metrics are scoped to the current academic year and semester.

## Metrics

### Active users by role

Counts active accounts (`users.isActive=true`) grouped by `users.role`.

### New users (last 7d / 30d)

Counts users created within the last 7 days and last 30 days (`users.createdAt`).

### Enrollment counts by status (term-scoped)

Counts enrollments grouped by `enrollments.status` for the selected term (`enrollments.academicYear`, `enrollments.semester`).

Statuses:
- `PENDING` → enrollment submitted / started
- `VERIFIED` → verified by registrar
- `ENROLLED` → officially enrolled (FOR SCHEDULING)
- `COMPLETED`, `DROPPED`, `FAILED` → terminal outcomes when applicable

### Payments totals (today / 7d / 30d)

Sums amounts for paid payments (`payments.status='PAID'`) using `payments.paidDate`:
- Today → `paidDate = today`
- 7d/30d → `paidDate >= today - N days`

### Top activity modules (last 30d)

Uses `activity_logs.endpoint` to derive the API module segment (e.g., `/api/enrollments/...` → `enrollments`) and counts occurrences in the last 30 days.

