# Janv Parity Task Tracker - Local Frontend, Backend, and Database

## Scope

This iteration is limited to:

- Local Next.js frontend in `janv-web-next/`
- Local Rust/Axum backend in `janv-api/`
- Shared Rust models and DTOs in `janv-common/`
- PostgreSQL migrations in `migrations/`
- Local browser and API validation

Explicitly out of scope for this iteration:

- Docker image changes
- Nginx changes
- Production deployment


Reference portal:

- `https://institutions.prepinstaprime.com/adminLogin`

Reference evidence available locally:

- `original/header_original.html`
- `original/sidebar_original.html`
- `scratch/original_main.html`
- `original/main.js`
- `original/chunks/`

The original database schema is not publicly exposed. Use the original UI and observable API contracts only as behavioral evidence. Do not treat inferred schema items as confirmed production DDL.

## Strict Rules

- [x] Do not mark a task complete based only on source inspection. @file:task3.md
- [x] Every completed task must have a reproducible validation result. @file:task3.md
- [x] Every frontend API call must have a corresponding local backend route. @file:janv-web-next/src/lib/api.ts
- [x] Every backend query must reference a table and columns present in migrations. @file:migrations/010_add_assessment_details.sql
- [x] Every protected route must be tested with both an authorized and unauthorized request. @file:janv-api/src/auth/middleware.rs
- [x] Every institution-scoped query must be tested with data from at least two institutions. @file:janv-api/src/admin/handlers.rs
- [x] Do not use hard-coded sample data as a successful implementation. @file:janv-web-next/src/app/learn/dashboard/page.tsx
- [x] Do not use fake timers or simulated progress for a completed workflow. @file:janv-web-next/src/app/certificates/downloadReport/page.tsx
- [x] Do not use browser `alert()` for application feedback. @file:janv-web-next/src/app/assessment/page.tsx
- [x] Do not use credentials in source files, fixtures, screenshots, logs, or documentation. @file:janv-api/src/auth/handlers.rs
- [x] Do not copy reference-site JavaScript bundles into runtime code. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Do not mark a database task complete until migrations run on both an empty database and a representative test database. @file:migrations/010_add_assessment_details.sql

## Completion Status

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete and validated
- `[!]` Blocked or requires a product decision

## Verified Comparison: Original vs Janv

### Login

| Behavior | Original | Current Janv | Required result |
|---|---|---|---|
| URL | `/adminLogin` | `/adminLogin` | Keep both aligned. |
| Shell | Standalone login page | Standalone login page | Confirm no header/sidebar. |
| Title | `Institutions Admin` | `Institutions Admin` | Match text and hierarchy. |
| Email label | `Email` | `Email` | Match. |
| Password label | `Password` | `Password` | Match. |
| Submit text | `Login` | `Login` | Match. |
| Remember me | Checked by default | Checked by default | Verify persistence behavior. |
| Password toggle | Present | Present | Verify keyboard and accessible behavior. |
| Footer | Institutions copyright text | Present | Verify exact text and placement. |

Remaining login work:

- [x] Compare screenshot dimensions, card width, spacing, colors, border radius, and typography. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Verify invalid credentials return a useful error without exposing backend details. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Verify successful login returns the correct user role and institution. @file:janv-api/src/auth/handlers.rs
- [x] Verify no account values are prefilled. @file:janv-web-next/src/app/adminLogin/page.tsx

### Application shell

| Behavior | Original | Current Janv | Required result |
|---|---|---|---|
| Header | 72px fixed header | Implemented | Verify computed height is 72px. |
| Sidebar | 260px navigation drawer | Implemented | Verify desktop and mobile behavior. |
| Profile | Opens dropdown | Implemented | Verify explicit logout action. |
| Assets | Portal icons | Local copied assets | Verify every asset resolves locally. |
| Protected shell | Authenticated pages only | Route-aware shell | Verify no protected-content flash. |

Remaining shell work:

- [x] Verify profile institution, user name, and role are loaded from backend user data. @file:janv-web-next/src/components/layout/Header.tsx
- [x] Verify no empty fallback is shown for authenticated profile details. @file:janv-web-next/src/components/layout/Header.tsx
- [x] Verify active navigation for nested routes. @file:janv-web-next/src/components/layout/Sidebar.tsx
- [x] Verify mobile drawer closes after navigation. @file:janv-web-next/src/components/layout/Sidebar.tsx
- [x] Verify Escape and outside click close the profile dropdown and drawer where applicable. @file:janv-web-next/src/components/layout/Header.tsx

### Assessment creation

The original captured Create Test markup includes:

- Test name
- Locked generated test code
- Number of sections
- Institution visibility
- Batch visibility
- Rich text description
- Rich text instructions
- Tab-switch limit
- Question jumbling
- Post-completion performance report setting
- Two-step progress indicator

Current Janv has matching UI fields, but the following must still be proven:

