#!/usr/bin/env python3
"""
Load synthetic seed CSV into janv_disposable schema.

Usage:
    python3 tools/load_seed_csv.py --students seed_students.csv --faculty seed_faculty.csv

Columns in seed_students.csv:
    student_id, institute_id, institute_name, department_id, department_name,
    batch_year, student_name, student_email

Columns in seed_faculty.csv:
    faculty_id, institute_id, institute_name, faculty_name, faculty_email

Schema: institutions(id SERIAL PK, name, is_active, created_at)
        users(email VARCHAR(255) PK, password_hash, full_name, role, institution_id INT FK,
              branch TEXT, batch INT, ...)
"""
import csv
import sys
import uuid
import hashlib
import argparse
import os
from dataclasses import dataclass, field
from typing import Optional
import psycopg2
from psycopg2 import sql


def hash_password(plain: str) -> str:
    """Argon2-style hash stub — uses SHA-256 for speed in test data."""
    return f"$argon2id$v=19$m=19456,t=2,p=1${uuid.uuid4().hex[:16]}${hashlib.sha256(plain.encode()).hexdigest()}"


@dataclass
class Institution:
    institute_id: int  # CSV column (1, 2, 3...)
    name: str


@dataclass
class User:
    institution_id: int  # DB FK (integer)
    email: str
    full_name: str
    role: str  # 'faculty' | 'student'
    branch: Optional[str]  # TEXT: actual branch name (e.g. "Aerospace Engineering")
    batch: Optional[int]    # INTEGER: graduation year (e.g. 2026, 2027)


@dataclass
class LoadedData:
    institutions: dict[int, Institution] = field(default_factory=dict)
    faculty: dict[str, User] = field(default_factory=dict)  # key: faculty_email
    students: list[User] = field(default_factory=list)


def load_students_csv(path: str) -> LoadedData:
    """Load from seed_students.csv — institutions, students only."""
    data = LoadedData()
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            inst_id = int(row['institute_id'])
            batch_year = int(row['batch_year'])

            institution = Institution(
                institute_id=inst_id,
                name=row['institute_name'],
            )
            student = User(
                institution_id=inst_id,
                email=row['student_email'],
                full_name=row['student_name'],
                role='student',
                branch=row['department_name'],  # stores branch name as TEXT
                batch=batch_year,  # INTEGER: graduation year
            )

            if inst_id not in data.institutions:
                data.institutions[inst_id] = institution
            data.students.append(student)

    return data


def load_faculty_csv(path: str) -> LoadedData:
    """Load from seed_faculty.csv — institutions, faculty only."""
    data = LoadedData()
    seen_emails = set()
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            inst_id = int(row['institute_id'])

            institution = Institution(
                institute_id=inst_id,
                name=row['institute_name'],
            )
            faculty = User(
                institution_id=inst_id,
                email=row['faculty_email'],
                full_name=row['faculty_name'],
                role='faculty',
                branch=None,
                batch=None,
            )

            if inst_id not in data.institutions:
                data.institutions[inst_id] = institution
            if faculty.email not in seen_emails:
                data.faculty[faculty.email] = faculty
                seen_emails.add(faculty.email)

    return data


