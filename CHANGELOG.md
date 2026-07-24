# Changelog

All notable changes to the Benedict College Management Information System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-07-23] - BSIT Schedule Seed (SY 2026-2027, 1st Semester)

### Summary
- Added a repeatable seed script to import BSIT (1st–4th year) paper schedules into the database for SY 2026-2027, 1st Semester.

### Backend (API)
- Added an idempotent BSIT schedule seeder script and a structured dataset source file.
- Seeder ensures: active academic year, semester settings, placeholder teacher (User + Employee), BSIT course sections, subjects, and schedules.
- Added `npm run seed:bsit-schedules:2026` to run the import locally.

### Verification
- `api`: `npm run migrate`
- `api`: `npm run seed:bsit-schedules:2026`
- `GET /api/schedules?semester=First%20Semester&academicYear=2026-2027`

## [2026-07-23] - Schedules Year Level Filter

### Summary
- Added a Year Level filter to the Schedule Management page to quickly view schedules for a specific year level (e.g., all First Year).

### Frontend
- Added a `Year Level` dropdown filter on the Schedules page that sends `yearLevel` to the API.

### Verification
- `npm run check`

## [2026-07-23] - Schedule Report Print Layout + Signatories

### Summary
- Updated the schedule report PDF preview/output to match the paper-style schedule format.
- Added selectable employee signatories for Endorsed By / Approved By in the print modal.

### Frontend
- Updated schedule report generator layout (header, simplified table columns, total units row, and signature block).
- Print modal now loads employees and allows selecting Endorsed By / Approved By from employee records.

### Verification
- `npm run check`

## [2026-07-23] - Production Course Management Fix (API Base Path)

### Summary
- Fixed production-only 404 errors on Course Management caused by API requests hitting `/courses` instead of `/api/courses` depending on environment base URL configuration.

### Frontend
- Added a request-time guard that prefixes `/api` when the configured base URL does not already point to the API path.

### Verification
- `npm run check`

## [2026-07-23] - Production Schedule Print Report Fix (Filtering)

### Summary
- Fixed production-only "No schedules found" in Schedule Report Preview/Generate by making the schedules API filter resilient when some schedules are missing `courseSection` linkage.

### Backend
- Updated `GET /api/schedules` filtering for `courseId` and `yearLevel` to match either `courseSection.*` or `subject.*` fields (fallback path for older data).

### Verification
- `npm run check`

## [2026-07-23] - Subject Year Level Normalization (First Year saved as 13)

### Summary
- Fixed Subject Year Level values being stored as `13` (etc.) when selecting "First Year" in the Subject edit form.

### Frontend
- Updated Subject Form year level dropdown to store college year levels as `1–4` for First–Fourth Year.

### Backend (API)
- Normalized incoming subject `yearLevel` values (`13–16` → `1–4`) on create/update to prevent inconsistent data.

### Ops
- Added `api`: `npm run fix:subjects:college-yearlevel` to bulk-fix existing subjects (`13–16` → `1–4`).

### Verification
- `npm run check`

## [2026-07-23] - Production Logo Upload Fix (Vercel + Render)

### Summary
- Fixed school logo rendering/upload issues that only happened on the live Vercel frontend while working locally.

### Frontend
- Normalized `/uploads/...` logo URLs to resolve against the configured API origin in production.
- Ensured Settings page preview uses the same normalized logo URL logic.

### Backend (API)
- Made `/uploads` static file serving and logo upload filesystem paths robust when the API runs from the `api/` working directory (Render).
- Fixed local-file deletion logic for old logos by correctly mapping `/uploads/...` URL paths to the real uploads directory.

### Verification
- `npm run check`
- `npm run build:api`

## [2026-07-22] - Render API + Vercel Frontend Deployment

### Deployment
- API deployed as a standalone service on Render from `api/`.
- Frontend deployed on Vercel.

