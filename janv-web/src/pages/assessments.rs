use leptos::prelude::*;
use crate::api::list_assessments_api;
use janv_common::models::Assessment;
use ::wasm_bindgen_futures::spawn_local;

#[component]
pub fn Assessments() -> impl IntoView {
    let (assessments, set_assessments) = signal(Vec::<Assessment>::new());
    let (loading, set_loading) = signal(true);
    let (error_msg, set_error_msg) = signal(None::<String>);

    spawn_local(async move {
        match list_assessments_api().await {
            Ok(data) => {
                set_assessments.set(data);
                set_loading.set(false);
            }
            Err(e) => {
                set_error_msg.set(Some(e));
                set_loading.set(false);
            }
        }
    });

    view! {
        <div style="padding: 40px; max-width: 1200px; margin: 0 auto;">
            <header style="margin-bottom: 32px;">
                <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 6px;">"Mock Assessments & Exams"</h1>
                <p style="color: var(--text-secondary); font-size: 14px;">"Evaluate your placement readiness. Take timer-enforced structured assessments."</p>
            </header>

            {move || if loading.get() {
                view! { <p style="color: var(--text-secondary);">"Loading exams..."</p> }.into_any()
            } else if let Some(err) = error_msg.get() {
                view! { <p style="color: var(--status-error);">{err}</p> }.into_any()
            } else {
                let list = assessments.get();
                if list.is_empty() {
                    view! {
                        <div class="glass-panel" style="text-align: center; padding: 40px;">
                            <h3 class="card-title">"No Mock Tests Scheduled"</h3>
                            <p style="color: var(--text-secondary);">"Check back soon! Faculty members schedule exams weekly."</p>
                        </div>
                    }.into_any()
                } else {
                    view! {
                        <div class="grid-cols-3">
                            {list.into_iter().map(|exam| {
                                view! {
                                    <div class="glass-panel">
                                        <h3 class="card-title" style="margin-bottom: 6px;">{exam.title}</h3>
                                        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
                                            "Duration: " {exam.duration_mins} " Minutes"
                                        </p>
                                        <p class="card-desc" style="height: 60px; overflow: hidden; text-overflow: ellipsis;">
                                            {exam.description.unwrap_or_else(|| "No description provided.".to_string())}
                                        </p>
                                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 16px;">
                                            <span style="font-size: 14px; font-weight: 600; color: var(--accent-blue);">
                                                {exam.total_marks} " Marks"
                                            </span>
                                            <a href=format!("/assessment/{}", exam.id) class="btn btn-primary" style="padding: 6px 16px; font-size: 13px;">
                                                "Start Test"
                                            </a>
                                        </div>
                                    </div>
                                }
                            }).collect::<Vec<_>>()}
                        </div>
                    }.into_any()
                }
            }}
        </div>
    }
}
