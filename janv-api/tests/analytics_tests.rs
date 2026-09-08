use janv_common::dto::*;
use uuid::Uuid;

#[test]
fn test_report_dto_serialization() {
    let row = ReportRow {
        student_id: "rahul@example.com".to_string(),
        student_name: "Rahul Verma".to_string(),
        email: "rahul@example.com".to_string(),
        batch: Some(2026),
        branch: Some("CSE".to_string()),
        assessments_started: 5,
        assessments_completed: 4,
        courses_enrolled: 2,
        avg_score: Some(88.5),
    };

    let serialized = serde_json::to_string(&row).unwrap();
    assert!(serialized.contains("Rahul Verma"));
    assert!(serialized.contains("88.5"));

    let deserialized: ReportRow = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized.student_name, "Rahul Verma");
    assert_eq!(deserialized.assessments_completed, 4);
    assert_eq!(deserialized.avg_score, Some(88.5));
}

#[test]
fn test_certificate_dto_serialization() {
    let row = CertificateRow {
        id: Uuid::new_v4(),
        certificate_number: "CERT-2026-001".to_string(),
        student_name: "Ananya Sharma".to_string(),
        course_title: Some("Full Stack Web Development".to_string()),
        batch: Some(2026),
        branch: Some("IT".to_string()),
        issued_at: chrono::Utc::now(),
        status: "issued".to_string(),
    };

    let serialized = serde_json::to_string(&row).unwrap();
    assert!(serialized.contains("CERT-2026-001"));
    assert!(serialized.contains("Ananya Sharma"));
    assert!(serialized.contains("issued"));
}
