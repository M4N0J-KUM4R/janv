//! Reporting & Document Generation Module
//!
//! Submodules handle format-specific generation (PDF, CSV, etc.) isolated from business logic.

pub mod csv;
pub mod pdf;

pub use csv::escape_csv;
pub use pdf::create_valid_pdf;
