use crate::auth::jwt::create_access_token;
use crate::auth::middleware::AuthUser;
use crate::auth::password::{hash_password, verify_password};
use crate::db::AppState;
use crate::templates::{
    AdminDashboardTemplate, AssessmentsTemplate, CompilerTemplate, DashboardTemplate, HtmlTemplate,
    LayoutTemplate, LoginTemplate, PracticeTemplate, RegisterTemplate,
};
use axum::{
    Json,
    extract::{Form, Query, State},
    http::{HeaderMap, HeaderValue, header},
    response::{IntoResponse, Redirect, Response},
};
use chrono::Utc;
use janv_common::dto::auth::{LoginRequest, RegisterRequest};
use janv_common::errors::AppError;
use janv_common::models::{Assessment, CodingProblem, Institution, User, UserResponse, UserRole};
use uuid::Uuid;
use validator::Validate;

// Helper to fetch user response safely for layouts
async fn get_user_profile(db: &sqlx::PgPool, user_id: Uuid) -> Option<UserResponse> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_one(db)
        .await
        .ok()
        .map(UserResponse::from)
}

// 1. Dashboard View
pub async fn dashboard_page(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    let user_profile = match get_user_profile(&state.db, auth_user.id).await {
        Some(p) => p,
        None => return Redirect::to("/login").into_response(),
    };

    HtmlTemplate(LayoutTemplate {
        title: "Dashboard",
        content: DashboardTemplate {
            user: user_profile.clone(),
        },
        user: Some(user_profile),
    })
    .into_response()
}

// 2. Login View & Post
pub async fn login_page() -> impl IntoResponse {
    HtmlTemplate(LayoutTemplate {
        title: "Login",
        content: LoginTemplate { error: None },
        user: None,
    })
}

pub async fn login_post(
    State(state): State<AppState>,
    Form(body): Form<LoginRequest>,
) -> impl IntoResponse {
    if let Err(e) = body.validate() {
        return HtmlTemplate(LayoutTemplate {
            title: "Login",
            content: LoginTemplate {
                error: Some(e.to_string()),
            },
            user: None,
        })
        .into_response();
    }

    let user = match sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&body.email)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(u)) => u,
        _ => {
            return HtmlTemplate(LayoutTemplate {
                title: "Login",
                content: LoginTemplate {
                    error: Some("Invalid credentials".to_string()),
                },
                user: None,
            })
            .into_response();
        }
    };

    if !user.is_active {
        return HtmlTemplate(LayoutTemplate {
            title: "Login",
            content: LoginTemplate {
                error: Some("Account is disabled".to_string()),
            },
            user: None,
        })
        .into_response();
    }

    if verify_password(&body.password, &user.password_hash).is_err()
        || !verify_password(&body.password, &user.password_hash).unwrap_or(false)
    {
        return HtmlTemplate(LayoutTemplate {
            title: "Login",
            content: LoginTemplate {
                error: Some("Invalid credentials".to_string()),
            },
            user: None,
        })
        .into_response();
    }

    let access_token = match create_access_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_access_token_expires_secs,
    ) {
        Ok(t) => t,
        Err(_) => {
            return HtmlTemplate(LayoutTemplate {
                title: "Login",
                content: LoginTemplate {
                    error: Some("Token generation failed".to_string()),
                },
                user: None,
            })
            .into_response();
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        HeaderValue::from_str(&format!(
            "access_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
            access_token, state.config.jwt_access_token_expires_secs
        ))
        .unwrap(),
    );
    headers.insert("HX-Redirect", HeaderValue::from_static("/"));

    (headers, "Logging in...").into_response()
}

// 3. Register View & Post
pub async fn register_page() -> impl IntoResponse {
    HtmlTemplate(LayoutTemplate {
        title: "Register",
        content: RegisterTemplate { error: None },
        user: None,
    })
}

