# Janv Service Structure

## Decision

Use a **modular monolith with service boundaries** for the current deployment. The existing application should remain one Rust API process while each domain has a clear router, application service, repository, DTO, and policy boundary. Extract a domain into a separate deployable service only after its API, database ownership, and integration tests are stable.

This is safer for the existing AWS RDS setup than immediately splitting the application into several services that would share tables and create transaction, authentication, and deployment problems.

## Target Repository Layout

```text
janv/
├── janv-web-next/              # Web UI and thin API-for-frontend adapters
├── services/
│   └── janv-api/               # Current Rust modular-monolith service
│       └── src/
│           ├── app/             # Application bootstrap and router composition
│           │   ├── mod.rs
│           │   ├── state.rs
│           │   ├── router.rs
│           │   └── error.rs
│           ├── platform/        # Shared technical infrastructure only
│           │   ├── config.rs
│           │   ├── database.rs
│           │   ├── redis.rs
│           │   ├── telemetry.rs
│           │   ├── auth.rs
│           │   └── http.rs
│           ├── identity/        # Login, refresh, users, roles, institutions
│           ├── learning/        # Courses, videos, progress, ratings
│           ├── assessment/      # Tests, sections, questions, attempts, timers
│           ├── reporting/       # Dashboard, reports, analytics, CSV/PDF jobs
│           ├── certification/  # Certificates and certificate templates
│           ├── proctoring/     # Proctoring configuration and events
│           ├── practice/       # Coding problems and submissions
│           └── admin/          # Tenant administration, imports, audit log
├── janv-common/                # Versioned DTOs, enums, validation primitives
├── janv-executor/              # Isolated code execution capability
├── migrations/                 # Ordered RDS migrations, owned by database layer
└── tests/
    ├── contract/
    ├── integration/
    └── e2e/
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

- HTTP handlers must be thin.
- SQL must live in repositories, not handlers.
- Business workflows must live in services.
- Authorization must be explicit in policies/services.
- A domain must not import another domain's repository directly.
- Cross-domain work must use a service interface or application command.
- Shared types belong in `janv-common` only when they are genuinely shared contracts.
- No domain may read another domain's tables without an explicit repository/service contract.
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

- [ ] Every domain has a documented owner and public API.
- [ ] Every handler is thin and delegates to a service.
- [ ] SQL is isolated in repositories.
- [ ] Tenant and role policies are centralized and tested.
- [ ] Next.js does not maintain a second conflicting business implementation.
- [ ] RDS migrations are controlled, backed up, idempotent, and tested.
- [ ] Contract, integration, security, and browser tests pass.
- [ ] No hard-coded business data or fake progress remains.
- [ ] Existing routes continue to work through compatibility tests.
- [ ] Extraction into separate deployable services is treated as a later decision, not a prerequisite for correctness.
