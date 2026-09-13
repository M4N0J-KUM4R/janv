//! PDF Generation Module
//!
//! Provides utilities for generating valid PDF documents for export and reporting.

/// Generates a valid minimal PDF buffer for export reports.
///
/// Builds a spec-compliant PDF-1.4 binary stream with catalog, pages, page objects,
/// text streams, Helvetica font dictionary, cross-reference table, and trailer.
pub fn create_valid_pdf(title: &str, subtitle: &str, summary: &str) -> Vec<u8> {
    let stream_content = format!(
        "BT\n/F1 18 Tf\n50 720 Td\n({}) Tj\n/F1 12 Tf\n0 -25 Td\n({}) Tj\n0 -20 Td\n({}) Tj\nET",
        title.replace('(', "\\(").replace(')', "\\)"),
        subtitle.replace('(', "\\(").replace(')', "\\)"),
        summary.replace('(', "\\(").replace(')', "\\)")
    );
    let stream_len = stream_content.len();

    let mut pdf = Vec::new();
    pdf.extend_from_slice(b"%PDF-1.4\n");

    let obj1_offset = pdf.len();
    pdf.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    let obj2_offset = pdf.len();
    pdf.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    let obj3_offset = pdf.len();
    pdf.extend_from_slice(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");

    let obj4_offset = pdf.len();
    pdf.extend_from_slice(
        format!(
            "4 0 obj\n<< /Length {} >>\nstream\n{}\nendstream\nendobj\n",
            stream_len, stream_content
        )
        .as_bytes(),
    );

    let obj5_offset = pdf.len();
    pdf.extend_from_slice(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    );

    let xref_offset = pdf.len();
    let xref = format!(
        "xref\n0 6\n0000000000 65535 f \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n",
        obj1_offset, obj2_offset, obj3_offset, obj4_offset, obj5_offset
    );
    pdf.extend_from_slice(xref.as_bytes());

    let trailer = format!(
        "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
        xref_offset
    );
    pdf.extend_from_slice(trailer.as_bytes());

    pdf
}
