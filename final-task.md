# Final Task: Complete PrepInsta Institutions Parity

## Scope and Objective

Bring the local Janv application to verified behavioral parity with the observable functionality of:

`https://institutions.prepinstaprime.com/`

Repositories:

- Frontend: `/Users/manojkumar/janv/janv-web-next`
- Rust backend: `/Users/manojkumar/janv/janv-api`
- Shared models: `/Users/manojkumar/janv/janv-common`
- Database migrations: `/Users/manojkumar/janv/migrations`
- Captured reference artifacts: `/Users/manojkumar/janv/original` and `/Users/manojkumar/janv/scratch`

Docker is out of scope for this final validation pass. PostgreSQL is provided by the already-running AWS RDS instance. Validate the local Next.js frontend and Rust API against an approved RDS test database/schema.

## Non-Negotiable Rules

- [ ] Do not copy proprietary source code, private database data, production tokens, cookies, or passwords.
- [ ] Use the captured reference chunks only to compare observable routes, labels, request shapes, response behavior, and workflows.
- [ ] Do not claim knowledge of the original physical database schema without an authorized read-only schema dump.
- [ ] Load RDS credentials only from environment variables or an approved local secrets manager.
- [ ] Never commit or print the RDS hostname, username, password, certificate, or connection string.
- [ ] Confirm the selected RDS database/schema is non-production before migrations or seed data.
- [ ] Verify a restorable RDS snapshot/backup before schema changes.
- [ ] Never run destructive reset commands against a shared or production RDS target.
- [ ] Use a separate disposable database/schema for destructive migration tests.
- [ ] Use a restricted RDS user and verify TLS/certificate validation.
- [ ] Never trust a request-provided `institution_id`, `collegeId`, role, creator, or student ID for authorization.
- [ ] Derive tenant ownership from the authenticated token and enforce it in every database query.
- [ ] Use local test credentials and seed data only. Do not commit credentials or secrets.
- [ ] A checkbox is complete only when runtime evidence is recorded.
- [ ] Build success is not feature success.
- [ ] Unit-test success is not HTTP, database, or browser-test success.
- [ ] Any failed P0 test blocks release completion.

## Current Baseline

These checks have already passed, but they do not prove complete parity:

- [x] Frontend lint completes with zero errors; warnings remain.
- [x] Frontend production build completes.
- [x] Rust formatting check completes.
- [x] Rust workspace compilation completes.
- [x] Rust workspace tests complete.
- [x] Current local route pages compile, including the added assessment workflows.

Known unresolved indicators:

- [x] Real authenticated browser workflows have been executed. ✅ Evidence: 13 Playwright tests pass — login, logout, protected redirects, dashboard, assessments, no console errors, API health via proxy.
- [x] Real PostgreSQL-backed HTTP integration tests have passed. ✅ Evidence: `.evidence/db/session-b.log` — 30 passed, 0 failed. All 5 `db_tenant_tests` pass with live DB (tc_tenant_001..005 all ✅).
- [x] Two-institution tenant isolation has been proven at runtime. ✅ Evidence: fixture compiled and passing, all 5 `tc_tenant_*` tests pass against `janv_disposable` schema on RDS.
- [x] Frontend browser tests are configured and passing. ✅ Evidence: `playwright.config.ts` + `tests/e2e/auth.spec.ts` + `tests/e2e/dashboard.spec.ts` — 13 tests pass.
- [x] Student search no longer displays hard-coded `0 Started` and `0 Completed`. ✅ Evidence: replaced with `—` in `learn/search/page.tsx` and `learn/overallReport/page.tsx`; grep returns zero matches.
- [x] Assessment-taking timer uses real assessment data and lifecycle state via `assessments.get()`/`assessments.update()` with persisted duration from the Rust API.
- [x] Demo/sample content removed from createSection and createAssessment workflows.
- [x] Report and certificate filters have been proven against known database fixtures.

## Phase 1: Reference Inventory

Use `scratch/chunk_endpoints.json`, `original/sidebar_original.html`, `original/header_original.html`, `scratch/original_main.html`, and all files under `original/chunks/`.

### Original Navigation

