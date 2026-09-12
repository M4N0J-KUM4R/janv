use janv_common::dto::*;
use janv_common::models::{Difficulty, QuestionType};
use uuid::Uuid;
use validator::Validate;

#[test]
fn test_create_assessment_validation() {
    let valid_req = CreateAssessmentRequest {
        title: "Midterm Assessment".to_string(),
        description: Some("Description of assessment".to_string()),
        instructions: Some("Do not switch tabs".to_string()),
        course_id: Some(Uuid::new_v4()),
        duration_mins: 60,
        total_marks: 100,
        pass_percentage: 50.0,
        is_published: false,
        shuffle_questions: true,
        show_results: true,
        start_time: None,
        end_time: None,
        test_code: Some("EXAM2026".to_string()),
        num_sections: Some(2),
        tab_switch_limit: Some(5),
        institution_visibility: None,
        batch_visibility: None,
        sections: Some(vec![
            CreateSectionRequest {
                title: "Section 1: Aptitude".to_string(),
                instructions: None,
                section_type: Some("1".to_string()),
                duration_mins: Some(30),
                default_marks: Some(1.0),
                penalty_marks: Some(0.25),
                display_questions: Some(30),
            },
            CreateSectionRequest {
                title: "Section 2: Coding".to_string(),
                instructions: None,
                section_type: Some("2".to_string()),
                duration_mins: Some(30),
                default_marks: Some(10.0),
                penalty_marks: Some(0.0),
                display_questions: None,
            },
        ]),
    };

    assert!(valid_req.validate().is_ok());

    // Invalid title (too short)
    let invalid_title = CreateAssessmentRequest {
        title: "ab".to_string(),
        ..valid_req.clone()
    };
    assert!(invalid_title.validate().is_err());

    // Invalid pass percentage (> 100)
    let invalid_pass = CreateAssessmentRequest {
        pass_percentage: 105.0,
        ..valid_req.clone()
    };
    assert!(invalid_pass.validate().is_err());

    // Invalid duration (0)
    let invalid_duration = CreateAssessmentRequest {
        duration_mins: 0,
        ..valid_req.clone()
    };
    assert!(invalid_duration.validate().is_err());
}

#[test]
fn test_section_validation() {
    let valid_sec = CreateSectionRequest {
        title: "Core Java".to_string(),
        instructions: None,
        section_type: Some("1".to_string()),
        duration_mins: Some(45),
        default_marks: Some(2.0),
        penalty_marks: Some(0.5),
        display_questions: Some(20),
    };
    assert!(valid_sec.validate().is_ok());

    // Empty title
    let empty_title = CreateSectionRequest {
        title: "".to_string(),
        ..valid_sec.clone()
    };
    assert!(empty_title.validate().is_err());

    // Duration 0
    let zero_dur = CreateSectionRequest {
        duration_mins: Some(0),
        ..valid_sec.clone()
    };
    assert!(zero_dur.validate().is_err());
}

#[test]
fn test_create_question_validation() {
    let valid_q = CreateQuestionRequest {
        bank_id: Some(Uuid::new_v4()),
        question_type: QuestionType::Mcq,
        content: "What is 2 + 2?".to_string(),
        options: Some(serde_json::json!([
            {"id": "1", "text": "4", "is_correct": true},
            {"id": "2", "text": "5", "is_correct": false}
        ])),
        explanation: Some("2 + 2 = 4".to_string()),
        difficulty: Difficulty::Easy,
        tags: Some(vec!["math".to_string()]),
        points: 5,
    };
    assert!(valid_q.validate().is_ok());

    // Empty content
    let empty_content = CreateQuestionRequest {
        content: "".to_string(),
        ..valid_q.clone()
    };
    assert!(empty_content.validate().is_err());
}
