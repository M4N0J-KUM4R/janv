use leptos::prelude::*;
use crate::components::*;
use crate::api::get_me;
use janv_common::models::UserResponse;
use ::wasm_bindgen_futures::spawn_local;

#[component]
pub fn Dashboard() -> impl IntoView {
    let (user_profile, set_user_profile) = signal(None::<UserResponse>);
    let (loading, set_loading) = signal(true);
    let (_error_msg, set_error_msg) = signal(None::<String>);

    spawn_local(async move {
        match get_me().await {
            Ok(profile) => {
                set_user_profile.set(Some(profile));
                set_loading.set(false);
            }
            Err(e) => {
                set_error_msg.set(Some(e));
                set_loading.set(false);
                // Redirect to login on auth failure
                if let Some(window) = web_sys::window() {
                    let _ = window.location().set_href("/login");
                }
            }
        }
    });

    view! {
        <div>
            {move || if loading.get() {
                view! {
                    <div style="display: flex; align-items: center; justify-content: center; min-height: 50vh;">
                        <p style="color: var(--text-secondary);">"Loading workspace..."</p>
                    </div>
                }.into_any()
            } else if let Some(profile) = user_profile.get() {
                let role_str = match profile.role {
                    janv_common::models::UserRole::SuperAdmin => "super_admin".to_string(),
                    janv_common::models::UserRole::Faculty => "faculty".to_string(),
                    janv_common::models::UserRole::Student => "student".to_string(),
                };
                
                view! {
                    <div class="dashboard-container">
                        <Sidebar role=role_str.clone() />
                        <main class="main-content">
                            <header style="margin-bottom: 32px;">
                                <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 6px;">
                                    "Welcome back, " {profile.full_name}
                                </h1>
                                <p style="color: var(--text-secondary); font-size: 14px;">
                                    "Workspace Role: " <span style="color: var(--accent-purple); font-weight: 600;">{role_str.to_uppercase()}</span>
                                </p>
                            </header>

                            {match role_str.as_str() {
                                "super_admin" => view! {
                                    <div class="grid-cols-3">
                                        <StatsCard title="Total Students".to_string() value="1,248".to_string() desc="Active registered candidates".to_string() />
                                        <StatsCard title="Faculty Members".to_string() value="42".to_string() desc="Content creators & reviewers".to_string() />
                                        <StatsCard title="Sandboxes Spawned".to_string() value="3,150".to_string() desc="Docker compilers run today".to_string() />
                                    </div>
                                }.into_any(),
                                "faculty" => view! {
                                    <div class="grid-cols-3">
                                        <StatsCard title="My Courses".to_string() value="4".to_string() desc="Published coding courses".to_string() />
                                        <StatsCard title="Assessments Created".to_string() value="12".to_string() desc="Mock tests in system".to_string() />
                                        <StatsCard title="Submissions Graded".to_string() value="842".to_string() desc="Auto-evaluation completed".to_string() />
                                    </div>
                                }.into_any(),
                                _ => view! {
                                    <div>
                                        <div class="grid-cols-3" style="margin-bottom: 32px;">
                                            <StatsCard title="Problems Solved".to_string() value="68".to_string() desc="Total accepted practice submissions".to_string() />
                                            <StatsCard title="Assessments Taken".to_string() value="5".to_string() desc="Mock mock tests completed".to_string() />
                                            <StatsCard title="Current Streak".to_string() value="7 Days".to_string() desc="Daily learning commitment".to_string() />
                                        </div>

                                        <div class="glass-panel">
                                            <h3 class="card-title">"Daily Practice Goal"</h3>
                                            <div style="background-color: var(--bg-primary); height: 10px; border-radius: 5px; overflow: hidden; margin-top: 12px; margin-bottom: 12px;">
                                                <div style="background: var(--accent-gradient); width: 75%; height: 100%;"></div>
                                            </div>
                                            <p style="font-size: 13px; color: var(--text-secondary);">
                                                "Solve 2 more problems to complete today's objective!"
                                            </p>
                                        </div>
                                    </div>
                                }.into_any()
                            }}
                        </main>
                    </div>
                }.into_any()
            } else {
                view! {
                    <div style="padding: 20px; color: var(--status-error);">
                        "Authentication error. Re-authenticating..."
                    </div>
                }.into_any()
            }}
        </div>
    }
}
