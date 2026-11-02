//! Per-PC widget settings, stored as JSON in the app config directory.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct Settings {
    /// Float above other windows instead of staying on the desktop layer.
    pub always_on_top: bool,
    /// Ignore mouse input so the widget can't be moved or clicked by accident.
    pub locked: bool,
    /// Set once autostart has been enabled on first run, so turning it off sticks.
    pub autostart_initialized: bool,
    /// Schedule server address; empty means [`DEFAULT_SERVER_URL`].
    pub server_url: String,
}

pub const DEFAULT_SERVER_URL: &str = "http://127.0.0.1:8090";

impl Settings {
    pub fn server_url(&self) -> &str {
        if self.server_url.trim().is_empty() { DEFAULT_SERVER_URL } else { self.server_url.trim() }
    }
}

fn path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("settings.json"))
}

impl Settings {
    pub fn load(app: &AppHandle) -> Self {
        path(app)
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, app: &AppHandle) {
        let Some(p) = path(app) else { return };
        if let Some(dir) = p.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(json) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(p, json);
        }
    }
}
