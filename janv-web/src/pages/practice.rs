use leptos::prelude::*;
use crate::api::list_problems_api;
use janv_common::models::CodingProblem;
use ::wasm_bindgen_futures::spawn_local;

#[component]
pub fn Practice() -> impl IntoView {
    let (problems, set_problems) = signal(Vec::<CodingProblem>::new());
    let (loading, set_loading) = signal(true);
    let (error_msg, set_error_msg) = signal(None::<String>);

    spawn_local(async move {
        match list_problems_api().await {
            Ok(data) => {
                set_problems.set(data);
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
                <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 6px;">"Practice Coding Problems"</h1>
                <p style="color: var(--text-secondary); font-size: 14px;">"Solve real-world programming problems. Submit your answers and test them against test cases."</p>
            </header>

            {move || if loading.get() {
                view! { <p style="color: var(--text-secondary);">"Loading problems..."</p> }.into_any()
            } else if let Some(err) = error_msg.get() {
                view! { <p style="color: var(--status-error);">{err}</p> }.into_any()
            } else {
                let list = problems.get();
                if list.is_empty() {
                    view! {
                        <div class="glass-panel" style="text-align: center; padding: 40px;">
                            <h3 class="card-title">"No Problems Available"</h3>
                            <p style="color: var(--text-secondary);">"Check back later! Faculty members are currently preparing the workspace."</p>
                        </div>
                    }.into_any()
                } else {
                    view! {
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            {list.into_iter().map(|problem| {
                                let difficulty_color = match problem.difficulty {
                                    janv_common::models::Difficulty::Easy => "var(--status-success)",
                                    janv_common::models::Difficulty::Medium => "var(--status-warning)",
                                    janv_common::models::Difficulty::Hard => "var(--status-error)",
                                };
                                view! {
                                    <div class="glass-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 30px;">
                                        <div>
                                            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">{problem.title}</h3>
                                            <div style="display: flex; gap: 12px; align-items: center;">
                                                <span style=format!("color: {}; font-weight: 600; font-size: 13px;", difficulty_color)>
                                                    {format!("{:?}", problem.difficulty)}
                                                </span>
                                                <span style="color: var(--text-muted); font-size: 13px;">"•"</span>
                                                <span style="color: var(--text-secondary); font-size: 13px;">
                                                    "Limits: " {problem.time_limit_ms} "ms / " {problem.memory_limit_kb / 1024} "MB"
                                                </span>
                                            </div>
                                        </div>
                                        <a href=format!("/practice/{}", problem.id) class="btn btn-secondary" style="padding: 8px 20px;">
                                            "Solve Challenge"
                                        </a>
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
