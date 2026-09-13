use janv_executor::{
    languages::{Language, get_language_config, list_languages, parse_language},
    output::ExecutionStatus,
    executor::CodeExecutor,
};

#[test]
fn rust_is_discoverable_and_configured_for_judge0() {
    for alias in ["rust", "Rust", "RUST", "rs"] {
        assert_eq!(parse_language(alias).unwrap(), Language::Rust);
    }
    let config = get_language_config(&Language::Rust);
    assert_eq!(config.file_extension, "rs");
    assert_eq!(config.judge0_id, 73);
    assert_eq!(config.version, "Rust 1.40.0");
    assert_eq!(list_languages().iter().filter(|lang| lang.name == "rust").count(), 1);
    for alias in ["c", "c++", "cpp", "java", "python", "py", "python3", "js", "ts", "go", "cs"] {
        assert!(parse_language(alias).is_ok());
    }
    assert!(parse_language("unsupported").is_err());
}

#[tokio::test]
#[ignore = "Requires active Judge0 instance at JUDGE0_URL"]
async fn executor_runs_code_against_live_judge0() {
    let executor = CodeExecutor::new().await.unwrap();
    let output = executor.execute_code(
        "print('hello python from judge0')", "python", None,
    ).await.unwrap();
    assert_eq!(output.status, ExecutionStatus::Success);
    assert_eq!(output.stdout.trim(), "hello python from judge0");
}
