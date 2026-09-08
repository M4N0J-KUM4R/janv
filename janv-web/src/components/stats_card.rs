use leptos::prelude::*;

#[component]
pub fn StatsCard(title: String, value: String, desc: String) -> impl IntoView {
    view! {
        <div class="glass-panel">
            <h3 class="card-title">{title}</h3>
            <p class="stat-value">{value}</p>
            <p class="card-desc" style="margin-bottom: 0; margin-top: 8px;">{desc}</p>
        </div>
    }
}
