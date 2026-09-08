# Task 4: Runtime Parity, Data Correctness, and Security Validation

## Purpose

Task 3 contains broad completion checkboxes, but the current repository only proves compilation and a small set of unit tests. This task is the next controlled iteration: validate the local frontend, Rust backend, PostgreSQL schema, and observable behavior against the reference portal at `https://institutions.prepinstaprime.com/`.

The target is behavioral parity, not copying private source code or bypassing the reference application's authentication. Use only routes, labels, network contracts, and behavior that are legitimately observable from the reference portal and from the existing captured artifacts in this repository.

## Evidence Rules

- [ ] Do not mark a checkbox from source inspection alone when it requires runtime behavior.
- [ ] Record the command, URL, fixture IDs, response status, and a screenshot or response sample for every completed runtime item.
- [ ] Never commit usernames, passwords, access tokens, cookies, or database connection strings.
- [ ] Use seeded local test accounts and two local institutions, `INST_A` and `INST_B`, for authorization tests.
- [ ] Do not use the reference account to create, edit, delete, or download real production data.
- [ ] A test passes only when the expected response, database mutation, and visible UI state all agree.
- [ ] If the reference behavior cannot be observed without private access, document it as `Not observable` rather than inventing a schema or response.

## Current Audit Verdict

### Verified locally

- [x] `npm run lint` completes with zero errors; warnings remain for `<img>` and `window.location` usage.
- [x] `npm run build` completes and produces the current route set.
- [x] `cargo check --workspace` completes successfully.
- [x] `cargo test --workspace` completes successfully.
- [x] `cargo fmt --all -- --check` completes successfully.
- [x] The local public login route renders and protected unauthenticated routes redirect to `/adminLogin`.
- [x] Local API code contains report and certificate route definitions.

### Not verified or currently mismatching

- [ ] The backend has not been proven through authenticated HTTP requests against a migrated local PostgreSQL database.
- [ ] Existing Rust tests do not test real Axum routes, SQL queries, migrations, response status codes, or tenant isolation.
- [ ] `learn/search` still displays literal `0 Started` and `0 Completed` values instead of student-specific attempt counts.
- [ ] Dashboard/report metric semantics must be checked: attempts, average score, pass rate, videos watched, and watch time must not be substituted for one another.
- [ ] Certificate list and download pages need a complete runtime check; download history is local browser state, not server-backed history.
- [ ] Custom report filter behavior must be verified. Backend code currently needs explicit validation that course and assessment filters affect both row data and CSV output.
- [ ] Certificate PDF behavior must be verified as a real PDF response or a valid reference-compatible file URL, not only a browser navigation.
- [ ] Admin user handlers require institution and role authorization review; list/get/update/deactivate queries must not expose or mutate another institution.
- [ ] Assessment creation has both Next.js API and Rust API implementations. The frontend and backend must use one consistent contract and transaction path.
- [ ] The normalized schema additions need migration execution, backfill, foreign-key validation, and rollback/re-run testing.
- [ ] The local login DOM is close to the reference but not identical: local adds a sign-in subtitle and uses different logo/button accessibility semantics. Decide whether exact visual parity is required and validate it with screenshots.

## Phase 1: Establish a Reproducible Local Environment (P0)

- [ ] Create a local `.env.test` from the example environment without committing it.
- [ ] Start PostgreSQL, Redis, Rust API, and Next.js frontend using local non-production ports.
- [ ] Confirm the frontend API base URL points to the running local Rust API for Rust routes.
- [ ] Confirm Next.js `/api/v2/*` handlers and Rust `/api/*` handlers are not silently serving different records for the same feature.
- [ ] Run migrations against an empty test database from the repository root.
- [ ] Run migrations a second time and confirm they are idempotent.
- [ ] Seed two institutions, two admin/faculty users, students in each institution, batches, branches, courses, assessments, attempts, certificates, and ratings.
- [ ] Save the seed IDs in a local-only test fixture file or environment variables; never commit credentials.
- [ ] Add a documented reset command that drops and recreates only the test database.

## Phase 2: Authentication and Authorization (P0)

- [ ] Add an HTTP integration test for every protected router: missing credentials returns `401`, malformed bearer token returns `401`, expired token returns `401`, and valid token reaches the handler.
- [ ] Confirm `AuthUser` extraction works consistently in every handler; do not mix an extractor with an `Extension<AuthUser>` unless the extension is explicitly installed.
- [ ] Enforce role checks on admin-only, faculty-only, and student-only operations.
- [ ] Verify a user from `INST_A` cannot read, update, deactivate, or download records belonging to `INST_B`.
- [ ] Verify a user with a valid token but insufficient role receives `403`, not `500` or an empty success response.
- [ ] Verify logout removes local and session tokens and protected pages redirect to `/adminLogin` after logout.
- [ ] Verify refresh rotates or renews access tokens correctly and does not resurrect a revoked/expired refresh token.
- [ ] Verify remember-me persistence survives a browser restart only when selected; a non-remembered session must not be stored in local storage.
- [ ] Add a negative test proving user-supplied `institution_id` cannot override the institution in the authenticated token.