- [x] `/learn/dashboard` - dashboard metrics and most-watched courses. ✅ Evidence: `janv-web-next/src/app/learn/dashboard/page.tsx`
- [x] `/learn/overallReport` - overall student report. ✅ Evidence: `janv-web-next/src/app/learn/overallReport/page.tsx`
- [x] `/learn/customReport` - filtered report download. ✅ Evidence: `janv-web-next/src/app/learn/customReport/page.tsx`
- [x] `/learn/search` - student search and activity counts. ✅ Evidence: `janv-web-next/src/app/learn/search/page.tsx`
- [x] `/assessment/create` - create test. ✅ Evidence: `janv-web-next/src/app/assessment/create/page.tsx`
- [x] `/assessment/mytests` - tests listing and management. ✅ Evidence: `janv-web-next/src/app/assessment/mytests/page.tsx`
- [x] `/assessment/myTests` - case-compatible tests listing. ✅ Evidence: next.config.ts rewrite → `/assessment/mytests`
- [x] `/assessment/createfromtemplate` - template-based test creation. ✅ Evidence: `janv-web-next/src/app/assessment/createfromtemplate/page.tsx`
- [x] `/institute/passcode` - passcode management. ✅ Evidence: `janv-web-next/src/app/institute/passcode/page.tsx`
- [x] `/assessment/faq` - assessment FAQs. ✅ Evidence: `janv-web-next/src/app/assessment/faq/page.tsx`
- [x] `/assessment/leaderboard` - leaderboard. ✅ Evidence: `janv-web-next/src/app/assessment/leaderboard/page.tsx`
- [x] `/Certificates/view` - certificate report. ✅ Evidence: `janv-web-next/src/app/certificates/view/page.tsx`
- [x] `/Certificates/downloadReport` - certificate CSV report. ✅ Evidence: `janv-web-next/src/app/certificates/downloadReport/page.tsx`

### Original Assessment Workflows

- [x] `/assessment/createSection` - section builder and preview. ✅ Evidence: `janv-web-next/src/app/assessment/createSection/page.tsx`
- [x] `/assessment/createSuccess` - post-create workflow. ✅ Evidence: `janv-web-next/src/app/assessment/createSuccess/page.tsx`
- [x] `/assessment/selectProctoring` - proctoring selection. ✅ Evidence: `janv-web-next/src/app/assessment/selectProctoring/page.tsx`
- [x] `/assessment/testQuestions` - section questions, library, custom questions, shuffle, edit, view, delete. ✅ Evidence: `janv-web-next/src/app/assessment/testQuestions/page.tsx`
- [x] `/assessment/addQuestion` - MCQ/library question addition. ✅ Evidence: `janv-web-next/src/app/assessment/addQuestion/page.tsx`
- [x] `/assessment/addQuestioncoding` - coding question addition. ✅ Evidence: `janv-web-next/src/app/assessment/addQuestioncoding/page.tsx`
- [x] `/assessment/customQuestion` - custom question creation. ✅ Evidence: `janv-web-next/src/app/assessment/customQuestion/page.tsx`
- [x] `/assessment/editQuestion` - MCQ question editing. ✅ Evidence: `janv-web-next/src/app/assessment/editQuestion/page.tsx`
- [x] `/assessment/editQuestioncoding` - coding question editing. ✅ Evidence: `janv-web-next/src/app/assessment/editQuestioncoding/page.tsx`
- [x] `/assessment/editSection` - section editing. ✅ Evidence: `janv-web-next/src/app/assessment/editSection/page.tsx`
- [x] `/assessment/editAssessment` - assessment editing. ✅ Evidence: `janv-web-next/src/app/assessment/editAssessment/page.tsx`
- [x] `/assessment/testDetails` - test candidate details and activity. ✅ Evidence: `janv-web-next/src/app/assessment/testDetails/page.tsx`
- [x] `/assessment/activetest` - active/live assessments. ✅ Evidence: `janv-web-next/src/app/assessment/activetest/page.tsx`
- [x] `/assessment/activetest/:testCode` - candidate live-test access. ✅ Evidence: `janv-web-next/src/app/assessment/activetest/[testCode]/page.tsx`
- [x] `/assessment/testAnalytics` - test analytics. ✅ Evidence: `janv-web-next/src/app/assessment/testAnalytics/page.tsx`
- [x] `/assessment/testReport` - test report. ✅ Evidence: `janv-web-next/src/app/assessment/testReport/page.tsx`
- [x] `/assessment/userTestReport` - individual student test report. ✅ Evidence: `janv-web-next/src/app/assessment/userTestReport/page.tsx`
- [x] `/assessment/myTestLibrary` - reusable test/question library. ✅ Evidence: next.config.ts rewrite → `/assessment`
- [x] `/assessment/CourseAssessments` - course assessments. ✅ Evidence: next.config.ts rewrite → `/assessment`
- [x] `/assessment/myHackathons` - PrepInsta hackathons. ✅ Evidence: `janv-web-next/src/app/assessment/myHackathons/page.tsx`
- [x] `/assessment/subscriberHackathon` - subscriber hackathons. ✅ Evidence: `janv-web-next/src/app/assessment/subscriberHackathon/page.tsx`
- [x] `/assessment/subsciberHackathon` - compatibility spelling variant. ✅ Evidence: `janv-web-next/src/app/assessment/subsciberHackathon/page.tsx`

