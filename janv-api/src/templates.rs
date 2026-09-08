use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse, Response},
};
use janv_common::models::{Assessment, CodingProblem, Institution, UserResponse};
use uuid::Uuid;

pub struct HtmlTemplate<T>(pub T);

impl<T> IntoResponse for HtmlTemplate<T>
where
    T: Template,
{
    fn into_response(self) -> Response {
        match self.0.render() {
            Ok(html) => Html(html).into_response(),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to render template. Error: {}", err),
            )
                .into_response(),
        }
    }
}

#[derive(Template)]
#[template(path = "layout.html")]
pub struct LayoutTemplate<'a, T: Template> {
    pub title: &'a str,
    pub content: T,
    pub user: Option<UserResponse>,
}

#[derive(Template)]
#[template(path = "login.html")]
pub struct LoginTemplate {
    pub error: Option<String>,
}

#[derive(Template)]
#[template(path = "register.html")]
pub struct RegisterTemplate {
    pub error: Option<String>,
}

#[derive(Template)]
#[template(path = "dashboard.html")]
pub struct DashboardTemplate {
    pub user: UserResponse,
}

#[derive(Template)]
#[template(path = "compiler.html")]
pub struct CompilerTemplate {
    pub languages: Vec<String>,
}

#[derive(Template)]
#[template(path = "practice.html")]
pub struct PracticeTemplate {
    pub problems: Vec<CodingProblem>,
}

#[derive(Template)]
#[template(path = "assessments.html")]
pub struct AssessmentsTemplate {
    pub assessments: Vec<Assessment>,
}

#[derive(Template)]
#[template(path = "admin_dashboard.html")]
pub struct AdminDashboardTemplate {
    pub user: UserResponse,
    pub institutions: Vec<Institution>,
    pub users: Vec<UserResponse>,

    // selected filters
    pub selected_institution_id: Option<i32>,
    pub selected_branch: Option<String>,
    pub selected_batch: Option<String>,

    // metrics
    pub total_colleges: usize,
    pub total_students: usize,
    pub total_faculty: usize,

    // alerts
    pub error: Option<String>,
    pub success: Option<String>,
}
