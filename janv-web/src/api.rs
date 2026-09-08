use reqwest::Client;
use janv_common::dto::*;
use janv_common::models::*;

const API_BASE_URL: &str = "http://localhost:8080/api";

fn get_token() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let window = web_sys::window()?;
        let storage = window.local_storage().ok()??;
        storage.get_item("access_token").ok()?
    }
    #[cfg(not(target_arch = "wasm32"))]
    None
}

pub fn save_token(token: &str) {
    let _ = token;
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            let _ = storage.set_item("access_token", token);
        }
    }
}

pub fn clear_token() {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            let _ = storage.remove_item("access_token");
        }
    }
}

async fn request_builder(
    method: reqwest::Method,
    path: &str,
) -> reqwest::RequestBuilder {
    let client = Client::new();
    let url = format!("{}{}", API_BASE_URL, path);
    let mut builder = client.request(method, url);
    
    if let Some(token) = get_token() {
        builder = builder.header("Authorization", format!("Bearer {}", token));
    }
    
    builder
}

pub async fn login_api(req: LoginRequest) -> Result<AuthResponse, String> {
    let response = request_builder(reqwest::Method::POST, "/auth/login")
        .await
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let auth_data = response.json::<AuthResponse>().await.map_err(|e| e.to_string())?;
        save_token(&auth_data.access_token);
        Ok(auth_data)
    } else {
        let error_msg = response.text().await.unwrap_or_else(|_| "Unknown login error".to_string());
        Err(error_msg)
    }
}

pub async fn register_api(req: RegisterRequest) -> Result<AuthResponse, String> {
    let response = request_builder(reqwest::Method::POST, "/auth/register")
        .await
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let auth_data = response.json::<AuthResponse>().await.map_err(|e| e.to_string())?;
        save_token(&auth_data.access_token);
        Ok(auth_data)
    } else {
        let error_msg = response.text().await.unwrap_or_else(|_| "Registration failed".to_string());
        Err(error_msg)
    }
}

pub async fn get_me() -> Result<UserResponse, String> {
    let response = request_builder(reqwest::Method::GET, "/auth/me")
        .await
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        response.json::<UserResponse>().await.map_err(|e| e.to_string())
    } else {
        Err("Failed to fetch user profile".to_string())
    }
}

pub async fn list_problems_api() -> Result<Vec<CodingProblem>, String> {
    let response = request_builder(reqwest::Method::GET, "/practice")
        .await
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        // Wait, list_problems returns PaginatedResponse<CodingProblem>, or a Vec?
        // In practice DTO we defined PaginatedResponse. Let's see what endpoint returns.
        // Let's assume standard PaginatedResponse or list
        let res = response.json::<PaginatedResponse<CodingProblem>>().await.map_err(|e| e.to_string())?;
        Ok(res.data)
    } else {
        Err("Failed to list problems".to_string())
    }
}

pub async fn execute_code_api(req: ExecuteCodeRequest) -> Result<ExecutionResult, String> {
    let response = request_builder(reqwest::Method::POST, "/compiler/execute")
        .await
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        response.json::<ExecutionResult>().await.map_err(|e| e.to_string())
    } else {
        Err("Compilation request failed".to_string())
    }
}

pub async fn list_assessments_api() -> Result<Vec<Assessment>, String> {
    let response = request_builder(reqwest::Method::GET, "/assessments")
        .await
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        response.json::<Vec<Assessment>>().await.map_err(|e| e.to_string())
    } else {
        Err("Failed to fetch assessments".to_string())
    }
}
