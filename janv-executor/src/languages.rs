use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Language {
    C,
    Cpp,
    Java,
    Python,
    Rust,
    JavaScript,
    TypeScript,
    Go,
    CSharp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageConfig {
    pub name: String,
    pub display_name: String,
    pub file_extension: String,
    pub judge0_id: u32,
    pub version: String,
}

pub fn get_language_config(lang: &Language) -> LanguageConfig {
    match lang {
        Language::C => LanguageConfig {
            name: "c".to_string(),
            display_name: "C (GCC 9.2.0)".to_string(),
            file_extension: "c".to_string(),
            judge0_id: 50,
            version: "GCC 9.2.0".to_string(),
        },
        Language::Cpp => LanguageConfig {
            name: "cpp".to_string(),
            display_name: "C++ (GCC 9.2.0)".to_string(),
            file_extension: "cpp".to_string(),
            judge0_id: 54,
            version: "GCC 9.2.0".to_string(),
        },
        Language::Java => LanguageConfig {
            name: "java".to_string(),
            display_name: "Java (OpenJDK 13.0.1)".to_string(),
            file_extension: "java".to_string(),
            judge0_id: 62,
            version: "OpenJDK 13.0.1".to_string(),
        },
        Language::Python => LanguageConfig {
            name: "python".to_string(),
            display_name: "Python (3.8.1)".to_string(),
            file_extension: "py".to_string(),
            judge0_id: 71,
            version: "Python 3.8.1".to_string(),
        },
        Language::Rust => LanguageConfig {
            name: "rust".to_string(),
            display_name: "Rust (1.40.0)".to_string(),
            file_extension: "rs".to_string(),
            judge0_id: 73,
            version: "Rust 1.40.0".to_string(),
        },
        Language::JavaScript => LanguageConfig {
            name: "javascript".to_string(),
            display_name: "JavaScript (Node.js 12.14.0)".to_string(),
            file_extension: "js".to_string(),
            judge0_id: 63,
            version: "Node.js 12.14.0".to_string(),
        },
        Language::TypeScript => LanguageConfig {
            name: "typescript".to_string(),
            display_name: "TypeScript (3.7.4)".to_string(),
            file_extension: "ts".to_string(),
            judge0_id: 74,
            version: "TypeScript 3.7.4".to_string(),
        },
        Language::Go => LanguageConfig {
            name: "go".to_string(),
            display_name: "Go (1.13.5)".to_string(),
            file_extension: "go".to_string(),
            judge0_id: 60,
            version: "Go 1.13.5".to_string(),
        },
        Language::CSharp => LanguageConfig {
            name: "csharp".to_string(),
            display_name: "C# (Mono 6.6.0.161)".to_string(),
            file_extension: "cs".to_string(),
            judge0_id: 51,
            version: "Mono 6.6.0.161".to_string(),
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
        get_language_config(&Language::JavaScript),
        get_language_config(&Language::TypeScript),
        get_language_config(&Language::Go),
        get_language_config(&Language::CSharp),
    ]
}

pub fn parse_language(s: &str) -> Result<Language> {
    match s.trim().to_lowercase().as_str() {
        "c" => Ok(Language::C),
        "cpp" | "c++" | "g++" => Ok(Language::Cpp),
        "java" => Ok(Language::Java),
        "python" | "py" | "python3" => Ok(Language::Python),
        "rust" | "rs" => Ok(Language::Rust),
        "javascript" | "js" | "node" | "nodejs" => Ok(Language::JavaScript),
        "typescript" | "ts" => Ok(Language::TypeScript),
        "go" | "golang" => Ok(Language::Go),
        "csharp" | "cs" | "c#" => Ok(Language::CSharp),
        _ => Err(anyhow!("Unsupported language: {}", s)),
    }
}
