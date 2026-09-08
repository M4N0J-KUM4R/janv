# Parity Fix Task Tracker - Iteration 2

## Purpose

This tracker covers the remaining differences found after the first parity pass. Complete the tasks in order, keeping the original portal as a behavior and visual reference while implementing equivalent functionality in the local application.

Reference login page:

- `https://institutions.prepinstaprime.com/adminLogin`

Reference artifacts available locally:

- `original/header_original.html`
- `original/sidebar_original.html`
- `scratch/original_main.html`
- `original/main.js`
- `original/chunks/`

copy proprietary JavaScript bundles into application code. Do not store account credentials in source files, logs, screenshots, fixtures, or documentation.

## Status Legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Verified complete
- `[!]` Blocked or requires a product decision

## Phase 0: Baseline and Safety

- [ ] Create a backup or commit before changing the current implementation.
- [ ] Record the current `git status` and keep unrelated user changes intact.
- [ ] Confirm the local database connection points to a development or staging database.
- [ ] Confirm production credentials are not present in `.env`, browser storage, screenshots, or committed files.
- [ ] Create a test institution, test faculty user, and test student user for local validation.
- [ ] Create at least one test course, assessment, section, question, attempt, and certificate fixture.
- [ ] Capture baseline screenshots at 1440x900 and 390x844 for local routes.
- [ ] Capture reference screenshots only from authorized access and avoid including personal data.

Validation:

- [ ] `git status --short`
- [ ] `rg -n "password|secret|token|api_key|Ayush7369|SVCET12345" . --glob '!node_modules/**' --glob '!target/**'`
- [ ] Verify the command above returns no committed secrets.

## Phase 1: Frontend Build and Lint Health

### Build failure

- [ ] Fix the `unknown` result type at `janv-web-next/src/app/api/v2/assessment/route.ts:158`.
- [ ] Define typed row interfaces for assessment insert results.
- [ ] Avoid using `any` in API route handlers.
- [ ] Type database query results explicitly.
- [ ] Return consistent JSON response types from every Next.js route.

### React lint errors

- [ ] Fix `handleSubmit` being referenced before declaration in `assessment/[id]/take/page.tsx`.
- [ ] Fix state updates performed directly inside effects in:
  - [ ] `assessment/create/page.tsx`
  - [ ] `assessment/createSection/page.tsx`
  - [ ] `assessment/createSuccess/page.tsx`
  - [ ] `assessment/page.tsx`
  - [ ] `learn/overallReport/page.tsx`
- [ ] Refactor effect initialization so it does not trigger avoidable cascading renders.
- [ ] Add correct effect dependencies after refactoring.
- [ ] Replace unescaped JSX quotes in `assessment/page.tsx`.
- [ ] Remove unused imports and variables.
- [ ] Decide whether `<img>` warnings should be fixed with `next/image` or explicitly documented.
- [ ] Remove stale ESLint disable directives.

Validation:

- [ ] `cd janv-web-next && npm run lint`
- [ ] `cd janv-web-next && npm run build`
- [ ] Confirm both commands exit with status 0.
- [ ] Confirm the build reports all expected routes.

## Phase 2: Login and Authentication Parity

### Login screen

- [ ] Compare `/adminLogin` against the reference screenshot and DOM.
- [ ] Change the visible email label from `Email Address` to `Email` if exact reference text is required.
- [ ] Change the submit button from `Sign In` to `Login`.
- [ ] Match the reference title hierarchy and typography for `Institutions Admin`.
- [ ] Match the reference background color, card width, padding, borders, and footer.
- [ ] Add the reference footer text: `© Institutions 2023. All rights reserved.`
- [ ] Verify email placeholder is `Enter email`.
- [ ] Verify password placeholder matches the reference.
- [ ] Verify password visibility control exposes a clear accessible label.
- [ ] Verify `Remember me` is checked by default if that is the reference behavior.
- [ ] Add keyboard navigation tests for email, password, remember-me, visibility, and login.
- [ ] Ensure no test or placeholder account values are prefilled.

Files:

- [ ] `janv-web-next/src/app/adminLogin/page.tsx`
- [ ] `janv-web-next/src/app/login/page.tsx`
- [ ] `janv-web-next/src/app/globals.css`

### Auth state

