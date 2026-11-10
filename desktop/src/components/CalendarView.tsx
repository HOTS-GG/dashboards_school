import { useEffect, useState } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createViewDay, createViewList, createViewMonthAgenda, createViewWeek } from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import { scheduleXCalendars, TIMEZONE, toCalendarEvent } from "../lib/calendar";
import { isDark, usePrefs } from "../lib/prefs";
import type { Occurrence } from "../lib/recurrence";
import { Icon } from "./Icon";

type Props = {
  occurrences: Occurrence[];
  onSelect: (key: string) => void;
  /** Double-clicking a day or time slot starts a new event on that date. */
  onCreate: (date: string) => void;
};

type ViewId = "month-agenda" | "week" | "day" | "list";

const VIEWS: Array<[ViewId, string, "months" | "weeks" | "days"]> = [
  ["month-agenda", "월", "months"],
  ["week", "주", "weeks"],
  ["day", "일", "days"],
  ["list", "목록", "weeks"],
];

function rangeLabel(view: ViewId, date: Temporal.PlainDate) {
  if (view === "month-agenda") return `${date.year}년 ${date.month}월`;
  if (view === "day") return date.toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  const start = date.subtract({ days: date.dayOfWeek % 7 }); // weeks start on Sunday
  const end = start.add({ days: 6 });
  return `${start.month}월 ${start.day}일 – ${end.month === start.month ? "" : `${end.month}월 `}${end.day}일`;
}

export function CalendarView({ occurrences, onSelect, onCreate }: Props) {
  const prefs = usePrefs();
  const [eventsService] = useState(() => createEventsServicePlugin());
  const [controls] = useState(() => createCalendarControlsPlugin());
  const [view, setView] = useState<ViewId>("month-agenda");
  const [date, setDate] = useState(() => Temporal.Now.plainDateISO(TIMEZONE));

  const calendar = useCalendarApp(
    {
      views: [createViewMonthAgenda(), createViewWeek(), createViewDay(), createViewList()],
      defaultView: "month-agenda",
      locale: "ko-KR",
      timezone: TIMEZONE,
      firstDayOfWeek: 7,
      isDark: isDark(prefs),
      calendars: scheduleXCalendars,
      events: [],
      callbacks: {
        onEventClick: (e) => onSelect(String(e.id)),
        onDoubleClickDate: (d) => onCreate(d.toString()),
        onDoubleClickAgendaDate: (d) => onCreate(d.toString()),
        onDoubleClickDateTime: (dt) => onCreate(dt.toPlainDate().toString()),
        onSelectedDateUpdate: (d) => setDate(d),
        // Schedule-X can switch views by itself (e.g. when the window is widened); follow it.
        onRangeUpdate: () => setView(controls.getView() as ViewId),
      },
    },
    [eventsService, controls],
  );

  useEffect(() => {
    if (calendar) eventsService.set(occurrences.map(toCalendarEvent));
  }, [calendar, occurrences, eventsService]);

  const dark = isDark(prefs);
  useEffect(() => {
    calendar?.setTheme(dark ? "dark" : "light");
  }, [calendar, dark]);

  const step = VIEWS.find(([id]) => id === view)![2];
  const go = (d: Temporal.PlainDate) => {
    setDate(d);
    controls.setDate(d);
  };
  const switchView = (v: ViewId) => {
    setView(v);
    controls.setView(v);
  };
  const today = Temporal.Now.plainDateISO(TIMEZONE);

  return (
    <div className="calendar">
      <nav className="calnav" aria-label="달력 보기">
        <span className="calnav__range">
          <button className="button button--icon" onClick={() => go(date.subtract({ [step]: 1 }))} aria-label="이전">
            <Icon name="chevronLeft" />
          </button>
          <span className="calnav__label" aria-live="polite">{rangeLabel(view, date)}</span>
          <button className="button button--icon" onClick={() => go(date.add({ [step]: 1 }))} aria-label="다음">
            <Icon name="chevronRight" />
          </button>
          {!date.equals(today) && (
            <button className="button button--quiet calnav__today" onClick={() => go(today)}>오늘</button>
          )}
        </span>
        <span className="calnav__views" role="tablist">
          {VIEWS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id}
              className={`calnav__view${view === id ? " calnav__view--on" : ""}`} onClick={() => switchView(id)}>
              {label}
            </button>
          ))}
        </span>
      </nav>
      <div className="calendar__body">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  );
}
