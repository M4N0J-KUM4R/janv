pub mod audit_log;
pub mod bulk_ops;
pub mod dashboard;
pub mod handlers;

use crate::db::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/users",
            get(handlers::list_users).post(handlers::create_user),
        )
        .route(
            "/users/{id}",
            get(handlers::get_user)
                .put(handlers::update_user)
                .delete(handlers::delete_user),
        )
        .route("/bulk-import", post(bulk_ops::bulk_import_users))
        .route("/dashboard", get(dashboard::get_dashboard))
        .route("/audit-log", get(audit_log::get_audit_log))
}
