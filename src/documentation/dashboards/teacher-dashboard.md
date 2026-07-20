---
title: "Teacher Dashboard (Live Analytics)"
description: "Meaning of each metric shown on the Teacher dashboard and how it is computed."
roles: ["TEACHER", "ADMIN", "SUPERADMIN"]
category: "dashboards"
order: 3
tags: ["dashboard", "analytics", "teacher", "schedule"]
lastUpdated: "2026-07-10"
---

## What this dashboard is for

The Teacher Dashboard gives an at-a-glance view of the teacher’s timetable focus for today and quick access to class lists.

## Term scope

Schedule metrics are scoped to the selected term (academic year + semester). Today is determined using the server’s local weekday (e.g., `MONDAY`).

## Metrics

### Today’s next 3 classes

Shows up to 3 upcoming schedule entries for:
- the current teacher
- the selected term
- the current day of week
- start time >= current time

Each item includes a direct link to the class list route:
- `/schedules/:id/class-list`

### Total distinct students across teacher’s classes (term-scoped)

Counts distinct `enrollments.studentId` across sections that the teacher handles in the selected term and that are `ENROLLED`.

This is deduped: a student is counted once even if they appear in multiple schedules/sections.

