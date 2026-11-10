//! Keeps the widget out of the way and alive:
//! - "quiet mode" while a full-screen app, game or presentation is running
//!   (the screen tells notifications to wait), and
//! - a heartbeat from the web page; if it stops (renderer hung or crashed),
//!   the page is reloaded.

use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::UI::Shell::{
    SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN,
};

const CHECK_EVERY: Duration = Duration::from_secs(5);
/// Hidden pages get their timers throttled to about once a minute, so allow plenty.
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(180);

pub struct Heartbeat(Mutex<Instant>);

impl Default for Heartbeat {
    fn default() -> Self {
        Heartbeat(Mutex::new(Instant::now()))
    }
}

#[tauri::command]
pub fn heartbeat(state: tauri::State<Heartbeat>) {
    *state.0.lock().unwrap() = Instant::now();
}

#[tauri::command]
pub fn is_quiet() -> bool {
    quiet_now()
}

fn quiet_now() -> bool {
    matches!(
        unsafe { SHQueryUserNotificationState() },
        Ok(s) if s == QUNS_BUSY || s == QUNS_RUNNING_D3D_FULL_SCREEN || s == QUNS_PRESENTATION_MODE
    )
}

pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        let mut quiet = quiet_now();
        loop {
            std::thread::sleep(CHECK_EVERY);

            let q = quiet_now();
            if q != quiet {
                quiet = q;
                log::info!("quiet mode {}", if q { "on" } else { "off" });
                let _ = app.emit("quiet-mode", q);
            }

            let last = *app.state::<Heartbeat>().0.lock().unwrap();
            if last.elapsed() > HEARTBEAT_TIMEOUT {
                log::warn!("no heartbeat from the page for {:?}; reloading it", last.elapsed());
                *app.state::<Heartbeat>().0.lock().unwrap() = Instant::now();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.reload();
                }
            }
        }
    });
}
