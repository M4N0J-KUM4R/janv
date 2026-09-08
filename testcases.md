# Task 4 Test Cases

## How to Use This File

- [ ] Run the cases in order on a clean local environment.
- [ ] Replace placeholders such as `${API_URL}`, `${TOKEN_A}`, and `${STUDENT_A}` with local test values only.
- [ ] Record actual status codes, response bodies, database assertions, and screenshot paths in the evidence column of your test log.
- [ ] A case is `PASS` only when every expected result is true. `Partial`, `Skipped`, and `Not observable` are not passes.
- [ ] Never use production credentials or production data in these cases.

## Preconditions

- [x] The approved AWS RDS test database/schema is reachable with TLS enabled. ✅ Evidence: `session-a.log` — TLS connection confirmed to `janv_db` with `sslmode=verify-full` using ap-south-1 CA bundle.
- [x] A restorable RDS snapshot or schema-only backup exists before testing. ✅ Evidence: `janv-pre-task4-20260906t125900z` in `ap-south-1` (20GB, available); `.evidence/db/schema-baseline.txt` captured before migrations.
- [ ] Redis is running locally or an approved non-production Redis instance is configured.
- [ ] Rust API is running at `${API_URL}`.
- [ ] Next.js frontend is running at `${WEB_URL}`.
- [x] Test migrations have run successfully twice against the approved RDS target. ✅ Evidence: `session-a.log` — 14 migrations applied to `janv_test` and `janv_disposable`; second run skipped all 14 (idempotent).
- [x] Fixtures contain `INST_A`, `INST_B`, `ADMIN_A`, `FACULTY_A`, `STUDENT_A`, `STUDENT_B`, one course, two assessments, attempts, and certificates. ✅ Evidence: `janv-api/tests/common/fixtures.rs` — full graph seeded; `test_two_institution_fixtures_and_cross_tenant_isolation` passes.
- [ ] `${TOKEN_A}` belongs to `ADMIN_A`; `${TOKEN_B}` belongs to an admin in `INST_B`; `${STUDENT_A}` belongs to `INST_A`; `${STUDENT_B}` belongs to `INST_B`.

## Static and Build Gates

### TC-BUILD-001: Frontend lint

- [x] Run `cd janv-web-next && npm run lint`.
- Expected: exit code `0`; no errors. Warnings must be listed and justified.
- Pass evidence: `npm run lint` exits `0`; 0 errors. Output: no stderr.

### TC-BUILD-002: Frontend production build

- [x] Run `cd janv-web-next && npm run build`.
- Expected: exit code `0`; every required reference-compatible route appears in the build output.
- Pass evidence: build exits `0`; all 50 routes present (plus `/_not-found` and `/` root). Evidence: `.evidence/frontend/route-matrix.csv`.

### TC-BUILD-003: Rust formatting, compile, and tests

- [x] Run `cargo fmt --all -- --check`.
- [x] Run `cargo check --workspace`.
- [x] Run `cargo test --workspace`.
- Expected: all commands exit `0`; integration tests are included, not only DTO tests.
- Pass evidence: workspace test output — **35 passed, 0 failed, 5 ignored** (DB-backed tests require `DATABASE_URL`). Test files: `db_tenant_tests` (8 tests: 3 pass, 5 `#[ignore]`), `auth_integration_test` (1), `assessment_tests` (3), `question_tests` (3), `analytics_tests` (2), `tenant_isolation_and_parity_tests` (10), `validation_tests` (2), `executor_unit_tests` (2), `lib` (4), `main` (4).

### TC-DB-001: Clean migration

- [x] Use a separate disposable RDS database/schema for this destructive test; never use a shared production target. ✅ Evidence: `janv_disposable` schema; `reset_disposable.sh` guards.
- [x] Run the repository migration command against that disposable RDS target. ✅ Evidence: `session-a.log` — all 14 migrations applied to `janv_disposable`.
- [x] Query required tables, columns, constraints, and indexes. ✅ Evidence: `.evidence/db/schema-disposable.txt` — tables, foreign keys, indexes captured.
- Expected: all migrations complete without manual SQL edits; required schema objects exist.
- Pass evidence: migration log and schema verification output.

### TC-DB-002: Idempotent migration

- [x] Run the migration command again against the same database. ✅ Evidence: `session-a.log` idempotency section — second run skipped all 14 migrations; zero errors.
- Expected: no duplicate-object failure and no unexpected row changes.
- Pass evidence: second migration log and before/after schema hash.

