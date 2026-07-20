# Administrator User Guide

## Overview
This guide provides administrators with step-by-step instructions to configure, operate, and maintain the MIS. It focuses on user management, RBAC, system settings, billing, reporting, audit, and notifications.

## Audience & Permissions
- Audience: System administrators and operations leads
- Access: Full administrative privileges with RBAC management rights

## Prerequisites
- Active admin account
- Current academic term configured
- Connectivity to database and email/SMS providers

## Getting Started
1. Sign in using your administrator credentials.
2. Open the Admin Dashboard.
3. Verify system status widgets (database, queues, email).

![Admin Dashboard](images/admin/dashboard-1.png)

## Core Tasks

### Manage Users and Roles
1. Navigate to `Administration > Users`.
2. Create a user: click `New User`, fill required fields, assign role.
3. Edit user: select user, click `Edit`, update details.
4. Deactivate user: toggle `Active` off.
5. Reset password: click the Key icon (Reset Password) and choose either `Reset to Default` or a `Custom Password`.
6. Bulk reset passwords: select multiple users, then use `Reset Passwords` in the bulk actions toolbar.
7. Assign roles: `Administration > Roles`, select role, add users.

Reference: [Admin Password Reset Guide](admin-password-reset-guide.md)

Reference: [User Self-Service Password Reset Guide](password-reset-user-guide.md)

![Users List](images/admin/users-list.png)

### Configure RBAC
1. Go to `Administration > Roles & Permissions`.
2. Create role: `New Role`, provide name and description.
3. Set permissions per module (e.g., Enrollment, Billing, Reports).
4. Save and review using `Role Preview`.
5. Audit changes in `Role Change Log`.

![Role Permissions](images/admin/rbac-permissions.png)

### System Settings
1. Navigate to `Administration > Settings`.
2. Academic term: set start/end dates, grading scales.
3. Fee schedules: define tuition, miscellaneous fees, discounts.
4. Grading schema: configure grade buckets and passing rules.
5. Notification templates: edit email/SMS templates.

![Settings](images/admin/settings.png)

### Enrollment Oversight
1. Open `Enrollment > Overview`.
2. Monitor pipeline: Applied → Admitted → Enrolled.
3. Resolve validation errors flagged on applications.
4. Export enrollment roster for registrar.

![Enrollment Overview](images/admin/enrollment-overview.png)

### Billing & Invoices
1. Go to `Finance > Invoices`.
2. Create invoice: select student, add line items, taxes, and discounts.
3. Approve invoice: review totals, click `Approve`.
4. Record payment: choose method, enter reference, save.
5. Issue refund/adjustment: open invoice, `Actions > Refund`.
6. Export PDF or send via email.

![Invoice](images/admin/invoice.png)

### Reporting & Analytics
1. Open `Reports`.
2. Apply filters (term, program, status) and generate reports.
3. Export to CSV/XLS/PDF.
4. Schedule recurring reports.

![Reports](images/admin/reports.png)

### Audits & Logs
1. Navigate to `Administration > Audit Logs`.
2. Filter by user, module, date.
3. Export logs for compliance.

### Notifications
1. Open `Communication > Templates`.
2. Edit templates with variables (e.g., {{student_name}}, {{invoice_number}}).
3. Send campaigns and review delivery status.

## Troubleshooting
- Cannot sign in: ensure account active; request password reset.
- Missing permissions: verify role assignments in RBAC.
- Email not sending: check provider credentials and queue status.
- Report empty: adjust filters and term selection.

## FAQs
- How do I temporarily suspend a user? Set `Active = off`.
- Can I clone roles? Use `Duplicate Role` in RBAC.

## Glossary
- RBAC: Role-Based Access Control
- Roster: List of enrolled students for a term

## Security Notes
- Never share passwords or export logs containing PII to public channels.
- Secrets must be stored in environment files, not in documentation.

## Documentation Links
- Shared Page Size Dropdown: `docs/setup.md`
- ADR 002 — Page Size Dropdown Standardization: `docs/adr/002-page-size-dropdown-standardization.md`
- Project README (UI Consistency section): `README.md`
