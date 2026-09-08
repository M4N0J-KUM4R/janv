//! Test fixtures for two-institution tenant isolation tests.
//!
//! This module provides a [`TwoInstitutionFixtures`] struct that seeds the
//! database with two independent institutions (`INST_A` and `INST_B`), each
//! with faculty, students, courses, assessments, attempts, and certificates.
//!
//! Use [`seed_two_institutions`] to populate a pool, then call
//! [`TwoInstitutionFixtures::teardown`] in the test cleanup hook.
//!
//! All data is local-only test fixtures — no real user data.

pub mod fixtures;

pub use fixtures::{TwoInstitutionFixtures, seed_two_institutions};
