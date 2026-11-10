import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TIMEZONE } from "./calendar";

const HEARTBEAT_MS = 20_000;
const RELOAD_HOUR = 4; // daily fresh start, while nobody is looking

let quiet = false;
const quietListeners = new Set<(q: boolean) => void>();

/** True while a full-screen app, game or presentation is running. */
export function isQuiet() {
  return quiet;
}

export function onQuietChange(fn: (q: boolean) => void): () => void {
  quietListeners.add(fn);
  return () => quietListeners.delete(fn);
}

/**
 * Starts the page's side of the health checks (see src-tauri/src/health.rs):
 * a heartbeat so a hung page gets reloaded, quiet-mode tracking, and a reload
 * once a day at RELOAD_HOUR to clear any slow build-up from running for weeks.
 */
export function startHealth() {
  const beat = () => void invoke("heartbeat").catch(() => {});
  beat();
  setInterval(beat, HEARTBEAT_MS);

  const setQuiet = (q: boolean) => {
    quiet = q;
    quietListeners.forEach((fn) => fn(q));
  };
  void invoke<boolean>("is_quiet").then(setQuiet).catch(() => {});
  void listen<boolean>("quiet-mode", (e) => setQuiet(e.payload));

  const started = Temporal.Now.zonedDateTimeISO(TIMEZONE);
  setInterval(() => {
    const now = Temporal.Now.zonedDateTimeISO(TIMEZONE);
    const nextDay = Temporal.PlainDate.compare(now.toPlainDate(), started.toPlainDate()) > 0;
    if (nextDay && now.hour >= RELOAD_HOUR && !quiet) location.reload();
  }, 10 * 60_000);
}
