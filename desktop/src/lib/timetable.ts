import "temporal-polyfill/global";
import type { RecordModel } from "pocketbase";
import { TIMEZONE } from "./calendar";
import { pb } from "./pb";

/** One weekly class. This is all the widget needs, whatever the source. */
export type Lesson = {
  weekday: number; // 1 = Mon … 5 = Fri
  period: number;
  subject: string;
  classLabel: string;
  room: string;
};

export type BellTime = { period: number; start: string; end: string }; // "HH:MM"

/**
 * Where lessons come from. v1 reads what each teacher typed in; an automatic
 * import (NEIS, school timetable export, …) can replace this later without
 * touching the screens. See docs/design.md §5.4.
 */
export interface TimetableSource {
  load(term: string): Promise<Lesson[]>;
}

type SlotRecord = RecordModel & {
  owner: string;
  term: string;
  weekday: number;
  period: number;
  subject: string;
  class_label: string;
  room: string;
};

const toLesson = (r: SlotRecord): Lesson => ({
  weekday: r.weekday,
  period: r.period,
  subject: r.subject,
  classLabel: r.class_label,
  room: r.room,
});

/** Lessons each teacher entered by hand (`timetable_slots`, own records only). */
export const manualSource: TimetableSource = {
  async load(term) {
    const list = await pb().collection("timetable_slots").getFullList<SlotRecord>({
      filter: pb().filter("term = {:term}", { term }),
    });
    return list.map(toLesson);
  },
};

/** Korean school terms: Mar–Aug is term 1, Sep–Feb term 2 (Jan–Feb belong to the previous year). */
export function termOf(date: Temporal.PlainDate): string {
  if (date.month >= 3 && date.month <= 8) return `${date.year}-1`;
  return date.month >= 9 ? `${date.year}-2` : `${date.year - 1}-2`;
}

export function previousTerm(term: string): string {
  const [y, t] = term.split("-").map(Number);
  return t === 2 ? `${y}-1` : `${y - 1}-2`;
}

export function currentTerm(): string {
  return termOf(Temporal.Now.plainDateISO(TIMEZONE));
}

// --- editing (manual source) ---

async function findSlot(term: string, weekday: number, period: number) {
  const list = await pb().collection("timetable_slots").getList<SlotRecord>(1, 1, {
    filter: pb().filter("term = {:term} && weekday = {:weekday} && period = {:period}", { term, weekday, period }),
  });
  return list.items[0];
}

/** Saves one cell; an empty subject clears it. */
export async function saveLesson(term: string, lesson: Lesson) {
  const existing = await findSlot(term, lesson.weekday, lesson.period);
  const col = pb().collection("timetable_slots");
  if (!lesson.subject.trim()) {
    if (existing) await col.delete(existing.id);
    return;
  }
  const data = {
    subject: lesson.subject.trim(),
    class_label: lesson.classLabel.trim(),
    room: lesson.room.trim(),
  };
  if (existing) await col.update(existing.id, data);
  else
    await col.create({
      ...data,
      owner: pb().authStore.record!.id,
      term,
      weekday: lesson.weekday,
      period: lesson.period,
    });
}

/** Copies another term's lessons into `term`, overwriting cells that collide. Returns how many were copied. */
export async function copyTerm(from: string, to: string): Promise<number> {
  const lessons = await manualSource.load(from);
  for (const l of lessons) await saveLesson(to, l);
  return lessons.length;
}

// --- bell times ---

type BellRecord = RecordModel & BellTime;

export async function loadBellTimes(): Promise<BellTime[]> {
  const list = await pb().collection("bell_times").getFullList<BellRecord>({ sort: "period" });
  return list.map(({ period, start, end }) => ({ period, start, end }));
}

/** Replaces the whole bell schedule (admins only; the server enforces it). */
export async function saveBellTimes(times: BellTime[]) {
  const col = pb().collection("bell_times");
  const existing = await col.getFullList<BellRecord>();
  const byPeriod = new Map(existing.map((r) => [r.period, r]));
  for (const t of times) {
    const r = byPeriod.get(t.period);
    if (r) await col.update(r.id, t);
    else await col.create(t);
    byPeriod.delete(t.period);
  }
  for (const r of byPeriod.values()) await col.delete(r.id);
}

// --- offline cache ---

const CACHE_KEY = "timetable-cache-v1";
type Cached = { term: string; lessons: Lesson[]; bells: BellTime[] };

export function loadTimetableCache(): Cached | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveTimetableCache(c: Cached) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

export function clearTimetableCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

// --- "now" ---

export type NowInfo =
  | { kind: "weekend" }
  | { kind: "before"; next: number }
  | { kind: "class"; period: number; next?: number }
  | { kind: "break"; next: number }
  | { kind: "after" };

/** Where the school day stands at `now` (Seoul time), given the bell schedule. */
export function whereNow(bells: BellTime[], now = Temporal.Now.zonedDateTimeISO(TIMEZONE)): NowInfo {
  if (now.dayOfWeek > 5 || bells.length === 0) return { kind: "weekend" };
  const t = now.toPlainTime().toString({ smallestUnit: "minute" });
  const sorted = [...bells].sort((a, b) => a.period - b.period);
  const current = sorted.find((b) => b.start <= t && t < b.end);
  const next = sorted.find((b) => b.start > t)?.period;
  if (current) return { kind: "class", period: current.period, next };
  if (next === undefined) return { kind: "after" };
  return t < sorted[0].start ? { kind: "before", next } : { kind: "break", next };
}

// --- sync ---

export type TimetableState = Cached;

/**
 * Keeps this term's lessons and the bell schedule current: cache first, then the
 * server, refetched on every realtime (re)connect and on any change to either
 * collection. Returns a function that stops syncing.
 */
export function syncTimetable(onChange: (s: TimetableState) => void, source: TimetableSource = manualSource) {
  const cached = loadTimetableCache();
  if (cached?.term === currentTerm()) onChange(cached);

  let stopped = false;
  const refetch = async () => {
    const term = currentTerm();
    try {
      const [lessons, bells] = await Promise.all([source.load(term), loadBellTimes()]);
      if (stopped) return;
      const next = { term, lessons, bells };
      saveTimetableCache(next);
      onChange(next);
    } catch {
      // Offline: keep showing the cache.
    }
  };

  const client = pb();
  const subs = Promise.all([
    client.realtime.subscribe("PB_CONNECT", () => void refetch()),
    client.collection("timetable_slots").subscribe("*", () => void refetch()),
    client.collection("bell_times").subscribe("*", () => void refetch()),
  ]).catch(() => [] as Array<() => Promise<void>>);
  void refetch();
  // Picks up a new term (and the day's first fetch after a long sleep) without a restart.
  const hourly = setInterval(() => void refetch(), 3_600_000);

  return () => {
    stopped = true;
    clearInterval(hourly);
    void subs.then((list) => list.forEach((u) => void u().catch(() => {})));
  };
}
