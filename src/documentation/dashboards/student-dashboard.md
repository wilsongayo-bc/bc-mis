---
title: "Student Dashboard (Live Analytics)"
description: "Meaning of each metric shown on the Student dashboard and how it is computed."
roles: ["STUDENT", "ADMIN", "SUPERADMIN"]
category: "dashboards"
order: 4
tags: ["dashboard", "analytics", "student", "enrollment", "payments"]
lastUpdated: "2026-07-10"
---

## What this dashboard is for

The Student Dashboard highlights the student’s current enrollment standing, basic financial summary, schedule snapshot, and account alerts.

## Term scope

Enrollment and schedule metrics are scoped to the selected term (academic year + semester).

## Metrics

### Current enrollment status (term-scoped)

Shows the latest enrollment record for the student in the selected term.

### Payment summary (term-scoped)

Uses enrollment fields:
- `totalAssessed`
- `totalPaid`
- `balance`
- `downpaymentRequired`
- `downpaymentMet`

### Today schedule summary

Shows:
- count of today’s classes
- next class today (if any)

This is derived from the student’s ENROLLED course sections in the selected term.

### Alerts

Account reminders:
- `mustChangePassword` → you must update your password before continuing
- `emailNotVerified` → email verification is pending

