import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { TIMEZONE } from "./calendar";
import type { Occurrence } from "./recurrence";

const LEAD_MINUTES = 10;
const CHECK_EVERY_MS = 30_000;
const SENT_KEY = "notified-v1";

function loadSent(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSent(sent: Record<string, number>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {}
}

/**
 * Shows a Windows notification LEAD_MINUTES before each timed occurrence.
 * Each occurrence (at a given start time) is announced once, even across restarts.
 * Returns a function that stops the checks.
 */
export function startNotifier(getOccurrences: () => Occurrence[]): () => void {
  let enabled = false;
  void (async () => {
    enabled = (await isPermissionGranted()) || (await requestPermission()) === "granted";
  })();

  const check = () => {
    if (!enabled) return;
    const now = Temporal.Now.instant();
    const sent = loadSent();
    // Forget entries for occurrences that started more than a day ago.
    for (const [k, at] of Object.entries(sent)) if (at < now.epochMilliseconds - 86_400_000) delete sent[k];

    for (const o of getOccurrences()) {
      if (o.event.all_day) continue;
      const startsIn = Temporal.Instant.compare(o.start.toInstant(), now) > 0
        ? now.until(o.start.toInstant()).total("minutes")
        : -1;
      const id = `${o.key}@${o.start.epochMilliseconds}`;
      if (startsIn < 0 || startsIn > LEAD_MINUTES || sent[id]) continue;
      const time = o.start.withTimeZone(TIMEZONE).toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" });
      sendNotification({
        title: o.event.title,
        body: [`${time} 시작 (${Math.max(1, Math.round(startsIn))}분 후)`, o.event.location].filter(Boolean).join(" · "),
      });
      sent[id] = o.start.epochMilliseconds;
    }
    saveSent(sent);
  };

  const timer = setInterval(check, CHECK_EVERY_MS);
  setTimeout(check, 3_000);
  return () => clearInterval(timer);
}
