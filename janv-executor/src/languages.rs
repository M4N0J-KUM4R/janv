use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Language {
    C,
    Cpp,
    Java,
    Python,
    Rust,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageConfig {
    pub name: String,
    pub display_name: String,
    pub file_extension: String,
    pub docker_image: String,
    pub compile_cmd: Option<String>,
    pub run_cmd: String,
    pub version: String,
}

pub fn get_language_config(lang: &Language) -> LanguageConfig {
    match lang {
        Language::C => LanguageConfig {
            name: "c".to_string(),
            display_name: "C (GCC)".to_string(),
            file_extension: "c".to_string(),
            docker_image: "janv-sandbox-c:latest".to_string(),
            compile_cmd: Some("gcc -o /tmp/solution /tmp/solution.c".to_string()),
            run_cmd: "/tmp/solution".to_string(),
            version: "gcc (Alpine)".to_string(),
        },
        Language::Cpp => LanguageConfig {
            name: "cpp".to_string(),
            display_name: "C++ (GCC)".to_string(),
            file_extension: "cpp".to_string(),
            docker_image: "janv-sandbox-cpp:latest".to_string(),
            compile_cmd: Some("g++ -o /tmp/solution /tmp/solution.cpp".to_string()),
            run_cmd: "/tmp/solution".to_string(),
            version: "g++ (Alpine)".to_string(),
        },
        Language::Java => LanguageConfig {
            name: "java".to_string(),
            display_name: "Java (OpenJDK)".to_string(),
            file_extension: "java".to_string(),
            docker_image: "janv-sandbox-java:latest".to_string(),
            compile_cmd: Some("javac /tmp/Solution.java".to_string()),
            run_cmd: "java -cp /tmp Solution".to_string(),
            version: "Java 21".to_string(),
        },
        Language::Python => LanguageConfig {
            name: "python".to_string(),
            display_name: "Python 3".to_string(),
            file_extension: "py".to_string(),
            docker_image: "janv-sandbox-python:latest".to_string(),
            compile_cmd: None,
            run_cmd: "python3 /tmp/solution.py".to_string(),
            version: "Python 3.12".to_string(),
        },
        Language::Rust => LanguageConfig {
            name: "rust".to_string(),
            display_name: "Rust".to_string(),
            file_extension: "rs".to_string(),
            docker_image: "janv-sandbox-rust:latest".to_string(),
            compile_cmd: Some("rustc /tmp/solution.rs -o /tmp/solution".to_string()),
            run_cmd: "/tmp/solution".to_string(),
            version: "Rust (Alpine)".to_string(),
        },
    }
}

pub fn list_languages() -> Vec<LanguageConfig> {
    vec![
        get_language_config(&Language::C),
        get_language_config(&Language::Cpp),
        get_language_config(&Language::Java),
        get_language_config(&Language::Python),
        get_language_config(&Language::Rust),
    ]
}

pub fn parse_language(s: &str) -> Result<Language> {
    match s.to_lowercase().as_str() {
        "c" => Ok(Language::C),
        "cpp" | "c++" => Ok(Language::Cpp),
        "java" => Ok(Language::Java),
        "python" | "py" | "python3" => Ok(Language::Python),
        "rust" | "rs" => Ok(Language::Rust),
        _ => Err(anyhow!("Unsupported language: {}", s)),
    }
}
