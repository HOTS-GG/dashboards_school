import { useEffect, useState } from "react";
import { TIMEZONE } from "../lib/calendar";
import { whereNow, type BellTime, type Lesson } from "../lib/timetable";

/** One line at the bottom of the widget: today's classes, with the current one highlighted. */
export function TodayStrip({ lessons, bells, onOpen }: { lessons: Lesson[]; bells: BellTime[]; onOpen: () => void }) {
  const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO(TIMEZONE));
  useEffect(() => {
    const t = setInterval(() => setNow(Temporal.Now.zonedDateTimeISO(TIMEZONE)), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = lessons.filter((l) => l.weekday === now.dayOfWeek).sort((a, b) => a.period - b.period);
  const where = whereNow(bells, now);
  const current = where.kind === "class" ? where.period : undefined;
  const nowLesson = today.find((l) => l.period === current);
  // Next of *my* lessons, not just the next period of the school day.
  const from = where.kind === "class" ? where.period + 1 : "next" in where ? where.next : Infinity;
  const nextLesson = today.find((l) => l.period >= from);
  const next = nextLesson?.period;

  let summary: string;
  if (now.dayOfWeek > 5) summary = "주말";
  else if (today.length === 0) summary = "오늘 수업 없음";
  else if (bells.length === 0) summary = "오늘 수업";
  else if (nowLesson) summary = `지금 ${nowLesson.period}교시 ${nowLesson.subject}`;
  else if (nextLesson) summary = `다음 ${nextLesson.period}교시 ${nextLesson.subject}`;
  else summary = "오늘 수업 끝";

  return (
    <button className="today" onClick={onOpen} title="내 시간표 열기">
      <span className="today__summary">{summary}</span>
      <span className="today__list">
        {today.map((l) => (
          <span
            key={l.period}
            className={`today__item${l.period === current ? " today__item--now" : ""}${l.period === next && l.period !== current ? " today__item--next" : ""}`}
          >
            {l.period} {l.subject}
            {l.classLabel && <small> {l.classLabel}</small>}
          </span>
        ))}
      </span>
    </button>
  );
}