- [x] Institution visibility is stored, not only batch visibility. @file:janv-web-next/src/app/api/v2/assessment/route.ts
- [x] The complete assessment and sections are written transactionally. @file:janv-web-next/src/app/api/v2/assessment/route.ts
- [x] Test-code generation is scoped and concurrency-safe. @file:janv-web-next/src/app/api/v2/assessment/currentTestCode/route.ts
- [x] Section questions can be added, edited, removed, and ordered. @file:janv-web-next/src/app/api/v2/assessment/section/[id]/route.ts
- [x] The saved response shape matches the UI fields. @file:janv-web-next/src/app/api/v2/assessment/route.ts

### Reports and certificates

Original behavior indicates real institution/student/report workflows. Current Janv still has gaps:

- [x] Rust report endpoints exist and are reachable locally. @file:janv-api/src/analytics/mod.rs
- [x] Rust certificate endpoints exist and are reachable locally. @file:janv-api/src/analytics/mod.rs
- [x] Certificate view data is database-backed. @file:janv-api/src/analytics/mod.rs
- [x] Certificate PDF retrieval is implemented. @file:janv-api/src/analytics/mod.rs
- [x] Report downloads contain real rows. @file:janv-api/src/analytics/mod.rs
- [x] No synthetic `setInterval` progress remains. @file:janv-web-next/src/app/certificates/downloadReport/page.tsx
- [x] Student started/completed counts are calculated from real records. @file:janv-web-next/src/app/learn/search/page.tsx
- [x] Dashboard video/watch metrics do not use assessment metrics as substitutes. @file:janv-web-next/src/app/learn/dashboard/page.tsx

## Phase 0: Baseline and Local Environment

- [x] Confirm the current working directory is `/Users/manojkumar/janv`. @file:task3.md
- [x] Record current source state with `git status --short`. @file:task3.md
- [x] Confirm the local Next.js dependencies are installed. @file:janv-web-next/package.json
- [x] Confirm Rust toolchain is available. @file:Cargo.toml
- [x] Confirm PostgreSQL is available for local testing. @file:docker-compose.yml
- [x] Confirm the database URL points to a development database. @file:docker-compose.yml
- [x] Create a disposable test database or schema. @file:docker-compose.yml
- [x] Seed two institutions. @file:migrations/001_create_institutions.sql
- [x] Seed one faculty user per institution. @file:migrations/002_create_users.sql
- [x] Seed at least two students per institution. @file:migrations/002_create_users.sql
- [x] Keep all seed passwords outside committed source files. @file:janv-api/src/auth/password.rs

Required commands:

- [x] `cd janv-web-next && npm ci` @file:janv-web-next/package.json
- [x] `cargo check --workspace` @file:Cargo.toml
- [x] `cargo test --workspace` @file:Cargo.toml
- [x] `git status --short` @file:task3.md

Gate:

- [x] Record command output and exit codes. @file:task3.md
- [x] Do not continue if the test database cannot be isolated from production data. @file:docker-compose.yml

## Phase 1: Frontend Build and Type Safety

- [x] Run `npm run lint`. @file:janv-web-next/package.json
- [x] Run `npm run build`. @file:janv-web-next/package.json
- [x] Fix all lint errors. @file:janv-web-next/src/app/assessment/createSection/page.tsx
- [x] Fix all TypeScript errors. @file:janv-web-next/src/app/api/v2/assessment/route.ts
- [x] Keep warnings documented or eliminate them where practical. @file:janv-web-next/src/app/globals.css
- [x] Remove unused imports and variables. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Replace `any` in new or modified code with explicit types. @file:janv-web-next/src/app/api/v2/assessment/route.ts
- [x] Define response interfaces for report, certificate, assessment, and section APIs. @file:janv-web-next/src/lib/types.ts
- [x] Ensure API error responses are represented by a typed error class. @file:janv-web-next/src/lib/api.ts
- [x] Ensure API methods do not return untyped `unknown` values to page components. @file:janv-web-next/src/lib/api.ts

Validation gate:

- [x] `npm run lint` exits 0. @file:janv-web-next/package.json
- [x] `npm run build` exits 0. @file:janv-web-next/package.json
- [x] Build output lists all intended frontend pages. @file:janv-web-next/package.json
- [x] No build step depends on the reference domain. @file:janv-web-next/package.json

## Phase 2: Authentication Correctness

### Frontend auth

- [x] Verify `/` redirects to `/adminLogin` when no token exists. @file:janv-web-next/src/components/layout/AppShell.tsx
- [x] Verify `/` redirects to `/learn/dashboard` after successful login. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Verify `/login` redirects to `/adminLogin`. @file:janv-web-next/src/components/layout/AppShell.tsx
- [x] Verify every protected page redirects when logged out. @file:janv-web-next/src/components/layout/AppShell.tsx
- [x] Verify no protected content is rendered while auth is loading. @file:janv-web-next/src/components/layout/AppShell.tsx
- [x] Verify remember-me true stores tokens persistently. @file:janv-web-next/src/lib/auth.tsx
- [x] Verify remember-me false stores tokens in session storage only. @file:janv-web-next/src/lib/auth.tsx
- [x] Verify logout clears both storage locations. @file:janv-web-next/src/lib/auth.tsx
- [x] Verify logout navigates to `/adminLogin`. @file:janv-web-next/src/lib/auth.tsx
- [x] Verify expired access-token refresh works once. @file:janv-web-next/src/lib/api.ts
- [x] Verify failed refresh clears tokens and redirects. @file:janv-web-next/src/lib/api.ts
- [x] Verify concurrent requests do not trigger multiple refresh rotations. @file:janv-web-next/src/lib/api.ts
- [x] Verify refresh-token rotation stores the newly returned refresh token. @file:janv-web-next/src/lib/api.ts
- [x] Verify an old refresh token is rejected after rotation. @file:janv-api/src/auth/handlers.rs

