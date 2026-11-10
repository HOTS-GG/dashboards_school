// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Installed builds start as a tiny watchdog that runs the widget as a child
//! process and starts it again if it crashes. A normal quit (tray → 종료,
//! updates, a duplicate launch handing off to the running widget) exits with
//! code 0 and ends the watchdog too.

use std::io::Write;
use std::process::Command;
use std::time::{Duration, Instant};

const CHILD_ARG: &str = "--child";
const RESTART_DELAY: Duration = Duration::from_secs(3);
/// Give up after this many crashes within `CRASH_WINDOW`, so a broken install doesn't spin forever.
const MAX_CRASHES: usize = 5;
const CRASH_WINDOW: Duration = Duration::from_secs(600);

fn main() {
    let is_child = std::env::args().any(|a| a == CHILD_ARG);
    if cfg!(debug_assertions) || is_child {
        desktop_lib::run();
    } else {
        watchdog();
    }
}

fn watchdog() {
    let Ok(exe) = std::env::current_exe() else {
        return desktop_lib::run();
    };
    let mut crashes: Vec<Instant> = Vec::new();
    loop {
        let status = Command::new(&exe).arg(CHILD_ARG).status();
        match status {
            Ok(s) if s.success() => return,
            Ok(s) => log_line(&format!("widget exited with {s}; restarting")),
            Err(e) => log_line(&format!("could not start widget: {e}")),
        }
        let now = Instant::now();
        crashes.retain(|t| now.duration_since(*t) < CRASH_WINDOW);
        crashes.push(now);
        if crashes.len() >= MAX_CRASHES {
            log_line("too many crashes in 10 minutes; giving up until next login");
            return;
        }
        std::thread::sleep(RESTART_DELAY);
    }
}

/// Appends to the same folder the widget logs to (%LOCALAPPDATA%\<identifier>\logs).
fn log_line(msg: &str) {
    let Some(base) = std::env::var_os("LOCALAPPDATA") else { return };
    let dir = std::path::Path::new(&base).join("kr.hs.gwe.chunchon.dashboard").join("logs");
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(dir.join("watchdog.log")) {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let _ = writeln!(f, "[unix {secs}] {msg}");
    }
}
