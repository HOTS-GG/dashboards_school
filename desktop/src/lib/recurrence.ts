import "temporal-polyfill/global";
import type { EventRecord } from "./events";
import { toZoned } from "./calendar";

// Supported subset of RFC 5545 RRULE: FREQ, INTERVAL, UNTIL (a local date, inclusive).
export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type Repeat = { freq: Freq; interval: number; until: Temporal.PlainDate | null };

const UNIT: Record<Freq, "days" | "weeks" | "months" | "years"> = {
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};
const MAX_OCCURRENCES = 1000;

export function parseRRule(rrule: string): Repeat | null {
  if (!rrule) return null;
  const parts = Object.fromEntries(rrule.split(";").map((p) => p.split("=") as [string, string]));
  if (!(parts.FREQ in UNIT)) return null;
  const until = /^\d{8}/.test(parts.UNTIL ?? "")
    ? Temporal.PlainDate.from(`${parts.UNTIL.slice(0, 4)}-${parts.UNTIL.slice(4, 6)}-${parts.UNTIL.slice(6, 8)}`)
    : null;
  return { freq: parts.FREQ as Freq, interval: Math.max(1, Number(parts.INTERVAL) || 1), until };
}

export function formatRRule(r: Repeat | null): string {
  if (!r) return "";
  const parts = [`FREQ=${r.freq}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.until) parts.push(`UNTIL=${r.until.toString().replace(/-/g, "")}`);
  return parts.join(";");
}

export type Occurrence = {
  /** Unique per occurrence: the record id, plus `__YYYY-MM-DD` for repeats. */
  key: string;
  /** Local start date of this occurrence (what `exdates` stores). */
  date: string;
  event: EventRecord;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
};

/** Expands events (repeating ones included) into the occurrences that overlap [from, to]. */
export function expand(events: EventRecord[], from: Temporal.PlainDate, to: Temporal.PlainDate): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    const start = toZoned(event.start);
    const end = toZoned(event.end);
    const repeat = parseRRule(event.rrule);
    if (!repeat) {
      out.push({ key: event.id, date: start.toPlainDate().toString(), event, start, end });
      continue;
    }
    const duration = start.until(end);
    const skip = new Set<string>(Array.isArray(event.exdates) ? event.exdates : []);
    for (let n = 0; n < MAX_OCCURRENCES; n++) {
      // Step from the original start each time so monthly repeats on the 31st don't drift.
      const s = start.add({ [UNIT[repeat.freq]]: n * repeat.interval });
      const day = s.toPlainDate();
      if (Temporal.PlainDate.compare(day, to) > 0) break;
      if (repeat.until && Temporal.PlainDate.compare(day, repeat.until) > 0) break;
      const e = s.add(duration);
      if (skip.has(day.toString()) || Temporal.PlainDate.compare(e.toPlainDate(), from) < 0) continue;
      out.push({ key: `${event.id}__${day}`, date: day.toString(), event, start: s, end: e });
    }
  }
  return out;
}

export function describeRepeat(rrule: string): string {
  const r = parseRRule(rrule);
  if (!r) return "";
  const every = { DAILY: "일", WEEKLY: "주", MONTHLY: "개월", YEARLY: "년" }[r.freq];
  const base = r.interval === 1 ? { DAILY: "매일", WEEKLY: "매주", MONTHLY: "매월", YEARLY: "매년" }[r.freq] : `${r.interval}${every}마다`;
  return r.until ? `${base} · ${r.until.month}월 ${r.until.day}일까지` : base;
}
