# Janv — Educational Coding Platform

Janv is an advanced educational coding platform (similar to PrepInsta or LeetCode) designed to help students learn programming, practice coding challenges, and take assessments.

## Tech Stack

| Component         | Technology                      |
| ----------------- | ------------------------------- |
| **Backend API**   | Rust, Axum, Tokio               |
| **Database**      | PostgreSQL (SQLx)               |
| **Executor**      | Rust, Bollard, Docker, Redis    |
| **Frontend**      | Rust, Leptos (WASM)             |
| **Cache/Queue**   | Redis                           |

## Project Structure

- `janv-common`: Shared types, DTOs, errors, and validation logic.
- `janv-api`: Core REST API server handling users, courses, and assessments.
- `janv-executor`: Secure code execution sandbox engine using Docker.
- `janv-web`: Frontend web application (Leptos).

## Quick Start

### 1. Start Infrastructure
Run the required database, redis, and sandbox images:
```bash
docker-compose up -d
```

### 2. Build Sandbox Images
```bash
cd janv-executor
docker build -t janv-sandbox-c:latest -f docker/Dockerfile.c .
docker build -t janv-sandbox-cpp:latest -f docker/Dockerfile.cpp .
docker build -t janv-sandbox-java:latest -f docker/Dockerfile.java .
docker build -t janv-sandbox-python:latest -f docker/Dockerfile.python .
```

### 3. Run the application
```bash
cargo run -p janv-api
cargo run -p janv-executor
```

## API Endpoints Summary

- `POST /api/auth/login` - Authenticate user
- `GET /api/courses` - List courses
- `GET /api/assessments/:id` - Get assessment details
- `POST /api/submissions` - Submit code for execution

## License

MIT
