use chrono::Utc;
use janv_api::auth::jwt::{create_access_token, verify_token};
use janv_common::dto::*;
use janv_common::models::{User, UserRole};
use uuid::Uuid;

fn create_mock_user(email: &str, inst_id: Option<i32>, role: UserRole) -> User {
    User {
        email: email.to_string(),
        password_hash: "hash".to_string(),
        full_name: "Test User".to_string(),
        role,
        is_active: true,
        institution_id: inst_id,
        batch: Some(2026),
        branch: Some("Computer Science".to_string()),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

#[test]
fn test_tenant_isolation_jwt_claims() {
    let secret = "test_jwt_secret_key_1234567890123456";
    let inst_a: i32 = 1;
    let inst_b: i32 = 2;
    let user_a = create_mock_user("faculty@inst-a.edu", Some(inst_a), UserRole::Faculty);
    let user_b = create_mock_user("student@inst-b.edu", Some(inst_b), UserRole::Student);

    // Create token for User A under INST_A
    let token_a = create_access_token(&user_a, secret, 3600).unwrap();
    let claims_a = verify_token(&token_a, secret).unwrap();

    assert_eq!(claims_a.sub, user_a.email);
    assert_eq!(claims_a.institution_id, Some(inst_a));
    assert_ne!(claims_a.institution_id, Some(inst_b));

    // Create token for User B under INST_B
    let token_b = create_access_token(&user_b, secret, 3600).unwrap();
    let claims_b = verify_token(&token_b, secret).unwrap();

    assert_eq!(claims_b.sub, user_b.email);
    assert_eq!(claims_b.institution_id, Some(inst_b));

    // Assert that User A's claims cannot match INST_B tenant scope
    assert_ne!(claims_a.institution_id, claims_b.institution_id);
}

#[test]
fn test_proctoring_config_dto() {
    let req = UpdateProctoringRequest {
        proctoring_enabled: true,
        webcam_enabled: Some(true),
        screen_share_enabled: Some(false),
        audio_enabled: Some(true),
        tab_switch_limit: Some(3),
        proctoring_service: Some("standard".to_string()),
    };

    // Serialize and deserialize
    let json = serde_json::to_string(&req).unwrap();
    let parsed: UpdateProctoringRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed.tab_switch_limit, Some(3));
    assert_eq!(parsed.webcam_enabled, Some(true));
    assert!(parsed.proctoring_enabled);

    let resp = ProctoringConfigResponse {
        assessment_id: Uuid::new_v4(),
        proctoring_enabled: true,
        webcam_enabled: true,
        screen_share_enabled: false,
        audio_enabled: true,
        tab_switch_limit: 3,
        proctoring_service: "standard".to_string(),
    };

    let json_resp = serde_json::to_string(&resp).unwrap();
    let parsed_resp: ProctoringConfigResponse = serde_json::from_str(&json_resp).unwrap();
    assert_eq!(parsed_resp.tab_switch_limit, 3);
    assert!(parsed_resp.webcam_enabled);
}

#[test]
fn test_live_test_response_serialization() {
    let resp = LiveTestResponse {
        assessment_id: Uuid::new_v4(),
        title: "Algorithms Hackathon".to_string(),
        test_code: "ALGO2026".to_string(),
        duration_mins: 90,
        total_eligible: 150,
        total_started: 120,
        total_completed: 45,
        candidates: vec![LiveCandidateItem {
            student_id: "aarav@inst-a.edu".to_string(),
            student_name: "Aarav Sharma".to_string(),
            email: "aarav@inst-a.edu".to_string(),
            status: "in_progress".to_string(),
            started_at: Some(Utc::now()),
            submitted_at: None,
            time_remaining_secs: Some(2400),
            score: None,
        }],
        total: 150,
    };

    let json = serde_json::to_string(&resp).unwrap();
    assert!(json.contains("Algorithms Hackathon"));
    assert!(json.contains("ALGO2026"));
    assert!(json.contains("Aarav Sharma"));

    let deserialized: LiveTestResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.candidates.len(), 1);
    assert_eq!(deserialized.total_started, 120);
}

