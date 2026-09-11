use janv_executor::{
    executor::CodeExecutor,
    languages::{Language, get_language_config, list_languages, parse_language},
    limits::ExecutionLimits,
    output::ExecutionStatus,
    sandbox::Sandbox,
};

#[test]
fn rust_is_discoverable_and_uses_the_existing_compile_then_run_pipeline() {
    for alias in ["rust", "Rust", "RUST", "rs"] {
        assert_eq!(parse_language(alias).unwrap(), Language::Rust);
    }
    let config = get_language_config(&Language::Rust);
    assert_eq!(config.file_extension, "rs");
    assert_eq!(config.docker_image, "janv-sandbox-rust:latest");
    assert_eq!(config.compile_cmd.as_deref(), Some("rustc /tmp/solution.rs -o /tmp/solution"));
    assert_eq!(config.run_cmd, "/tmp/solution");
    assert_eq!(list_languages().iter().filter(|lang| lang.name == "rust").count(), 1);
    for alias in ["c", "c++", "cpp", "java", "python", "py", "python3"] {
        assert!(parse_language(alias).is_ok());
    }
    assert!(parse_language("unsupported").is_err());
}

#[tokio::test]
#[ignore = "Requires Docker and janv-sandbox-rust:latest built locally"]
async fn executor_runs_rust_and_reports_cgroup_memory() {
    let executor = CodeExecutor::new().await.unwrap();
    let output = executor.execute_code(
        "fn main() { println!(\"hello rust\"); }", "rust", None,
    ).await.unwrap();
    assert_eq!(output.status, ExecutionStatus::Success);
    assert_eq!(output.stdout.trim(), "hello rust");
    assert!(output.memory_used_kb > 0);
}

#[tokio::test]
#[ignore = "Requires Docker and janv-sandbox-rust:latest built locally"]
async fn rust_compile_error_does_not_run_the_program() {
    let executor = CodeExecutor::new().await.unwrap();
    let output = executor.execute_code("fn main( {", "rust", None).await.unwrap();
    assert_eq!(output.status, ExecutionStatus::CompilationError);
    assert!(!output.stderr.is_empty());
    assert!(output.stdout.is_empty());
    assert!(output.memory_used_kb > 0);
}

#[tokio::test]
#[ignore = "Requires Docker and janv-sandbox-rust:latest built locally"]
async fn rust_runtime_errors_and_timeouts_report_memory() {
    let sandbox = Sandbox::new(ExecutionLimits {
        timeout_secs: 1,
        ..ExecutionLimits::default()
    }).await.unwrap();
    let failed = sandbox.execute("fn main() { panic!(\"boom\"); }", &Language::Rust, None).await.unwrap();
    assert_eq!(failed.status, ExecutionStatus::RuntimeError);
    assert!(failed.memory_used_kb > 0);
    let timed_out = sandbox.execute("fn main() { loop { std::thread::sleep(std::time::Duration::from_secs(1)); } }", &Language::Rust, None).await.unwrap();
    assert_eq!(timed_out.status, ExecutionStatus::TimeLimitExceeded);
    assert!(timed_out.memory_used_kb > 0);
}
