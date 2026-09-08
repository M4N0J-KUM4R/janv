use janv_executor::{limits::ExecutionLimits, output::truncate_output};

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
