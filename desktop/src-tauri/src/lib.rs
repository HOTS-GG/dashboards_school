mod auth;
mod desktop_pin;
mod settings;

use settings::Settings;
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use windows::Win32::Foundation::HWND;

const SAVED_STATE: StateFlags = StateFlags::POSITION.union(StateFlags::SIZE);

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn hwnd(window: &WebviewWindow) -> Option<HWND> {
    window.hwnd().ok().map(|h| HWND(h.0))
}

/// Applies the layer (desktop vs. always on top) and mouse lock from settings.
fn apply_settings(window: &WebviewWindow, s: &Settings) {
    let Some(h) = hwnd(window) else { return };
    if s.always_on_top {
        desktop_pin::unpin(h);
        let _ = window.set_always_on_top(true);
    } else {
        let _ = window.set_always_on_top(false);
        desktop_pin::pin(h);
    }
    let _ = window.set_ignore_cursor_events(s.locked);
}

fn show(app: &AppHandle) {
    if let Some(w) = main_window(app) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Moves the window back to the primary monitor if its saved position is off every screen
/// (e.g. a second monitor was unplugged).
fn keep_on_screen(window: &WebviewWindow) {
    let (Ok(pos), Ok(size), Ok(monitors)) =
        (window.outer_position(), window.outer_size(), window.available_monitors())
    else {
        return;
    };
    let (cx, cy) = (pos.x + size.width as i32 / 2, pos.y + size.height as i32 / 2);
    let visible = monitors.iter().any(|m| {
        let (mp, ms) = (m.position(), m.size());
        cx >= mp.x && cx < mp.x + ms.width as i32 && cy >= mp.y && cy < mp.y + ms.height as i32
    });
    if !visible {
        let _ = window.center();
    }
}

fn update_settings(app: &AppHandle, change: impl FnOnce(&mut Settings)) {
    let state = app.state::<Mutex<Settings>>();
    let mut s = state.lock().unwrap();
    change(&mut s);
    s.save(app);
    if let Some(w) = main_window(app) {
        apply_settings(&w, &s);
    }
}

fn build_tray(app: &AppHandle, s: &Settings) -> tauri::Result<()> {
    let autostart = app.autolaunch().is_enabled().unwrap_or(false);
    let show_item = MenuItem::with_id(app, "show", "위젯 보이기", true, None::<&str>)?;
    let on_top = CheckMenuItem::with_id(app, "on_top", "항상 위에 표시", true, s.always_on_top, None::<&str>)?;
    let locked = CheckMenuItem::with_id(app, "locked", "위치 잠금 (클릭 통과)", true, s.locked, None::<&str>)?;
    let auto = CheckMenuItem::with_id(app, "autostart", "Windows 시작 시 실행", true, autostart, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&show_item, &sep, &on_top, &locked, &auto, &sep, &quit])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().cloned().expect("bundle icon"))
        .tooltip("학교 일정")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show(tray.app_handle());
            }
        })
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => show(app),
            "on_top" => {
                let checked = on_top.is_checked().unwrap_or(false);
                update_settings(app, |s| s.always_on_top = checked);
            }
            "locked" => {
                let checked = locked.is_checked().unwrap_or(false);
                update_settings(app, |s| s.locked = checked);
            }
            "autostart" => {
                let launcher = app.autolaunch();
                let _ = if auto.is_checked().unwrap_or(false) { launcher.enable() } else { launcher.disable() };
            }
            "quit" => {
                let _ = app.save_window_state(SAVED_STATE);
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Explorer recreates the desktop window when it restarts; re-pin when that happens.
fn watch_desktop(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(2));
        let handle = app.clone();
        let _ = app.run_on_main_thread(move || {
            let on_top = handle.state::<Mutex<Settings>>().lock().unwrap().always_on_top;
            if let Some(h) = main_window(&handle).as_ref().and_then(hwnd) {
                if !on_top && !desktop_pin::is_pinned(h) {
                    desktop_pin::pin(h);
                }
            }
        });
    });
}

#[tauri::command]
fn server_url(settings: tauri::State<Mutex<Settings>>) -> String {
    settings.lock().unwrap().server_url().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch just brings the running widget forward.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_window_state::Builder::default().with_state_flags(SAVED_STATE).build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            server_url,
            auth::google_login,
            auth::session_load,
            auth::session_save,
            auth::session_clear
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let mut s = Settings::load(&handle);

            // Start with Windows by default, but only for installed builds and only once,
            // so a user who turns it off keeps it off.
            if !cfg!(debug_assertions) && !s.autostart_initialized {
                let _ = handle.autolaunch().enable();
                s.autostart_initialized = true;
                s.save(&handle);
            }

            if let Some(w) = main_window(&handle) {
                keep_on_screen(&w);
                apply_settings(&w, &s);
            }
            build_tray(&handle, &s)?;
            app.manage(Mutex::new(s));
            watch_desktop(handle);
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // No close button; Alt+F4 hides the widget instead of quitting (quit is in the tray).
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            // When focus leaves a desktop-layer widget, drop it back behind other windows.
            WindowEvent::Focused(false) => {
                let app = window.app_handle();
                let _ = app.save_window_state(SAVED_STATE);
                let Some(state) = app.try_state::<Mutex<Settings>>() else { return };
                let on_top = state.lock().unwrap().always_on_top;
                if let (false, Some(w)) = (on_top, main_window(app)) {
                    if let Some(h) = hwnd(&w) {
                        desktop_pin::send_to_back(h);
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
