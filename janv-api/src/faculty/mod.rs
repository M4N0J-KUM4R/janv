pub mod analytics;
pub mod course;
pub mod handlers;

use crate::db::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handlers::get_faculty_dashboard))
        .route(
            "/courses",
            get(course::list_courses).post(course::create_course),
        )
        .route(
            "/courses/{id}",
            get(course::get_course)
                .put(course::update_course)
                .delete(course::delete_course),
        )
        .route("/courses/{id}/enroll", post(course::enroll_student))
        .route(
            "/courses/{id}/students",
            get(course::list_enrolled_students),
        )
        .route(
            "/courses/{id}/analytics",
            get(analytics::get_course_analytics),
        )
}