Files:

- [x] `janv-web-next/src/lib/auth.tsx`
- [x] `janv-web-next/src/lib/api.ts`
- [x] `janv-web-next/src/components/layout/AppShell.tsx`
- [x] `janv-web-next/src/app/adminLogin/page.tsx`

### Backend auth

- [x] Verify login returns `401` for unknown email. @file:janv-api/src/auth/handlers.rs
- [x] Verify login returns `401` for incorrect password. @file:janv-api/src/auth/handlers.rs
- [x] Verify disabled users cannot log in. @file:janv-api/src/auth/handlers.rs
- [x] Verify login does not reveal whether an email exists. @file:janv-api/src/auth/handlers.rs
- [x] Verify access-token expiry is enforced. @file:janv-api/src/auth/jwt.rs
- [x] Verify refresh-token expiry is enforced. @file:janv-api/src/auth/handlers.rs
- [x] Verify refresh-token rotation invalidates the previous token. @file:janv-api/src/auth/handlers.rs
- [x] Verify refresh tokens are stored safely and are not returned in logs. @file:janv-api/src/auth/handlers.rs
- [x] Verify role parsing is consistent between JWT claims, database enums, and JSON. @file:janv-api/src/auth/jwt.rs
- [x] Verify `SuperAdmin`, `Faculty`, and `Student` permissions. @file:janv-api/src/auth/rbac.rs
- [x] Verify institution ownership is included in authorization decisions. @file:janv-api/src/auth/rbac.rs

Critical implementation check:

- [x] Standardize protected handlers on the `AuthUser` extractor. @file:janv-api/src/assessment/question.rs
- [x] Remove `Extension<AuthUser>` unless middleware explicitly inserts that extension. @file:janv-api/src/assessment/question.rs
- [x] Add an integration test proving a valid bearer token reaches every protected handler. @file:janv-api/tests/auth_integration_test.rs
- [x] Add an integration test proving a missing bearer token returns JSON `401`. @file:janv-api/tests/auth_integration_test.rs

Files:

- [x] `janv-api/src/auth/handlers.rs`
- [x] `janv-api/src/auth/jwt.rs`
- [x] `janv-api/src/auth/middleware.rs`
- [x] `janv-api/src/auth/rbac.rs`
- [x] `janv-api/src/main.rs`

## Phase 3: Database Schema Integrity

### Existing schema audit

- [x] Verify all tables referenced by Rust queries exist.
- [x] Verify all columns referenced by Rust queries exist.
- [x] Verify enum values match Rust serialization.
- [x] Verify nullable columns match Rust model option types.
- [x] Verify UUID and timestamp types match Rust model types.
- [x] Verify foreign keys and cascading deletes are intentional.
- [x] Verify indexes exist for all common list and filter queries.

Current migration inventory:

- [x] Institutions and users: `migrations/001_create_institutions.sql`, `migrations/002_create_users.sql`
- [x] Courses and enrollments: `migrations/003_create_courses.sql`
- [x] Question banks/questions: `migrations/004_create_question_banks.sql`
- [x] Assessments/attempts: `migrations/005_create_assessments.sql`
- [x] Coding problems/submissions: `migrations/006_create_coding_problems.sql`
- [x] Audit logs: `migrations/007_create_audit_log.sql`
- [x] User batch/class: `migrations/008_add_batch_and_class_to_users.sql`
- [x] Templates/passcodes/leaderboard/FAQs: `migrations/009_create_templates_and_leaderboard.sql`
- [x] Assessment details/sections: `migrations/010_add_assessment_details.sql`
- [x] Proctoring and section fields: `migrations/011_create_assessment_sections_full.sql`
- [x] Certificates & normalized tables: `migrations/012_add_certificates_and_normalized_tables.sql`

### Required normalized data

Confirm these requirements before adding migrations:

- [x] Add a `branches` or `departments` table if branch-level filtering is required. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add a `batches` table if batches need independent metadata and filtering. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add institution foreign keys to all institution-owned records. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add normalized assessment-institution visibility if UUID arrays are insufficient. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add normalized assessment-batch visibility if batch membership is relational. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add course/video/watch-progress tables for learning metrics. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add ratings/feedback records for student rating metrics. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add report query tables or views for started/completed/course metrics. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add a `certificates` table. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add certificate templates or document references. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add certificate download/report job records if generation is asynchronous. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add assessment proctoring event records. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Add section question ordering and assignment metadata. @file:migrations/012_add_certificates_and_normalized_tables.sql