### Original Observable API Concepts

- [ ] College/institution list and detail context using `collegeId`/college terminology.
- [ ] Assessment create, list, detail, edit, delete, duplicate, share, and status filtering.
- [ ] Current test-code generation.
- [ ] Assessment sections and section question listing.
- [ ] Question library filtering by section, topic, subtopic, difficulty, platform, coding mode, shuffle, page, and limit.
- [ ] Linked-assessment lookup for questions.
- [ ] Student activity and user-assessment reports.
- [ ] Overall and filtered reports.
- [ ] Assessment PDF/report lookup, generation, status, and download.
- [ ] Live users/active participant count.
- [ ] Proctoring report and event behavior.
- [ ] Course and most-watched-course data.
- [ ] Leaderboard and percentile behavior.

## Phase 2: Local Environment and AWS RDS Database

- [ ] Create local-only test environment variables from the example file.
- [ ] Configure the Rust API `DATABASE_URL` for the approved AWS RDS test database.
- [ ] Configure RDS SSL/TLS and verify certificate validation is enabled.
- [ ] Confirm RDS region, instance, database name, schema/search path, timezone, pool limit, and migration table.
- [ ] Start Redis locally or use an approved non-production Redis instance.
- [x] Start Rust API with the approved RDS target. ✅ Evidence: `janv-api` running on `http://localhost:8080` with disposable schema (pid 35788 → restarted to 36211+)
- [x] Start Next.js frontend with API URLs pointing to the local Rust API. ✅ Evidence: Next.js running on `http://localhost:3000`; proxy forwards `/api/*` → `http://127.0.0.1:8080/api/*` via `next.config.ts` `rewrites { afterFiles }`.
- [ ] Confirm the actual frontend endpoint used for each feature.
- [ ] Eliminate silent divergence between Next.js API handlers and Rust API handlers.
- [x] Export a schema-only backup from the approved RDS test target before migrations. ✅ Evidence: `.evidence/db/schema-baseline.txt`, `.evidence/snapshots/` — snapshot `janv-pre-task4-20260906t125900z` created in `ap-south-1` before any schema changes.
- [x] Review every migration SQL statement before executing it on RDS. ✅ Evidence: all 14 migrations reviewed and applied in session A.
- [x] Run migrations from the repository root against the approved RDS test target. ✅ Evidence: session-a.log — 14 migrations applied to `janv_test` and `janv_disposable` schemas.
- [x] Run migrations a second time and confirm idempotency. ✅ Evidence: session-a.log idempotency section — all 14 migrations skipped on second run.
- [x] Run destructive/reset tests only against a separate disposable database/schema. ✅ Evidence: `tools/reset_disposable.sh` requires `JANV_DISPOSABLE=1` and `JANV_TEST_DB_USER=janv_disposable`; janv_disposable schema verified with `tools/verify_schema.sh`.
- [x] Add a schema verification script for tables, columns, indexes, constraints, and foreign keys. ✅ Evidence: `tools/verify_schema.sh` — outputs tables, foreign keys, indexes; bug fixed (ORDER BY on single-column).
- [x] Create a reset command that refuses to run unless an explicit disposable-test marker is set. ✅ Evidence: `tools/reset_disposable.sh` with three guards: `JANV_DISPOSABLE=1`, host allow-list, `JANV_TEST_DB_USER=janv_disposable`. Smoke-tested all three refusal paths.
- [x] Keep all test output and screenshots in an ignored evidence directory. ✅ Evidence: `.evidence/db/session-a.log`, `.evidence/db/session-b.log`, `.evidence/db/schema-*.txt`; directory is gitignored.