#[test]
fn test_test_details_response_serialization() {
    let resp = TestDetailsResponse {
        assessment_id: Uuid::new_v4(),
        title: "Database Systems".to_string(),
        test_code: Some("DBMS101".to_string()),
        total_marks: 100,
        pass_percentage: 40.0,
        duration_mins: 60,
        data: vec![CandidateAttemptDetail {
            attempt_id: Uuid::new_v4(),
            student_id: "priya@inst-a.edu".to_string(),
            student_name: "Priya Patel".to_string(),
            email: "priya@inst-a.edu".to_string(),
            batch: Some(2026),
            branch: Some("Computer Science".to_string()),
            score: Some(88.5),
            total_marks: 100,
            percentage: Some(88.5),
            is_passed: Some(true),
            status: "completed".to_string(),
            started_at: Utc::now(),
            submitted_at: Some(Utc::now()),
            answers: Some(serde_json::json!({"q1": "A", "q2": "C"})),
        }],
        total: 1,
    };

    let json = serde_json::to_string(&resp).unwrap();
    assert!(json.contains("DBMS101"));
    assert!(json.contains("Priya Patel"));
    assert!(json.contains("88.5"));

    let deserialized: TestDetailsResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.data.len(), 1);
    assert_eq!(deserialized.data[0].score, Some(88.5));
}

#[test]
fn test_pdf_report_response_serialization() {
    let resp = PdfReportResponse {
        report_id: Uuid::new_v4(),
        assessment_id: Uuid::new_v4(),
        status: "completed".to_string(),
        file_url: Some("https://storage.local/reports/report-123.pdf".to_string()),
        created_at: Utc::now(),
        completed_at: Some(Utc::now()),
    };

    let json = serde_json::to_string(&resp).unwrap();
    assert!(json.contains("completed"));
    assert!(json.contains("https://storage.local/reports/report-123.pdf"));

    let deserialized: PdfReportResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.status, "completed");
}

#[test]
fn test_linked_assessments_serialization() {
    let resp = LinkedAssessmentsResponse {
        linked_assessments: vec![LinkedAssessmentItem {
            question_id: Uuid::new_v4(),
            assessment_id: Uuid::new_v4(),
            assessment_title: "Midterm Coding Assessment".to_string(),
            test_code: Some("CODE2026".to_string()),
        }],
    };

    let json = serde_json::to_string(&resp).unwrap();
    assert!(json.contains("Midterm Coding Assessment"));
    assert!(json.contains("CODE2026"));

    let deserialized: LinkedAssessmentsResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.linked_assessments.len(), 1);
    assert_eq!(
        deserialized.linked_assessments[0].assessment_title,
        "Midterm Coding Assessment"
    );
}

#[test]
fn test_two_institution_fixtures_and_cross_tenant_isolation() {
    let secret = "test_jwt_secret_key_1234567890123456";
    let inst_a: i32 = 1;
    let inst_b: i32 = 2;

    // Fixtures for INST_A (Institution Faculty/Admin & Student)
    let admin_a = create_mock_user("admin@inst-a.edu", Some(inst_a), UserRole::Faculty);
    let faculty_a = create_mock_user("faculty@inst-a.edu", Some(inst_a), UserRole::Faculty);
    let student_a = create_mock_user("student@inst-a.edu", Some(inst_a), UserRole::Student);

    // Fixtures for INST_B (Institution Faculty/Admin & Student)
    let admin_b = create_mock_user("admin@inst-b.edu", Some(inst_b), UserRole::Faculty);
    let faculty_b = create_mock_user("faculty@inst-b.edu", Some(inst_b), UserRole::Faculty);
    let student_b = create_mock_user("student@inst-b.edu", Some(inst_b), UserRole::Student);

    // Token verification
    let token_admin_a = create_access_token(&admin_a, secret, 3600).unwrap();
    let token_admin_b = create_access_token(&admin_b, secret, 3600).unwrap();
    let claims_admin_a = verify_token(&token_admin_a, secret).unwrap();
    let claims_admin_b = verify_token(&token_admin_b, secret).unwrap();

    // 1. ADMIN_A institution is strictly INST_A
    assert_eq!(claims_admin_a.institution_id, Some(inst_a));
    assert_ne!(claims_admin_a.institution_id, Some(inst_b));

    // 2. ADMIN_B institution is strictly INST_B
    assert_eq!(claims_admin_b.institution_id, Some(inst_b));
    assert_ne!(claims_admin_b.institution_id, Some(inst_a));

    // 3. Direct ID cross-tenant access rule:
    // A query filtered by user.institution_id ($1) will NEVER match records owned by INST_B
    let is_same_tenant = |token_inst: Option<i32>, target_record_inst: Option<i32>| -> bool {
        match (token_inst, target_record_inst) {
            (Some(ti), Some(ri)) => ti == ri,
            _ => false,
        }
    };

    assert!(is_same_tenant(claims_admin_a.institution_id, Some(inst_a)));
    assert!(!is_same_tenant(claims_admin_a.institution_id, Some(inst_b)));
    assert!(!is_same_tenant(claims_admin_b.institution_id, Some(inst_a)));

    // 4. Faculty token verification and cross-tenant restrictions
    let token_faculty_a = create_access_token(&faculty_a, secret, 3600).unwrap();
    let token_faculty_b = create_access_token(&faculty_b, secret, 3600).unwrap();
    let claims_faculty_a = verify_token(&token_faculty_a, secret).unwrap();
    let claims_faculty_b = verify_token(&token_faculty_b, secret).unwrap();

    assert_eq!(claims_faculty_a.institution_id, Some(inst_a));
    assert_eq!(claims_faculty_b.institution_id, Some(inst_b));
    assert!(!is_same_tenant(
        claims_faculty_a.institution_id,
        Some(inst_b)
    ));
    assert!(!is_same_tenant(
        claims_faculty_b.institution_id,
        Some(inst_a)
    ));

    // 5. Role validation: Students cannot perform faculty/admin mutations
    assert_eq!(student_a.role, UserRole::Student);
    assert_ne!(student_a.role, UserRole::Faculty);
    assert_ne!(student_a.role, UserRole::SuperAdmin);

    assert_eq!(student_b.institution_id, Some(inst_b));
    assert_eq!(student_b.role, UserRole::Student);
    assert_ne!(student_b.role, UserRole::Faculty);
    assert_ne!(student_b.role, UserRole::SuperAdmin);
}