### Backend (API)
- Resolved Render build failures caused by out-of-sync lockfile and missing peer deps (added `openapi-types`).
- Added missing AWS SDK deps in `api/package.json` required by S3/R2 routes (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- Updated CORS behavior to allow production browser access from the Vercel frontend using `ALLOWED_ORIGINS` and `FRONTEND_URL`.

### Frontend
- Resolved Vercel install failure due to unused/mismatched NestJS dependencies at repo root by removing unused `@nestjs/*` packages.

### Ops Notes
- If Render redeploy fails during `puppeteer` install due to a broken cache, set `PUPPETEER_CACHE_DIR=/tmp/puppeteer` and redeploy with a cleared build cache.

## Update Template (copy/paste)

## [YYYY-MM-DD] - Short Title

### Summary
- 

### Frontend
- 

### Backend (API)
- 

### Database / Migrations
- 

### Deployment / Ops
- 

### Verification
- 

## [1.0.0] - 2025-01-XX

### 🎉 Initial Release
- Complete management information system for Benedict College
- Full-stack application with React frontend and Node.js backend
- Comprehensive academic and administrative management features

## [2026-02-09] - Sync & Database Improvements

### ✨ New Features

#### Remote Synchronization
- **Smart Data Sync**: Implemented `smart_dump_schedules.ts` to map local data to remote entity IDs (Employees, Subjects, Courses) without inserting test data.
- **Offline Mapping**: Added fallback support to use `remote_mapping.json` when direct remote connection is blocked.

#### Database Management
- **Safe Updates**: Refined manual update scripts to prevent errors with existing columns and indexes.
- **Data Dump Utilities**: Added `generate_dump.ts` for batch processing and foreign key handling.

## [2026-02-08] - Schedule Reports & Fixes

### ✨ New Features

#### Schedule Reports
- **Dynamic School Information**: Integrated system settings to dynamically populate the school name, address, logo, and email in PDF reports.
- **Automated Signatories**: Implemented logic to auto-fetch "Prepared By" (Program Head) and "Approved By" (College President) based on user positions.
- **Smart Logo Handling**: Added automatic format detection (PNG/JPEG) and rendering for school logos.
- **Email Integration**: Added clickable email addresses to the report header.

### 🐛 Bug Fixes

#### Reporting & Data
- **Block 1 Visibility**: Resolved an issue where Block 1 schedules were excluded from reports due to database inconsistencies.
- **Data Standardization**: Created migration `1770560500000-FixScheduleSemesterValues` to standardize semester values ("FIRST" → "First Semester") across the database.

## [Unreleased] - 2026-02-03

### ✨ New Features

#### Admin Section Management
- **Centralized Management Module**: Added a dedicated "Sections" page under Settings for Admins to manage all course sections in one place.
- **Enhanced Status Control**: Implemented an "Activate/Deactivate" toggle with smart validation.
  - **Validation**: Prevents deactivation or deletion if the section has active enrollments or schedules.
  - **Safe Deletion**: "Delete" button now performs a permanent delete only if the section has no history; otherwise, it prompts for deactivation.
- **Filtering**: Sections list can be filtered by status (Active/Inactive) and searched by name or course.

#### Schedule Management
- **Multi-Day Selection**: Replaced single-select dropdown with multi-select checkboxes for "Day of the Week" in Schedule Details.
- **Date Range Support**: Added `startDate` and `endDate` fields to Schedules to track class duration.
- **Enhanced Visibility**: Displayed start and end dates in Schedules list (desktop & mobile) and Schedule Details view.

#### Timetable System
- **Date Range View**: Added a new "View Mode" toggle (Week/Date Range) to filter schedules by custom date ranges.
- **Smart Grid Sync**: Implemented logic to anchor the Timetable grid to the start week of the selected date range.

### 🔧 Technical Improvements
- **Database Schema**: Updated `schedules` table to support comma-separated day strings and nullable date fields.
- **Conflict Detection**: Enhanced validation logic to handle multi-day overlap and date range conflicts.
- **Frontend State**: Updated Redux slices and TypeScript interfaces to support new schedule fields.

## [2026-02-02] - Yesterday's Updates

### ✨ New Features

#### Subject Management
- **Course Integration**: Replaced Department selection with Course selection in Subject forms.
- **Year Level**: Added Year Level field to Subjects for better academic tracking.
- **Schema Update**: Added `courseId` and `yearLevel` columns to `subjects` table.

#### Employee Management
- **Full Module Implementation**: Launched comprehensive Employee Management system.
  - **Employee List**: Searchable and filterable list of all employees.
  - **Employee Details**: Detailed view of employee profiles.
  - **Management Forms**: Add and Edit forms for employee data.
- **API & State**: Implemented dedicated API routes and Redux slice for efficient data handling.

### 🔧 Technical Improvements
- **Course Sections**: Updated `CourseSectionForm` for better usability.
- **Navigation**: Added Employee Management links to Sidebar and App routing.

## [Unreleased] - Recent Updates

### 🐛 Bug Fixes

#### Pre-Listing & Document Management (New)
- **Fixed Race Condition in Pre-Listing Uploads**
  - Implemented database transactions with pessimistic locking to prevent data loss when multiple documents are uploaded simultaneously.
  - Ensured `documentsSubmitted` JSON array is updated atomically.
- **Fixed Initial Requirements Visibility**
  - Updated backend merge logic to include documents from the JSON column (`documentsSubmitted`), ensuring pre-listing uploads are visible to admins.
- **Fixed File URL Generation**
  - Added `getFullFileUrl` helper in frontend to correctly resolve relative paths to absolute URLs for document previews.

#### Code Quality & Type Safety Improvements
- **Fixed 28 npm lint errors** across the entire codebase
  - Resolved TypeScript type errors by replacing `any` types with proper type definitions
  - Removed unused variables and imports throughout the application
  - Fixed ESLint rule violations for better code consistency
  - Added missing import statements and interface definitions

#### TypeScript Compilation Fixes
- **Fixed npm run check errors** - Resolved all TypeScript compilation issues
  - Fixed type mismatches in `UserProfile.tsx` for `role`, `createdAt`, and `updatedAt` properties
  - Added proper type casting for user role enums
  - Converted Date objects to ISO strings where required
  - Enhanced type safety across all components

#### Runtime Error Fixes
- **Fixed UserProfile.tsx runtime error** - Resolved `toISOString is not a function` error
  - Added proper type checking for date handling in user profiles
  - Implemented conditional logic to handle both string and Date types
  - Fixed error when viewing user profiles from the users list page
  - Enhanced error handling for date/time operations

#### Authentication & Error Handling
- **Improved login error handling** with user-friendly messages
  - Enhanced error message display for authentication failures
  - Added proper error state management in Redux store
  - Improved user experience with clear, actionable error messages
  - Fixed error handling for network connectivity issues

### ✨ New Features

#### Student Details (New)
- **Initial Requirements View**
  - Added a dedicated section in the Student Details page for "Initial Requirements".
  - Displays status of pre-registration documents (Pending/Submitted).
- **Document Preview Modal**
  - Implemented a modal to preview uploaded screenshots and images directly in the browser.
  - Added support for PDF embedding within the modal.
  - Included fallback download links for all files.

#### Pre-Listing Notifications (New)
- **Email Notification System**
  - Integrated `nodemailer` for automated email alerts.
  - **Student Confirmation:** Automatic email sent to students upon successful pre-listing submission.
  - **Admin Notification:** Automatic email sent to admins when a new pre-listing is received.
  - Configurable via standard SMTP environment variables.

### 🔧 Technical Improvements

#### Enhanced Type Safety
- **Comprehensive type safety enhancements** across the codebase
  - Created `ApiError` interface for consistent error handling
  - Replaced all `any` types with proper TypeScript interfaces
  - Added type assertions where necessary for external API responses
  - Improved type definitions for user profiles and authentication

#### Code Quality
- **Improved code consistency** and maintainability
  - Standardized error handling patterns across components
  - Enhanced Redux slice implementations with proper typing
  - Improved component prop types and interface definitions
  - Added comprehensive JSDoc comments for better documentation

#### Development Experience
- **Enhanced development workflow**
  - Fixed all linting errors for smoother development
  - Improved TypeScript compilation for faster builds
  - Enhanced error reporting and debugging capabilities
  - Better IDE support with improved type definitions

### 📚 Documentation Updates

#### Project Documentation
- **Updated README.md** with comprehensive project information
  - Replaced generic Vite template with Benedict College MIS-specific documentation
  - Added detailed feature descriptions and tech stack information
  - Included setup instructions and development guidelines
  - Added troubleshooting section for common issues

#### Technical Documentation
- **Enhanced development documentation**
  - Added detailed API documentation structure
  - Included deployment instructions and configuration guides
  - Added troubleshooting guides for common development issues
  - Improved code organization and project structure documentation

### 🛠️ Infrastructure & Configuration

#### Build & Development
- **Improved build process** and development setup
  - Enhanced Vite configuration for better development experience
  - Improved TypeScript configuration for stricter type checking
  - Better ESLint and Prettier integration
  - Optimized development server performance

#### Database & API
- **Enhanced database operations** and API reliability
  - Improved error handling in database operations
  - Better type safety for database entities
  - Enhanced API response handling and error management
  - Improved connection handling and retry logic
