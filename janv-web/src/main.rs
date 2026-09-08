mod api;
mod app;
mod components;
mod pages;

use app::App;

fn main() {
    console_error_panic_hook::set_once();
    
    // In Leptos 0.7 CSR mode, we mount to body
    leptos::mount::mount_to_body(|| leptos::prelude::view! { <App /> });
}
