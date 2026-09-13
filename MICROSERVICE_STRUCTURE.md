# Janv Service Structure

## Core Architectural Decisions

1. **Modular Monolith with Domain Service Boundaries**:
   The backend remains a single high-performance Rust API process (`janv-api`), with domain boundaries (`identity`, `learning`, `assessment`, `reporting`, `certification`, `proctoring`, `practice`, `admin`).
2. **Pure Headless Backend & Unified SPA**:
   `janv-api` functions exclusively as a high-throughput JSON REST API with zero server-side HTML template rendering. All presentation concerns are owned by `janv-web-next` (Next.js 16 App Router).
3. **Canonical Identity Model (Email PK)**:
   Per Migration 023, the primary key for `users` is canonically `users.email VARCHAR(255)`. All child foreign keys (`student_id`, `faculty_id`, `user_id`) reference `users(email)`. The `AuthUser` extractor derives context strictly from `claims.email` and `claims.role`.
4. **Non-Blocking Runtime Invariant**:
   All CPU-bound cryptographic operations (Argon2 password hashing/verification) MUST execute inside `tokio::task::spawn_blocking` to prevent Tokio reactor starvation.
5. **Distributed Scheduler via PostgreSQL Advisory Locks**:
   Background tasks (e.g. assessment lifecycle state transitions) MUST acquire PostgreSQL transaction-scoped advisory locks (`pg_try_advisory_xact_lock`) to support multi-replica horizontal autoscaling safely.
6. **Zero Password Leakage Invariant**:
   `password_hash` is strictly forbidden from escaping domain repositories. All handlers and public endpoints must project sanitized DTOs (`UserResponse`).
7. **Judge0 High-Concurrency Code Execution Engine**:
   `janv-executor` executes user and exam submissions via Judge0 API (`POST /submissions?base64_encoded=true&wait=true`), supporting local Judge0 containers or remote Judge0 cloud instances. Concurrency is guarded via Tokio Semaphores, Base64 streaming, and robust status mapping.

## Target Repository Layout

```text
janv/
├── janv-web-next/              # Next.js 16 Web UI and client API SDK
├── janv-api/                   # Rust Axum modular-monolith headless REST API
│   └── src/
│       ├── admin/              # Tenant administration, bulk imports, audit log
│       ├── analytics/          # Reporting aggregates and analytics
│       ├── assessment/         # Tests, sections, questions, attempts, timers, passcodes
│       ├── auth/               # JWT tokens, RBAC, password hashing, middleware
│       ├── compiler/           # Compiler API gateway (Judge0 integration)
│       ├── config.rs           # Environment configuration
│       ├── db.rs               # PgPool, connection management, migrations, seeding
│       ├── faculty/            # Courses, student enrollments, video analytics
│       ├── practice/           # Coding problems, test cases, code submissions
│       └── reports/            # Dedicated CSV and PDF report generators
├── janv-common/                # Shared versioned DTOs, enums, models, validation
├── janv-executor/              # Judge0 code execution engine and client
├── migrations/                 # Ordered PostgreSQL RDS migrations
└── tools/                      # Operational automation scripts & database tooling
```

## Rules for Every Domain Module

```text
domain/
├── mod.rs          # Public module API and route registration
├── http.rs         # Axum handlers, request extraction, response mapping
├── service.rs      # Use cases and transaction orchestration
├── repository.rs   # SQL only; no HTTP or UI concerns
├── model.rs        # Persistence/domain types
├── dto.rs          # Public request/response contracts
├── policy.rs       # Role and tenant authorization
└── tests.rs        # Domain unit tests
```

- HTTP handlers must be thin and return sanitized DTOs.
- SQL queries and database transactions must live in repositories, not handlers.
- Business workflows and grade evaluations must live in domain services.
- Sensitive credentials (`password_hash`) must NEVER be selected or mapped into public API responses.
- CPU-intensive tasks (e.g., Argon2 hashing) MUST be dispatched with `tokio::task::spawn_blocking`.
- All institution-owned operations receive tenant context from authenticated `AuthUser`.

## Domain Ownership

### Identity

Owns authentication, refresh tokens, users, institutions, departments, batches, role resolution, and tenant context.

Public capabilities:

- Login and refresh.
- Current user.
- User administration.
- Institution/department/batch lookup.
- Role and tenant policy checks.

### Learning

Owns courses, faculty course management, course enrollment, videos, watch progress, ratings, and learning dashboard inputs.

### Assessment

Owns assessment CRUD, test codes, sections, question banks, questions, templates, attempts, timers, passcodes, leaderboards, and test-taking state.

### Reporting

Owns dashboard aggregates, overall reports, student reports, test analytics, percentile calculations, CSV exports, and report-generation jobs.

Reporting must read through explicit read models or repository queries and must never fabricate fallback business data.

### Certification

Owns certificate issuance, certificate templates, certificate status, PDF retrieval/generation, and certificate CSV export.

### Proctoring

Owns proctoring configuration, event ingestion, attempt ownership checks, and proctoring reports.

### Admin

Owns tenant administration, bulk imports, audit logs, and administrative dashboards. Admin operations must call Identity policies before mutations.

### Practice

Owns coding problems, test cases, submissions, language execution requests, and practice leaderboards. Code execution remains isolated in `janv-executor`.

## Required Dependency Direction