pub async fn register_post(
    State(state): State<AppState>,
    Form(body): Form<RegisterRequest>,
) -> impl IntoResponse {
    if let Err(e) = body.validate() {
        return HtmlTemplate(LayoutTemplate {
            title: "Register",
            content: RegisterTemplate {
                error: Some(e.to_string()),
            },
            user: None,
        })
        .into_response();
    }

    let exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(&body.email)
            .fetch_one(&state.db)
            .await
            .unwrap_or(false);

    if exists {
        return HtmlTemplate(LayoutTemplate {
            title: "Register",
            content: RegisterTemplate {
                error: Some("Email already exists".to_string()),
            },
            user: None,
        })
        .into_response();
    }

    let password_hash = match hash_password(&body.password) {
        Ok(h) => h,
        Err(_) => {
            return HtmlTemplate(LayoutTemplate {
                title: "Register",
                content: RegisterTemplate {
                    error: Some("Password processing failed".to_string()),
                },
                user: None,
            })
            .into_response();
        }
    };

    let user_id = Uuid::new_v4();
    let now = Utc::now();
    let role = UserRole::Student;

    let user = match sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, $8)
        RETURNING *
        "#
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(password_hash)
    .bind(&body.full_name)
    .bind(role.to_string())
    .bind(true)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await
    {
        Ok(u) => u,
        Err(e) => {
            return HtmlTemplate(LayoutTemplate {
                title: "Register",
                content: RegisterTemplate { error: Some(format!("Database error: {}", e)) },
                user: None,
            })
            .into_response()
        }
    };

    let access_token = match create_access_token(
        &user,
        &state.config.jwt_secret,
        state.config.jwt_access_token_expires_secs,
    ) {
        Ok(t) => t,
        Err(_) => {
            return HtmlTemplate(LayoutTemplate {
                title: "Register",
                content: RegisterTemplate {
                    error: Some("Token generation failed".to_string()),
                },
                user: None,
            })
            .into_response();
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        HeaderValue::from_str(&format!(
            "access_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
            access_token, state.config.jwt_access_token_expires_secs
        ))
        .unwrap(),
    );
    headers.insert("HX-Redirect", HeaderValue::from_static("/"));

    (headers, "Registering...").into_response()
}

// 4. Logout Handler
pub async fn logout_post() -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::SET_COOKIE,
        HeaderValue::from_static("access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"),
    );
    headers.insert("HX-Redirect", HeaderValue::from_static("/login"));
    (headers, "Logging out...").into_response()
}

// 5. Compiler View
pub async fn compiler_page(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    let user_profile = get_user_profile(&state.db, auth_user.id).await;

    HtmlTemplate(LayoutTemplate {
        title: "Online Compiler",
        content: CompilerTemplate {
            languages: vec![
                "rust".to_string(),
                "python".to_string(),
                "cpp".to_string(),
                "java".to_string(),
            ],
        },
        user: user_profile,
    })
    .into_response()
}