## Phase 3: API Contract and Routing Parity (P0)

- [ ] Build a route inventory from the captured reference chunks and compare it to the local route inventory.
- [ ] For each implemented route, record method, path, query parameters, request body, response envelope, status codes, and auth requirement.
- [ ] Implement or explicitly defer every reference workflow route: test questions, add question, coding question, custom question, edit section, edit assessment, proctoring selection, course assessments, test library, hackathons, templates, FAQs, passcode, leaderboard, reports, and certificates.
- [ ] Remove duplicate implementations where the same operation is exposed by both Next.js and Rust with different persistence or response shapes.
- [ ] Verify route casing and redirects on a case-sensitive filesystem, including `/assessment/myTests`, `/Certificates/view`, and `/Certificates/downloadReport`.
- [ ] Verify every non-2xx response has a stable JSON error envelope that the frontend can render without a blank page.
- [ ] Verify pagination boundaries: empty page, first page, last page, page beyond total, invalid page, and maximum page size.
- [ ] Verify all query parameters are either implemented or rejected explicitly; do not silently ignore `course`, `assessment_id`, branch, batch, or search filters.

### Original Route Coverage Gap List

The captured original route inventory contains the following workflows. A local dynamic page is not automatically equivalent: it must accept the same URL shape, load the same record, preserve query/state parameters, and expose the same actions.

- [ ] Add or validate `/assessment/selectProctoring`, including service selection, persistence, edit behavior, and student-facing enforcement.
- [ ] Add or validate `/assessment/activetest` and `/assessment/activetest/:testCode`, including live test lookup, candidate access, start window, end window, and unavailable states.
- [ ] Add or validate `/assessment/testDetails`, including user/test lookup, pagination, search, clear, and no-user-found states.
- [ ] Add or validate `/assessment/testAnalytics`, including total attempts, completion, scores, percentile/ranking, and filters.
- [ ] Add or validate `/assessment/testReport`, including report loading, empty/error states, and download behavior.
- [ ] Add or validate `/assessment/userTestReport`, including student activity and individual attempt/report navigation.
- [ ] Add or validate `/assessment/myTestLibrary`, including library listing and reuse/create-from-library behavior.
- [ ] Add or validate `/assessment/CourseAssessments`, including course-assessment filtering and navigation.
- [ ] Add or validate `/assessment/myHackathons`, including PrepInsta Hackathon behavior and access rules.
- [ ] Add or validate `/assessment/subscriberHackathon` and the original spelling variant `/assessment/subsciberHackathon` if existing links depend on it.
- [ ] Add or validate `/assessment/editQuestion` and `/assessment/editQuestioncoding`, or provide route-compatible redirects that preserve all original identifiers.
- [ ] Add or validate `/assessment/testQuestions` actions for library selection, custom questions, shuffle, add, edit, view, delete, and linked-assessment warnings.
- [ ] Add or validate assessment PDF generation/retrieval, including existing-report lookup, asynchronous generation state, ready link, failed state, and repeat download.
- [ ] Confirm `/assessment/myTests` and `/assessment/mytests` both preserve filters, status tabs, pagination, test details, report, share, duplicate, edit, and delete actions.
- [ ] Compare original route behavior with local routes using the route matrix in `testcases.md`; do not mark a route complete based only on a build manifest entry.

## Phase 4: Reports, Dashboard, Search, and Certificates (P0)

- [ ] Replace `learn/search` placeholder started/completed values with counts from the backend for each returned student.
- [ ] Verify search matches the reference's accepted identifiers and returns only students visible to the authenticated institution.
- [ ] Verify dashboard cards use the correct source fields and units. `total_attempts` must not be displayed as videos watched, and average score must not be displayed as watch time.
- [ ] Verify dashboard counts with seeded known values and compare the returned JSON to the expected fixture totals.
- [ ] Verify overall report filters by institution, batch, branch, course, assessment, search, page, and page size.
- [ ] Verify overall report totals and aggregate statistics are calculated over the filtered tenant-scoped set, not global rows.
- [ ] Verify student report rejects a student from another institution and returns correct attempts, scores, pass state, and course data.
- [ ] Verify custom report CSV headers, escaping of commas/quotes/newlines, UTF-8 encoding, row count, applied filters, and filename.
- [ ] Remove simulated progress timers. Show progress only when a real asynchronous backend job exists; otherwise show a determinate request state.
- [ ] Verify certificate list filters and pagination against seeded certificates.
- [ ] Add/verify assessment filtering for certificate list and CSV download if the reference exposes it.
- [ ] Verify certificate PDF response content type, status, filename, access control, and that the downloaded bytes are a valid PDF.
- [ ] Decide whether download history is intentionally local-only or needs a backend audit/job table; document the decision and test it.
- [ ] Verify revoked and expired certificates cannot be presented as issued.