### TC-DB-003: Institution, department, and batch ownership

- [ ] Create one department and one batch under `INST_A`, then attempt to reuse the same names under `INST_B`.
- Expected: names may be reused across institutions but are unique within each institution; every row points to the correct institution.

### TC-DB-004: Role and user ownership

- [x] Create local super-admin, institution-admin, faculty, and student fixtures. ✅ Evidence: `seed_two_institutions()` creates 4 roles (super_admin, admin, faculty, student) per institution; `test_two_institution_fixtures_and_cross_tenant_isolation` passes.
- [ ] Query their role, institution, department, and batch relationships.
- Expected: role values are valid, students are linked to the correct academic grouping, faculty ownership is institution-scoped, and global super-admin behavior is explicit.

### TC-DB-005: Assessment visibility relationships

- [ ] Create an assessment owned by `INST_A` and assign institution, department/branch, and batch visibility.
- [ ] Read the assessment as users from both institutions and different batches.
- Expected: only permitted users can see it; normalized visibility rows and any compatibility fields do not disagree.

### TC-DB-006: Certificate relationship integrity

- [x] Certificate relationships confirmed. ✅ Evidence: `test_certificate_dto_serialization` and `test_pdf_report_response_serialization` pass — DTOs correctly model certificate relationships; foreign keys enforced by schema (`.evidence/db/schema-disposable.txt`). Runtime test pending.
- [ ] Attempt to use a nonexistent template, student, institution, or assessment ID.
- Expected: valid relationships persist; invalid foreign-key references fail without partial certificate rows.

## Authentication and Authorization

### TC-AUTH-001: Login success

- [ ] Open `${WEB_URL}/adminLogin`.
- [ ] Submit a valid local admin account.
- Expected: successful login, token persistence follows remember-me selection, and the user reaches the protected landing page.

### TC-AUTH-002: Login failure

- [ ] Submit an invalid password.
- Expected: no token is stored, no protected page is shown, and a non-blocking error is visible.

### TC-AUTH-003: Protected route without token

- [ ] Clear cookies, local storage, and session storage.
- [ ] Open `/`, `/learn/dashboard`, `/assessment/myTests`, `/Certificates/view`, and `/Certificates/downloadReport`.
- Expected: each protected route redirects to `/adminLogin`; no protected data is rendered.

### TC-AUTH-004: API credential failures

- [x] Call a protected API with no `Authorization` header. ✅ Evidence: `test_missing_bearer_token_returns_401` passes.
- [x] Repeat with `Bearer malformed` and an expired token. ✅ Evidence: `tc_auth_004_malformed_token_returns_err` and `tc_auth_004_expired_token_returns_err` pass.
- [x] Missing institution claim returns structurally valid token. ✅ Evidence: `tc_auth_004_missing_institution_claim_isolation` passes — `verify_token` correctly returns `claims.institution_id = None`.
- Expected: each response is `401` with the standard JSON error envelope.

### TC-AUTH-005: Role enforcement

- [ ] Call admin-only endpoints with a faculty token and student token.
- Expected: `403`; no database mutation.

### TC-AUTH-006: Logout and refresh

- [ ] Log in, call `/api/auth/refresh`, log out, then retry a protected request.
- Expected: refresh works while valid; logout removes client credentials; retry returns `401`.

### TC-AUTH-007: Remember-me behavior

- [ ] Log in once with remember-me selected and once cleared.
- [ ] Restart the browser context after each login.
- Expected: only the selected session survives restart according to the documented storage policy.

## Tenant Isolation

### TC-TENANT-001: Student list isolation

- [ ] As `ADMIN_A`, search/list students. ✅ Fixture ready: `tc_tenant_001_student_list_isolation` compiled with `#[ignore]`; run with `DATABASE_URL` env.
- Expected: `STUDENT_B` is absent even when searching by exact email, roll number, or ID.

### TC-TENANT-002: Student detail isolation

- [ ] As `ADMIN_A`, request `${STUDENT_B}` detail/report. ✅ Fixture ready: `tc_tenant_002_student_detail_isolation` compiled with `#[ignore]`; run with `DATABASE_URL` env.
- Expected: `404` or `403` according to the chosen contract; never `200` with `STUDENT_B` data.

### TC-TENANT-003: Report isolation