// 6. Practice View
pub async fn practice_page(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    let user_profile = get_user_profile(&state.db, auth_user.id).await;

    let problems = sqlx::query_as::<_, CodingProblem>(
        "SELECT * FROM coding_problems WHERE is_published = true",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    HtmlTemplate(LayoutTemplate {
        title: "Coding Practice",
        content: PracticeTemplate { problems },
        user: user_profile,
    })
    .into_response()
}

// 7. Assessments View
pub async fn assessments_page(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    let user_profile = get_user_profile(&state.db, auth_user.id).await;

    let assessments =
        sqlx::query_as::<_, Assessment>("SELECT * FROM assessments WHERE is_published = true")
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

    HtmlTemplate(LayoutTemplate {
        title: "Mock Assessments",
        content: AssessmentsTemplate { assessments },
        user: user_profile,
    })
    .into_response()
}

// 8. Compiler Run Form Post
#[derive(serde::Deserialize)]
pub struct RunCodeRequest {
    pub code: String,
    pub language: String,
    pub stdin: Option<String>,
}

pub async fn compiler_run_post(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
    Form(body): Form<RunCodeRequest>,
) -> impl IntoResponse {
    if auth_result.is_err() {
        return (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    let stdin_val = body
        .stdin
        .as_ref()
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.as_str());

    match state
        .executor
        .execute_code(&body.code, &body.language, stdin_val)
        .await
    {
        Ok(out) => {
            let status_color = match out.status {
                janv_executor::output::ExecutionStatus::Success => "text-green-400",
                _ => "text-red-400",
            };
            let status_label = format!("{:?}", out.status);

            let stdout_html = escape_html(&out.stdout);
            let stderr_html = escape_html(&out.stderr);

            let mut out_block = String::new();
            if !stdout_html.is_empty() {
                out_block.push_str(&format!(
                    r#"<div>
                        <div class="text-xs font-semibold text-slate-400 mb-1">Standard Output (stdout)</div>
                        <pre class="bg-black/40 border border-slate-900 rounded p-3 font-mono text-xs text-slate-200 overflow-x-auto">{}</pre>
                    </div>"#,
                    stdout_html
                ));
            }
            if !stderr_html.is_empty() {
                out_block.push_str(&format!(
                    r#"<div>
                        <div class="text-xs font-semibold text-slate-400 mb-1">Standard Error (stderr)</div>
                        <pre class="bg-red-950/20 border border-red-900/30 rounded p-3 font-mono text-xs text-red-300 overflow-x-auto">{}</pre>
                    </div>"#,
                    stderr_html
                ));
            }

            let html = format!(
                r#"<div class="space-y-4">
                    <div class="flex justify-between items-center bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                        <span class="text-sm font-semibold">Status: <span class="{}">{}</span></span>
                        <span class="text-xs text-slate-400 font-mono">Time: {}ms | Memory: {}KB</span>
                    </div>
                    {}
                </div>"#,
                status_color, status_label, out.execution_time_ms, out.memory_used_kb, out_block
            );

            axum::response::Html(html).into_response()
        }
        Err(e) => {
            let html = format!(
                r#"<div class="bg-red-900/20 border border-red-900/40 rounded p-4 text-sm text-red-300 font-mono">
                    Failed to execute code: {}
                </div>"#,
                e
            );
            axum::response::Html(html).into_response()
        }
    }
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

// 9. Super Admin Dashboard View
#[derive(serde::Deserialize, Clone)]
pub struct AdminFilterQuery {
    pub institution_id: Option<i32>,
    pub branch: Option<String>,
    pub batch: Option<String>,
    pub error: Option<String>,
    pub success: Option<String>,
}

pub async fn admin_dashboard(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
    Query(filter): Query<AdminFilterQuery>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    if !matches!(auth_user.role, UserRole::SuperAdmin) {
        return Redirect::to("/login").into_response();
    }

    // Fetch institutions
    let institutions = sqlx::query_as::<_, Institution>(
        "SELECT * FROM institutions WHERE is_active = true ORDER BY name",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // Build filtered users query
    let mut sql = String::from("SELECT * FROM users WHERE role != 'super_admin'");
    if let Some(inst_id) = filter.institution_id {
        sql.push_str(&format!(" AND institution_id = {}", inst_id));
    }
    if let Some(ref branch) = filter.branch {
        if !branch.trim().is_empty() {
            sql.push_str(&format!(
                " AND branch ILIKE '%{}%'",
                branch.replace('\'', "''")
            ));
        }
    }
    if let Some(ref b) = filter.batch {
        if let Ok(batch_int) = b.trim().parse::<i32>() {
            sql.push_str(&format!(" AND batch = {}", batch_int));
        }
    }
    sql.push_str(" ORDER BY created_at DESC");

    let users = sqlx::query_as::<_, User>(&sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(UserResponse::from)
        .collect::<Vec<_>>();

    // Fetch metrics
    let total_colleges = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM institutions")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0) as usize;

    let total_students =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE role = 'student'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0) as usize;

    let total_faculty =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE role = 'faculty'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0) as usize;

    let admin_profile = UserResponse {
        email: auth_user.email,
        full_name: "Super Admin".to_string(),
        role: UserRole::SuperAdmin,
        is_active: true,
        institution_id: None,
        batch: None,
        branch: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    HtmlTemplate(LayoutTemplate {
        title: "Admin Console",
        content: AdminDashboardTemplate {
            user: admin_profile.clone(),
            institutions,
            users,
            selected_institution_id: filter.institution_id,
            selected_branch: filter.branch,
            selected_batch: filter.batch,
            total_colleges,
            total_students,
            total_faculty,
            error: filter.error,
            success: filter.success,
        },
        user: Some(admin_profile),
    })
    .into_response()
}

// 10. Admin Add Faculty
#[derive(serde::Deserialize)]
pub struct CreateFacultyForm {
    pub full_name: String,
    pub email: String,
    pub password: String,
    pub institution_id: Uuid,
    pub department: String,
}

pub async fn admin_create_faculty(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
    Form(body): Form<CreateFacultyForm>,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    if !matches!(auth_user.role, UserRole::SuperAdmin) {
        return Redirect::to("/login").into_response();
    }

    let hashed = match hash_password(&body.password) {
        Ok(h) => h,
        Err(_) => return Redirect::to("/admin?error=Failed+to+hash+password").into_response(),
    };

    let user_id = Uuid::new_v4();
    let now = Utc::now();

    match sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, full_name, role, is_active, department, institution_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'faculty'::user_role, true, $5, $6, $7, $7)
        "#
    )
    .bind(user_id)
    .bind(&body.email)
    .bind(hashed)
    .bind(&body.full_name)
    .bind(&body.department)
    .bind(body.institution_id)
    .bind(now)
    .execute(&state.db)
    .await
    {
        Ok(_) => Redirect::to("/admin?success=Faculty+created+successfully").into_response(),
        Err(e) => Redirect::to(&format!("/admin?error=Database+error:+{}", e)).into_response(),
    }
}

// 11. Admin Import Students (CSV)
pub async fn admin_import_students(
    State(state): State<AppState>,
    auth_result: Result<AuthUser, AppError>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    let auth_user = match auth_result {
        Ok(u) => u,
        Err(_) => return Redirect::to("/login").into_response(),
    };

    if !matches!(auth_user.role, UserRole::SuperAdmin) {
        return Redirect::to("/login").into_response();
    }

    let mut file_data = None;
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if field.name() == Some("csv_file") {
            file_data = Some(field.bytes().await.unwrap_or_default());
            break;
        }
    }

    let data = match file_data {
        Some(d) => d,
        None => return Redirect::to("/admin?error=Missing+CSV+file").into_response(),
    };

    let mut reader = csv::Reader::from_reader(std::io::Cursor::new(data));
    let mut imported = 0;

    #[derive(serde::Deserialize)]
    struct CsvStudentRow {
        email: String,
        full_name: String,
        password: Option<String>,
        department: String,
        institution_id: Uuid,
        batch: String,
        class: String,
    }

    for result in reader.deserialize::<CsvStudentRow>() {
        if let Ok(row) = result {
            let pass = row.password.unwrap_or_else(|| "Welcome123".to_string());
            let hashed = match hash_password(&pass) {
                Ok(h) => h,
                _ => continue,
            };

            let user_id = Uuid::new_v4();
            let now = Utc::now();

            let _ = sqlx::query(
                r#"
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, department, institution_id, batch, class, created_at, updated_at)
                VALUES ($1, $2, $3, $4, 'student'::user_role, true, $5, $6, $7, $8, $9, $9)
                ON CONFLICT (email) DO NOTHING
                "#
            )
            .bind(user_id)
            .bind(&row.email)
            .bind(hashed)
            .bind(&row.full_name)
            .bind(&row.department)
            .bind(row.institution_id)
            .bind(&row.batch)
            .bind(&row.class)
            .bind(now)
            .execute(&state.db)
            .await;

            imported += 1;
        }
    }

    Redirect::to(&format!(
        "/admin?success=Successfully+imported+{}++students",
        imported
    ))
    .into_response()
}