- [ ] Confirm `/login` redirects to `/adminLogin`.
- [ ] Confirm `/` redirects to `/adminLogin` when logged out.
- [ ] Confirm `/` redirects to `/learn/dashboard` when logged in.
- [ ] Confirm protected pages do not flash protected content before auth resolution.
- [ ] Confirm public routes do not render the sidebar or header.
- [ ] Confirm logout clears local and session token storage.
- [ ] Confirm logout returns to `/adminLogin`.
- [ ] Confirm refresh token rotation invalidates the previous refresh token.
- [ ] Confirm expired access tokens are refreshed once and retried safely.
- [ ] Confirm failed refresh clears auth state and redirects to login.
- [ ] Confirm remember-me false uses session storage only.
- [ ] Confirm remember-me true uses persistent storage only.
- [ ] Confirm multiple tabs do not leave stale authenticated UI after logout.
- [ ] Add server-side authorization checks for every protected API handler.

Files:

- [ ] `janv-web-next/src/components/layout/AppShell.tsx`
- [ ] `janv-web-next/src/lib/auth.tsx`
- [ ] `janv-web-next/src/lib/api.ts`
- [ ] `janv-api/src/auth/handlers.rs`
- [ ] `janv-api/src/auth/middleware.rs`

## Phase 3: Shell and Navigation Parity

### Header

- [ ] Match the reference 72px header height in CSS and component styles.
- [ ] Match left and right header padding at desktop width.
- [ ] Match logo dimensions and local asset paths.
- [ ] Match email text styling.
- [ ] Display institution, user name, and role from authenticated user data.
- [ ] Remove all empty-string or sample fallbacks for authenticated user details.
- [ ] Add an accessible profile-menu button.
- [ ] Open the profile dropdown on click and keyboard activation.
- [ ] Close the profile dropdown on outside click and Escape.
- [ ] Add an explicit Logout action.
- [ ] Confirm clicking profile details does not immediately log out.

### Sidebar

- [ ] Match the reference 260px desktop drawer width.
- [ ] Match section headings, separators, item spacing, and active colors.
- [ ] Verify all reference navigation destinations.
- [ ] Verify active state for nested routes such as assessment edit/take pages.
- [ ] Verify `Certificates` links work on case-sensitive Linux filesystems.
- [ ] Keep all icon assets under `janv-web-next/public/static/media/`.
- [ ] Verify every local icon returns HTTP 200.
- [ ] Add desktop collapse/open behavior if required by the reference.
- [ ] Add mobile drawer behavior.
- [ ] Add a visible mobile overlay while the drawer is open.
- [ ] Close the drawer after selecting a mobile navigation item.
- [ ] Prevent body scroll while the mobile drawer is open.

Files:

- [ ] `janv-web-next/src/components/layout/Header.tsx`
- [ ] `janv-web-next/src/components/layout/Sidebar.tsx`
- [ ] `janv-web-next/src/components/layout/AppShell.tsx`
- [ ] `janv-web-next/src/app/globals.css`

## Phase 4: Nginx and Runtime Routing

- [ ] Confirm `/api/v2/` is routed to the Next.js service.
- [ ] Confirm all other `/api/` requests are routed to the Rust API.
- [ ] Confirm location block ordering remains correct.
- [ ] Confirm proxy paths do not duplicate or strip `/api/v2` unexpectedly.
- [ ] Confirm forwarded host and protocol headers are present.
- [ ] Confirm authorization headers reach both services.
- [ ] Confirm preflight requests work for browser API calls.
- [ ] Confirm Next.js API routes can reach the configured database in the deployed container.
- [ ] Confirm Rust API routes can reach the same intended database.
- [ ] Confirm no endpoint is accidentally returning the Next.js login HTML with HTTP 200.

Validation:

- [ ] Build the production containers.
- [ ] Start the full Docker Compose stack.
- [ ] Request `/adminLogin` and verify HTML response.
- [ ] Request an unauthenticated protected API and verify JSON `401`, not HTML `200`.
- [ ] Request `/api/v2/assessment/currentTestCode` and verify JSON response.
- [ ] Request `/api/analytics/dashboard` and verify Rust JSON response.
- [ ] Inspect Nginx access logs for upstream service selection.

Files:

