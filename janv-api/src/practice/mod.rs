pub mod handlers;
pub mod leaderboard;
pub mod problems;
pub mod submissions;
pub mod test_runner;

use crate::db::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            get(handlers::list_problems).post(problems::create_problem),
        )
        .route(
            "/{id}",
            get(handlers::get_problem)
                .put(problems::update_problem)
                .delete(problems::delete_problem),
        )
        .route("/{id}/test-cases", post(problems::add_test_case))
        .route("/test-cases/{id}", delete(problems::delete_test_case))
        .route("/{id}/submit", post(submissions::submit_code))
        .route("/submissions/{id}", get(submissions::get_submission))
        .route(
            "/{id}/my-submissions",
            get(submissions::list_my_submissions),
        )
        .route("/leaderboard", get(leaderboard::get_leaderboard))
}