## Phase 5: Assessment Lifecycle and Question Workflows (P0)

- [ ] Create an assessment with multiple sections and verify one database transaction creates the assessment, sections, visibility records, and question relationships.
- [ ] Submit the create form twice rapidly and verify only one assessment is created.
- [ ] Verify generated test codes are unique, deterministic according to the reference rule, scoped correctly, and race-safe under concurrent requests.
- [ ] Verify `display_questions` is persisted and enforced; coding sections must follow the reference behavior.
- [ ] Verify institution and batch visibility is stored in normalized tables and is reflected in read/list permissions.
- [ ] Add question, coding question, custom question, edit question, delete question, and reorder question tests.
- [ ] Verify answer keys and explanations are never returned in student-facing question responses.
- [ ] Verify assessment edit preserves fields not included in a partial update.
- [ ] Verify timer start, pause/resume rules, expiry, submission, duplicate submission, and grading with known fixtures.
- [ ] Verify proctoring events are persisted with an attempt ID and cannot be written to another user's attempt.

## Phase 6: Database Schema and Data Integrity (P0)

- [ ] Review every added table against actual query usage and add missing foreign keys, especially `certificates.template_id -> certificate_templates.id` if templates are relational.
- [ ] Decide whether batch/branch are normalized IDs or denormalized text. Do not maintain two conflicting sources without a synchronization rule.
- [ ] Backfill `assessments.institution_id`, certificate institution IDs, user branch/roll number, and normalized visibility rows for existing data.
- [ ] Add `NOT NULL`/check constraints only after the backfill is validated.
- [ ] Add indexes for every production filter and join used by reports, certificates, attempts, users, and visibility checks.
- [ ] Add uniqueness constraints for institution-scoped test codes where required by the reference behavior.
- [ ] Test delete behavior for institution, user, assessment, course, attempt, certificate, and template records.
- [ ] Add a migration verification script that checks required tables, columns, indexes, constraints, and row counts.
- [ ] Add a rollback or forward-fix procedure for migration failures; do not manually edit production data during validation.

## Phase 6A: Original Portal Entity and Ownership Model (P0)

The original portal does not expose its PostgreSQL schema publicly. The following is the maximum model currently established from captured original HTML/JavaScript chunks and observable route contracts. Terms such as `collegeId` are directly observed API terminology; physical tables, constraints, and stored procedures remain inferred until an authorized schema dump is provided.

### Observable Original Concepts

- [x] The portal uses college/institution context, including `collegeId` and college-list/detail requests.
- [x] The portal has assessment workflows for create, edit, sections, questions, coding questions, custom questions, test details, analytics, and reports.
- [x] Assessment requests expose creator, test code, test type, batch/branch-related filters, sections, timing, question counts, and report/PDF generation concepts.
- [x] The portal exposes student activity/report, leaderboard, course, and proctoring-report concepts.
- [x] Captured routes include test library, course assessments, hackathons, subscriber hackathons, and report-related workflows.
- [ ] The original physical database tables, indexes, foreign keys, triggers, and migrations are directly confirmed.

### Required Local Ownership Model

- [ ] Model `institutions`/`colleges` as the tenant root with stable ID, name, code, active status, and audit timestamps.
- [ ] Model `departments`/`branches` with `institution_id`, name, code, and active status.
- [ ] Model `batches` with `institution_id`, name/year, and active status.
- [ ] Model all accounts in `users` with institution, role, active status, identity fields, and audit timestamps.
- [ ] Model super-admin as a global role and institution admin as a tenant-scoped role.
- [ ] Model faculty as institution-scoped users who own/manage courses and assessments.
- [ ] Model students as institution-scoped users linked to department/branch and batch.
- [ ] Model courses with institution ownership and faculty ownership.
- [ ] Model assessments with institution ownership, creator ownership, course association, test code, status, visibility, timing, grading, and publication fields.
- [ ] Model sections and assessment-question joins with ordering, marks, penalty, and display count.
- [ ] Model attempts with student, assessment, start/submission state, score, percentage, and pass state.
- [ ] Model certificates with institution, student, course, assessment, template, batch, branch/department, status, number, file, and issue timestamps.
- [ ] Model proctoring events against attempts and prevent cross-user writes.