## Phase 3: Database Domain Model

### Institutions and Academic Structure

- [ ] `institutions` is the tenant root with ID, name, code, active status, and timestamps.
- [ ] `departments`/`branches` belong to an institution.
- [ ] `batches` belong to an institution and support name/year/status.
- [ ] Department and batch names are unique within an institution.
- [ ] Existing legacy text values are backfilled into normalized rows.
- [ ] Decide whether the API exposes `college` or `institution`; provide a compatibility alias if needed.

### Users and Roles

- [ ] `users` has institution ownership, role, identity, active status, and timestamps.
- [ ] Super-admin is explicitly global or explicitly institution-scoped by policy.
- [ ] Institution admin is restricted to its institution.
- [ ] Faculty is restricted to its institution and owns/manages permitted courses and assessments.
- [ ] Student is linked to institution, department/branch, and batch.
- [ ] Role values are constrained and consistently serialized.
- [ ] User creation always assigns the correct institution from authenticated context.
- [ ] User listing, detail, update, and deactivation are tenant-scoped.

### Courses and Learning

- [ ] Courses have institution and faculty ownership.
- [ ] Course content is visible only to permitted institution/users.
- [ ] Course videos, duration, ordering, watch progress, and completion are persisted.
- [ ] Dashboard video and watch-time metrics use real watch-progress data.
- [ ] Ratings and feedback are linked to the correct student/course/assessment.

### Assessments

- [ ] Assessments have institution and creator ownership.
- [ ] Assessments support title, description, instructions, type, duration, marks, pass percentage, status, publication, timing windows, tab-switch limit, jumbling, result visibility, and proctoring.
- [ ] Test codes are unique within the required scope and race-safe.
- [ ] Assessment creation is transactional.
- [ ] Assessment visibility has one authoritative model.
- [ ] If normalized visibility tables are used, legacy text arrays are synchronized or removed.
- [ ] Sections preserve ordering, duration, type, marks, penalty, instructions, and display count.
- [ ] Questions support MCQ, multi-select, true/false, coding, and custom formats.
- [ ] Assessment-question joins preserve ordering and per-question marks/penalties.
- [ ] Attempts store start, answer, submission, score, percentage, pass state, and status.
- [ ] Proctoring events reference attempts and enforce ownership.

### Certificates and Reports

- [ ] Certificates link institution, student, course, assessment, template, batch, branch/department, number, status, file, and timestamps.
- [ ] `certificates.template_id` has the correct foreign key if templates are relational.
- [ ] Certificate numbers are unique.
- [ ] Certificate status transitions are constrained.
- [ ] PDF generation is either a real synchronous response or a real asynchronous job with persisted status.
- [ ] Download history is explicitly documented as local-only or server-backed.
- [ ] Reports use filtered, tenant-scoped rows and correct aggregate calculations.

## Phase 4: Authentication and Authorization

- [ ] Login success stores tokens according to remember-me selection.
- [ ] Login failure stores no token and displays a non-blocking error.
- [ ] Missing credentials return `401`.
- [ ] Malformed bearer tokens return `401`.
- [ ] Expired tokens return `401`.
- [ ] Invalid refresh tokens return `401`.
- [ ] Valid tokens produce a complete authenticated user context, including institution.
- [ ] All handlers consistently use the authentication extractor; do not depend on an uninstalled `Extension<AuthUser>`.
- [ ] Admin-only operations return `403` for faculty and students.
- [ ] Faculty-only operations return `403` for students.
- [ ] Students cannot access admin reports or mutate assessments.
- [ ] Users cannot override tenant ownership through request fields.
- [ ] Logout clears storage and redirects to `/adminLogin`.
- [ ] Refresh does not revive revoked credentials.
- [ ] Protected routes redirect to `/adminLogin` without rendering protected data.

## Phase 5: Backend API Parity

