use leptos::prelude::*;

#[component]
pub fn Sidebar(role: String) -> impl IntoView {
    view! {
        <aside class="sidebar">
            <ul class="sidebar-menu">
                <li class="sidebar-item"><a href="/">"🏠 Dashboard"</a></li>
                {match role.as_str() {
                    "super_admin" => view! {
                        <li class="sidebar-item"><a href="/admin/users">"👥 User Management"</a></li>
                        <li class="sidebar-item"><a href="/admin/institutions">"🏢 Institutions"</a></li>
                        <li class="sidebar-item"><a href="/admin/logs">"📋 System Logs"</a></li>
                    }.into_any(),
                    "faculty" => view! {
                        <li class="sidebar-item"><a href="/faculty/courses">"📚 Course Builder"</a></li>
                        <li class="sidebar-item"><a href="/faculty/assessments">"✍️ Test Creator"</a></li>
                        <li class="sidebar-item"><a href="/faculty/analytics">"📈 Student Stats"</a></li>
                    }.into_any(),
                    _ => view! {
                        <li class="sidebar-item"><a href="/student/courses">"🎓 My Courses"</a></li>
                        <li class="sidebar-item"><a href="/student/results">"🏆 My Performance"</a></li>
                    }.into_any()
                }}
            </ul>
        </aside>
    }
}
