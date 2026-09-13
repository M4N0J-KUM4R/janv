use std::env;

#[derive(Debug, Clone, Copy)]
pub struct ExecutionLimits {
    pub timeout_secs: f64,
    pub max_memory_kb: u64,
    pub max_output_bytes: usize,
}

impl Default for ExecutionLimits {
    fn default() -> Self {
        Self {
            timeout_secs: 5.0,
            max_memory_kb: 128 * 1024, // 128 MB
            max_output_bytes: 65536,
        }
    }
}

impl ExecutionLimits {
    pub fn from_env() -> Self {
        let default_limits = Self::default();
        Self {
            timeout_secs: env::var("JUDGE0_TIMEOUT_SECS")
                .or_else(|_| env::var("JANV_TIMEOUT_SECS"))
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.timeout_secs),
            max_memory_kb: env::var("JUDGE0_MAX_MEMORY_KB")
                .or_else(|_| env::var("JANV_MAX_MEMORY_KB"))
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_memory_kb),
            max_output_bytes: env::var("JUDGE0_MAX_OUTPUT")
                .or_else(|_| env::var("JANV_MAX_OUTPUT"))
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_output_bytes),
        }
    }
}