- [ ] `docker/nginx.conf`
- [ ] `docker-compose.yml`
- [ ] `docker-compose.prod.yml`
- [ ] `Dockerfile.web`
- [ ] `Dockerfile.api`

## Phase 5: Assessment Data Model and Creation

### Request and persistence parity

- [ ] Define a typed create-assessment request matching the reference payload.
- [ ] Persist `test_name`/title.
- [ ] Persist generated `test_code`.
- [ ] Persist test description as HTML or a documented rich-text format.
- [ ] Persist test instructions as HTML or a documented rich-text format.
- [ ] Persist test type.
- [ ] Persist section count.
- [ ] Persist tab-switch limit.
- [ ] Persist jumble-questions setting.
- [ ] Persist show-performance-report setting.
- [ ] Persist proctoring setting and selected services.
- [ ] Persist institution visibility.
- [ ] Persist batch visibility.
- [ ] Persist start and end schedule values.
- [ ] Persist status transitions: draft, scheduled, ongoing, completed, cancelled.
- [ ] Wrap assessment and section inserts in a database transaction.
- [ ] Roll back the assessment if any section insert fails.
- [ ] Reject duplicate client submissions using an idempotency key or server-side guard.
- [ ] Enforce ownership and institution scope server-side.

### Visibility model

- [ ] Decide whether visibility should use UUID arrays or normalized join tables.
- [ ] Prefer normalized join tables if institutions and batches are independently queryable.
- [ ] Persist the institution selections currently collected by the UI.
- [ ] Do not treat department names as institution UUIDs.
- [ ] Add API endpoints to list valid institutions, branches/departments, and batches.
- [ ] Verify blank visibility means globally visible only where the reference does so.
- [ ] Add tests for one institution, multiple institutions, all institutions, one batch, and all batches.

### Test-code generation

- [ ] Implement institution/college-scoped code generation.
- [ ] Match the reference prefix and zero-padding rules.
- [ ] Replace count-plus-fixed-offset generation.
- [ ] Use a database sequence or transactional locking to avoid duplicate codes.
- [ ] Make the current-test-code endpoint use the same generator as creation.
- [ ] Validate both `/api/v2/assessment/currentTestCode` and `/api/v2/assessment/currentTestCode/:collegeId` behavior.
- [ ] Decide whether the frontend should always send the college/institution id.

Files:

- [ ] `janv-web-next/src/app/assessment/create/page.tsx`
- [ ] `janv-web-next/src/app/assessment/createSection/page.tsx`
- [ ] `janv-web-next/src/app/api/v2/assessment/route.ts`
- [ ] `janv-web-next/src/app/api/v2/assessment/currentTestCode/route.ts`
- [ ] `janv-web-next/src/app/api/v2/assessment/currentTestCode/[collegeId]/route.ts`
- [ ] `migrations/010_add_assessment_details.sql`
- [ ] `migrations/011_create_assessment_sections_full.sql`

## Phase 6: Sections and Questions

- [ ] Match section fields: name, duration, instructions, type, marks, penalty, display count.
- [ ] Validate section name characters and maximum length.
- [ ] Validate duration range.
- [ ] Validate marks and penalty decimal precision.
- [ ] Disable display-question count for Coding sections when required.
- [ ] Validate display count cannot exceed available questions.
- [ ] Preserve section order.
- [ ] Preserve section edits after navigating backward.
- [ ] Preserve draft state after a browser refresh where appropriate.
- [ ] Prevent deleting the final required section.
- [ ] Prevent deleting a section without an explicit confirmation.
- [ ] Implement question-library selection.
- [ ] Implement custom MCQ creation.
- [ ] Implement custom Coding question creation.
- [ ] Implement question assignment to a section.
- [ ] Implement question removal from a section.
- [ ] Implement section question ordering.
- [ ] Implement section question count and total marks recalculation.
- [ ] Prevent duplicate question assignment.
- [ ] Return correct section field names expected by the frontend.

Expected reference-related routes to evaluate:

- [ ] `/assessment/testQuestions`
- [ ] `/assessment/addQuestion`
- [ ] `/assessment/addQuestioncoding`
- [ ] `/assessment/customQuestion`
- [ ] `/assessment/editSection`
- [ ] `/assessment/editAssessment`

