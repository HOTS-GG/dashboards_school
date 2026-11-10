import "temporal-polyfill/global";
import type { CalendarEventExternal } from "@schedule-x/calendar";
import type { Occurrence } from "./recurrence";

export const TIMEZONE = "Asia/Seoul";

// Category → "line colour", like subway lines; `badge` is the letter on its round badge, so
// a category never relies on colour alone. `main` carries white text at ≥4.5:1; `dark` is
// the same line lifted for marks on the dark theme.
// Keep in sync with the --line-* tokens in styles/tokens.css.
export const CATEGORIES = {
  학사: { colorName: "academic", badge: "학", main: "#0052a4", dark: "#6ea8ff", container: "#dce8f6", onContainer: "#00264d" },
  회의: { colorName: "meeting", badge: "회", main: "#7d4f93", dark: "#c99be2", container: "#efe5f4", onContainer: "#3b2047" },
  행사: { colorName: "event", badge: "행", main: "#00843d", dark: "#4fd08a", container: "#dcf1e4", onContainer: "#003d1c" },
  출장: { colorName: "trip", badge: "출", main: "#c25a00", dark: "#ff9d50", container: "#fbe7d6", onContainer: "#5c2a00" },
  기타: { colorName: "other", badge: "기", main: "#5f6773", dark: "#aab2bd", container: "#e7e9ec", onContainer: "#1f242b" },
} as const;

export type Category = keyof typeof CATEGORIES;

export function categoryOf(c: string | undefined): (typeof CATEGORIES)[Category] {
  return CATEGORIES[(c || "기타") as Category] ?? CATEGORIES.기타;
}

export const scheduleXCalendars = Object.fromEntries(
  Object.entries(CATEGORIES).map(([label, c]) => [
    c.colorName,
    {
      colorName: c.colorName,
      label,
      lightColors: { main: c.main, container: c.container, onContainer: c.onContainer },
      darkColors: { main: c.dark, container: c.onContainer, onContainer: c.container },
      readonly: true,
    },
  ]),
);

/** PocketBase dates look like "2026-11-03 01:00:00.000Z" (UTC). */
export function toZoned(pbDate: string): Temporal.ZonedDateTime {
  return Temporal.Instant.from(pbDate.replace(" ", "T")).toZonedDateTimeISO(TIMEZONE);
}

export function toCalendarEvent(o: Occurrence): CalendarEventExternal {
  const e = o.event;
  return {
    id: o.key,
    title: e.title,
    location: e.location || undefined,
    description: e.description || undefined,
    people: e.expand?.owner?.name ? [e.expand.owner.name] : undefined,
    calendarId: categoryOf(e.category).colorName,
    // All-day events span whole dates (end date inclusive).
    start: e.all_day ? o.start.toPlainDate() : o.start,
    end: e.all_day ? o.end.toPlainDate() : o.end,
  };
}

export function formatRange(o: Occurrence): string {
  const { start: s, end: en } = o;
  const date = (d: Temporal.ZonedDateTime) =>
    d.toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const time = (d: Temporal.ZonedDateTime) => d.toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" });
  const sameDay = s.toPlainDate().equals(en.toPlainDate());
  if (o.event.all_day) return sameDay ? `${date(s)} 종일` : `${date(s)} – ${date(en)} 종일`;
  return sameDay ? `${date(s)} ${time(s)} – ${time(en)}` : `${date(s)} ${time(s)} – ${date(en)} ${time(en)}`;
}

/** Converts a local Seoul date + time to the UTC instant PocketBase stores. */
export function toPbDate(date: string, time = "00:00"): string {
  return Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(TIMEZONE).toInstant().toString();
}
