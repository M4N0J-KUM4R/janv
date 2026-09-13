use janv_executor::{
    languages::{Language, get_language_config, list_languages, parse_language},
    limits::ExecutionLimits,
    output::{ExecutionStatus, truncate_output},
    judge0::Judge0Client,
};

#[test]
fn test_execution_limits_defaults() {
    let limits = ExecutionLimits::default();
    assert_eq!(limits.timeout_secs, 5.0);
    assert_eq!(limits.max_memory_kb, 128 * 1024);
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

#[test]
fn test_language_mappings_and_judge0_ids() {
    let languages = list_languages();
    assert!(languages.len() >= 5);

    let py = parse_language("python").unwrap();
    assert_eq!(py, Language::Python);
    assert_eq!(get_language_config(&py).judge0_id, 71);

    let cpp = parse_language("cpp").unwrap();
    assert_eq!(cpp, Language::Cpp);
    assert_eq!(get_language_config(&cpp).judge0_id, 54);

    let rust = parse_language("rs").unwrap();
    assert_eq!(rust, Language::Rust);
    assert_eq!(get_language_config(&rust).judge0_id, 73);

    let js = parse_language("js").unwrap();
    assert_eq!(js, Language::JavaScript);
    assert_eq!(get_language_config(&js).judge0_id, 63);

    let ts = parse_language("ts").unwrap();
    assert_eq!(ts, Language::TypeScript);
    assert_eq!(get_language_config(&ts).judge0_id, 74);

    let java = parse_language("java").unwrap();
    assert_eq!(java, Language::Java);
    assert_eq!(get_language_config(&java).judge0_id, 62);

    let c = parse_language("c").unwrap();
    assert_eq!(c, Language::C);
    assert_eq!(get_language_config(&c).judge0_id, 50);

    let go = parse_language("golang").unwrap();
    assert_eq!(go, Language::Go);
    assert_eq!(get_language_config(&go).judge0_id, 60);

    let cs = parse_language("c#").unwrap();
    assert_eq!(cs, Language::CSharp);
    assert_eq!(get_language_config(&cs).judge0_id, 51);
}

#[tokio::test]
async fn test_judge0_client_offline_handling() {
    // Port 65432 where nothing is listening
    let client = Judge0Client::with_config(
        "http://127.0.0.1:65432".to_string(),
        None,
        None,
        ExecutionLimits::default(),
    );

    let output = client
        .execute("print('hello')", &Language::Python, None)
        .await
        .expect("Client should return clean ExecutionOutput on connection error");

    assert_eq!(output.status, ExecutionStatus::RuntimeError);
    assert_eq!(output.exit_code, 1);
    assert!(output.stdout.is_empty());
    assert!(output.stderr.contains("Judge0 connection error"));
}
