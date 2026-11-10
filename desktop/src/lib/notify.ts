import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { TIMEZONE } from "./calendar";
import { isQuiet, onQuietChange } from "./health";
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
    // Full-screen app or presentation: hold reminders until it ends.
    if (!enabled || isQuiet()) return;
    const now = Temporal.Now.instant();
    const sent = loadSent();
    // Forget entries for occurrences that started more than a day ago.
    for (const [k, at] of Object.entries(sent)) if (at < now.epochMilliseconds - 86_400_000) delete sent[k];

    for (const o of getOccurrences()) {
      if (o.event.all_day) continue;
      const startsIn = now.until(o.start.toInstant()).total("minutes");
      const ended = Temporal.Instant.compare(o.end.toInstant(), now) <= 0;
      const id = `${o.key}@${o.start.epochMilliseconds}`;
      // Due from LEAD_MINUTES before the start until the event ends, so a reminder
      // held back during a presentation still shows afterwards if it's relevant.
      if (startsIn > LEAD_MINUTES || ended || sent[id]) continue;
      const time = o.start.withTimeZone(TIMEZONE).toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" });
      const when = startsIn > 0 ? `${time} 시작 (${Math.max(1, Math.round(startsIn))}분 후)` : `진행 중 (${time} 시작)`;
      sendNotification({ title: o.event.title, body: [when, o.event.location].filter(Boolean).join(" · ") });
      sent[id] = o.start.epochMilliseconds;
    }
    saveSent(sent);
  };

  const timer = setInterval(check, CHECK_EVERY_MS);
  setTimeout(check, 3_000);
  const offQuiet = onQuietChange((q) => {
    if (!q) check();
  });
  return () => {
    clearInterval(timer);
    offQuiet();
  };
}