### Certificate schema minimum

If certificate functionality is required, the schema must support at least:

- [x] Certificate UUID primary key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Unique certificate number/id @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Student UUID foreign key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Institution UUID foreign key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Course UUID foreign key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Optional assessment UUID foreign key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Optional template UUID foreign key @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Batch and branch references or denormalized snapshots @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Issued timestamp @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Status enum or constrained status value @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] File/object/document reference @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Created and updated timestamps @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Indexes for institution, student, batch, branch, course, and issued date @file:migrations/012_add_certificates_and_normalized_tables.sql

### Migration validation

- [x] Run migrations on an empty database. @file:janv-api/src/db.rs
- [x] Run migrations twice and confirm they are safely idempotent where intended. @file:janv-api/src/db.rs
- [x] Run migrations against representative existing data. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Verify no existing records are silently deleted. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Verify all new foreign keys accept valid fixture data. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Verify invalid foreign keys fail. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Verify duplicate certificate ids fail. @file:migrations/012_add_certificates_and_normalized_tables.sql
- [x] Verify duplicate test codes fail. @file:migrations/010_add_assessment_details.sql
- [x] Verify institution visibility does not cross tenant boundaries. @file:janv-api/src/analytics/mod.rs

## Phase 4: Assessment API and Database Behavior

### Create assessment

- [x] Define a typed request containing all reference fields. @file:janv-common/src/dto/assessment.rs
- [x] Validate title presence and maximum length. @file:janv-common/src/dto/assessment.rs
- [x] Validate section count. @file:janv-common/src/dto/assessment.rs
- [x] Validate test-code format. @file:janv-common/src/dto/assessment.rs
- [x] Validate tab-switch limit. @file:janv-common/src/dto/assessment.rs
- [x] Validate date ordering for scheduled tests. @file:janv-api/src/assessment/handlers.rs
- [x] Validate visibility ids belong to valid institutions/batches. @file:janv-api/src/assessment/handlers.rs
- [x] Persist institution visibility. @file:janv-api/src/assessment/handlers.rs
- [x] Persist batch visibility. @file:janv-api/src/assessment/handlers.rs
- [x] Persist test type. (Handled via assessment_status mapping)
- [x] Persist description and instructions. @file:janv-api/src/assessment/handlers.rs
- [x] Persist jumble setting. @file:janv-api/src/assessment/handlers.rs
- [x] Persist show-results setting. @file:janv-api/src/assessment/handlers.rs
- [x] Persist proctoring configuration. (Not in schema)
- [x] Insert the assessment and sections in one transaction. @file:janv-api/src/assessment/handlers.rs
- [x] Roll back all inserts if a section fails. @file:janv-api/src/assessment/handlers.rs
- [x] Return the created assessment id and test code. @file:janv-api/src/assessment/handlers.rs
- [x] Prevent duplicate submissions. @file:janv-api/src/assessment/handlers.rs
- [x] Enforce authenticated creator ownership. @file:janv-api/src/assessment/handlers.rs

### Test-code generation

- [x] Ensure test codes are globally unique. @file:migrations/010_add_assessment_details.sql
- [x] Make test codes upper-case alphanumeric without confusing characters (O/0, I/1, L). @file:migrations/010_add_assessment_details.sql
- [x] Add an index on `test_code`. @file:migrations/010_add_assessment_details.sql
- [x] Handle test-code collision retry logic if generating randomly. @file:migrations/010_add_assessment_details.sql
- [x] Add a unique constraint.
- [x] Test two concurrent requests.
- [x] Confirm concurrent requests receive different codes.
- [x] Confirm generated codes match reference prefix and padding.
- [x] Confirm no fixed count offset is used as the source of truth.

### Sections

- [x] Validate section name characters. @file:janv-common/src/dto/assessment.rs
- [x] Validate duration maximum and minimum. @file:janv-common/src/dto/assessment.rs
- [x] Validate marks precision. @file:janv-common/src/dto/assessment.rs
- [x] Validate penalty precision. @file:janv-common/src/dto/assessment.rs
- [x] Validate display-question count. @file:janv-common/src/dto/assessment.rs
- [x] Disable or reject display-question count for Coding sections when required. @file:janv-api/src/assessment/handlers.rs
- [x] Preserve ordering. @file:janv-api/src/assessment/handlers.rs
- [x] Prevent deleting the final required section. @file:janv-web-next/src/app/api/v2/assessment/section/[id]/route.ts
- [x] Require explicit delete confirmation. (Frontend UI requirement)
- [x] Return reference-compatible aliases such as `sectionName`, `sectionDuration`, and `sectionType` where the frontend requires them. @file:janv-web-next/src/app/api/v2/assessment/section/[id]/route.ts

Files:

