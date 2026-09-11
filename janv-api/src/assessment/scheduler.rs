use sqlx::PgPool;
use tokio::{task::JoinHandle, time::{Duration, MissedTickBehavior}};

pub fn spawn(pool: PgPool) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
        loop {
            // The first tick runs immediately, catching up after an API restart.
            interval.tick().await;
            match tick(&pool).await {
                Ok((published, completed)) if published > 0 || completed > 0 => {
                    tracing::info!(published, completed, "Assessment schedule advanced");
                }
                Ok(_) => {}
                Err(error) => tracing::error!(%error, "Assessment scheduler tick failed; retrying next minute"),
            }
        }
    })
}

async fn tick(pool: &PgPool) -> Result<(u64, u64), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("SET LOCAL lock_timeout = '5s'").execute(&mut *tx).await?;
    sqlx::query("SET LOCAL statement_timeout = '15s'").execute(&mut *tx).await?;

    // Finish expired scheduled tests first, so downtime never publishes an expired test.
    // Drafts and cancelled tests retain their deliberate lifecycle state.
    let completed = sqlx::query(
        "UPDATE assessments SET status = 'completed'
         WHERE status IN ('scheduled', 'ongoing') AND end_time < NOW()",
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    let published = sqlx::query(
        "UPDATE assessments SET is_published = true, status = 'ongoing'
         WHERE status = 'scheduled' AND start_time <= NOW()
           AND (end_time IS NULL OR end_time >= NOW())",
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    tx.commit().await?;
    Ok((published, completed))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[sqlx::test(migrations = false)]
    async fn advances_due_tests_without_publishing_expired_or_draft_tests(pool: PgPool) {
        sqlx::raw_sql(
            "CREATE TYPE assessment_status AS ENUM ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled');
             CREATE TABLE assessments (
                 title TEXT PRIMARY KEY, status assessment_status NOT NULL,
                 is_published BOOLEAN NOT NULL DEFAULT false,
                 start_time TIMESTAMPTZ, end_time TIMESTAMPTZ
             );
             INSERT INTO assessments (title, status, start_time, end_time) VALUES
                 ('due', 'scheduled', NOW() - INTERVAL '1 minute', NOW() + INTERVAL '1 hour'),
                 ('future', 'scheduled', NOW() + INTERVAL '1 hour', NULL),
                 ('no_end', 'scheduled', NOW() - INTERVAL '1 minute', NULL),
                 ('no_start', 'scheduled', NULL, NULL),
                 ('expired', 'scheduled', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
                 ('finished', 'ongoing', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
                 ('draft', 'draft', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
                 ('cancelled', 'cancelled', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour');
             INSERT INTO assessments (title, status, is_published, start_time) VALUES
                 ('already_published', 'scheduled', true, NOW() - INTERVAL '1 minute');",
        )
        .execute(&pool)
        .await
        .unwrap();

        assert_eq!(tick(&pool).await.unwrap(), (3, 2));
        assert_eq!(tick(&pool).await.unwrap(), (0, 0));
        for (title, expected_status, expected_published) in [
            ("due", "ongoing", true),
            ("future", "scheduled", false),
            ("no_end", "ongoing", true),
            ("no_start", "scheduled", false),
            ("expired", "completed", false),
            ("finished", "completed", false),
            ("draft", "draft", false),
            ("cancelled", "cancelled", false),
            ("already_published", "ongoing", true),
        ] {
            let actual: (String, bool) = sqlx::query_as(
                "SELECT status::text, is_published FROM assessments WHERE title = $1",
            )
            .bind(title)
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(actual, (expected_status.to_string(), expected_published), "{title}");
        }
    }
}
