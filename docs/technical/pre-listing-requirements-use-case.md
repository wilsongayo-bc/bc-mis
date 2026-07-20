# Pre-Listing Requirements – Snapshot Model and Database Catalog

This document explains how the Pre-Listing initial requirements are defined, displayed, saved, and how they relate to the `document_requirements` table.

## Overview

- Pre-Listing requirements are grouped by applicant type: `freshmen`, `grade12`, `als`, `transferee`.
- The UI and API use a static list to enforce grouping and required/optional flags.
- When a student submits the Pre-Listing form, the current requirements are copied into the student record as a JSON “snapshot”.
- The `document_requirements` table is a catalog for general use; it is not directly referenced by the Pre-Listing snapshot.

## Key Code Paths

- Static requirements source: `api/utils/documentRequirements.ts` (function `getPublicPreListingRequirements`)  
  - Relevant lines: `api/utils/documentRequirements.ts:130-178`
- Public API endpoints:
  - Fetch requirements: `api/routes/public-prelisting.ts:102-117`
  - Create pre-listing: `api/routes/public-prelisting.ts:119-238`  
    - Applies snapshot to `students.documentsRequired`
  - Upload screenshot to a requirement: `api/routes/public-prelisting.ts:253-386`
  - Fetch pre-listing details: `api/routes/public-prelisting.ts:389-420`
- Frontend form: `src/pages/PublicPreListing.tsx`  
  - Requirements fallback and groups: `src/pages/PublicPreListing.tsx:68-111`, `src/pages/PublicPreListing.tsx:346-364`  
  - Validation honors `required`: `src/pages/PublicPreListing.tsx:325-336`

## Data Model

- Student-side snapshot (JSON):
  - `students.documentsRequired` – array of requirement objects  
  - `students.documentsSubmitted` – array of submitted requirement objects with `fileUrl`, `fileName`, etc.
  - Type reference: `api/entities/Student.ts:26-39`
- Catalog table:
  - `document_requirements` – master catalog for document types  
  - Entity: `api/entities/DocumentRequirement.ts:13-62`

## Why a Snapshot?

- Historical integrity: Records preserve the exact requirement set in effect at submission time.
- Grouping logic: Current DB schema does not include grouping metadata used by Pre-Listing.
- Flexibility: Business rules can change without retroactively altering prior records.

## Current Business Rules Implemented

- Freshmen: First Sem Report Card (S.Y. 2025–2026) + CoE Second Sem (S.Y. 2025–2026) – both required.
- Grade 12 graduates: Complete Grade 12 Report Card – required.
- ALS passers: SHS A&E Test COR – required.
- Transferees/Returning: TOR/Informative Copy – required; Transfer Credential/Honorable Dismissal – optional.

These rules are enforced in:
- API requirements source: `api/utils/documentRequirements.ts`  
- Frontend validation: `src/pages/PublicPreListing.tsx` via `required` flags.

## Database Catalog Sync

Although Pre-Listing uses the snapshot model, we maintain parity in the catalog:

- Script: `api/scripts/add-prelisting-requirements.ts`  
  - Adds/updates the master catalog (`document_requirements`) with entries matching the Pre-Listing rules.
  - Run locally: `npx ts-node api/scripts/add-prelisting-requirements.ts`

## Operational Notes

- Changing requirements:
  1. Update `api/utils/documentRequirements.ts` to adjust groups and `required` flags.
  2. If needed, update the fallback list in `src/pages/PublicPreListing.tsx`.
  3. Run the catalog sync script to reflect changes in `document_requirements`.
- Storage for uploads:
  - Uses Vercel Blob or Cloudflare R2 when configured; otherwise saves to local `/uploads/prelisting`  
    - See `api/routes/public-prelisting.ts:300-338`
- CAPTCHA protection:
  - Cloudflare Turnstile integration is supported when configured in env  
    - See `api/routes/public-prelisting.ts:69-100` and `src/pages/PublicPreListing.tsx:113-135`

## Future Refactor (Optional)

- Add grouping and visibility metadata to `document_requirements`.
- Link snapshots to catalog IDs via `students.documentsRequired[].studentDocumentId` or explicit FK in a `student_documents` bridge.
- Provide versioned requirement sets to track policy changes over time.

## Quick Verification Queries (MySQL)

- View student snapshot columns:
  - `SELECT id, documentsRequired, documentsSubmitted FROM students ORDER BY created_at DESC LIMIT 10;`
- View catalog entries:
  - `SELECT id, name, is_required, is_initial FROM document_requirements ORDER BY created_at DESC;`