## Phase 7: Assessment Management and Taking Tests

- [ ] Validate My Tests tabs: all, yet-to-start, ongoing, completed.
- [ ] Validate search by test name and test code.
- [ ] Validate stable sorting and pagination.
- [ ] Validate schedule start and end times.
- [ ] Validate publish rules, including no-question assessments.
- [ ] Validate duplicate assessment behavior and regenerated test code.
- [ ] Validate delete ownership and confirmation.
- [ ] Validate passcode creation, replacement, removal, and verification.
- [ ] Validate copy-link behavior.
- [ ] Validate preview mode does not create a real student attempt.
- [ ] Validate assessment edit permissions.
- [ ] Validate timer persistence after reload.
- [ ] Validate timer expiry server-side, not only in the browser.
- [ ] Validate automatic submission on expiry.
- [ ] Validate MCQ grading.
- [ ] Validate multi-select grading.
- [ ] Validate True/False grading.
- [ ] Validate Coding execution and result handling.
- [ ] Validate show-results false hides answers and explanations.
- [ ] Validate show-results true exposes the permitted report.
- [ ] Validate tab-switch counting and configured limit.
- [ ] Validate proctoring configuration and event persistence.
- [ ] Replace all blocking browser alerts with accessible non-blocking status messages.

Files:

- [ ] `janv-web-next/src/app/assessment/page.tsx`
- [ ] `janv-web-next/src/app/assessment/[id]/edit/page.tsx`
- [ ] `janv-web-next/src/app/assessment/[id]/take/page.tsx`
- [ ] `janv-api/src/assessment/handlers.rs`
- [ ] `janv-api/src/assessment/attempt.rs`
- [ ] `janv-api/src/assessment/timer.rs`
- [ ] `janv-api/src/assessment/passcode.rs`

## Phase 8: Dashboard and Reports

### Dashboard metrics

- [ ] Define the exact meaning of Total Students.
- [ ] Define the exact source for Current Student Rating.
- [ ] Add course video/watch records if the reference dashboard requires them.
- [ ] Add Total Videos Watched aggregation.
- [ ] Add Total Watch Time aggregation.
- [ ] Add Most Watched Courses aggregation.
- [ ] Do not display assessment attempts as video counts.
- [ ] Do not display average score as watch time.
- [ ] Return zero or an explicit unavailable state when a metric has no data.
- [ ] Scope all metrics to the authenticated institution.

### Student search

- [ ] Return real student name, roll number, email, batch, branch, started count, and completed count.
- [ ] Replace fabricated `0 Started` and `0 Completed` values.
- [ ] Add server-side pagination.
- [ ] Add minimum query length and input normalization.
- [ ] Add search rate limiting or debounce protection on the server.
- [ ] Verify institution isolation.
- [ ] Verify empty and error states.

### Overall report

- [ ] Implement a Rust route for `/api/analytics/reports/overall`.
- [ ] Implement filters: batch, branch, course, assessment, and page.
- [ ] Implement configurable page size.
- [ ] Return total count and stable page results.
- [ ] Return real started and completed timestamps.
- [ ] Return per-student course/report metrics.
- [ ] Return dashboard stats from the same scoped query model.
- [ ] Add indexes for common filters.
- [ ] Verify no hard-coded pagination totals remain.

### Report download

- [ ] Implement `/api/analytics/reports/download` in Rust.
- [ ] Validate requested format.
- [ ] Generate CSV from real report rows.
- [ ] Add XLSX generation only if required.
- [ ] Set correct content type and content disposition.
- [ ] Enforce report ownership and institution scope.
- [ ] Handle empty result sets.
- [ ] Add a download error state in the UI.
- [ ] Remove synthetic progress simulation unless backed by a real job.

Files:

- [ ] `janv-web-next/src/app/learn/dashboard/page.tsx`
- [ ] `janv-web-next/src/app/learn/search/page.tsx`
- [ ] `janv-web-next/src/app/learn/overallReport/page.tsx`
- [ ] `janv-web-next/src/app/learn/customReport/page.tsx`
- [ ] `janv-web-next/src/lib/api.ts`
- [ ] `janv-api/src/analytics/mod.rs`
- [ ] `janv-api/src/admin/handlers.rs`

## Phase 9: Certificates