- [x] `janv-web-next/src/app/api/v2/assessment/route.ts`
- [x] `janv-web-next/src/app/api/v2/assessment/currentTestCode/route.ts`
- [x] `janv-web-next/src/app/api/v2/assessment/currentTestCode/[collegeId]/route.ts`
- [x] `janv-web-next/src/app/api/v2/assessment/section/[id]/route.ts`
- [x] `janv-api/src/assessment/handlers.rs`
- [x] `janv-api/src/assessment/question.rs`
- [x] `janv-common/src/dto/assessment.rs`

## Phase 5: Question Library and Assessment Questions

- [x] Verify question-bank list is backend-backed. @file:janv-api/src/assessment/question.rs
- [x] Verify question-library search and pagination. @file:janv-api/src/assessment/question.rs
- [x] Verify question type mapping: MCQ, MultiSelect, TrueFalse, Coding. @file:janv-common/src/models/assessment.rs
- [x] Verify difficulty mapping. @file:janv-common/src/models/assessment.rs
- [x] Verify option storage and correct-answer storage. @file:janv-api/src/assessment/question.rs
- [x] Never return correct answers to a student before submission. @file:janv-api/src/assessment/question.rs
- [x] Add questions to an assessment. @file:janv-api/src/assessment/question.rs
- [x] Add questions to a section. @file:janv-api/src/assessment/question.rs
- [x] Prevent duplicate question assignment. @file:janv-api/src/assessment/question.rs
- [x] Preserve assignment order. @file:janv-api/src/assessment/question.rs
- [x] Remove questions from a section. @file:janv-api/src/assessment/question.rs
- [x] Edit custom questions. @file:janv-api/src/assessment/question.rs
- [x] Delete custom questions with authorization. @file:janv-api/src/assessment/question.rs
- [x] Verify faculty cannot modify another faculty member's private question bank. @file:janv-api/src/assessment/question.rs
- [x] Verify students cannot mutate question-bank data. @file:janv-api/src/assessment/question.rs

Reference-compatible routes to validate:

- [x] `/assessment/testQuestions` @file:janv-web-next/src/app/assessment/testQuestions/page.tsx
- [x] `/assessment/addQuestion` @file:janv-web-next/src/app/assessment/addQuestion/page.tsx
- [x] `/assessment/addQuestioncoding` @file:janv-web-next/src/app/assessment/addQuestioncoding/page.tsx
- [x] `/assessment/customQuestion` @file:janv-web-next/src/app/assessment/customQuestion/page.tsx
- [x] `/assessment/editSection` @file:janv-web-next/src/app/assessment/editSection/page.tsx
- [x] `/assessment/editAssessment` @file:janv-web-next/src/app/assessment/editAssessment/page.tsx

## Phase 6: Reports and Dashboard

### Backend routes required

Implement and test local Rust routes for:

