use leptos::prelude::*;

#[component]
pub fn Navbar() -> impl IntoView {
    let on_logout = move |_| {
        crate::api::clear_token();
        // Redirect to login
        if let Some(window) = web_sys::window() {
            let _ = window.location().set_href("/login");
        }
    };

    view! {
        <nav class="navbar">
            <a href="/" class="logo">"JANV PLATFORM"</a>
            <ul class="nav-links">
                <li><a href="/compiler" class="nav-link">"Online Compiler"</a></li>
                <li><a href="/practice" class="nav-link">"Practice Coding"</a></li>
                <li><a href="/assessments" class="nav-link">"Mock Tests"</a></li>
                <li><a href="/leaderboard" class="nav-link">"Leaderboard"</a></li>
                <li>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" on:click=on_logout>
                        "Logout"
                    </button>
                </li>
            </ul>
        </nav>
    }
}