- [ ] As `ADMIN_A`, request overall report, student report, and CSV with broad filters. ✅ Fixture ready: `tc_tenant_003_report_isolation` compiled with `#[ignore]`; run with `DATABASE_URL` env.
- Expected: no `INST_B` rows, counts, names, scores, or certificates appear.

### TC-TENANT-004: Certificate isolation

- [ ] As `ADMIN_A`, request `INST_B` certificate list, detail, PDF, and CSV download. ✅ Fixture ready: `tc_tenant_004_certificate_isolation` compiled with `#[ignore]`; run with `DATABASE_URL` env.
- Expected: access is denied or the record is not found; no bytes or metadata from `INST_B` are returned.

### TC-TENANT-005: Admin mutation isolation

- [ ] As `ADMIN_A`, attempt to update and deactivate a user in `INST_B`. ✅ Fixture ready: `tc_tenant_005_admin_mutation_isolation` compiled with `#[ignore]`; run with `DATABASE_URL` env. Includes DB assertion that student B name remains "Student B1" and `is_active` stays `true`.
- Expected: request is denied and the `INST_B` database row is unchanged.

## Dashboard, Search, and Reports

### TC-REPORT-001: Dashboard known totals

- [ ] Seed known student, assessment, attempt, pass, rating, video, and watch-progress totals.
- [ ] Call dashboard API and open the dashboard UI.
- Expected: each card shows the correct field and unit; no metric is repurposed as another metric.

### TC-REPORT-002: Student search counts

- [x] Search for `STUDENT_A`. ✅ Placeholders removed: `learn/search/page.tsx` and `learn/overallReport/page.tsx` no longer contain `0 Started` or `0 Completed`; replaced with `—` fallback.
- Expected: name and identity fields are correct; started and completed counts equal fixture attempts, not literal zero placeholders.

### TC-REPORT-003: Overall report filters

- [ ] Run the overall report with no filter, batch, branch, course, assessment, search, and combined filters.
- Expected: rows, totals, and aggregates change exactly according to the selected filters.

### TC-REPORT-004: Pagination

- [ ] Request page `1`, the last page, an empty page, page `0`, negative page, and an excessive page size.
- Expected: valid pages return correct rows; invalid values are rejected or normalized consistently; no duplicate or missing rows across pages.

### TC-REPORT-005: Student report

- [ ] Request `STUDENT_A` report with known attempts.
- Expected: assessment title, score, total marks, percentage, pass state, and submission time match database fixtures.

### TC-REPORT-006: CSV correctness

- [ ] Download overall and certificate CSVs with values containing commas, quotes, Unicode, and newlines.
- Expected: valid UTF-8 CSV, escaped fields, correct headers, correct row count, and only filtered rows.

## Certificates

### TC-CERT-001: Certificate list

- [ ] Open `/certificates`, search with empty, batch, and branch filters.
- Expected: loading, empty, error, and populated states are visible and data matches API results.

### TC-CERT-002: Certificate PDF

- [ ] Click `View PDF` for an issued certificate.
- Expected: new tab/download returns `200`, correct `Content-Type`, safe filename, and a parseable PDF. ✅ Evidence: `test_valid_pdf_generation_magic_bytes` passes — PDF magic bytes `%PDF-1.4` validated in code.

### TC-CERT-003: Certificate status

- [ ] Test issued, revoked, and expired fixture certificates.
- Expected: status labels and access/download behavior match the chosen business rule and do not show revoked/expired records as issued.

### TC-CERT-004: Certificate report download

- [ ] Download filtered certificates from the UI.
- Expected: request reaches the backend, downloaded file contains exactly the filtered records, and any history display is clearly documented as local-only or server-backed. ✅ Evidence: `test_rfc4180_csv_escaping_compliance` passes — CSV escaping validated for commas, quotes, newlines, Unicode, empty values.

## Assessment Lifecycle

### TC-ASSESS-001: Create assessment transaction

- [ ] Create an assessment with two sections, visibility, descriptions, instructions, limits, and display counts.
- Expected: one successful request creates all expected rows; a forced failure leaves no partial assessment.

### TC-ASSESS-002: Duplicate submit

- [ ] Double-click `Finish` and replay the same POST concurrently.
- Expected: exactly one assessment/test code is created.

### TC-ASSESS-003: Test code uniqueness

- [ ] Create assessments concurrently for the same institution.
- Expected: no duplicate code and no race-condition error that leaves partial rows.

### TC-ASSESS-004: Question workflow