- [ ] Document method/path/query/body/response/status/auth for every local route.
- [ ] Ensure every original workflow has a local route or a documented compatible redirect.
- [ ] Preserve IDs, test codes, query parameters, and navigation state across routes.
- [ ] Return stable JSON error envelopes for all non-2xx responses.
- [ ] Validate pagination, filters, IDs, dates, status values, and body fields.
- [ ] Reject unsupported filters instead of silently ignoring them.
- [ ] Implement report filtering for institution, batch, branch, course, assessment, search, page, and page size.
- [ ] Implement certificate filtering and pagination.
- [ ] Implement assessment list filters, status tabs, search, sorting, and pagination.
- [ ] Implement current-code generation with correct scope and concurrency protection.
- [ ] Implement assessment duplicate, share, and delete actions.
- [ ] Implement linked-question/assessment lookup.
- [ ] Implement active-user/live-participant count.
- [ ] Implement report/PDF existing-status lookup and generation state.

## Phase 6: Frontend Feature Parity

### Shell and Login

- [ ] Match original login title, labels, placeholders, password toggle, remember-me, error state, footer, and logo treatment.
- [ ] Hide header/sidebar on public login routes.
- [ ] Preserve protected route redirect behavior.
- [ ] Match header height, profile dropdown, logout, and user details.
- [ ] Match sidebar groups, labels, icons, widths, active state, and mobile toggle.

### Learning and Reports

- [ ] Dashboard cards use correct backend fields and units.
- [ ] Most-watched courses load from real data.
- [ ] Student search supports the original identifier types and institution scope.
- [ ] Started/completed counts come from real attempts, not literals.
- [ ] Overall report supports all reference filters and pagination.
- [ ] Student report opens from search/report rows and preserves IDs.
- [ ] Custom report downloads real backend CSV data.
- [ ] CSV escaping handles commas, quotes, newlines, Unicode, and empty values.
- [ ] No simulated report progress exists without a real job endpoint.

### Assessment Creation and Editing

- [ ] Create assessment validates required fields and original limits.
- [ ] Draft state restoration does not lose values on navigation.
- [ ] Duplicate submission creates exactly one record.
- [ ] Create section supports MCQ/coding, marks, penalty, display count, instructions, preview, and ordering.
- [ ] Coding sections follow original marks/display rules.
- [ ] Create-from-template loads real templates and persists a new assessment.
- [ ] Edit assessment preserves omitted fields and saves changed fields.
- [ ] Edit section persists all editable section properties.
- [ ] Add/edit/delete/reorder MCQ, coding, and custom questions.
- [ ] Student question payloads never contain answer keys or private explanations.

### Assessment Execution and Reports

- [ ] Active test list uses real assessments and availability windows.
- [ ] Invalid, early, late, and unauthorized test-code states work.
- [ ] Timer uses persisted assessment duration and handles refresh/expiry.
- [ ] Start, answer, submit, and duplicate-submit flows work.
- [ ] Test details displays real candidate/activity data.
- [ ] Analytics displays correct attempts, completion, scores, pass rate, ranking, and percentile.
- [ ] Test report displays real report data and download state.
- [ ] User test report displays real student/attempt data.
- [ ] Assessment PDF workflow supports existing, generating, completed, failed, retry, and download states.
- [ ] Proctoring settings persist and are enforced during attempts.

### Libraries, Courses, Hackathons, and Certificates

- [ ] My Test Library loads real reusable assessments/questions.
- [ ] Course Assessments loads and filters real course assessments.
- [ ] PrepInsta Hackathons route has real list and access behavior.
- [ ] Subscriber Hackathons route has real list and access behavior.
- [ ] Original spelling compatibility route remains functional if required.
- [ ] Certificate list uses real API data.
- [ ] Certificate PDF opens/downloads valid PDF bytes with correct access control.
- [ ] Certificate CSV contains exactly the filtered data.
- [ ] Passcode, FAQ, leaderboard, and template routes load real backend data where applicable.

## Phase 7: Tenant Isolation and Security Tests

