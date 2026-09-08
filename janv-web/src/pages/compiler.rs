use leptos::prelude::*;
use crate::api::execute_code_api;
use janv_common::dto::practice::ExecuteCodeRequest;
use ::wasm_bindgen_futures::spawn_local;

#[component]
pub fn Compiler() -> impl IntoView {
    let (code, set_code) = signal(
        "# Enter your python code here\nprint(\"Hello, World!\")\n".to_string()
    );
    let (language, set_language) = signal("python".to_string());
    let (stdin, set_stdin) = signal(String::new());
    let (output, set_output) = signal(String::new());
    let (error_logs, set_error_logs) = signal(String::new());
    let (running, set_running) = signal(false);

    let on_language_change = move |ev| {
        let lang = event_target_value(&ev);
        set_language.set(lang.clone());
        match lang.as_str() {
            "python" => set_code.set("# Python compiler\nprint(\"Hello, JANV!\")\n".to_string()),
            "cpp" => set_code.set("#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, JANV!\" << endl;\n    return 0;\n}\n".to_string()),
            "c" => set_code.set("#include <stdio.h>\n\nint main() {\n    printf(\"Hello, JANV!\\n\");\n    return 0;\n}\n".to_string()),
            "java" => set_code.set("public class Solution {\n    pub static void main(String[] args) {\n        System.out.println(\"Hello, JANV!\");\n    }\n}\n".to_string()),
            _ => {}
        }
    };

    let run_compiler = move |_| {
        set_running.set(true);
        set_output.set("Compiling and executing code... Please wait.".to_string());
        set_error_logs.set(String::new());

        let req = ExecuteCodeRequest {
            code: code.get(),
            language: language.get(),
            stdin: Some(stdin.get()),
        };

        spawn_local(async move {
            match execute_code_api(req).await {
                Ok(res) => {
                    set_output.set(res.stdout.unwrap_or_else(|| "".to_string()));
                    set_error_logs.set(res.stderr.unwrap_or_else(|| "".to_string()));
                    set_running.set(false);
                }
                Err(err) => {
                    set_output.set(format!("Execution failed: {}", err));
                    set_running.set(false);
                }
            }
        });
    };

    view! {
        <div style="padding: 40px; max-width: 1200px; margin: 0 auto;">
            <header style="margin-bottom: 24px;">
                <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 6px;">"Online Code Compiler"</h1>
                <p style="color: var(--text-secondary); font-size: 14px;">"Compile and run C, C++, Java, or Python scripts securely inside Docker sandboxes."</p>
            </header>

            <div class="glass-panel" style="margin-bottom: 24px;">
                <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 16px;">
                    <div>
                        <label class="form-label" style="margin-bottom: 4px;">"Select Language"</label>
                        <select class="form-input" style="padding: 8px 16px;" on:change=on_language_change>
                            <option value="python">"Python 3"</option>
                            <option value="cpp">"C++ (GCC)"</option>
                            <option value="c">"C (GCC)"</option>
                            <option value="java">"Java (OpenJDK)"</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" style="margin-top: 18px;" on:click=run_compiler prop:disabled=running>
                        {move || if running.get() { "Running..." } else { "▶ Run Code" }}
                    </button>
                </div>

                <div class="editor-container">
                    <div class="editor-main">
                        <textarea
                            class="code-textarea"
                            on:input=move |ev| set_code.set(event_target_value(&ev))
                            prop:value=code
                        />
                    </div>
                </div>
            </div>

            <div class="grid-cols-3" style="grid-template-columns: 1fr 2fr; gap: 24px;">
                <div class="glass-panel">
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 12px;">"Standard Input (stdin)"</h3>
                    <textarea
                        class="form-input"
                        style="height: 120px; font-family: var(--font-mono); resize: none;"
                        placeholder="Provide inputs here..."
                        on:input=move |ev| set_stdin.set(event_target_value(&ev))
                        prop:value=stdin
                    />
                </div>
                <div class="glass-panel" style="background-color: #0c0c0c;">
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 12px; color: #33ff33;">"Console Output"</h3>
                    <pre style="font-family: var(--font-mono); font-size: 14px; color: #ffffff; white-space: pre-wrap; overflow-y: auto; height: 120px;">
                        {move || output.get()}
                    </pre>
                    {move || if !error_logs.get().is_empty() {
                        view! {
                            <div style="border-top: 1px solid var(--border-color); margin-top: 12px; padding-top: 12px;">
                                <p style="color: var(--status-error); font-size: 12px; font-weight: 600; margin-bottom: 4px;">"Errors & Warnings:"</p>
                                <pre style="font-family: var(--font-mono); font-size: 13px; color: var(--status-error); white-space: pre-wrap;">
                                    {error_logs.get()}
                                </pre>
                            </div>
                        }.into_any()
                    } else {
                        view! { <div/> }.into_any()
                    }}
                </div>
            </div>
        </div>
    }
}
