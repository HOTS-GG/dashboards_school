import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./App.css";
import { BellEditor } from "./components/BellEditor";
import { CalendarView } from "./components/CalendarView";
import { EventDetail } from "./components/EventDetail";
import { EventForm } from "./components/EventForm";
import { Icon } from "./components/Icon";
import { Login } from "./components/Login";
import { Legend, NextBoard } from "./components/NextBoard";
import { SettingsSheet } from "./components/SettingsSheet";
import { TimetableEditor } from "./components/TimetableEditor";
import { TodayStrip } from "./components/TodayStrip";
import { TIMEZONE } from "./lib/calendar";
import { clearCache, syncEvents, type EventRecord, type SyncStatus } from "./lib/events";
import { startNotifier } from "./lib/notify";
import { currentUser, initClient, logout, pb, refreshSession } from "./lib/pb";
import { usePrefs } from "./lib/prefs";
import { expand } from "./lib/recurrence";
import { clearTimetableCache, syncTimetable, type TimetableState } from "./lib/timetable";

type Phase = "loading" | "login" | "main" | "error";

const STATUS_LABEL: Record<SyncStatus, string> = {
  online: "실시간",
  connecting: "연결 중",
  offline: "오프라인 · 저장본",
};

function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await initClient();
        const ok = pb().authStore.token ? await refreshSession() : false;
        setPhase(ok ? "main" : "login");
      } catch (err: any) {
        setError(err?.message || String(err));
        setPhase("error");
      }
    })();
  }, []);

  const signOut = () => {
    logout();
    clearCache();
    clearTimetableCache();
    setPhase("login");
  };

  return (
    <main className="widget">
      {phase === "main" ? (
        <Schedule onLogout={signOut} />
      ) : (
        <>
          <Header />
          {phase === "loading" && <section className="widget__empty">불러오는 중…</section>}
          {phase === "error" && <section className="widget__empty" role="alert">시작하지 못했습니다: {error}</section>}
          {phase === "login" && <Login onDone={() => setPhase("main")} />}
        </>
      )}
    </main>
  );
}

function Header({ children }: { children?: ReactNode }) {
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  return (
    <header className="widget__header" data-tauri-drag-region>
      <span className="widget__date" data-tauri-drag-region>{today}</span>
      {children}
    </header>
  );
}

type Sheet =
  | { kind: "detail"; key: string }
  | { kind: "form"; eventId?: string; date?: string }
  | { kind: "timetable" }
  | { kind: "bells" }
  | { kind: "settings" }
  | null;

// Occurrences are expanded for the same window the event cache keeps.
function expansionWindow() {
  const today = Temporal.Now.plainDateISO(TIMEZONE);
  return { from: today.subtract({ months: 3 }).with({ day: 1 }), to: today.add({ months: 7 }).with({ day: 1 }) };
}

function Schedule({ onLogout }: { onLogout: () => void }) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [timetable, setTimetable] = useState<TimetableState | null>(null);
  const prefs = usePrefs();

  useEffect(() => syncEvents(setEvents, setStatus), []);
  useEffect(() => syncTimetable(setTimetable), []);
  const occurrences = useMemo(() => {
    const { from, to } = expansionWindow();
    return expand(events, from, to);
  }, [events]);

  const latest = useRef(occurrences);
  latest.current = occurrences;
  useEffect(() => startNotifier(() => latest.current), []);

  const selected = sheet?.kind === "detail" ? occurrences.find((o) => o.key === sheet.key) : undefined;
  const editing = sheet?.kind === "form" && sheet.eventId ? events.find((e) => e.id === sheet.eventId) : undefined;
  const onSelect = useCallback((key: string) => setSheet({ kind: "detail", key }), []);
  const onCreate = useCallback((date?: string) => setSheet({ kind: "form", date }), []);
  const close = useCallback(() => setSheet(null), []);
  const offline = status === "offline";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Header>
        <span className="header__actions">
          <span className={`status status--${status}`} role="status" title={offline ? "서버에 연결되지 않아 마지막으로 받은 일정을 보여 주고 있습니다." : undefined}>
            <span className="status__dot" aria-hidden /> {STATUS_LABEL[status]}
          </span>
          <button className="button button--icon" onClick={() => setSheet({ kind: "settings" })} aria-label="설정">
            <Icon name="settings" />
          </button>
        </span>
      </Header>
      <NextBoard occurrences={occurrences} onSelect={onSelect} />
      <div className="toolbar">
        <Legend />
        <span className="toolbar__actions">
          <button className="button button--quiet" onClick={() => setSheet({ kind: "timetable" })} disabled={offline}>
            <Icon name="timetable" /> 시간표
          </button>
          <button className="button button--primary button--small" onClick={() => onCreate()} disabled={offline}
            title={offline ? "서버에 연결되면 등록할 수 있습니다." : undefined}>
            <Icon name="plus" /> 일정
          </button>
        </span>
      </div>
      <CalendarView occurrences={occurrences} onSelect={onSelect} onCreate={onCreate} />
      {prefs.showStrip && timetable && (
        <TodayStrip lessons={timetable.lessons} bells={timetable.bells} onOpen={() => setSheet({ kind: "timetable" })} />
      )}

      {selected && (
        <EventDetail
          occurrence={selected}
          onEdit={() => setSheet({ kind: "form", eventId: selected.event.id })}
          onClose={close}
        />
      )}
      {sheet?.kind === "form" && (!sheet.eventId || editing) && (
        <EventForm event={editing} date={sheet.date} onClose={close} />
      )}
      {sheet?.kind === "timetable" && (
        <TimetableEditor
          bells={timetable?.bells ?? []}
          isAdmin={currentUser()?.role === "admin"}
          onEditBells={() => setSheet({ kind: "bells" })}
          onClose={close}
        />
      )}
      {sheet?.kind === "bells" && (
        <BellEditor bells={timetable?.bells ?? []} onClose={() => setSheet({ kind: "timetable" })} />
      )}
      {sheet?.kind === "settings" && <SettingsSheet onLogout={onLogout} onClose={close} />}
    </>
  );
}

export default App;