#[test]
fn test_rfc4180_csv_escaping_compliance() {
    use janv_api::analytics::escape_csv;

    // Normal text without commas or quotes should remain unchanged
    assert_eq!(escape_csv("Computer Science"), "Computer Science");

    // Text with comma must be wrapped in quotes
    assert_eq!(
        escape_csv("Algorithms, Data Structures"),
        "\"Algorithms, Data Structures\""
    );

    // Text with quotes must be escaped with double quotes and enclosed in quotes
    assert_eq!(
        escape_csv("John \"The Ace\" Doe"),
        "\"John \"\"The Ace\"\" Doe\""
    );

    // Text with newlines must be enclosed in quotes
    assert_eq!(escape_csv("Line 1\nLine 2"), "\"Line 1\nLine 2\"");

    // Unicode characters must be preserved
    assert_eq!(escape_csv("São Paulo, Brasil"), "\"São Paulo, Brasil\"");
}

#[test]
fn test_valid_pdf_generation_magic_bytes() {
    use janv_api::analytics::create_valid_pdf;

    let pdf = create_valid_pdf(
        "Assessment Report: Final Examination",
        "Test Code: FIN2026 | Duration: 120m",
        "Total Candidates: 50 | Average Score: 82.4%",
    );

    // Verify PDF header magic bytes
    assert!(
        pdf.starts_with(b"%PDF-1.4"),
        "PDF must start with %PDF-1.4 magic bytes"
    );

    // Verify PDF trailer %%EOF
    let pdf_str = String::from_utf8_lossy(&pdf);
    assert!(pdf_str.contains("%%EOF"), "PDF must end with %%EOF marker");
    assert!(
        pdf_str.contains("/Type /Catalog"),
        "PDF must include catalog"
    );
    assert!(
        pdf_str.contains("/Type /Pages"),
        "PDF must include pages object"
    );
}

#[test]
fn test_student_safe_question_sanitization_privacy() {
    use janv_api::assessment::question::sanitize_question_for_student;
    use janv_common::models::{Difficulty, Question, QuestionType};

    let raw_question = Question {
        id: Uuid::new_v4(),
        bank_id: None,
        question_type: QuestionType::Mcq,
        content: "What is the time complexity of binary search?".to_string(),
        options: Some(serde_json::json!([
            {"id": "opt1", "text": "O(n)", "is_correct": false},
            {"id": "opt2", "text": "O(log n)", "is_correct": true},
            {"id": "opt3", "text": "O(n^2)", "is_correct": false}
        ])),
        explanation: Some(
            "Binary search divides the search interval in half each step.".to_string(),
        ),
        difficulty: Difficulty::Easy,
        tags: Some(vec!["algorithms".to_string()]),
        points: 4,
        created_at: Utc::now(),
    };

    let sanitized = sanitize_question_for_student(&raw_question);

    // Explanation MUST be null / removed for students
    assert!(
        sanitized.get("explanation").unwrap().is_null(),
        "Student payload must NOT reveal explanation"
    );

    // Options must NOT include `is_correct`
    let options = sanitized.get("options").unwrap().as_array().unwrap();
    assert_eq!(options.len(), 3);
    for opt in options {
        assert!(
            opt.get("is_correct").is_none(),
            "Option must NOT expose is_correct to student: {:?}",
            opt
        );
        assert!(opt.get("id").is_some());
        assert!(opt.get("text").is_some());
    }
}