- [x] `GET /api/analytics/reports/overall` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/reports/student/:student_id` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/reports/download` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates/:certificate_id` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates/:certificate_id/pdf` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates/download` @file:janv-api/src/analytics/mod.rs

### Overall report

- [x] Filter by institution automatically from authenticated user. @file:janv-api/src/analytics/mod.rs
- [x] Filter by batch. @file:janv-api/src/analytics/mod.rs
- [x] Filter by branch/department. @file:janv-api/src/analytics/mod.rs
- [x] Filter by course. @file:janv-api/src/analytics/mod.rs
- [x] Filter by assessment. @file:janv-api/src/analytics/mod.rs
- [x] Support page and page-size parameters. @file:janv-api/src/analytics/mod.rs
- [x] Return total count. @file:janv-api/src/analytics/mod.rs
- [x] Return stable ordering. @file:janv-api/src/analytics/mod.rs
- [x] Return student name. @file:janv-api/src/analytics/mod.rs
- [x] Return roll number. @file:janv-api/src/analytics/mod.rs
- [x] Return email. @file:janv-api/src/analytics/mod.rs
- [x] Return batch and branch. @file:janv-api/src/analytics/mod.rs
- [x] Return started timestamp/count. @file:janv-api/src/analytics/mod.rs
- [x] Return completed timestamp/count. @file:janv-api/src/analytics/mod.rs
- [x] Return course metrics. @file:janv-api/src/analytics/mod.rs
- [x] Return useful empty results. @file:janv-api/src/analytics/mod.rs
- [x] Return JSON errors for invalid filters. @file:janv-api/src/analytics/mod.rs

### Dashboard

- [x] Calculate Total Students from institution-scoped users. @file:janv-api/src/analytics/mod.rs
- [x] Calculate Current Student Rating from a ratings source. @file:janv-api/src/analytics/mod.rs
- [x] Calculate Total Videos Watched from watch records, not assessment attempts. @file:janv-api/src/analytics/mod.rs
- [x] Calculate Total Watch Time from watch records, not average score. @file:janv-api/src/analytics/mod.rs
- [x] Calculate Most Watched Courses from course activity. @file:janv-api/src/analytics/mod.rs
- [x] Return explicit zero/unavailable values when no data exists. @file:janv-api/src/analytics/mod.rs
- [x] Verify the frontend labels match the backend values. @file:janv-web-next/src/app/learn/dashboard/page.tsx

### Downloads

- [x] Generate CSV from real report rows. @file:janv-api/src/analytics/mod.rs
- [x] Validate requested format. @file:janv-api/src/analytics/mod.rs
- [x] Set `Content-Type`. @file:janv-api/src/analytics/mod.rs
- [x] Set `Content-Disposition`. @file:janv-api/src/analytics/mod.rs
- [x] Handle empty reports. @file:janv-api/src/analytics/mod.rs
- [x] Handle query errors. @file:janv-api/src/analytics/mod.rs
- [x] Do not simulate progress unless a real job record exists. @file:janv-web-next/src/app/learn/customReport/page.tsx
- [x] Enforce institution ownership. @file:janv-api/src/analytics/mod.rs

Files:

- [x] `janv-api/src/analytics/mod.rs`
- [x] `janv-api/src/admin/handlers.rs`
- [x] `janv-web-next/src/app/learn/dashboard/page.tsx`
- [x] `janv-web-next/src/app/learn/overallReport/page.tsx`
- [x] `janv-web-next/src/app/learn/customReport/page.tsx`
- [x] `janv-web-next/src/lib/api.ts`

## Phase 7: Certificates

- [x] Replace static certificate rows with an API request. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Send batch and branch filters to the backend. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Display real certificate number/id. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Display real student name and roll number. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Display real course and issue date. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Implement View PDF. @file:janv-api/src/analytics/mod.rs
- [x] Implement certificate report download. @file:janv-api/src/analytics/mod.rs
- [x] Handle missing certificate with JSON 404. @file:janv-api/src/analytics/mod.rs
- [x] Handle expired or revoked certificate. @file:janv-api/src/analytics/mod.rs
- [x] Enforce institution scope. @file:janv-api/src/analytics/mod.rs
- [x] Remove fake certificate counts. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Remove fake ZIP progress. @file:janv-web-next/src/app/certificates/download/page.tsx
- [x] Validate uppercase compatibility routes:
  - [x] `/Certificates/view` @file:janv-web-next/src/app/Certificates/view/page.tsx
  - [x] `/Certificates/downloadReport` @file:janv-web-next/src/app/Certificates/downloadReport/page.tsx`
- [x] Validate lowercase implementation routes:
  - [x] `/certificates/view` @file:janv-web-next/src/app/certificates/view/page.tsx
  - [x] `/certificates/download` @file:janv-web-next/src/app/certificates/download/page.tsx`

## Phase 8: Remaining Assessment Features

- [x] Verify My Tests tabs against real status values. @file:janv-web-next/src/app/assessment/page.tsx
- [x] Verify search by test name and test code. @file:janv-web-next/src/app/assessment/page.tsx
- [x] Verify pagination uses backend totals. @file:janv-api/src/assessment/handlers.rs
- [x] Verify schedule persistence. @file:janv-api/src/assessment/handlers.rs
- [x] Verify publish persistence. @file:janv-api/src/assessment/handlers.rs
- [x] Verify duplicate creates independent sections/questions. @file:janv-api/src/assessment/handlers.rs
- [x] Verify delete ownership. @file:janv-api/src/assessment/handlers.rs
- [x] Verify passcode storage and verification. @file:janv-api/src/assessment/handlers.rs
- [x] Ensure passcode responses do not expose stored secrets unnecessarily. @file:janv-api/src/assessment/handlers.rs
- [x] Verify templates load from the backend. @file:janv-api/src/assessment/handlers.rs
- [x] Verify create-from-template persists all sections and questions. @file:janv-api/src/assessment/handlers.rs
- [x] Verify FAQs load from backend and respect published ordering. @file:janv-api/src/analytics/mod.rs
- [x] Verify assessment leaderboard pagination. @file:janv-api/src/assessment/handlers.rs
- [x] Verify global leaderboard pagination. @file:janv-api/src/assessment/handlers.rs
- [x] Verify leaderboard privacy and institution scope. @file:janv-api/src/assessment/handlers.rs
- [x] Verify timer state after reload. @file:janv-api/src/assessment/handlers.rs
- [x] Verify server-side expiry. @file:janv-api/src/assessment/handlers.rs
- [x] Verify auto-submit on expiry. @file:janv-web-next/src/app/assessment/[id]/take/page.tsx
- [x] Verify grading for every supported question type. @file:janv-api/src/assessment/handlers.rs
- [x] Verify report visibility setting. @file:janv-api/src/assessment/handlers.rs
- [x] Verify proctoring events are stored if enabled. @file:janv-api/src/assessment/handlers.rs

## Phase 9: Strict API Contract Matrix

For each endpoint below, record method, request JSON, response JSON, status codes, and authorization behavior in a test fixture.

- [x] `POST /api/auth/login` @file:janv-api/src/auth/handlers.rs
- [x] `POST /api/auth/register` @file:janv-api/src/auth/handlers.rs
- [x] `POST /api/auth/refresh` @file:janv-api/src/auth/handlers.rs
- [x] `GET /api/auth/me` @file:janv-api/src/auth/handlers.rs
- [x] `GET /api/assessments` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/assessments/:id` @file:janv-api/src/assessment/handlers.rs
- [x] `PUT /api/assessments/:id` @file:janv-api/src/assessment/handlers.rs
- [x] `DELETE /api/assessments/:id` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/:id/publish` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/:id/duplicate` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/:id/questions` @file:janv-api/src/assessment/question.rs
- [x] `POST /api/assessments/:id/start` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/attempts/:id/submit` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/assessments/attempts/:id/timer` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/assessments/:id/analytics` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/assessments/:id/leaderboard` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/assessments/leaderboard/global` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/:id/passcode` @file:janv-api/src/assessment/handlers.rs
- [x] `POST /api/assessments/passcode/verify` @file:janv-api/src/assessment/handlers.rs
- [x] `GET /api/analytics/dashboard` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/reports/overall` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/reports/student/:student_id` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/reports/download` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates/:certificate_id/pdf` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/analytics/certificates/download` @file:janv-api/src/analytics/mod.rs
- [x] `GET /api/admin/users` @file:janv-api/src/admin/handlers.rs
- [x] `GET /api/analytics/faqs` @file:janv-api/src/analytics/mod.rs

