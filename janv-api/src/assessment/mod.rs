pub mod analytics;
pub mod attempt;
pub mod handlers;
pub mod leaderboard;
pub mod passcode;
pub mod question;
pub mod template;
pub mod timer;

use crate::db::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        // Assessment CRUD
        .route(
            "/",
            get(handlers::list_assessments).post(handlers::create_assessment),
        )
        .route(
            "/{id}",
            get(handlers::get_assessment)
                .put(handlers::update_assessment)
                .delete(handlers::delete_assessment),
        )
        .route("/{id}/publish", post(handlers::publish_assessment))
        .route("/{id}/duplicate", post(handlers::duplicate_assessment))
        // Question banks & questions
        .route(
            "/banks",
            get(question::list_question_banks).post(question::create_question_bank),
        )
        .route("/banks/{bank_id}/questions", post(question::add_question))
        .route(
            "/questions/{id}",
            put(question::update_question).delete(question::delete_question),
        )
        .route(
            "/{assessment_id}/questions",
            post(question::add_questions_to_assessment),
        )
        // Attempts & test-taking
        .route("/{id}/start", post(attempt::start_attempt))
        .route("/attempts/{id}/submit", post(attempt::submit_attempt))
        .route("/attempts/{id}", get(attempt::get_attempt_result))
        .route("/my-attempts", get(attempt::list_my_attempts))
        // Timer
        .route("/attempts/{id}/timer", get(timer::check_timer))
        // Analytics
        .route("/{id}/analytics", get(analytics::get_assessment_analytics))
        // Templates
        .route(
            "/templates",
            get(template::list_templates).post(template::create_template),
        )
        .route(
            "/templates/create-from",
            post(template::create_from_template),
        )
        .route("/templates/{id}", delete(template::delete_template))
        .route("/{id}/save-as-template", post(template::save_as_template))
        // Leaderboard
        .route("/{id}/leaderboard", get(leaderboard::get_leaderboard))
        .route(
            "/leaderboard/global",
            get(leaderboard::get_global_leaderboard),
        )
        // Passcode
        .route(
            "/{id}/passcode",
            post(passcode::set_passcode).delete(passcode::remove_passcode),
        )
        .route("/passcode/verify", post(passcode::verify_passcode))
        .route("/passcode/current", get(passcode::get_current_passcode))
        .route("/passcode/regenerate", post(passcode::regenerate_passcode))
}