### Data model

- [ ] Add a `certificates` table.
- [ ] Link each certificate to a student, institution, course, and optionally assessment.
- [ ] Store certificate id and template id.
- [ ] Store issued timestamp.
- [ ] Store status: pending, issued, revoked, failed.
- [ ] Store file/object key or generated document reference.
- [ ] Add unique constraint for certificate id.
- [ ] Add indexes for student, batch, branch, course, and issued date.
- [ ] Add audit records for issue, revoke, view, and download.

### Backend

- [ ] Implement certificate list endpoint.
- [ ] Implement certificate filtering by batch and branch.
- [ ] Implement certificate PDF retrieval.
- [ ] Implement certificate report download.
- [ ] Implement authorization and institution scoping.
- [ ] Return real certificate rows instead of sample data.
- [ ] Return proper 404 for unknown certificate ids.
- [ ] Set correct PDF and CSV/XLSX response headers.

### Frontend

- [ ] Connect `/certificates/view` to the certificate API.
- [ ] Connect `/certificates/download` to the certificate download API.
- [ ] Implement `View PDF` action.
- [ ] Implement loading, error, empty, and success states.
- [ ] Remove sample names, ids, dates, and course values.
- [ ] Replace fake ZIP progress with an actual download or job-status flow.
- [ ] Verify uppercase compatibility routes:
  - [ ] `/Certificates/view`
  - [ ] `/Certificates/downloadReport`
- [ ] Verify lowercase implementation routes:
  - [ ] `/certificates/view`
  - [ ] `/certificates/download`

Files:

- [ ] `janv-web-next/src/app/certificates/page.tsx`
- [ ] `janv-web-next/src/app/certificates/view/page.tsx`
- [ ] `janv-web-next/src/app/certificates/download/page.tsx`
- [ ] `janv-web-next/src/app/certificates/downloadReport/page.tsx`
- [ ] `janv-web-next/src/lib/api.ts`
- [ ] Add a new migration under `migrations/`
- [ ] `janv-api/src/analytics/mod.rs`

## Phase 10: Templates, FAQs, Passcodes, and Leaderboards

- [ ] Verify template list is loaded from the backend.
- [ ] Verify template fields match the reference card content.
- [ ] Implement create-from-template persistence.
- [ ] Copy template sections and questions transactionally.
- [ ] Verify FAQ list is backend-driven.
- [ ] Verify FAQ ordering and published filtering.
- [ ] Verify passcode responses do not leak stored passcodes unnecessarily.
- [ ] Verify invalid passcode errors are clear but do not reveal assessment existence incorrectly.
- [ ] Verify global leaderboard pagination.
- [ ] Verify assessment leaderboard pagination.
- [ ] Verify tie ranking rules.
- [ ] Verify leaderboard institution/student privacy rules.

Files:

- [ ] `janv-web-next/src/app/assessment/templates/page.tsx`
- [ ] `janv-web-next/src/app/assessment/createfromtemplate/page.tsx`
- [ ] `janv-web-next/src/app/assessment/faq/page.tsx`
- [ ] `janv-web-next/src/app/institute/passcode/page.tsx`
- [ ] `janv-web-next/src/app/assessment/leaderboard/page.tsx`
- [ ] `janv-api/src/assessment/template.rs`
- [ ] `janv-api/src/assessment/passcode.rs`
- [ ] `janv-api/src/assessment/leaderboard.rs`

## Phase 11: Database Schema Gap Work

The original production database schema is not publicly exposed. Unauthenticated API requests return the login HTML, not schema metadata. The items below are the local schema additions suggested by observable reference behavior and must be confirmed against the authorized product requirements before migration.

### Institution structure

- [ ] Add `branches` or `departments` table if branch-level filtering is required.
- [ ] Add `batches` table if batches need metadata, dates, or status.
- [ ] Add institution-admin profile fields for college name, display name, role, and contact metadata.
- [ ] Add foreign keys from students and assessments to institution scope.
- [ ] Add indexes for institution, branch, and batch filtering.

### Assessment visibility

- [ ] Decide whether to retain `institution_visibility UUID[]`.
- [ ] If normalized, add `assessment_institutions` join table.
- [ ] Add `assessment_batches` join table.
- [ ] Add foreign keys and cascading behavior.
- [ ] Add a default visibility policy.
- [ ] Add tests for cross-institution access prevention.

