# PrepInsta Parity Task List

## Goal

Make the local Janv application functionally and visually equivalent to the authorized reference institution portal, with copying proprietary JavaScript bundles or backend implementation. Reproduce the observable workflows using the local codebase and local APIs.

Reference URL: https://institutions.prepinstaprime.com/adminLogin

Reference artifacts already captured in this workspace:

- `original/sidebar_original.html`
- `original/header_original.html`
- `scratch/original_main.html`
- `original/createSection.chunk.js`
- `original/createSuccess.chunk.js`

Do not store, commit, or repeat any account passwords in source files, logs, screenshots, or this task file.

## Current Differences

### P0: Authentication and routing

- Reference login route is `/adminLogin`; local login route is `/login`.
- Reference login is a standalone page. Local `RootLayout` always renders the sidebar and header, including on `/login`.
- Reference login title is `Institutions Admin`; local title is `Welcome Back`.
- Reference login includes email placeholder `Enter email`; local email input has no matching placeholder.
- Reference login includes password placeholder, password visibility toggle, and a checked `Remember me` checkbox. Local implementation lacks these behaviors.
- Local home route redirects to `/learn/dashboard` even when unauthenticated.
- Protected routes are not consistently guarded before rendering.
- Local auth stores tokens in `localStorage`; verify whether this matches the intended security model and add refresh/expiry handling.

Files:

- `janv-web-next/src/app/layout.tsx`
- `janv-web-next/src/app/login/page.tsx`
- `janv-web-next/src/app/page.tsx`
- `janv-web-next/src/lib/auth.tsx`

### P0: Production API routing

- Next.js implements `/api/v2/assessment` and `/api/v2/questionLibrary`.
- `docker/nginx.conf` currently proxies every `/api/*` request to the Rust API.
- Rust does not expose the Next.js `/api/v2/*` handlers.
- Consequently, deployed test-code loading, assessment creation, section creation, and question-library requests can return 404s.

Files:

- `docker/nginx.conf`
- `janv-web-next/src/app/api/v2/assessment/route.ts`
- `janv-web-next/src/app/api/v2/questionLibrary/route.ts`
- `janv-api/src/main.rs`

### P0: Certificates

- Reference sidebar links use `/Certificates/view` and `/Certificates/downloadReport`.
- Local implementation directories are lowercase: `/certificates/view` and `/certificates/downloadReport`.
- Current local uppercase links return 404.
- Certificate data is hard-coded sample data rather than loaded from a backend.
- `View PDF` has no implementation.
- Download certificate report workflow is not connected to a real report endpoint.

Files:

- `janv-web-next/src/components/layout/Sidebar.tsx`
- `janv-web-next/src/app/certificates/page.tsx`
- `janv-web-next/src/app/certificates/view/page.tsx`
- `janv-web-next/src/app/certificates/downloadReport/page.tsx`

### P1: Header and shell behavior

- Reference header profile area opens a dropdown.
- Local profile area logs out immediately when clicked.
- Reference header is 72px high; local CSS variable is 64px while the component applies 72px inline. Standardize this.
- Reference sidebar is a 260px drawer with a working menu/drawer interaction.
- Local menu icon is visual only and has no toggle behavior.
- Local sidebar loads icon assets directly from the reference domain. Prefer local copies or a controlled asset source for reliability and independence.
- Verify responsive behavior for mobile drawer, tablet layout, and desktop layout.

Files:

- `janv-web-next/src/components/layout/Header.tsx`
- `janv-web-next/src/components/layout/Sidebar.tsx`
- `janv-web-next/src/app/globals.css`

### P1: Assessment creation

The local create-test page contains many matching fields, but behavior still differs or needs validation:

