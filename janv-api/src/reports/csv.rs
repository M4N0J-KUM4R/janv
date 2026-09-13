//! CSV Formatting & Export Module
//!
//! Provides utilities for RFC 4180 compliant CSV formatting.

/// Escapes a string to RFC 4180 compliant CSV field format.
pub fn escape_csv(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') || field.contains('\r') {
        let escaped = field.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        field.to_string()
    }
}
