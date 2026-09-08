use chrono::Utc;
use janv_api::assessment::question::{sanitize_options, sanitize_question_for_student};
use janv_common::models::{Difficulty, Question, QuestionType};
use serde_json::json;
use uuid::Uuid;

#[test]
fn test_question_types_and_difficulty_serialization() {
    let q_types = vec![
        (QuestionType::Mcq, "\"mcq\""),
        (QuestionType::MultiSelect, "\"multi_select\""),
        (QuestionType::TrueFalse, "\"true_false\""),
        (QuestionType::Coding, "\"coding\""),
    ];

    for (qt, expected) in q_types {
        let serialized = serde_json::to_string(&qt).unwrap();
        assert_eq!(serialized, expected);
        let deserialized: QuestionType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, qt);
    }

    let difficulties = vec![
        (Difficulty::Easy, "\"easy\""),
        (Difficulty::Medium, "\"medium\""),
        (Difficulty::Hard, "\"hard\""),
    ];

    for (diff, expected) in difficulties {
        let serialized = serde_json::to_string(&diff).unwrap();
        assert_eq!(serialized, expected);
        let deserialized: Difficulty = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, diff);
    }
}

#[test]
fn test_sanitize_options_removes_answers() {
    let raw_options = Some(json!([
        { "id": "A", "input": "Option A", "is_correct": true, "isAnswer": 1 },
        { "id": "B", "input": "Option B", "is_correct": false, "isAnswer": 0, "correct": false }
    ]));

    let sanitized = sanitize_options(&raw_options).expect("Sanitized options should not be None");
    let arr = sanitized.as_array().expect("Should be an array");

    for opt in arr {
        assert!(opt.get("is_correct").is_none());
        assert!(opt.get("correct").is_none());
        assert!(opt.get("isAnswer").is_none());
        assert!(opt.get("is_answer").is_none());
        assert!(opt.get("input").is_some());
    }
}

#[test]
fn test_sanitize_question_for_student() {
    let q = Question {
        id: Uuid::new_v4(),
        bank_id: Some(Uuid::new_v4()),
        question_type: QuestionType::Mcq,
        content: "What is 2 + 2?".to_string(),
        options: Some(json!([
            { "text": "3", "is_correct": false },
            { "text": "4", "is_correct": true }
        ])),
        explanation: Some("2 + 2 equals 4".to_string()),
        difficulty: Difficulty::Easy,
        tags: Some(vec!["math".to_string()]),
        points: 2,
        created_at: Utc::now(),
    };

    let sanitized = sanitize_question_for_student(&q);
    assert_eq!(sanitized["content"], "What is 2 + 2?");
    assert!(sanitized["explanation"].is_null());
    let opts = sanitized["options"].as_array().unwrap();
    assert_eq!(opts.len(), 2);
    assert!(opts[0].get("is_correct").is_none());
    assert!(opts[1].get("is_correct").is_none());
}
