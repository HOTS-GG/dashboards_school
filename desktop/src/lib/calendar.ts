import "temporal-polyfill/global";
import type { CalendarEventExternal } from "@schedule-x/calendar";
import type { EventRecord } from "./events";

export const TIMEZONE = "Asia/Seoul";

// Category → Schedule-X calendar (colour group). Colours are placeholders until the design pass.
export const CATEGORIES = {
  학사: { colorName: "academic", main: "#2563eb", container: "#dbeafe", onContainer: "#1e3a8a" },
  회의: { colorName: "meeting", main: "#7c3aed", container: "#ede9fe", onContainer: "#4c1d95" },
  행사: { colorName: "event", main: "#db2777", container: "#fce7f3", onContainer: "#831843" },
  출장: { colorName: "trip", main: "#d97706", container: "#fef3c7", onContainer: "#78350f" },
  기타: { colorName: "other", main: "#4b5563", container: "#e5e7eb", onContainer: "#111827" },
} as const;

export const scheduleXCalendars = Object.fromEntries(
  Object.entries(CATEGORIES).map(([label, c]) => [
    c.colorName,
    {
      colorName: c.colorName,
      label,
      lightColors: { main: c.main, container: c.container, onContainer: c.onContainer },
      darkColors: { main: c.main, container: c.onContainer, onContainer: c.container },
      readonly: true,
    },
  ]),
);

/** PocketBase dates look like "2026-11-03 01:00:00.000Z" (UTC). */
export function toZoned(pbDate: string): Temporal.ZonedDateTime {
  return Temporal.Instant.from(pbDate.replace(" ", "T")).toZonedDateTimeISO(TIMEZONE);
}

export function toCalendarEvent(e: EventRecord): CalendarEventExternal {
  const start = toZoned(e.start);
  const end = toZoned(e.end);
  return {
    id: e.id,
    title: e.title,
    location: e.location || undefined,
    description: e.description || undefined,
    people: e.expand?.owner?.name ? [e.expand.owner.name] : undefined,
    calendarId: CATEGORIES[(e.category || "기타") as keyof typeof CATEGORIES].colorName,
    // All-day events span whole dates (end date inclusive).
    start: e.all_day ? start.toPlainDate() : start,
    end: e.all_day ? end.toPlainDate() : end,
  };
}

export function formatRange(e: EventRecord): string {
  const s = toZoned(e.start);
  const en = toZoned(e.end);
  const date = (d: Temporal.ZonedDateTime) =>
    d.toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const time = (d: Temporal.ZonedDateTime) => d.toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" });
  const sameDay = s.toPlainDate().equals(en.toPlainDate());
  if (e.all_day) return sameDay ? `${date(s)} 종일` : `${date(s)} – ${date(en)} 종일`;
  return sameDay ? `${date(s)} ${time(s)} – ${time(en)}` : `${date(s)} ${time(s)} – ${date(en)} ${time(en)}`;
}
