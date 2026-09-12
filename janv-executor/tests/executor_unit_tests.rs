use janv_executor::{
    languages::Language,
    limits::ExecutionLimits,
    output::{ExecutionStatus, truncate_output},
    sandbox::Sandbox,
};

#[test]
fn test_execution_limits_defaults() {
    let limits = ExecutionLimits::default();
    assert_eq!(limits.max_cpu, 0.5);
    assert_eq!(limits.timeout_secs, 10);
    assert_eq!(limits.max_output_bytes, 65536);
}

#[test]
fn test_output_truncation() {
    let output = "Hello, World!";
    let truncated = truncate_output(output, 5);
    assert_eq!(truncated, "Hello...[output truncated]");

    let short_output = "Ok";
    let truncated_short = truncate_output(short_output, 5);
    assert_eq!(truncated_short, "Ok");
}

#[tokio::test]
async fn test_sandbox_offline_returns_runtime_error() {
    let sandbox = Sandbox::with_docker(None, ExecutionLimits::default());
    let output = sandbox
        .execute("print('hello')", &Language::Python, None)
        .await
        .expect("Execution should return Ok(ExecutionOutput)");

    assert_eq!(output.status, ExecutionStatus::RuntimeError);
    assert_eq!(output.exit_code, 1);
    assert!(output.stdout.is_empty());
    assert!(output.stderr.contains("Docker sandbox daemon is offline"));
}

#[tokio::test]
async fn test_require_docker_flag_refuses_startup_when_offline() {
    unsafe {
        std::env::set_var("REQUIRE_DOCKER", "true");
    }
    let res = Sandbox::new(ExecutionLimits::default()).await;
    unsafe {
        std::env::remove_var("REQUIRE_DOCKER");
    }
    assert!(res.is_err(), "Sandbox::new must fail when REQUIRE_DOCKER is true and Docker is offline");
    assert!(res.unwrap_err().to_string().contains("REQUIRE_DOCKER is set to true"));
}