- Reference flow is a two-step process with a visible progress indicator.
- Reference fields include test name, locked generated test code, section count, institution visibility, batch visibility, rich text description, rich text instructions, tab-switch limit, question jumbling, and post-test report visibility.
- Local step one stores a draft in `sessionStorage` and navigates to the section page. Validate behavior after refresh, back navigation, multiple tabs, and expired sessions.
- Local test code starts with a fallback value and calls `/api/v2/assessment/currentTestCode`; verify that the deployed route is reachable.
- Local submit does not create the assessment until the later step. Verify duplicate submission protection and error recovery.
- Verify that visibility selections are persisted and sent to the backend. The local API currently does not clearly persist institution and batch visibility fields.
- Compare rich text output and supported operations with the reference: underline, bold, italic, ordered/bulleted lists, links, images, super/subscript, code block, and formula.
- Validate section-specific rules: MCQ versus Coding, default marks, penalty marks, duration limits, display-question count, and required fields.

Files:

- `janv-web-next/src/app/assessment/create/page.tsx`
- `janv-web-next/src/app/assessment/createSection/page.tsx`
- `janv-web-next/src/app/assessment/createSuccess/page.tsx`
- `janv-web-next/src/components/common/RichTextEditor.tsx`
- `janv-web-next/src/app/api/v2/assessment/route.ts`

### P1: Assessment management

- Validate `/assessment/mytests` against the reference `/assessment/myTests` behavior and casing.
- Verify filtering by all, yet-to-start, ongoing, and completed states.
- Verify search by test name and test code.
- Verify schedule modal, start/end times, publish, duplicate, delete, passcode, copy-link, edit, preview, and report actions.
- Verify empty-question behavior and the route to add questions.
- Verify that all action errors are shown as usable inline messages or toasts instead of silent failures.
- Verify that assessment response field names match the frontend types and table rendering.

Files:

- `janv-web-next/src/app/assessment/page.tsx`
- `janv-web-next/src/app/assessment/mytests/page.tsx`
- `janv-web-next/src/app/assessment/[id]/edit/page.tsx`
- `janv-web-next/src/lib/api.ts`
- `janv-api/src/assessment/handlers.rs`

### P1: Reports and student search

- Local student search uses `mockDatabase`; replace it with a real API request.
- Local dashboard statistics contain hard-coded values; load institution-scoped values from the backend.
- Local overall report has hard-coded totals, pagination, and sample rows; connect filters and pagination to backend queries.
- Local custom report download uses `alert('Report downloaded!')`; implement a real download response and progress state.
- Verify batch, branch, course, date, search, pagination, and empty-state behavior.
- Verify authorization so one institution cannot access another institution's student/report data.

Files:

- `janv-web-next/src/app/learn/dashboard/page.tsx`
- `janv-web-next/src/app/learn/overallReport/page.tsx`
- `janv-web-next/src/app/learn/customReport/page.tsx`
- `janv-web-next/src/app/learn/search/page.tsx`
- `janv-web-next/src/lib/api.ts`
- `janv-api/src/analytics/`
- `janv-api/src/admin/`

### P1: Templates, FAQs, passcodes, and leaderboard

- Confirm template cards are loaded from the API rather than static fallback content.
- Verify create-from-template submits the selected template and creates a real assessment.
- Verify FAQ content source, loading, empty, and error states.
- Verify passcode creation, removal, verification, invalid-code handling, and assessment association.
- Verify assessment-specific and global leaderboard pagination, ranking, ties, and authorization.

Files:

- `janv-web-next/src/app/assessment/templates/page.tsx`
- `janv-web-next/src/app/assessment/createfromtemplate/page.tsx`
- `janv-web-next/src/app/assessment/faq/page.tsx`
- `janv-web-next/src/app/institute/passcode/page.tsx`
- `janv-web-next/src/app/assessment/leaderboard/page.tsx`
- `janv-web-next/src/lib/api.ts`
- `janv-api/src/assessment/passcode.rs`
- `janv-api/src/assessment/leaderboard.rs`

## Implementation Order

1. Create a route-aware authenticated shell so login pages do not render sidebar/header.
2. Add `/adminLogin` and align login labels, placeholders, remember-me behavior, password visibility, loading, and error states.
3. Fix the unauthenticated root redirect and add route guards for protected pages.
4. Fix Nginx routing so `/api/v2/*` reaches Next.js handlers and other `/api/*` requests reach Rust.
5. Fix certificate route casing and add redirect aliases for old links.
6. Replace the header's immediate logout with a profile dropdown containing an explicit logout action.
7. Implement sidebar menu toggling and responsive drawer behavior.
8. Connect student search, dashboard, reports, certificates, and downloads to real APIs.
9. Complete assessment creation persistence, section validation, duplicate-submit handling, and error recovery.
10. Validate templates, FAQs, passcodes, leaderboards, assessment taking, timer expiry, submission, grading, and report visibility.
11. Remove hard-coded sample data and reference-domain asset dependencies where local equivalents are available.
12. Run production build, container integration tests, browser smoke tests, and security checks.

