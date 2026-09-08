use leptos::prelude::*;
use leptos_router::components::{Route, Router, Routes};
use leptos_router::path;
use crate::components::Navbar;
use crate::pages::*;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <main>
                <Navbar />
                <Routes fallback=|| view! { <div style="padding:40px; text-align:center;">"Page Not Found"</div> }>
                    <Route path=path!("") view=Dashboard />
                    <Route path=path!("login") view=Login />
                    <Route path=path!("register") view=Register />
                    <Route path=path!("compiler") view=Compiler />
                    <Route path=path!("practice") view=Practice />
                    <Route path=path!("assessments") view=Assessments />
                </Routes>
            </main>
        </Router>
    }
}
