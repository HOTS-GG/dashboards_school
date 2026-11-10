//! Automatic updates from the school server: `<server>/updates/latest.json`
//! (published by `scripts/publish-update.ps1`). Checked at start and daily;
//! a signed update installs quietly and the widget restarts.

use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::settings::Settings;

const CHECK_EVERY: Duration = Duration::from_secs(24 * 3600);
const FIRST_CHECK_AFTER: Duration = Duration::from_secs(60);

async fn check(app: &AppHandle) -> Result<(), String> {
    let server = app.state::<std::sync::Mutex<Settings>>().lock().unwrap().server_url().to_string();
    let endpoint = format!("{}/updates/latest.json", server.trim_end_matches('/'));
    let url = endpoint.parse().map_err(|e| format!("bad update url {endpoint}: {e}"))?;
    let updater = app
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(());
    };
    log::info!("installing update {} (current {})", update.version, update.current_version);
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    // The installer relaunches the widget; exit cleanly so the watchdog stops too.
    app.exit(0);
    Ok(())
}

pub fn start(app: AppHandle) {
    // Dev builds aren't installed, so there's nothing to update.
    if cfg!(debug_assertions) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        tokio_sleep(FIRST_CHECK_AFTER).await;
        loop {
            if let Err(e) = check(&app).await {
                // No server, no published update, or offline: try again tomorrow.
                log::info!("update check: {e}");
            }
            tokio_sleep(CHECK_EVERY).await;
        }
    });
}

async fn tokio_sleep(d: Duration) {
    let _ = tauri::async_runtime::spawn_blocking(move || std::thread::sleep(d)).await;
}