## API Contract Checklist

Confirm every frontend request has a deployed handler and matching response shape:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/v2/assessment/currentTestCode`
- `POST /api/v2/assessment`
- `GET /api/v2/assessment/section/:assessmentId`
- `DELETE /api/v2/assessment/section/:sectionId`
- `GET /api/v2/questionLibrary`
- Assessment list/get/update/delete/publish/duplicate endpoints
- Assessment question, attempt, timer, analytics, leaderboard, and passcode endpoints
- Student search endpoint
- Dashboard and report endpoints
- Certificate list, PDF, and report-download endpoints

For each endpoint, verify:

- Authentication is required where appropriate.
- Role and institution ownership are enforced server-side.
- Request field names match the frontend payload.
- Response field names match the TypeScript types and rendering code.
- Empty, validation-error, unauthorized, not-found, and server-error responses are handled.
- Pagination returns total count and stable ordering.

## Validation Plan

### Static checks

- Run `npm run lint` in `janv-web-next`.
- Run `npm run build` in `janv-web-next`.
- Run `cargo check --workspace`.
- Run `cargo test --workspace`.
- Search for remaining mock/sample behavior:

  `rg -n "mockDatabase|alert\\(|hard-coded|Loading|sample|Ayush7369|admin123" janv-web-next/src janv-api/src`

- Search for route mismatches:

  `rg -n "Certificates|certificates|api/v2|assessment/myT" janv-web-next docker janv-api`

### Browser smoke tests

Run against the production-like deployment, not only `next dev`:

1. Open `/` while logged out; confirm redirect to `/adminLogin` and no authenticated shell.
2. Open `/adminLogin`; confirm exact fields, toggle, remember-me checkbox, validation, and failed-login message.
3. Log in with a test account; confirm redirect to the dashboard.
4. Open every sidebar link and confirm no 404 or blank page.
5. Toggle the sidebar menu at desktop and mobile widths.
6. Open the profile dropdown; confirm logout requires an explicit action.
7. Complete Create Test step one and step two; confirm the assessment exists after reload.
8. Add MCQ and Coding sections; verify marks, penalty, duration, and question counts.
9. Add questions, publish, duplicate, schedule, set/remove passcode, preview, and delete a test.
10. Search for a student and verify results are server-backed.
11. Filter and paginate reports; download a report and verify the file contents.
12. View certificates, open a certificate PDF, and download a certificate report.
13. Verify leaderboard and FAQ loading, empty, and error states.
14. Start an assessment, verify timer behavior, submit answers, and verify grading/report visibility.
15. Repeat protected requests with an expired token and confirm a safe re-authentication path.

### Visual checks

At minimum compare reference and local screenshots at 1440x900 and 390x844:

- Login page spacing, typography, colors, border radii, and controls.
- Header height, padding, profile alignment, and logo treatment.
- Sidebar width, section spacing, active item, dividers, and drawer animation.
- Breadcrumbs, cards, progress bar, forms, tables, modals, toasts, and empty states.
- Horizontal overflow and touch target sizes on mobile.

## Completion Criteria

- No expected route returns 404.
- No production workflow depends on mock data, hard-coded totals, browser alerts, or session-only persistence.
- All frontend API calls resolve through the deployed proxy and return the expected schema.
- Login, authorization, institution scoping, token expiry, and logout are tested.
- Create, manage, take, grade, report, certificate, passcode, template, FAQ, and leaderboard workflows pass browser smoke tests.
- `npm run lint`, `npm run build`, `cargo check --workspace`, and `cargo test --workspace` pass.
- Visual comparison has no known P0/P1 mismatch at desktop or mobile sizes.