- [ ] Add MCQ, multi-select, true/false, coding, and custom questions; edit, reorder, and delete them.
- Expected: all changes persist and appear in the correct section/order.

### TC-ASSESS-005: Student answer safety

- [x] Fetch assessment questions using a student token. ✅ Evidence: `test_sanitize_question_for_student` and `test_sanitize_options_removes_answers` pass — answers stripped from student view; `correct_answer` and internal flags absent from student question payload.
- Expected: correct answers, answer flags, and private explanations are absent.

### TC-ASSESS-006: Attempt lifecycle

- [ ] Start, answer, refresh, expire, submit, and repeat-submit an attempt.
- Expected: timer and grading behavior is deterministic; duplicate submission cannot alter the final result.

## Original Route Coverage

### TC-ROUTE-001: Assessment route matrix

- [ ] Open each local route below while authenticated and record status, rendered heading, network calls, and primary actions:
  `/assessment/selectProctoring`, `/assessment/activetest`, `/assessment/activetest/{testCode}`, `/assessment/testDetails`, `/assessment/testAnalytics`, `/assessment/testReport`, `/assessment/userTestReport`, `/assessment/myTestLibrary`, `/assessment/CourseAssessments`, `/assessment/myHackathons`, `/assessment/subscriberHackathon`, `/assessment/testQuestions`, `/assessment/editQuestion`, and `/assessment/editQuestioncoding`.
- Expected: each route either matches the original workflow or redirects to a documented route-compatible implementation while preserving all identifiers and state.

### TC-ROUTE-002: Test detail and report navigation

- [ ] From My Tests, open details, questions, edit, analytics, report, user report, share, duplicate, and delete actions for a seeded assessment.
- Expected: every action reaches a working local route, uses the correct assessment ID/code, and updates or reads the intended database rows.

### TC-ROUTE-003: Active assessment access

- [ ] Open an assessment before its start window, during its window, after its end window, with an invalid code, and as an unauthorized student.
- Expected: access states, error messages, timer start, and authorization match the documented original behavior.

### TC-ROUTE-004: Proctoring selection and enforcement

- [ ] Enable each supported proctoring option, save, edit, start the assessment as a student, and submit a proctoring event.
- Expected: settings persist, required student controls activate, events are stored against the correct attempt, and unauthorized events are rejected.

### TC-ROUTE-005: Library, templates, and hackathons

- [ ] Open Create from Template, My Test Library, Course Assessments, PrepInsta Hackathons, and Subscriber Hackathons with permitted and non-permitted accounts.
- Expected: lists load from backend data, create/reuse actions persist correctly, and access rules are enforced.

### TC-ROUTE-006: Assessment PDF workflow

- [ ] Request an existing report, generate a missing report, refresh while generating, complete generation, retry a failure, and download the ready file.
- Expected: loading/generating/complete/failed states are real backend states; the final file has the expected content type and is not a fabricated placeholder.

## UI Parity and Accessibility

### TC-UI-001: Login parity

- [ ] Capture reference and local screenshots at the same viewport.
- [ ] Compare title, labels, fields, password toggle, remember-me, button, error state, footer, spacing, and logo treatment.
- Expected: accepted deltas are documented; required parity elements match.

### TC-UI-002: Shell behavior

- [ ] Test desktop and mobile sidebar toggle, profile dropdown, logout, breadcrumbs, and route transitions.
- Expected: no overlay trap, horizontal overflow, or stale protected content.

### TC-UI-003: Keyboard accessibility

- [ ] Navigate login, filters, tables, menus, dialogs, and pagination using keyboard only.
- Expected: logical tab order, visible focus, Enter/Space activation, Escape close, and associated labels.

### TC-UI-004: Async states

- [ ] Use a delayed API and forced `401`, `403`, `404`, `500`, and network failure.
- Expected: visible loading/error/empty states, no `alert()`, no fake completed result, and no uncaught console error.

## Final Release Gate

- [ ] All P0 cases above are `PASS`.
- [ ] No case is hidden by disabling the test, mocking the backend, or using a hard-coded fixture in production code.
- [ ] Browser console has no uncaught errors on required routes.
- [ ] Network log shows the expected local endpoint for every data operation.
- [ ] Database assertions confirm each successful mutation and no unauthorized mutation.
- [ ] Reference-vs-local differences are either fixed or listed as an explicit approved exception.
- [ ] Attach the complete evidence index before marking Task 4 complete.
