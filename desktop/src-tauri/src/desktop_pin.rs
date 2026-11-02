//! Keeps the widget on the desktop layer.
//!
//! The window is made an *owned* window of Explorer's desktop window (Progman).
//! Owned windows always sit above their owner and are not minimized by
//! "Show desktop" (Win+D), yet stay ordinary top-level windows, so clicks and
//! keyboard input keep working. Explorer recreates Progman when it restarts,
//! so callers re-check with [`is_pinned`] and pin again.

use windows::core::w;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    FindWindowW, GetWindow, SetWindowLongPtrW, SetWindowPos, GWLP_HWNDPARENT, GW_OWNER,
    HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
};

fn progman() -> Option<HWND> {
    unsafe { FindWindowW(w!("Progman"), None) }.ok().filter(|h| !h.is_invalid())
}

fn owner(hwnd: HWND) -> Option<HWND> {
    unsafe { GetWindow(hwnd, GW_OWNER) }.ok().filter(|h| !h.is_invalid())
}

fn set_owner(hwnd: HWND, owner: Option<HWND>) {
    let value = owner.map_or(0, |h| h.0 as isize);
    unsafe { SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, value) };
}

/// True when the window is owned by the current desktop window.
pub fn is_pinned(hwnd: HWND) -> bool {
    matches!((owner(hwnd), progman()), (Some(o), Some(p)) if o == p)
}

/// Attaches the window to the desktop and drops it behind other windows.
/// Returns false if Explorer's desktop window isn't available (yet).
pub fn pin(hwnd: HWND) -> bool {
    let Some(desktop) = progman() else { return false };
    set_owner(hwnd, Some(desktop));    send_to_back(hwnd);
    true
}

pub fn unpin(hwnd: HWND) {
    set_owner(hwnd, None);
}

/// Moves the window under all other windows (it stays above the desktop).
pub fn send_to_back(hwnd: HWND) {
    let _ = unsafe {
        SetWindowPos(hwnd, Some(HWND_BOTTOM), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
    };
}