### Learning analytics

- [ ] Add courses/modules/videos tables if the learning dashboard is required.
- [ ] Add student video progress table.
- [ ] Add watch-session or watch-time aggregation fields.
- [ ] Add student ratings/feedback table.
- [ ] Add indexes for student and course analytics.

### Reporting

- [ ] Add normalized assessment report query model or reporting views.
- [ ] Add indexes for student, batch, branch, course, and assessment.
- [ ] Add report job table if downloads are asynchronous.
- [ ] Add report job status and error fields.
- [ ] Add audit records for report generation and download.

### Proctoring

- [ ] Add assessment proctoring configuration fields if not sufficient on `assessments`.
- [ ] Add attempt proctoring event table.
- [ ] Store tab switches, focus changes, fullscreen exits, and timestamps.
- [ ] Define retention and privacy policy for proctoring events.

### Question library

- [ ] Add source/category metadata if required by the library UI.
- [ ] Add tags and search indexes.
- [ ] Add section-question ordering constraints.
- [ ] Add author/institution ownership fields.

### Migration safety

- [ ] Write forward-only migrations.
- [ ] Add indexes concurrently where appropriate in production.
- [ ] Backfill existing rows before making new fields required.
- [ ] Add rollback or recovery instructions for every migration.
- [ ] Test migrations against an empty database.
- [ ] Test migrations against a copy of representative data.
- [ ] Verify foreign-key delete behavior.

## Phase 12: API Contract Verification

For every endpoint below:

- [ ] Verify method and path.
- [ ] Verify authentication requirement.
- [ ] Verify role and institution authorization.
- [ ] Verify request field names.
- [ ] Verify response field names.
- [ ] Verify empty response behavior.
- [ ] Verify validation errors.
- [ ] Verify unauthorized and forbidden responses.
- [ ] Verify not-found responses.
- [ ] Verify pagination metadata.
- [ ] Verify content type.

Endpoints:

- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/refresh`
- [ ] `GET /api/auth/me`
- [ ] `GET /api/v2/assessment/currentTestCode`
- [ ] `GET /api/v2/assessment/currentTestCode/:collegeId`
- [ ] `GET /api/v2/assessment`
- [ ] `POST /api/v2/assessment`
- [ ] `GET /api/v2/assessment/:id`
- [ ] `DELETE /api/v2/assessment/:id`
- [ ] `GET /api/v2/assessment/section/:id`
- [ ] `DELETE /api/v2/assessment/section/:id`
- [ ] `GET /api/v2/questionLibrary`
- [ ] `GET /api/assessments`
- [ ] `POST /api/assessments`
- [ ] `GET /api/analytics/dashboard`
- [ ] `GET /api/analytics/reports/overall`
- [ ] `GET /api/analytics/reports/download`
- [ ] `GET /api/analytics/certificates`
- [ ] `GET /api/analytics/certificates/download`
- [ ] `GET /api/admin/users`
- [ ] `GET /api/assessments/:id/leaderboard`
- [ ] `GET /api/assessments/leaderboard/global`
- [ ] `POST /api/assessments/passcode/verify`

## Phase 13: Browser Validation Matrix

### Public and auth

- [ ] Logged-out `/` redirects to `/adminLogin`.
- [ ] Logged-out `/login` redirects to `/adminLogin`.
- [ ] `/adminLogin` has no sidebar/header.
- [ ] Invalid login displays a non-blocking error.
- [ ] Password visibility works.
- [ ] Remember-me persistence works.
- [ ] Successful login reaches the dashboard.
- [ ] Logout returns to `/adminLogin`.

### Navigation

- [ ] Learning Dashboard opens.
- [ ] View Reports opens.
- [ ] Download Reports opens.
- [ ] Search Student opens.
- [ ] Create Test opens.
- [ ] My Tests opens.
- [ ] Create from Template opens.
- [ ] Pass Code opens.
- [ ] FAQs opens.
- [ ] Leaderboard opens.
- [ ] View Certificates opens.
- [ ] Download Certificate Report opens.
- [ ] No expected route returns 404.

### Assessment workflow

- [ ] Create a test with one MCQ section.
- [ ] Create a test with multiple sections.
- [ ] Create a test with a Coding section.
- [ ] Save and resume a draft.
- [ ] Refresh at each creation step.
- [ ] Submit each step twice quickly.
- [ ] Add questions from the library.
- [ ] Add a custom question.
- [ ] Edit a section.
- [ ] Delete a section with confirmation.
- [ ] Publish a populated test.
- [ ] Attempt to publish an empty test.
- [ ] Schedule a test.
- [ ] Duplicate a test.
- [ ] Set, verify, and remove a passcode.
- [ ] Preview a test.

### Reports and certificates

- [ ] Search a real test student.
- [ ] Search with no result.
- [ ] Verify started/completed counts.
- [ ] Filter overall report by batch.
- [ ] Filter by branch.
- [ ] Filter by course.
- [ ] Change page size.
- [ ] Navigate to another page.
- [ ] Download a non-empty report.
- [ ] Download an empty report.
- [ ] View real certificates.
- [ ] Open a certificate PDF.
- [ ] Download a certificate report.
- [ ] Verify unauthorized certificate access fails.

### Responsive behavior

- [ ] Validate 1440x900.
- [ ] Validate 1024x768.
- [ ] Validate 768x1024.
- [ ] Validate 390x844.
- [ ] Validate 360x800.
- [ ] Confirm no horizontal page overflow except intended tables.
- [ ] Confirm all controls have usable touch targets.
- [ ] Confirm modal content fits mobile width.

## Phase 14: Automated Tests

- [ ] Add unit tests for test-code generation.
- [ ] Add unit tests for visibility normalization.
- [ ] Add unit tests for section validation.
- [ ] Add unit tests for MCQ grading.
- [ ] Add unit tests for multi-select grading.
- [ ] Add unit tests for timer expiration.
- [ ] Add unit tests for leaderboard tie handling.
- [ ] Add API tests for unauthorized access.
- [ ] Add API tests for cross-institution access.
- [ ] Add API tests for report filters and pagination.
- [ ] Add API tests for certificate download headers.
- [ ] Add frontend tests for login visibility and remember-me behavior.
- [ ] Add frontend tests for duplicate-submit guards.
- [ ] Add frontend tests for empty/error/loading states.

## Phase 15: Final Verification Commands

- [ ] `cd janv-web-next && npm run lint`
- [ ] `cd janv-web-next && npm run build`
- [ ] `cargo fmt --all -- --check`
- [ ] `cargo check --workspace`
- [ ] `cargo test --workspace`
- [ ] `docker compose config`
- [ ] Build the production images.
- [ ] Start the production-like stack.
- [ ] Run browser smoke tests against the stack.
- [ ] Search for unfinished mocks:

  `rg -n "mockDatabase|demoStudents|setInterval|hard-coded|sample|fake|placeholder|alert\\(" janv-web-next/src janv-api/src`

- [ ] Search for stale reference-domain dependencies:

  `rg -n "institutions\\.prepinstaprime\\.com|static/media" janv-web-next/src`

- [ ] Search for credentials and secrets:

  `rg -n "password|secret|token|api_key|Ayush7369|SVCET12345|admin123" . --glob '!node_modules/**' --glob '!target/**'`

- [ ] Confirm no real credentials are present in output, logs, or artifacts.

## Definition of Done

- [ ] Frontend lint passes with zero errors.
- [ ] Production build passes.
- [ ] Rust checks and tests pass.
- [ ] All expected reference-compatible routes load successfully.
- [ ] Login behavior and visible text match the reference requirements.
- [ ] Protected routes cannot be accessed without authentication.
- [ ] API requests return JSON errors instead of login HTML.
- [ ] Assessment creation is transactional and persists all selected settings.
- [ ] Questions and sections are fully manageable.
- [ ] Dashboard metrics use correct data sources.
- [ ] Search and reports contain real server-backed data.
- [ ] Report downloads contain real report rows.
- [ ] Certificates are database-backed and viewable/downloadable.
- [ ] Institution and batch isolation is enforced server-side.
- [ ] No critical workflow uses mock data, fake progress, sample records, or blocking alerts.
- [ ] Database migrations are tested on empty and representative databases.
- [ ] Browser validation passes at desktop and mobile sizes.
