# Librarian User Guide

## Overview
This guide explains catalog management, loans/returns, fines, reservations, and reporting.

## Audience & Permissions
- Audience: Librarians and library assistants
- Access: Library module with inventory and loan controls

## Prerequisites
- Active librarian account
- Barcode/ISBN tools available

## Getting Started
1. Sign in and open `Library System`.
2. Verify catalog and loan queues.

![Library Dashboard](images/library/dashboard.png)

## Core Tasks

### Catalog Management
1. Navigate to `Catalog`.
2. Add item: enter title, author, ISBN, category, and copies.
3. Edit item: update metadata and availability.
4. Archive item: mark as inactive.

![Catalog](images/library/catalog.png)

### Loans & Returns
1. Open `Loans`.
2. Checkout: scan student/teacher ID and book barcode; confirm due date.
3. Return: scan barcode; confirm condition.
4. Renew: extend due date per policy.

![Loans](images/library/loans.png)

### Fines & Payments
1. Auto-calculated fines appear for overdue items.
2. Record fine payment and issue receipt.
3. Waive fines with approval.

### Reservations & Holds
1. Search item and click `Place Hold`.
2. Notify user upon availability.

### Reports
1. Navigate to `Reports > Overdue/Inventory`.
2. Filter by category and date.
3. Export CSV/PDF.

## Troubleshooting
- Barcode not scanning: check device and re-enter manually.
- Duplicate catalog entry: use `Merge Records`.

## FAQs
- Can I import catalog? Use `Import MARC/CSV` when enabled.

## Security Notes
- Handle patron data per privacy policy; avoid exporting PII.

## Documentation Links
- Shared Page Size Dropdown: `docs/setup.md`
- ADR 002 — Page Size Dropdown Standardization: `docs/adr/002-page-size-dropdown-standardization.md`
- Project README (UI Consistency section): `README.md`
