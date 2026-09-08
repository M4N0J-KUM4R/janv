use leptos::prelude::*;
use janv_common::dto::auth::{LoginRequest, RegisterRequest};
use janv_common::models::UserRole;
use crate::api::{login_api, register_api};
use ::wasm_bindgen_futures::spawn_local;

#[component]
pub fn Login() -> impl IntoView {
    let (email, set_email) = signal(String::new());
    let (password, set_password) = signal(String::new());
    let (error_msg, set_error_msg) = signal(None::<String>);
    let (loading, set_loading) = signal(false);

    let on_submit = move |ev: web_sys::SubmitEvent| {
        ev.prevent_default();
        set_loading.set(true);
        set_error_msg.set(None);

        let req = LoginRequest {
            email: email.get(),
            password: password.get(),
        };

        // Trigger login API call
        spawn_local(async move {
            match login_api(req).await {
                Ok(_) => {
                    // Redirect to dashboard
                    if let Some(window) = web_sys::window() {
                        let _ = window.location().set_href("/");
                    }
                }
                Err(err) => {
                    set_error_msg.set(Some(err));
                    set_loading.set(false);
                }
            }
        });
    };

    view! {
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
            <div class="glass-panel" style="width: 100%; max-width: 420px;">
                <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    "Welcome to JANV"
                </h2>
                <p style="color: var(--text-secondary); font-size: 14px; text-align: center; margin-bottom: 24px;">
                    "Login to access your workspace"
                </p>

                {move || error_msg.get().map(|msg| view! {
                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--status-error); padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: var(--status-error);">
                        {msg}
                    </div>
                })}

                <form on:submit=on_submit>
                    <div class="form-group">
                        <label class="form-label">"Email Address"</label>
                        <input
                            type="email"
                            class="form-input"
                            placeholder="Enter your email"
                            required
                            on:input=move |ev| set_email.set(event_target_value(&ev))
                            prop:value=email
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">"Password"</label>
                        <input
                            type="password"
                            class="form-input"
                            placeholder="••••••••"
                            required
                            on:input=move |ev| set_password.set(event_target_value(&ev))
                            prop:value=password
                        />
                    </div>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        style="width: 100%; padding: 12px; margin-top: 10px;"
                        prop:disabled=loading
                    >
                        {move || if loading.get() { "Signing in..." } else { "Sign In" }}
                    </button>
                </form>

                <p style="color: var(--text-secondary); font-size: 13px; text-align: center; margin-top: 24px;">
                    "Don't have an account? "
                    <a href="/register" style="color: var(--accent-purple); text-decoration: none; font-weight: 600;">
                        "Create account"
                    </a>
                </p>
            </div>
        </div>
    }
}

#[component]
pub fn Register() -> impl IntoView {
    let (email, set_email) = signal(String::new());
    let (password, set_password) = signal(String::new());
    let (full_name, set_full_name) = signal(String::new());
    let (department, set_department) = signal(String::new());
    let (error_msg, set_error_msg) = signal(None::<String>);
    let (loading, set_loading) = signal(false);

    let on_submit = move |ev: web_sys::SubmitEvent| {
        ev.prevent_default();
        set_loading.set(true);
        set_error_msg.set(None);

        let req = RegisterRequest {
            email: email.get(),
            password: password.get(),
            full_name: full_name.get(),
            role: UserRole::Student, // default role
            department: Some(department.get()),
            institution_id: None,
        };

        spawn_local(async move {
            match register_api(req).await {
                Ok(_) => {
                    if let Some(window) = web_sys::window() {
                        let _ = window.location().set_href("/");
                    }
                }
                Err(err) => {
                    set_error_msg.set(Some(err));
                    set_loading.set(false);
                }
            }
        });
    };

    view! {
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
            <div class="glass-panel" style="width: 100%; max-width: 420px;">
                <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    "Create Account"
                </h2>
                <p style="color: var(--text-secondary); font-size: 14px; text-align: center; margin-bottom: 24px;">
                    "Sign up to start practicing coding challenges"
                </p>

                {move || error_msg.get().map(|msg| view! {
                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--status-error); padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: var(--status-error);">
                        {msg}
                    </div>
                })}

                <form on:submit=on_submit>
                    <div class="form-group">
                        <label class="form-label">"Full Name"</label>
                        <input
                            type="text"
                            class="form-input"
                            placeholder="John Doe"
                            required
                            on:input=move |ev| set_full_name.set(event_target_value(&ev))
                            prop:value=full_name
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">"Email Address"</label>
                        <input
                            type="email"
                            class="form-input"
                            placeholder="Enter your email"
                            required
                            on:input=move |ev| set_email.set(event_target_value(&ev))
                            prop:value=email
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">"Department"</label>
                        <input
                            type="text"
                            class="form-input"
                            placeholder="Computer Science"
                            required
                            on:input=move |ev| set_department.set(event_target_value(&ev))
                            prop:value=department
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">"Password"</label>
                        <input
                            type="password"
                            class="form-input"
                            placeholder="Min 8 chars, 1 uppercase, 1 digit"
                            required
                            on:input=move |ev| set_password.set(event_target_value(&ev))
                            prop:value=password
                        />
                    </div>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        style="width: 100%; padding: 12px; margin-top: 10px;"
                        prop:disabled=loading
                    >
                        {move || if loading.get() { "Creating account..." } else { "Sign Up" }}
                    </button>
                </form>

                <p style="color: var(--text-secondary); font-size: 13px; text-align: center; margin-top: 24px;">
                    "Already have an account? "
                    <a href="/login" style="color: var(--accent-purple); text-decoration: none; font-weight: 600;">
                        "Sign in"
                    </a>
                </p>
            </div>
        </div>
    }
}
