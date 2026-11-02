//! Google sign-in for a desktop app: the browser returns to a one-shot
//! listener on 127.0.0.1 (Google's "desktop app" loopback flow), and the
//! resulting PocketBase session is kept in Windows Credential Manager.

use serde::Serialize;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const KEYRING_SERVICE: &str = "kr.hs.gwe.chunchon.dashboard";
const KEYRING_USER: &str = "pocketbase-session";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Serialize)]
pub struct OAuthCallback {
    code: String,
    state: String,
    redirect_url: String,
}

/// Opens `auth_url` (which ends in `redirect_uri=`) with a loopback redirect
/// appended, then waits for Google to send the browser back.
#[tauri::command]
pub async fn google_login(app: AppHandle, auth_url: String) -> Result<OAuthCallback, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_url = format!("http://127.0.0.1:{port}/callback");
    let full_url = format!("{auth_url}{}&prompt=select_account", urlencode(&redirect_url));
    app.opener().open_url(full_url, None::<&str>).map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking(move || wait_for_callback(listener, redirect_url))
        .await
        .map_err(|e| e.to_string())?
}

fn wait_for_callback(listener: TcpListener, redirect_url: String) -> Result<OAuthCallback, String> {
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let deadline = Instant::now() + LOGIN_TIMEOUT;
    loop {
        let stream = match listener.accept() {
            Ok((stream, _)) => stream,
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() > deadline {
                    return Err("로그인 시간이 초과되었습니다.".into());
                }
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }
            Err(e) => return Err(e.to_string()),
        };
        stream.set_nonblocking(false).map_err(|e| e.to_string())?;
        let mut request_line = String::new();
        BufReader::new(&stream).read_line(&mut request_line).map_err(|e| e.to_string())?;
        // "GET /callback?code=...&state=... HTTP/1.1"
        let Some(target) = request_line.split_whitespace().nth(1) else { continue };
        let Ok(url) = url::Url::parse(&format!("http://127.0.0.1{target}")) else { continue };
        if url.path() != "/callback" {
            let _ = (&stream).write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
            continue;
        }
        let param = |k: &str| url.query_pairs().find(|(n, _)| n == k).map(|(_, v)| v.into_owned());
        let result = match (param("code"), param("state"), param("error")) {
            (Some(code), Some(state), None) => Ok(OAuthCallback { code, state, redirect_url: redirect_url.clone() }),
            (_, _, Some(err)) => Err(format!("Google 로그인이 취소되었거나 거부되었습니다 ({err}).")),
            _ => Err("Google 응답이 올바르지 않습니다.".into()),
        };
        let page = if result.is_ok() { "로그인되었습니다. 이 창을 닫고 위젯으로 돌아가세요." } else { "로그인하지 못했습니다. 위젯에서 다시 시도하세요." };
        let body = format!("<!doctype html><meta charset=utf-8><p style=\"font:16px sans-serif;margin:40px\">{page}</p>");
        let _ = (&stream).write_all(
            format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).as_bytes(),
        );
        return result;
    }
}

fn urlencode(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn session_load() -> Option<String> {
    entry().ok()?.get_password().ok()
}

#[tauri::command]
pub fn session_save(value: String) -> Result<(), String> {
    entry()?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn session_clear() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