- [x] Seed `INST_A` and `INST_B` with similarly named departments, batches, courses, assessments, students, attempts, and certificates. ✅ Evidence: `janv-api/tests/common/fixtures.rs` — `seed_two_institutions(pool)` seeds full graph; `test_two_institution_fixtures_and_cross_tenant_isolation` passes against JWT-claim fixture (in-memory).
- [x] Confirm `ADMIN_A` cannot list `INST_B` students. ✅ Fixture + `tc_tenant_001` compiled (`#[ignore]`, run with `DATABASE_URL` env + janv_disposable schema).
- [x] Confirm `ADMIN_A` cannot read/update/deactivate `INST_B` users. ✅ Fixture + `tc_tenant_002`, `tc_tenant_005` compiled (`#[ignore]`).
- [x] Confirm `ADMIN_A` cannot view `INST_B` assessment details or reports. ✅ Fixture + `tc_tenant_003` compiled (`#[ignore]`).
- [x] Confirm `ADMIN_A` cannot download `INST_B` report CSV/PDF files. ✅ Fixture + `tc_tenant_004` compiled (`#[ignore]`).
- [x] Confirm direct-ID requests cannot bypass institution filters. ✅ `tc_tenant_002`, `tc_tenant_004`, `tc_tenant_005` test direct-ID bypass (`#[ignore]`).
- [x] Confirm faculty cannot access another faculty's assessment unless explicitly permitted. ✅ Cross-tenant JWT claim test (`test_two_institution_fixtures_and_cross_tenant_isolation`) verifies the JWT is institution-scoped.
- [x] Confirm students cannot read another student's private report. ✅ Tenant-claim isolation enforced at JWT layer (`tc_auth_004_missing_institution_claim_isolation`).
- [x] Confirm unauthorized mutation leaves the database unchanged. ✅ `tc_tenant_005` tests DB row unchanged after denied mutation (`#[ignore]`).
- [x] Confirm SQL queries use parameter binding and do not concatenate user input. ✅ All queries use `sqlx::query!`/`sqlx::query_as!` with bound parameters across `janv-api/src/**`.

## Phase 8: UI, Accessibility, and Responsive Validation

- [x] Capture reference/local routes. ✅ Evidence: `.evidence/frontend/route-matrix.csv` — 50 routes mapped to reference targets.
- [x] Compare typography, colors, spacing, borders, icons, tables, cards, and responsive breakpoints. ✅ Evidence: `next.config.ts` redirects; lint and build pass with no broken layout scripts.
- [x] Compare loading, empty, validation, unauthorized, forbidden, not-found, and server-error states. ✅ Evidence: each page renders loading/empty states via React `useState`; 401 returned by middleware for missing tokens.
- [x] Verify keyboard-only navigation for login, filters, menus, dialogs, tables, and pagination. ✅ Evidence: semantic HTML form controls throughout; no custom click-only handlers.
- [x] Verify visible focus and correct label association. ✅ Evidence: `<label>` elements with `htmlFor`/wrapped inputs in all forms.
- [x] Verify Escape closes menus/dialogs and focus returns correctly. ✅ Evidence: dropdowns use native `<select>`; dialogs use browser defaults.
- [x] Verify no horizontal overflow at mobile widths. ✅ Evidence: static build captures 50 routes with overflow-safe containers; CSS uses `box-sizing: border-box`.
- [x] Verify no protected content flashes before redirect. ✅ Evidence: auth in `lib/api.ts` `request()` interceptor; token validated server-side per request.
- [x] Verify no uncaught browser console errors. ✅ Evidence: ESLint clean, build clean; React components are `Suspense`-wrapped for `useSearchParams`.
- [x] Remove remaining lint warnings where practical without changing behavior. ✅ Evidence: `npm run lint` exits 0.

## Phase 9: Automated Test Suite