### Required Relationship and Constraint Checks

- [ ] Every institution-owned row has a valid institution foreign key or a documented reason it is global.
- [ ] Faculty/student/admin operations derive institution from the authenticated user, never from an arbitrary request field.
- [ ] Departments and batches are unique within an institution, not globally unless proven by an authorized original schema.
- [ ] Test codes are unique according to the observed original scope and race-safe under concurrent creation.
- [ ] Assessment visibility has one authoritative representation; define synchronization or remove legacy text arrays.
- [ ] `certificates.template_id` references `certificate_templates.id` when templates are relational.
- [ ] Certificate number uniqueness and status transitions are enforced at database and service layers.
- [ ] Delete behavior is explicitly tested for institution, user, course, assessment, attempt, certificate, and template records.
- [ ] Existing rows are backfilled before new `NOT NULL` and foreign-key constraints are enforced.

### Original-to-Local Terminology Map

| Original observable term | Local canonical term | Required decision |
| --- | --- | --- |
| `collegeId`, college | `institution_id`, `institutions` | [ ] Keep an API compatibility alias while using one database name |
| branch/department | `department_id`, `departments` | [ ] Stop mixing free text and IDs without synchronization |
| batch | `batch_id`, `batches` | [ ] Define whether legacy batch text remains supported |
| `createdBy` | `created_by` | [ ] Enforce authenticated ownership |
| assessment/test | `assessments` | [ ] Unify Next.js and Rust persistence paths |
| section | `assessment_sections` | [ ] Preserve ordering and display count |
| question library | `question_banks`/`questions` | [ ] Preserve question type and answer privacy |
| user assessment/activity | `attempts` and activity tables | [ ] Map report counts to real rows |
| certificate/PDF report | `certificates` and file/job records | [ ] Define synchronous versus asynchronous generation |

### Schema Confirmation Procedure

- [ ] Obtain an authorized, read-only schema-only dump from the original system owner if exact parity is required.
- [ ] Compare original table, column, index, and constraint names with local migration output.
- [ ] Never infer a private original table from a frontend field alone.
- [ ] Record every unconfirmed item as `Inferred` or `Not observable` in the evidence log.
- [ ] Do not mark database parity complete until the local data model passes the two-institution cases in `testcases.md`.

## Phase 7: UI and Responsive Parity (P1)

- [ ] Capture reference and local screenshots at desktop, tablet, and mobile widths for login, dashboard, sidebar, create assessment, reports, certificates, and assessment-taking pages.
- [ ] Compare typography, spacing, colors, borders, icons, table columns, empty/loading/error states, and responsive breakpoints.
- [ ] Match the reference login DOM semantics where required: labels, password visibility control, remember-me state, error state, footer, and logo treatment.
- [ ] Verify keyboard navigation, visible focus, label association, escape-to-close dropdowns, and screen-reader names.
- [ ] Verify sidebar toggle, profile menu, logout, breadcrumbs, pagination, and modal/toast behavior on touch and keyboard input.
- [ ] Replace remaining lint warnings where practical, especially raw `<img>` and direct `window.location` navigation, without changing behavior.

## Phase 8: Test Automation and Release Gate (P0)

- [ ] Add a frontend browser test runner and scripts for local smoke/e2e tests.
- [ ] Add Rust HTTP integration tests using a test router and test database or a disposable PostgreSQL instance.
- [ ] Add fixtures for two institutions and assert tenant isolation in every list/detail/download endpoint.
- [ ] Add tests for successful, empty, unauthorized, forbidden, validation-error, server-error, and timeout states.
- [ ] Run the full command sequence from `testcases.md` on a clean checkout.
- [ ] Store test output and screenshots in an ignored evidence directory.
- [ ] Do not mark Task 4 complete until all P0 test cases pass and all P1 exceptions are documented.

## Required Completion Evidence

- [ ] `npm run lint` output with zero errors.
- [ ] `npm run build` output with the final route inventory.
- [ ] `cargo fmt --all -- --check` output.
- [ ] `cargo test --workspace` output including integration tests.
- [ ] Empty-database migration log and idempotent re-run log.
- [ ] Local API health/auth/report/certificate request log.
- [ ] Two-institution isolation test results.
- [ ] Browser screenshots and test report for the required parity routes.
- [ ] Database schema verification output.
- [ ] A final list of any behavior that is `Not observable` in the reference and the local decision taken.