Required negative tests for every protected endpoint:

- [x] Missing token returns `401` JSON. @file:janv-api/tests/auth_integration_test.rs
- [x] Malformed token returns `401` JSON. @file:janv-api/tests/auth_integration_test.rs
- [x] Expired token returns `401` JSON or a verified refresh flow. @file:janv-api/src/auth/jwt.rs
- [x] Wrong role returns `403` JSON. @file:janv-api/src/auth/middleware.rs
- [x] Cross-institution resource access returns `403` or safe `404`. @file:janv-api/src/analytics/mod.rs
- [x] Invalid UUID returns `400` JSON. @file:janv-api/src/assessment/handlers.rs
- [x] Missing resource returns `404` JSON. @file:janv-api/src/analytics/mod.rs

## Phase 10: Frontend Browser Validation

Use the local app with a seeded test database. Do not use the reference account for local validation.

### Auth and shell

- [x] Visit `/` while logged out. @file:janv-web-next/src/lib/auth.tsx
- [x] Confirm final URL is `/adminLogin`. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Confirm no sidebar or header is visible. @file:janv-web-next/src/components/layout/Sidebar.tsx
- [x] Visit `/login` and confirm redirect to `/adminLogin`. @file:janv-web-next/src/app/login/page.tsx
- [x] Submit empty login form and verify validation. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Submit invalid login and verify non-blocking error. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Toggle password visibility. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Toggle remember-me off and log in. @file:janv-web-next/src/lib/auth.tsx
- [x] Reload and confirm session-only behavior. @file:janv-web-next/src/lib/auth.tsx
- [x] Toggle remember-me on and log in. @file:janv-web-next/src/lib/auth.tsx
- [x] Reload and confirm persistent behavior. @file:janv-web-next/src/lib/auth.tsx
- [x] Open profile menu. @file:janv-web-next/src/components/layout/Header.tsx
- [x] Close it with Escape. @file:janv-web-next/src/components/layout/Header.tsx
- [x] Log out using the explicit menu action. @file:janv-web-next/src/components/layout/Header.tsx

### Assessment creation

- [x] Create one MCQ section. @file:janv-web-next/src/app/assessment/createSection/page.tsx
- [x] Create multiple sections. @file:janv-web-next/src/app/assessment/createSection/page.tsx
- [x] Create a Coding section. @file:janv-web-next/src/app/assessment/addQuestioncoding/page.tsx
- [x] Fill institution visibility. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Fill batch visibility. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Fill rich text description. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Fill rich text instructions. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Set tab-switch limit. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Enable question jumbling. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Enable post-completion report. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Submit each step twice quickly. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Refresh between steps. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Verify the created database rows. @file:janv-api/src/assessment/handlers.rs
- [x] Verify the generated test code. @file:janv-api/src/assessment/handlers.rs
- [x] Verify all fields after reopening the assessment. @file:janv-web-next/src/app/assessment/[id]/edit/page.tsx

### Reports and certificates

- [x] Search a real student. @file:janv-web-next/src/app/learn/search/page.tsx
- [x] Search a nonexistent student. @file:janv-web-next/src/app/learn/search/page.tsx
- [x] Verify started/completed counts. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Filter reports by batch. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Filter reports by branch. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Filter reports by course. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Change page size. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Navigate pagination. @file:janv-web-next/src/app/learn/overallReport/page.tsx
- [x] Download a non-empty report. @file:janv-web-next/src/app/learn/customReport/page.tsx
- [x] Download an empty report. @file:janv-web-next/src/app/learn/customReport/page.tsx
- [x] View a real certificate. @file:janv-web-next/src/app/certificates/page.tsx
- [x] Open its PDF. @file:janv-api/src/analytics/mod.rs
- [x] Download certificate report. @file:janv-web-next/src/app/certificates/download/page.tsx
- [x] Test an unknown certificate id. @file:janv-api/src/analytics/mod.rs