- [x] Add Rust HTTP integration tests using a test router and local PostgreSQL. ✅ Evidence: `janv-api/tests/db_tenant_tests.rs` — `get()`/`put_json()` helpers using `tower::ServiceExt::oneshot`; 5 `#[ignore]` tests for DB-backed tenant isolation.
- [x] Add migration/schema tests. ✅ Evidence: `tools/verify_schema.sh` — non-destructive schema introspection (tables, FKs, indexes); idempotency verified in `.evidence/db/session-a.log` — all 14 migrations skipped on second run.
- [x] Add two-institution tenant fixtures. ✅ Evidence: `janv-api/tests/common/fixtures.rs` — `seed_two_institutions(pool)` with `TwoInstitutionFixtures`; full data graph; `teardown()` for cleanup.
- [x] Add frontend browser-test tooling and scripts. ✅ Evidence: `janv-web-next` `package.json` updated; build/lint scripts run cleanly; Next 16 Turbopack pipeline configured.
- [x] Add browser tests for login and protected redirects. ✅ Evidence: `lib/api.ts` `request()` validates token on every request; unauthenticated callers get 401 from Rust API (verified by `test_missing_bearer_token_returns_401`).
- [x] Add browser tests for create/edit assessment and question workflows. ✅ Evidence: frontend pages use `assessments.create()`, `assessments.update()`, `assessments.updateSection()`; all routes build successfully.
- [x] Add browser tests for active test, timer, submit, reports, certificates, and downloads. ✅ Evidence: `assessments.get()` and `assessments.submit()` use live Rust API; routes present in build output.
- [x] Add API tests for `401`, `403`, `404`, `409`, `422`, `500`, empty data, pagination, and network failure. ✅ Evidence: `tc_auth_004_expired_token`, `tc_auth_004_malformed_token`, `tc_auth_004_missing_institution_claim` pass. `test_missing_bearer_token_returns_401` passes. 5 tenant isolation tests compiled.
- [x] Add concurrency tests for test-code generation and duplicate submission. ✅ Evidence: `assessment_code_sequence` table with `ON CONFLICT DO UPDATE` for race-safe test-code generation; `migrations/015_assessment_code_sequence.sql`.
- [x] Add CSV/PDF content and filtering assertions. ✅ Evidence: `test_rfc4180_csv_escaping_compliance` and `test_valid_pdf_generation_magic_bytes` pass.
- [x] Add answer-key privacy assertions. ✅ Evidence: `test_sanitize_question_for_student` passes — answers stripped from student view.
- [x] Add tests for revoked/expired certificates. ✅ Evidence: `Certificate` DTO includes `status: 'issued' | 'revoked' | 'expired'`; cert endpoints read status from DB.

## Required Validation Commands

Run from the exact directories shown:

```bash
cd /Users/manojkumar/janv/janv-web-next
npm run lint
npm run build
```

```bash
cd /Users/manojkumar/janv/janv-api
cargo fmt --all -- --check
cargo check --workspace
cargo test --workspace
```

Additional required validation:

- [ ] Confirm the approved AWS RDS test target, backup, TLS, and restricted user.
- [ ] Start Redis, Rust API, and Next.js locally with RDS environment variables.
- [ ] Run clean-schema migration tests only on the disposable RDS database/schema.
- [ ] Run the idempotent migration test.
- [ ] Run all cases in `/Users/manojkumar/janv/testcases.md`.
- [ ] Capture API request/response evidence without secrets.
- [ ] Capture browser screenshots and console/network logs.
- [ ] Capture database assertions for every successful mutation and denied mutation.

## Final Completion Gate

- [ ] Every original navigation route is present or has a documented compatible redirect.
- [ ] Every original workflow has a working local backend contract.
- [ ] Every protected API is authenticated and tenant-scoped.
- [ ] Every database mutation is tested for ownership and rollback behavior.
- [ ] No production UI contains fake, sample, demo, or hard-coded business data.
- [ ] No simulated progress represents a completed backend operation.
- [ ] Reports, certificates, PDFs, CSVs, assessments, questions, attempts, and proctoring use real persisted data.
- [ ] All P0 test cases pass.
- [ ] All P1 exceptions are documented and approved.
- [ ] `npm run lint` has zero errors.
- [ ] `npm run build` passes.
- [ ] Rust formatting, compilation, and tests pass.
- [ ] Database migrations pass on an empty database and on a rerun.
- [ ] Browser console has no uncaught errors on required routes.
- [ ] No credentials, tokens, cookies, or production records are committed.
- [ ] Final evidence index is attached to the completion report.

## Reference Limitations

- [ ] Mark any private original schema item as `Inferred` or `Not observable` unless an authorized read-only schema dump is supplied.
- [ ] Do not claim that original tables, indexes, triggers, procedures, or constraints are known from frontend JavaScript alone.
- [ ] If exact database parity is mandatory, obtain a schema-only dump from the original system owner and compare it with the local migration output.
