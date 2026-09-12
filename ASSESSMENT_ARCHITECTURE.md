# Assessment Feature: Full Architecture, Backend & API Reference

This document provides a comprehensive technical reference for the **Assessment** subsystem of the Janv educational platform, spanning the Rust Axum backend (`janv-api`), shared data models and DTOs (`janv-common`), sandboxed execution engine (`janv-executor`), database schema, and Next.js frontend routes (`janv-web-next`).

---

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [Database Schema & Data Entities](#2-database-schema--data-entities)
3. [Rust Backend Architecture (`janv-api/src/assessment`)](#3-rust-backend-architecture-janv-apisrcassessment)
   - [Module Structure](#module-structure)
   - [Assessment Management (`handlers.rs`)](#assessment-management-handlersrs)
   - [Question & Bank Management (`question.rs`)](#question--bank-management-questionrs)
   - [Attempts & Grading Engine (`attempt.rs`)](#attempts--grading-engine-attemptrs)
   - [Timer & Exam Integrity (`timer.rs`)](#timer--exam-integrity-timerrs)
   - [6-Hour Auto-Rotating Passcode System (`passcode.rs`)](#6-hour-auto-rotating-passcode-system-passcoders)
   - [Background Lifecycle Scheduler (`scheduler.rs`)](#background-lifecycle-scheduler-schedulerrs)
   - [Analytics & Distribution Engine (`analytics.rs`)](#analytics--distribution-engine-analyticsrs)
   - [Templates & Blueprint System (`template.rs`)](#templates--blueprint-system-templaters)
   - [Leaderboards & Ranking System (`leaderboard.rs`)](#leaderboards--ranking-system-leaderboardrs)
4. [Sandboxed Code Execution (`janv-executor`)](#4-sandboxed-code-execution-janv-executor)
5. [Complete API Endpoints Reference](#5-complete-api-endpoints-reference)
   - [Native Axum API (`/api/assessments`)](#native-axum-api-apiassessments)
   - [Next.js V2 API Routes (`/api/v2/assessment`)](#nextjs-v2-api-routes-apiv2assessment)
6. [Frontend Client SDK & UI Flows (`janv-web-next`)](#6-frontend-client-sdk--ui-flows-janv-web-next)
   - [API Client Methods (`src/lib/api.ts`)](#api-client-methods-srclibapits)
   - [Primary UI Views & Workflows](#primary-ui-views--workflows)

---

## 1. High-Level Architecture

```
                                  +---------------------------------------+
                                  |    Next.js 16 (App Router / Turbopack)|
                                  |    Client Components & Edge Routes    |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTP / JSON (Axios/Fetch)
                                                      v
                                  +---------------------------------------+
                                  |        Rust Axum Web Server           |
                                  |       (Port 8080 - janv-api)          |
                                  +---------+-----------------+-----------+
                                            |                 |
                   +------------------------+                 +-------------------------+
                   |                                                                    |
                   v                                                                    v
+------------------------------------+                                +-----------------------------------+
|  Background Lifecycle Worker       |                                |  janv-executor Sandboxing Engine  |
|  (Tokio Scheduler - 60s cadence)   |                                |  (Bollard / Docker Engine API)    |
|  - Scheduled -> Ongoing            |                                |  - C, C++, Java, Python, Rust     |
|  - Ongoing -> Completed            |                                |  - Memory telemetry (cgroup v2)   |
+------------------+-----------------+                                +-----------------+-----------------+
                   |                                                                    |
                   +------------------------+                 +-------------------------+
                                            |                 |
                                            v                 v
                                  +---------------------------------------+
                                  |   PostgreSQL RDS (Multi-Tenant DB)    |
                                  |   - Schema migrations 001 - 024       |
                                  |   - JSONB Question & Attempt stores   |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         Redis In-Memory Cache         |
                                  |         Session Tokens & Queues       |
                                  +---------------------------------------+
```

### Architectural Principles:
- **Separation of Concerns**: Assessment metadata, question bank curation, active candidate attempts, and background scheduling are decoupled into modular Rust submodules.
- **Safety & Isolation**: Candidate answers are graded server-side; sensitive correct answers (`is_correct`, `correct`, `is_answer`) are sanitized in memory before delivering questions to students.
- **Dual-Layer Routing**: Next.js hosts both direct client pages, lightweight V2 proxy handlers (`/api/v2/assessment`), and talks directly to `janv-api` for mission-critical grading and live scheduling.
- **Fault-Tolerant Scheduling**: The asynchronous assessment scheduler applies transactional `lock_timeout = 5s` and `statement_timeout = 15s`, ensuring downtime never publishes expired examinations.

---

## 2. Database Schema & Data Entities

The assessment system interacts with several primary tables in PostgreSQL:

### 1. `assessments`
Core examination definition and lifecycle table.
```sql
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    duration_mins INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    pass_percentage DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT false,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    test_code VARCHAR(20) UNIQUE,
    num_sections INTEGER NOT NULL DEFAULT 1,
    tab_switches_allowed INTEGER NOT NULL DEFAULT 10,
    institution_id INTEGER REFERENCES institutions(id),
    institution_visibility INTEGER[],
    batch_visibility TEXT[],
    instructions TEXT,
    is_proctoring BOOLEAN NOT NULL DEFAULT false,
    test_type VARCHAR(100) DEFAULT 'General Assessment',
    status assessment_status NOT NULL DEFAULT 'draft', -- ENUM: draft, scheduled, ongoing, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. `assessment_sections`
Sub-divisions within an assessment (e.g., Aptitude, Technical MCQ, Coding).
```sql
CREATE TABLE assessment_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    section_type VARCHAR(100) DEFAULT 'Aptitude',
    duration_mins INTEGER,
    instructions TEXT,
    default_marks DOUBLE PRECISION DEFAULT 1.0,
    penalty_marks DOUBLE PRECISION DEFAULT 0.0,
    display_questions INTEGER DEFAULT 10,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. `question_banks` & `questions`
Repository of reusable questions.
```sql
CREATE TYPE question_type AS ENUM ('mcq', 'multi_select', 'true_false', 'coding');
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    faculty_id VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
    question_type question_type NOT NULL,
    content TEXT NOT NULL,
    options JSONB,            -- Array of option objects: [{"text": "...", "is_correct": true}]
    explanation TEXT,
    difficulty difficulty NOT NULL,
    tags TEXT[],
    points INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_questions (
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    section_id UUID REFERENCES assessment_sections(id) ON DELETE SET NULL,
    PRIMARY KEY (assessment_id, question_id)
);
```

### 4. `attempts`
Tracks individual student exam sessions and auto-grading records.
```sql
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'graded');

CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score DOUBLE PRECISION,
    total_marks INTEGER NOT NULL,
    percentage DOUBLE PRECISION,
    is_passed BOOLEAN,
    answers JSONB,            -- Stores candidate selections & per-question earned points
    status attempt_status NOT NULL DEFAULT 'in_progress'
);
```

### 5. `institution_passcodes` & `assessment_passcodes`
Security passcodes preventing unauthorized test participation.
```sql
CREATE TABLE institution_passcodes (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id),
    passcode VARCHAR(32) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    passcode VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assessment_id)
);
```

### 6. `leaderboard_entries`
Materialized ranking and completion telemetry.
```sql
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    total_marks INTEGER NOT NULL,
    percentage DOUBLE PRECISION NOT NULL,
    time_taken_secs INTEGER,
    completed_at TIMESTAMPTZ,
    UNIQUE(assessment_id, student_id)
);
```

---

## 3. Rust Backend Architecture (`janv-api/src/assessment`)

### Module Structure
Located in `janv-api/src/assessment/`:
- `mod.rs`: Router configuration and endpoint registration.
- `handlers.rs`: Assessment CRUD, publishing, and duplication.
- `question.rs`: Question bank management, question authoring, patch updates, and options sanitization.
- `attempt.rs`: Attempt initialization, question sanitization, auto-grading algorithms, and leaderboard trigger.
- `timer.rs`: Server-authoritative timer countdown and expiration checks.
- `passcode.rs`: 6-hour rotating institution passcode generation, assessment sync, and validation.
- `scheduler.rs`: Tokio background worker executing automated status transitions.
- `analytics.rs`: Aggregated score metrics and percentile histogram distribution.
- `template.rs`: Reusable assessment blueprint creation and instantiation.
- `leaderboard.rs`: Assessment-specific and global ranking projections.

---

### Assessment Management (`handlers.rs`)

#### 1. `list_assessments(State, AuthUser, Query<AssessmentListQuery>)`
- **Purpose**: Paginated retrieval of assessments.
- **Access Logic**:
  - `UserRole::Faculty`: Returns assessments matching `faculty_id = user.email`.
  - `UserRole::Student`: Returns only assessments where `is_published = true`.
  - `UserRole::SuperAdmin`: Returns all assessments.
- **Filtering**: Supports optional filtering by `course_id` and `is_published`.

#### 2. `get_assessment(State, AuthUser, Path<Uuid>)`
- **Purpose**: Retrieves assessment metadata alongside its ordered questions from `assessment_questions`.
- **Response**: `{ assessment, questions, question_count }`.

#### 3. `create_assessment(State, AuthUser, Json<CreateAssessmentRequest>)`
- **Purpose**: Creates an assessment in draft state.
- **Authorization**: Rejects requests from `UserRole::Student`.
- **Attributes Set**: `id = Uuid::new_v4()`, `is_published = false`, `created_at = NOW()`.

#### 4. `update_assessment(State, AuthUser, Path<Uuid>, Json<UpdateAssessmentRequest>)`
- **Purpose**: Updates assessment metadata with validation.
- **Validation**:
  - Ownership: Must be created by `user.email` or requested by `SuperAdmin`.
  - Date validation: Rejects `start_time` earlier than `Utc::now()`.

#### 5. `delete_assessment(State, AuthUser, Path<Uuid>)`
- **Purpose**: Cascading deletion of an assessment and its associated sections, question associations, attempts, and passcodes.

#### 6. `publish_assessment(State, AuthUser, Path<Uuid>)`
- **Purpose**: Transitions assessment to published status.
- **Pre-condition**: Ensures `COUNT(assessment_questions) > 0`. Rejects empty assessments with `AppError::BadRequest`.

#### 7. `duplicate_assessment(State, AuthUser, Path<Uuid>, Json<DuplicateAssessmentRequest>)`
- **Purpose**: Clones an existing assessment into a new draft, deep-copying all question associations.

---

### Question & Bank Management (`question.rs`)

#### 1. `list_question_banks(State, AuthUser)`
- Returns all question banks authored by the calling faculty member.

#### 2. `create_question_bank(State, AuthUser, Json<CreateQuestionBankRequest>)`
- Creates a categorized question bank (`title`, `subject`, `faculty_id`).

#### 3. `add_question(State, AuthUser, Path<bank_id>, Json<CreateQuestionRequest>)`
- Inserts a new question into the specified question bank supporting `MCQ`, `MultiSelect`, `TrueFalse`, or `Coding`.

#### 4. `update_question(State, AuthUser, Path<id>, Json<UpdateQuestionRequest>)`
- Patches an existing question using `COALESCE`, allowing partial updates of `content`, `options`, `explanation`, `difficulty`, `tags`, or `points` while preserving unmentioned fields.

#### 5. `delete_question(State, AuthUser, Path<id>)`
- Deletes question and cascades removal from `assessment_questions`.

#### 6. `add_questions_to_assessment(State, Extension<AuthUser>, Path<assessment_id>, Json<AddQuestionsRequest>)`
- Links an array of question IDs to an assessment, recording their specific display order (`sort_order`).

#### 7. `sanitize_options(raw_options: &Option<Value>) -> Option<Value>`
- **Security Method**: In-place traversal of JSON options array. Removes answer leaks (`is_correct`, `correct`, `isAnswer`, `is_answer`).

#### 8. `sanitize_question_for_student(q: &Question) -> Value`
- **Security Method**: Produces a student-safe JSON representation, stripping correct choices and suppressing the `explanation` field.

---

### Attempts & Grading Engine (`attempt.rs`)

#### 1. `start_attempt(State, AuthUser, Path<id>)`
- **Lifecycle & Verification Steps**:
  1. Verifies `is_published == true`.
  2. Enforces active time window (`start_time <= Utc::now() <= end_time`).
  3. Checks for existing `in_progress` attempt for this student; if found, resumes the session seamlessly.
  4. Inserts new `attempts` row with `status = 'in_progress'`.
  5. Fetches questions, sanitizes options via `sanitize_options`, and returns duration and total marks.

#### 2. `submit_attempt(State, AuthUser, Path<id>, Json<SubmitAttemptRequest>)`
- **Server-Side Grading Flow**:
  1. Validates attempt exists and is still `in_progress`.
  2. Evaluates submission elapsed time against `duration_mins * 60 + 30s` (grace period).
  3. Evaluates answers per question type:
     - **MCQ / TrueFalse**: Handled by `grade_single_choice`.
     - **MultiSelect**: Handled by `grade_multi_select` with proportional credit and wrong-selection penalties.
     - **Coding**: Evaluated via execution engine.
  4. Calculates overall percentage and `is_passed` (`percentage >= pass_percentage`).
  5. Updates attempt record (`status = 'submitted'`, `submitted_at = NOW()`, `score`, `percentage`, `is_passed`).
  6. **Leaderboard Upsert**: Atomically records highest score and fastest time into `leaderboard_entries`, recalculating ranks using `ROW_NUMBER() OVER (ORDER BY percentage DESC, time_taken_secs ASC)`.

#### 3. `grade_single_choice(student_answer, options, points) -> (bool, f64)`
- Compares student's chosen option index against option containing `is_correct == true`. Returns `(true, points)` on exact match.

#### 4. `grade_multi_select(student_answer, options, points) -> (bool, f64)`
- Computes intersection between selected indices and correct indices.
- Perfect match: Full points.
- Partial match: Penalized formula:
  $$\text{score} = \max\left(0, \frac{\text{correct\_selected} - \text{wrong\_selected}}{\text{total\_correct}}\right) \times \text{points}$$

#### 5. `get_attempt_result(State, AuthUser, Path<id>)`
- Returns scored attempt. Students can only view their own attempts; faculty and admin can inspect any candidate's attempt.

#### 6. `list_my_attempts(State, AuthUser)`
- Lists historical attempts for the authenticated student ordered by `started_at DESC`.

---

### Timer & Exam Integrity (`timer.rs`)

#### `check_timer(State, AuthUser, Path<attempt_id>)`
- **Authoritative Countdown**: Computes remaining time based on server clocks, preventing client-side clock tampering.
- **Formula**:
  $$\text{remaining} = \max(0, (\text{duration\_mins} \times 60) - (\text{now} - \text{started\_at}))$$
- Returns `{ remaining_seconds, elapsed_seconds, total_seconds, expired: bool, status: "running" | "expired" }`.

---

### 6-Hour Auto-Rotating Passcode System (`passcode.rs`)

Designed for institutional proctored exams, preventing students from outside the examination hall from accessing the test.

#### 1. `get_current_passcode(State, AuthUser)`
- Queries `institution_passcodes` for an active passcode where `expires_at > NOW()`.
- **Auto-Rotation**: If none exists or current code expired:
  - Generates format: `DG-####` (for institution 1) or `PASS-####` (with 4-digit random number).
  - Sets `window_start = NOW()`, `expires_at = NOW() + INTERVAL '6 hours'`.
  - Synchronizes code to `assessment_passcodes` for all assessments under that institution.

#### 2. `regenerate_passcode(State, AuthUser)`
- Force-invalidates prior passcodes (`is_active = false`) and creates an immediate new 6-hour window.

#### 3. `verify_passcode(State, AuthUser, Json<VerifyPasscodeRequest>)`
- Validates passcodes entered by students.
- **Fuzzy Matching**: Normalizes input with `REPLACE(REPLACE(UPPER(passcode), '-', ''), ' ', '')`, making entry whitespace- and hyphen-insensitive.

#### 4. `set_passcode` & `remove_passcode`
- Allows faculty to manually configure or disable a custom per-test static passcode.

---

### Background Lifecycle Scheduler (`scheduler.rs`)

The background scheduler runs continuously as a standalone Tokio task initialized in `janv-api/src/main.rs`.

#### 1. `spawn(pool: PgPool) -> JoinHandle<()>`
- Spawns an interval ticker running every **60 seconds**.
- Sets `MissedTickBehavior::Skip` to avoid stampedes after server sleep or delays.

#### 2. `tick(pool: &PgPool) -> Result<(u64, u64), sqlx::Error>`
- Executes inside an isolated SQL transaction:
  1. `SET LOCAL lock_timeout = '5s'`: Prevents database locking stalls.
  2. `SET LOCAL statement_timeout = '15s'`: Guards against runaway queries.
  3. **Auto-Complete Expired Tests**:
     ```sql
     UPDATE assessments SET status = 'completed'
     WHERE status IN ('scheduled', 'ongoing') AND end_time < NOW();
     ```
  4. **Auto-Publish Due Tests**:
     ```sql
     UPDATE assessments SET is_published = true, status = 'ongoing'
     WHERE status = 'scheduled' AND start_time <= NOW()
       AND (end_time IS NULL OR end_time >= NOW());
     ```

---

### Analytics & Distribution Engine (`analytics.rs`)

#### `get_assessment_analytics(State, AuthUser, Path<assessment_id>)`
- Calculates summary statistics over completed attempts:
  - `total_attempts`, `avg_score`, `highest_score`, `lowest_score`.
  - `pass_rate = (passed_count / total_attempts) * 100.0`.
- Generates score distribution histogram across standard grade brackets:
  - `90-100`, `80-89`, `70-79`, `60-69`, `50-59`, `0-49`.

---

### Templates & Blueprint System (`template.rs`)

Allows faculty to create reusable blueprints for standard examinations.
- `list_templates`: Fetches public templates and templates authored by calling faculty.
- `create_template`: Stores duration, marks, pass criteria, and question blueprint.
- `create_from_template`: Creates a concrete assessment initialized with template configuration.
- `save_as_template`: Extracts configuration from an existing assessment into a new template.
- `delete_template`: Removes template (author or SuperAdmin only).

---

### Leaderboards & Ranking System (`leaderboard.rs`)

- `get_leaderboard`: Paginated ranking for a specific assessment. Joins with `users` to provide student name, score, percentage, time taken in seconds, and ranked position.
- `get_global_leaderboard`: Aggregated across all assessments:
  ```sql
  SELECT le.student_id, u.full_name, AVG(le.percentage) as avg_pct, COUNT(*) as attempts
  FROM leaderboard_entries le
  INNER JOIN users u ON u.email = le.student_id
  GROUP BY le.student_id, u.full_name
  ORDER BY avg_pct DESC
  ```

---

## 4. Sandboxed Code Execution (`janv-executor`)

For assessments containing `QuestionType::Coding`, candidate code is evaluated inside containerized environments managed by `janv-executor`.

### Supported Languages (`languages.rs`)
| Language | Environment Image | Compile Command | Execution Command |
| :--- | :--- | :--- | :--- |
| **C** | `janv-sandbox-c:latest` | `gcc -o /tmp/solution /tmp/solution.c` | `/tmp/solution` |
| **C++** | `janv-sandbox-cpp:latest` | `g++ -o /tmp/solution /tmp/solution.cpp` | `/tmp/solution` |
| **Java** | `janv-sandbox-java:latest` | `javac /tmp/Solution.java` | `java -cp /tmp Solution` |
| **Python** | `janv-sandbox-python:latest` | *None* | `python3 /tmp/solution.py` |
| **Rust** | `janv-sandbox-rust:latest` | `rustc -O -o /tmp/solution /tmp/solution.rs` | `/tmp/solution` |

### Execution Pipeline (`sandbox.rs`)
1. **Container Provisioning**: Creates an ephemeral container with strict CPU, memory limits, and disabled network access.
2. **File Injection**: Writes candidate source file into container filesystem using TAR streaming.
3. **Compilation**: Runs compile command; captures compiler errors in `stderr` if compilation fails.
4. **Execution & Telemetry**: Executes the binary with optional testcase `stdin`. Reads peak memory usage via cgroup peak telemetry (`memory.peak` or `memory.max_usage_in_bytes`).
5. **Enforced Guardrails**: Applies timeout bounds and output size limits (`truncate_output`). Guarantees container cleanup via RAII `ContainerCleanupGuard`.

---

## 5. Complete API Endpoints Reference

### Native Axum API (`/api/assessments`)
Base URL: `http://localhost:8080/api/assessments` (Protected by JWT Bearer token).

| Method | Endpoint | Description | Auth Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List assessments with pagination & filter | Faculty, Student, Admin |
| `POST` | `/` | Create new assessment draft | Faculty, Admin |
| `GET` | `/{id}` | Get assessment details and questions | Any Authenticated |
| `PUT` | `/{id}` | Update assessment details | Creator Faculty, Admin |
| `DELETE` | `/{id}` | Delete assessment | Creator Faculty, Admin |
| `POST` | `/{id}/publish` | Publish assessment (validates question count > 0) | Creator Faculty, Admin |
| `POST` | `/{id}/duplicate` | Clone an assessment and its questions | Faculty, Admin |
| `GET` | `/banks` | List faculty's question banks | Faculty, Admin |
| `POST` | `/banks` | Create question bank | Faculty, Admin |
| `POST` | `/banks/{bank_id}/questions` | Add question to question bank | Faculty, Admin |
| `PUT` | `/questions/{id}` | Partial update question fields | Faculty, Admin |
| `DELETE` | `/questions/{id}` | Delete question | Faculty, Admin |
| `POST` | `/{assessment_id}/questions` | Link questions to assessment with sort order | Faculty, Admin |
| `POST` | `/{id}/start` | Begin candidate attempt & retrieve sanitized questions | Student |
| `POST` | `/attempts/{id}/submit` | Submit answers & trigger auto-grading engine | Student |
| `GET` | `/attempts/{id}` | Retrieve attempt scorecard & answers | Student (own), Faculty, Admin |
| `GET` | `/my-attempts` | List historical attempts for student | Student |
| `GET` | `/attempts/{id}/timer` | Check authoritative remaining countdown | Student, Faculty, Admin |
| `GET` | `/{id}/analytics` | Get aggregate statistics and score distribution | Faculty, Admin |
| `GET` | `/templates` | List reusable assessment templates | Faculty, Admin |
| `POST` | `/templates` | Create assessment template | Faculty, Admin |
| `POST` | `/templates/create-from` | Instantiate an assessment from a template | Faculty, Admin |
| `DELETE` | `/templates/{id}` | Delete assessment template | Creator Faculty, Admin |
| `POST` | `/{id}/save-as-template` | Convert existing test into reusable template | Creator Faculty, Admin |
| `GET` | `/{id}/leaderboard` | View assessment ranking leaderboard | Any Authenticated |
| `GET` | `/leaderboard/global` | View platform-wide global leaderboard | Any Authenticated |
| `POST` | `/{id}/passcode` | Set static passcode on assessment | Creator Faculty, Admin |
| `DELETE` | `/{id}/passcode` | Deactivate passcode on assessment | Creator Faculty, Admin |
| `POST` | `/passcode/verify` | Verify student passcode before launch | Any Authenticated |
| `GET` | `/passcode/current` | Get active 6-hour institutional passcode | Faculty, Admin |
| `POST` | `/passcode/regenerate` | Force-regenerate active 6-hour passcode | Faculty, Admin |

---

### Next.js V2 API Routes (`/api/v2/assessment`)
Base URL: `http://localhost:3000/api/v2/assessment`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Query assessments with aggregated sections and question counts |
| `POST` | `/` | Create multi-section assessment with duration and test code generation |
| `GET` | `/{id}` | Fetch detailed assessment with nested section specifications |
| `DELETE` | `/{id}` | Delete assessment |
| `GET` | `/section/{id}` | List all sections for a test or get a section by ID |
| `DELETE` | `/section/{id}` | Delete specific assessment section |
| `GET` | `/currentTestCode` | Retrieve active institutional passcode for current college |

---

## 6. Frontend Client SDK & UI Flows (`janv-web-next`)

### API Client Methods (`src/lib/api.ts`)

The frontend encapsulates backend calls through typed modules:

```typescript
export const assessments = {
  list(params?: { page?: number; per_page?: number; course_id?: string; is_published?: boolean });
  get(id: string);
  create(data: Partial<Assessment>);
  update(id: string, data: Partial<Assessment>);
  delete(id: string);
  publish(id: string);
  duplicate(id: string, new_title?: string);
  addQuestions(assessmentId: string, questionIds: string[]);
  start(id: string);
  submitAttempt(attemptId: string, answers: Record<string, unknown>);
  getAttempt(attemptId: string);
  myAttempts();
  checkTimer(attemptId: string);
  analytics(id: string);
  leaderboard(id: string, page?: number);
  globalLeaderboard(page?: number);
  setPasscode(id: string, passcode: string);
  verifyPasscode(passcode: string);
  getCurrentPasscode();
  regeneratePasscode();
  updateProctoring(id: string, data: UpdateProctoringRequest);
  getProctoringReport(attemptId: string);
  getTestDetails(id: string, params?: { page?: number; per_page?: number; search?: string; branch?: string });
  getPdfReport(id: string);
  createPdfReport(id: string);
  getLiveTest(testCode: string);
  listHackathons();
  getForStudent(params?: { page?: number; per_page?: number; search?: string; status?: string });
  getSection(sectionId: string);
  updateSection(sectionId: string, data: Partial<AssessmentSectionResponse>);
  getProctoring(assessmentId: string);
  listLibrary();
  getLinkedAssessments(questionIds: string[]);
  getLiveUsersCount();
  listCourseAssessments(courseId?: string);
};

export const templates = {
  list();
  create(data: Partial<AssessmentTemplate>);
  createFrom(data: { template_id: string; course_id: string; title?: string });
  saveAs(assessmentId: string);
  delete(id: string);
};
```

---

### Primary UI Views & Workflows

1. **Candidate Exam Taking Flow (`/assessment/[id]/take/page.tsx`)**:
   - Fetches attempt session via `assessments.start(id)`.
   - Starts client countdown synced with backend `duration_mins`.
   - Renders questions in sequence with single/multi-choice selection.
   - Prevents unauthorized tab switching; auto-submits upon time expiry or explicit user submission.
   - Posts answers to `assessments.submitAttempt(attempt.id, answers)`.

2. **Faculty Assessment Authoring (`/assessment/create/page.tsx`)**:
   - Configures multi-section tests (Aptitude, Domain MCQ, Coding).
   - Sets pass thresholds, tab-switch security limits, shuffle mode, and result visibility.
   - Assigns questions from question bank library or creates inline questions.

3. **Faculty Proctoring & Live Monitoring (`/assessment/selectProctoring` & `/assessment/activetest`)**:
   - Toggles webcam monitoring, audio detection, and full-screen enforcement.
   - Displays real-time candidate progress, active timers, and live submission telemetry.

4. **Analytics & Score Reporting (`/assessment/testAnalytics` & `/assessment/viewReport`)**:
   - Visualizes pass rates, average completion times, and score distribution histograms.
   - Generates downloadable candidate report cards and PDF exports.