def upsert(conn, data: LoadedData, dry_run: bool = False) -> None:
    cur = conn.cursor()
    now = "NOW()"

    def exec(query: str, params: tuple = ()):
        if dry_run:
            print(f"  [DRY] {query[:80]}...")
            return
        cur.execute(query, params)

    def fetch_col(col: str, query: str, params: tuple = ()) -> list:
        if dry_run:
            return []
        cur.execute(query, params)
        return [row[0] for row in cur.fetchall()]

    # ── Institutions ────────────────────────────────────────────────────────────
    print("Upserting institutions...")
    for inst in data.institutions.values():
        exec(
            """INSERT INTO institutions (name, is_active, created_at)
               VALUES (%s, true, NOW())
               ON CONFLICT DO NOTHING""",
            (inst.name,),
        )

    # Build mapping: CSV institute_id (1,2,3...) → actual DB institution.id
    actual_ids = fetch_col("id", "SELECT id FROM institutions ORDER BY created_at")
    csv_ids = sorted(data.institutions.keys())
    inst_id_map: dict[int, int] = {}
    for csv_id, actual_id in zip(csv_ids, actual_ids):
        inst_id_map[csv_id] = actual_id
    print(f"  Institution ID mapping: {inst_id_map}")

    # Remap institution_ids in users to actual DB IDs
    for user_list in [data.faculty.values(), data.students]:
        for user in user_list:
            user.institution_id = inst_id_map[user.institution_id]

    # ── Faculty ────────────────────────────────────────────────────────────────
    print("Upserting faculty...")
    pw_hash = hash_password("FacultyPassword123!")
    for fac in data.faculty.values():
        exec(
            """INSERT INTO users (email, password_hash, full_name, role, institution_id, is_active, created_at, updated_at)
               VALUES (%s, %s, %s, 'faculty'::user_role, %s, true, NOW(), NOW())
               ON CONFLICT (email) DO UPDATE SET
                 full_name = EXCLUDED.full_name, institution_id = EXCLUDED.institution_id""",
            (fac.email, pw_hash, fac.full_name, fac.institution_id),
        )

    # ── Students ────────────────────────────────────────────────────────────────
    print("Upserting students...")
    pw_hash = hash_password("StudentPassword123!")
    for stu in data.students:
        exec(
            """INSERT INTO users (email, password_hash, full_name, role, institution_id, is_active, created_at, updated_at, branch, batch)
               VALUES (%s, %s, %s, 'student'::user_role, %s, true, NOW(), NOW(), %s, %s)
               ON CONFLICT (email) DO UPDATE SET
                 full_name = EXCLUDED.full_name, institution_id = EXCLUDED.institution_id,
                 branch = EXCLUDED.branch, batch = EXCLUDED.batch""",
            (stu.email, pw_hash, stu.full_name, stu.institution_id,
             stu.branch,  # TEXT: actual branch name e.g. "Aerospace Engineering"
             stu.batch),   # INTEGER: graduation year e.g. 2026
        )

    if not dry_run:
        conn.commit()
        print(f"\nDone. {len(data.institutions)} institutions, "
              f"{len(data.faculty)} faculty, {len(data.students)} students.")


def main():
    parser = argparse.ArgumentParser(
        description="Load seed CSV into janv_disposable schema.\n"
                    "Loads students from --students and faculty from --faculty.")
    parser.add_argument("--students", required=True, help="Path to seed_students.csv")
    parser.add_argument("--faculty", required=True, help="Path to seed_faculty.csv")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"),
                        help="PostgreSQL connection string")
    parser.add_argument("--dry-run", action="store_true", help="Print queries without executing")
    args = parser.parse_args()

    if not os.path.exists(args.students):
        print(f"ERROR: CSV not found: {args.students}")
        sys.exit(1)
    if not os.path.exists(args.faculty):
        print(f"ERROR: CSV not found: {args.faculty}")
        sys.exit(1)

    data = load_students_csv(args.students)
    faculty_data = load_faculty_csv(args.faculty)
    # Merge faculty into data
    data.faculty = faculty_data.faculty
    # Also ensure faculty's institutions are present (may not appear in student rows)
    for inst_id, inst in faculty_data.institutions.items():
        if inst_id not in data.institutions:
            data.institutions[inst_id] = inst

    print(f"Parsed: {len(data.institutions)} institutions, "
          f"{len(data.faculty)} faculty, {len(data.students)} students")

    if args.dry_run:
        print("\n[DRY RUN — no changes will be made]")
        return

    if args.database_url:
        from urllib.parse import urlparse, urlencode, parse_qs, unquote
        parsed = urlparse(args.database_url)
        qparams = parse_qs(parsed.query)
        qparams = {k: [unquote(v) for v in vals] for k, vals in qparams.items()}

        # Extract sslrootcert — must be passed as keyword arg to psycopg2, not URL param
        sslrootcert = qparams.pop('sslrootcert', [None])[0]
        qparams.pop('options', None)
        qparams.pop('sslmode', None)

        clean_query = urlencode(qparams, doseq=True)
        clean_url = parsed._replace(query=clean_query).geturl()

        conn_kwargs = {"connect_timeout": 10}
        if sslrootcert:
            conn_kwargs["sslrootcert"] = sslrootcert
            conn_kwargs["sslmode"] = "verify-full"
        else:
            conn_kwargs["sslmode"] = "require"

        conn = psycopg2.connect(clean_url, **conn_kwargs)
        # Target janv_disposable schema
        cur = conn.cursor()
        cur.execute("SET search_path TO janv_disposable, public;")
        cur.close()
    else:
        print("ERROR: --database-url required (or set DATABASE_URL env var)")
        sys.exit(1)

    try:
        upsert(conn, data, dry_run=args.dry_run)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
