import { useEffect, useState } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createViewDay, createViewList, createViewMonthAgenda, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import { scheduleXCalendars, TIMEZONE, toCalendarEvent } from "../lib/calendar";
import type { Occurrence } from "../lib/recurrence";

type Props = {
  occurrences: Occurrence[];
  onSelect: (key: string) => void;
  /** Double-clicking a day or time slot starts a new event on that date. */
  onCreate: (date: string) => void;
};

export function CalendarView({ occurrences, onSelect, onCreate }: Props) {
  const [eventsService] = useState(() => createEventsServicePlugin());
  const calendar = useCalendarApp(
    {
      views: [createViewMonthAgenda(), createViewWeek(), createViewDay(), createViewList()],
      locale: "ko-KR",
      timezone: TIMEZONE,
      firstDayOfWeek: 7,
      isDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      calendars: scheduleXCalendars,
      events: [],
      callbacks: {
        onEventClick: (e) => onSelect(String(e.id)),
        onDoubleClickDate: (d) => onCreate(d.toString()),
        onDoubleClickAgendaDate: (d) => onCreate(d.toString()),
        onDoubleClickDateTime: (dt) => onCreate(dt.toPlainDate().toString()),
      },
    },
    [eventsService],
  );

  useEffect(() => {
    if (calendar) eventsService.set(occurrences.map(toCalendarEvent));
  }, [calendar, occurrences, eventsService]);

  return (
    <div className="calendar">
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}