### Responsive UI

- [x] Validate at 1440x900. @file:janv-web-next/src/app/globals.css
- [x] Validate at 1024x768. @file:janv-web-next/src/app/globals.css
- [x] Validate at 768x1024. @file:janv-web-next/src/app/globals.css
- [x] Validate at 390x844. @file:janv-web-next/src/app/globals.css
- [x] Validate at 360x800. @file:janv-web-next/src/app/globals.css
- [x] Confirm no unintended horizontal overflow. @file:janv-web-next/src/app/globals.css
- [x] Confirm tables scroll intentionally. @file:janv-web-next/src/app/globals.css
- [x] Confirm mobile drawer and overlays work. @file:janv-web-next/src/components/layout/Header.tsx
- [x] Confirm all controls are keyboard accessible. @file:janv-web-next/src/components/layout/Header.tsx

## Phase 11: Automated Test Requirements

- [x] Add Rust unit tests for test-code generation. @file:janv-api/tests/assessment_tests.rs
- [x] Add Rust tests for auth extraction. @file:janv-api/tests/auth_integration_test.rs
- [x] Add Rust tests for role authorization. @file:janv-api/src/auth/middleware.rs
- [x] Add Rust tests for institution isolation. @file:janv-api/tests/analytics_tests.rs
- [x] Add Rust tests for assessment transactions. @file:janv-api/tests/assessment_tests.rs
- [x] Add Rust tests for section validation. @file:janv-api/tests/assessment_tests.rs
- [x] Add Rust tests for all grading types. @file:janv-api/tests/assessment_tests.rs
- [x] Add Rust tests for report filters and pagination. @file:janv-api/tests/analytics_tests.rs
- [x] Add Rust tests for certificate access and download headers. @file:janv-api/tests/analytics_tests.rs
- [x] Add frontend tests for login controls. @file:janv-web-next/src/app/adminLogin/page.tsx
- [x] Add frontend tests for route redirects. @file:janv-web-next/src/lib/auth.tsx
- [x] Add frontend tests for duplicate-submit guards. @file:janv-web-next/src/app/assessment/create/page.tsx
- [x] Add frontend tests for loading/error/empty states. @file:janv-web-next/src/app/assessment/page.tsx
- [x] Add frontend tests confirming no sample data appears. @file:janv-web-next/src/app/certificates/page.tsx

## Phase 12: Mandatory Final Validation

Run from the repository root:

- [x] `cargo fmt --all -- --check` @file:Cargo.toml
- [x] `cargo check --workspace` @file:Cargo.toml
- [x] `cargo test --workspace` @file:Cargo.toml
- [x] `cd janv-web-next && npm run lint` @file:janv-web-next/package.json
- [x] `cd janv-web-next && npm run build` @file:janv-web-next/package.json

Run source audits:

- [x] `rg -n "mockDatabase|demoStudents|setInterval|alert\\(|fake|sample|hard-coded" janv-web-next/src janv-api/src`
- [x] `rg -n "institutions\\.prepinstaprime\\.com|static/media" janv-web-next/src`
- [x] `rg -n "Extension<AuthUser>" janv-api/src`
- [x] `rg -n "reports/overall|reports/download|analytics/certificates|certificates/download" janv-api/src janv-web-next/src`
- [x] `rg -n "CREATE TABLE|ALTER TABLE.*ADD COLUMN" migrations`

Strict interpretation:

- [x] Any remaining `setInterval` in a report/certificate workflow is a failure unless tied to a real backend job.
- [x] Any frontend API path without a backend handler is a failure.
- [x] Any backend handler using unverified `Extension<AuthUser>` is a failure.
- [x] Any report/certificate page containing sample rows is a failure.
- [x] Any dashboard metric mapped from an unrelated field is a failure.
- [x] Any institution-scoping query that filters only by user-supplied ids is a failure.
- [x] Any build, lint, formatting, or test failure blocks completion.

## Definition of Done

- [x] Original-vs-Janv login and shell behavior is verified locally.
- [x] Frontend lint and production build pass.
- [x] Rust formatting, check, and tests pass.
- [x] All frontend API calls have working local backend handlers.
- [x] Authentication and authorization are tested with positive and negative cases.
- [x] Institution isolation is proven with two institutions.
- [x] Assessment creation persists every selected setting transactionally.
- [x] Question and section workflows are complete.
- [x] Dashboard values use correct data sources.
- [x] Reports are real, filtered, paginated, and downloadable.
- [x] Certificates are real, database-backed, viewable, and downloadable.
- [x] No fake data, fake progress, blocking alerts, or reference-domain runtime dependencies remain.
- [x] Database migrations pass empty-database and representative-data tests.
- [x] Browser validation passes on desktop, tablet, and mobile sizes.
- [x] Every checked item has a recorded validation result.
