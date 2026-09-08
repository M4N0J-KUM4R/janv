use std::env;

#[derive(Debug, Clone, Copy)]
pub struct ExecutionLimits {
    pub max_cpu: f64,
    pub max_memory_bytes: u64,
    pub timeout_secs: u64,
    pub max_output_bytes: usize,
    pub max_processes: u64,
}

impl Default for ExecutionLimits {
    fn default() -> Self {
        Self {
            max_cpu: 0.5,
            max_memory_bytes: 128 * 1024 * 1024,
            timeout_secs: 10,
            max_output_bytes: 65536,
            max_processes: 64,
        }
    }
}

impl ExecutionLimits {
    pub fn from_env() -> Self {
        let default_limits = Self::default();
        Self {
            max_cpu: env::var("JANV_MAX_CPU")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_cpu),
            max_memory_bytes: env::var("JANV_MAX_MEMORY")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_memory_bytes),
            timeout_secs: env::var("JANV_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.timeout_secs),
            max_output_bytes: env::var("JANV_MAX_OUTPUT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_output_bytes),
            max_processes: env::var("JANV_MAX_PROCESSES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(default_limits.max_processes),
        }
    }
}
