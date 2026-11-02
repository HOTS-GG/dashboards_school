import { useEffect, useState } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createViewDay, createViewList, createViewMonthAgenda, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import { scheduleXCalendars, TIMEZONE, toCalendarEvent } from "../lib/calendar";
import type { EventRecord } from "../lib/events";

type Props = {
  events: EventRecord[];
  onSelect: (id: string) => void;
};

export function CalendarView({ events, onSelect }: Props) {
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
      callbacks: { onEventClick: (e) => onSelect(String(e.id)) },
    },
    [eventsService],
  );

  useEffect(() => {
    if (calendar) eventsService.set(events.map(toCalendarEvent));
  }, [calendar, events, eventsService]);

  return (
    <div className="calendar">
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}
