import { useEffect, useState } from "react";
import { CATEGORIES, categoryOf, TIMEZONE } from "../lib/calendar";
import type { Occurrence } from "../lib/recurrence";

const MAX_ROWS = 4;

function hhmm(t: Temporal.ZonedDateTime) {
  return t.toPlainTime().toString({ smallestUnit: "minute" });
}

/** "12분", "1시간 5분" — split so the number can be set large and the unit small. */
function countdown(minutes: number): Array<[string, string]> {
  const m = Math.max(1, Math.ceil(minutes));
  if (m < 60) return [[String(m), "분"]];
  const h = Math.floor(m / 60);
  return m % 60 ? [[String(h), "시간"], [String(m % 60), "분"]] : [[String(h), "시간"]];
}

function relative(o: Occurrence, now: Temporal.ZonedDateTime): string {
  if (Temporal.ZonedDateTime.compare(o.end, now) <= 0) return "지남";
  if (Temporal.ZonedDateTime.compare(o.start, now) <= 0) return "진행 중";
  return countdown(now.until(o.start).total("minutes")).map(([n, u]) => n + u).join(" ") + " 후";
}

export function Badge({ category }: { category: string }) {
  const c = categoryOf(category);
  return (
    <span className="badge" style={{ background: c.main }} title={category || "기타"}>
      {c.badge}
    </span>
  );
}

/** The departure board: minutes until the next event, then today's timed events in order. */
export function NextBoard({ occurrences, onSelect }: { occurrences: Occurrence[]; onSelect: (key: string) => void }) {
  const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO(TIMEZONE));
  useEffect(() => {
    const t = setInterval(() => setNow(Temporal.Now.zonedDateTimeISO(TIMEZONE)), 20_000);
    return () => clearInterval(t);
  }, []);

  const today = now.toPlainDate();
  const timed = occurrences
    .filter((o) => !o.event.all_day)
    .sort((a, b) => Temporal.ZonedDateTime.compare(a.start, b.start));
  // Anything overlapping today, so an event still running past midnight stays on the board.
  const todays = timed.filter(
    (o) => Temporal.PlainDate.compare(o.start.toPlainDate(), today) <= 0 &&
      Temporal.PlainDate.compare(o.end.toPlainDate(), today) >= 0,
  );
  const allDay = occurrences.filter(
    (o) => o.event.all_day &&
      Temporal.PlainDate.compare(o.start.toPlainDate(), today) <= 0 &&
      Temporal.PlainDate.compare(o.end.toPlainDate(), today) >= 0,
  );

  const isPast = (o: Occurrence) => Temporal.ZonedDateTime.compare(o.end, now) <= 0;
  const past = todays.filter(isPast);
  const live = todays.filter((o) => !isPast(o));
  const rows = [...past.slice(-Math.max(1, MAX_ROWS - live.length)), ...live].slice(0, MAX_ROWS);
  const next = timed.find((o) => Temporal.ZonedDateTime.compare(o.start, now) > 0);
  const nextIsToday = next?.start.toPlainDate().equals(today);

  return (
    <section className="board" aria-label="다음 일정">
      <div className="board__next">
        {next && nextIsToday ? (
          <button className="board__lead" onClick={() => onSelect(next.key)}>
            <span className="board__count" aria-label={`${relative(next, now)}`}>
              {countdown(now.until(next.start).total("minutes")).map(([n, u]) => (
                <span key={u}>
                  {n}
                  <small>{u}</small>
                </span>
              ))}
            </span>
            <span className="board__what">
              <span className="board__title">{next.event.title}</span>
              <span className="board__meta">
                {hhmm(next.start)}
                {next.event.location && ` · ${next.event.location}`}
              </span>
            </span>
          </button>
        ) : next ? (
          <button className="board__lead board__lead--later" onClick={() => onSelect(next.key)}>
            <span className="board__what">
              <span className="board__title">오늘 남은 일정 없음</span>
              <span className="board__meta">
                다음 · {next.start.toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}{" "}
                {hhmm(next.start)} {next.event.title}
              </span>
            </span>
          </button>
        ) : (
          <p className="board__lead board__lead--later">
            <span className="board__title">예정된 일정 없음</span>
          </p>
        )}
      </div>

      {allDay.length > 0 && (
        <p className="board__allday">
          <span className="board__label">종일</span>
          {allDay.map((o) => (
            <button key={o.key} className="board__allday-item" onClick={() => onSelect(o.key)}>
              <Badge category={o.event.category} /> {o.event.title}
            </button>
          ))}
        </p>
      )}

      {rows.length > 0 && (
        <ol className="board__rows">
          {rows.map((o) => {
            const state = relative(o, now);
            const kind = state === "지남" ? "past" : state === "진행 중" ? "now" : "soon";
            return (
              <li key={o.key}>
                <button className={`board__row board__row--${kind}`} onClick={() => onSelect(o.key)}>
                  <span className="board__time">{hhmm(o.start)}</span>
                  <Badge category={o.event.category} />
                  <span className="board__row-title">{o.event.title}</span>
                  <span className="board__state">{state}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** Category key folded into one colour strip; hovering or focusing it spells out the names. */
export function Legend() {
  return (
    <div className="legend" tabIndex={0} aria-label="분류: 학사, 회의, 행사, 출장, 기타">
      {Object.entries(CATEGORIES).map(([name, c]) => (
        <span key={name} className="legend__item" style={{ ["--line" as string]: c.main }}>
          <span className="legend__name">{name}</span>
        </span>
      ))}
    </div>
  );
}
