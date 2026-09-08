use crate::output::ExecutionOutput;
use anyhow::{Result, anyhow};
use chrono::{DateTime, Utc};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionJob {
    pub id: Uuid,
    pub code: String,
    pub language: String,
    pub stdin: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionJobResult {
    pub job_id: Uuid,
    pub output: ExecutionOutput,
    pub completed_at: DateTime<Utc>,
}

pub struct JobQueue {
    redis: redis::Client,
}

impl JobQueue {
    pub fn new(redis_url: &str) -> Result<Self> {
        let redis = redis::Client::open(redis_url)
            .map_err(|e| anyhow!("Failed to connect to Redis: {}", e))?;
        Ok(Self { redis })
    }

    pub async fn enqueue(&self, job: &ExecutionJob) -> Result<()> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let job_json = serde_json::to_string(job)?;
        conn.lpush::<_, _, ()>("janv:queue:executions", job_json)
            .await?;
        Ok(())
    }

    pub async fn dequeue(&self) -> Result<Option<ExecutionJob>> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let result: Option<(String, String)> = conn.brpop("janv:queue:executions", 2.0).await?;

        if let Some((_, job_json)) = result {
            let job: ExecutionJob = serde_json::from_str(&job_json)?;
            Ok(Some(job))
        } else {
            Ok(None)
        }
    }

    pub async fn store_result(&self, result: &ExecutionJobResult) -> Result<()> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let key = format!("janv:result:{}", result.job_id);
        let result_json = serde_json::to_string(result)?;

        redis::pipe()
            .set(&key, result_json)
            .expire(&key, 3600) // 1 hour TTL
            .query_async::<()>(&mut conn)
            .await?;

        Ok(())
    }

    pub async fn get_result(&self, job_id: &Uuid) -> Result<Option<ExecutionJobResult>> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let key = format!("janv:result:{}", job_id);
        let result_json: Option<String> = conn.get(&key).await?;

        if let Some(json) = result_json {
            let result: ExecutionJobResult = serde_json::from_str(&json)?;
            Ok(Some(result))
        } else {
            Ok(None)
        }
    }
}