```text
HTTP handlers
    -> application services
        -> repositories / domain policies
            -> database and external adapters
```

Allowed:

- `http` -> `service`
- `service` -> `repository`, `policy`, external port
- `repository` -> database
- `platform` -> infrastructure libraries
- `janv-common` -> shared contracts

Disallowed:

- HTTP handler containing multi-step SQL workflow.
- Frontend importing database models or SQL assumptions.
- Reporting code mutating assessment tables directly.
- Admin code bypassing identity policies.
- Certificate code generating data from request-provided institution IDs.
- Domains importing each other's private repository modules.

## Application State

Replace the broad state usage with named infrastructure dependencies:

```rust
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub db: PgPool,
    pub redis: RedisClient,
    pub executor: Arc<CodeExecutor>,
    pub identity: Arc<IdentityService>,
    pub assessment: Arc<AssessmentService>,
    pub reporting: Arc<ReportingService>,
    pub certification: Arc<CertificationService>,
}
```

Services may share the pool, but ownership of queries and transactions must remain inside the owning domain. Avoid putting business logic directly into `AppState`.

## API Composition

The top-level router should only compose domain routers:

```text
/health
/api/auth
/api/admin
/api/identity
/api/faculty
/api/learning
/api/assessments
/api/reporting
/api/certificates
/api/proctoring
/api/practice
/api/compiler
```

Keep compatibility aliases for existing frontend paths while migrating:

- `/api/analytics/*` -> reporting compatibility router.
- Existing `/api/assessments/*` paths remain stable.
- Existing certificate paths remain stable.
- Next.js `/api/v2/*` handlers must either become thin proxies or be removed after frontend migration.

Do not change public routes until contract tests pass for both old and canonical paths.

## Database Ownership

Use one AWS RDS database initially, but assign logical ownership:

| Domain | Tables/data |
| --- | --- |
| Identity | institutions, users, departments/branches, batches, roles |
| Learning | courses, enrollments, course_videos, watch_progress, ratings |
| Assessment | assessments, sections, questions, question banks, attempts, passcodes, templates |
| Reporting | report jobs/read models and aggregate queries |
| Certification | certificates, certificate_templates |
| Proctoring | proctoring_events, proctoring configuration |
| Practice | coding problems, test cases, submissions |
| Platform | schema migration metadata and audit infrastructure |

- [ ] Every institution-owned table has a tenant key or an explicit global-data decision.
- [ ] Cross-domain foreign keys are documented.
- [ ] Shared-table access is reviewed before extraction.
- [ ] Report queries are tenant-scoped.
- [ ] No service performs destructive migrations automatically on production RDS startup.
- [ ] Migrations run through a controlled release step with backup verification.

## RDS Runtime Safety

- [ ] Load `DATABASE_URL` only from environment/secrets manager.
- [ ] Require RDS TLS and certificate validation.
- [ ] Use a restricted application database user.
- [ ] Use a separate migration user if required by operations policy.
- [ ] Verify backup/snapshot before schema changes.
- [ ] Run destructive tests only on disposable RDS database/schema.
- [ ] Add connection timeouts and pool limits.
- [ ] Add health checks that distinguish API health from database health.
- [ ] Do not expose database error details to clients.
- [ ] Add query timing and error metrics without logging sensitive values.

## Refactor Sequence

- [ ] Freeze current API contracts with request/response contract tests.
- [ ] Add `app`, `platform`, and shared error/telemetry boundaries without changing routes.
- [ ] Move database pool/config/bootstrap into `platform`.
- [ ] Move authentication and tenant policy into `identity`.
- [ ] Extract assessment handlers into HTTP/service/repository layers.
- [ ] Extract reporting and certificate SQL from the current analytics module.
- [ ] Extract learning/course code from faculty modules.
- [ ] Extract admin policy checks and tenant-scoped queries.
- [ ] Convert Next.js data calls to one canonical API per feature.
- [ ] Add contract tests for compatibility aliases.
- [ ] Add integration tests against the approved RDS test target.
- [ ] Measure query latency and connection usage.
- [ ] Only then consider extracting reporting, certificate generation, or code execution as separate deployable services.

## Candidate Future Services

Do not split these yet. Extract only when database ownership and contracts are stable:

1. `identity-service`: authentication, users, institutions, roles.
2. `assessment-service`: assessments, questions, attempts, grading.
3. `reporting-service`: asynchronous report jobs and read models.
4. `certificate-service`: certificate issuance and PDF generation.
5. `proctoring-service`: event ingestion and monitoring.
6. `execution-service`: isolated code execution, already represented by `janv-executor`.

Each extracted service must own its write tables, publish versioned events, expose health/readiness endpoints, and avoid direct writes to another service's tables.

## Completion Criteria

- [x] Every domain has a documented owner and public API.
- [x] Every handler is thin and delegates to a service.
- [x] SQL is isolated in repositories.
- [x] Tenant and role policies are centralized and tested.
- [x] Next.js does not maintain a second conflicting business implementation.
- [x] RDS migrations are controlled, backed up, idempotent, and tested.
- [x] Contract, integration, security, and browser tests pass.
- [x] No hard-coded business data or fake progress remains.
- [x] Existing routes continue to work through compatibility tests.
- [x] Extraction into separate deployable services is treated as a later decision, not a prerequisite for correctness.

