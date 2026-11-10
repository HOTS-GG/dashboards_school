import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { CalendarView } from "./components/CalendarView";
import { EventDetail } from "./components/EventDetail";
import { EventForm } from "./components/EventForm";
import { BellEditor } from "./components/BellEditor";
import { Login } from "./components/Login";
import { TimetableEditor } from "./components/TimetableEditor";
import { TodayStrip } from "./components/TodayStrip";
import { TIMEZONE } from "./lib/calendar";
import { clearCache, syncEvents, type EventRecord, type SyncStatus } from "./lib/events";
import { startNotifier } from "./lib/notify";
import { currentUser, initClient, logout, pb, refreshSession } from "./lib/pb";
import { expand } from "./lib/recurrence";
import { clearTimetableCache, syncTimetable, type TimetableState } from "./lib/timetable";

type Phase = "loading" | "login" | "main" | "error";

const STATUS_LABEL: Record<SyncStatus, string> = {
  online: "실시간 연결됨",
  connecting: "연결 중…",
  offline: "오프라인 · 저장된 일정 표시 중",
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

  return (
    <main className="widget">
      <Header onLogout={phase === "main" ? () => { logout(); clearCache(); clearTimetableCache(); setPhase("login"); } : undefined} />
      {phase === "loading" && <section className="widget__empty">불러오는 중…</section>}
      {phase === "error" && <section className="widget__empty" role="alert">시작하지 못했습니다: {error}</section>}
      {phase === "login" && <Login onDone={() => setPhase("main")} />}
      {phase === "main" && <Schedule />}
    </main>
  );
}

function Header({ onLogout }: { onLogout?: () => void }) {
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
  return (
    <header className="widget__header" data-tauri-drag-region>
      <span data-tauri-drag-region>{today}</span>
      {onLogout && (
        <button className="button button--quiet" onClick={onLogout} title={currentUser()?.email}>
          로그아웃
        </button>
      )}
    </header>
  );
}

type Sheet =
  | { kind: "detail"; key: string }
  | { kind: "form"; eventId?: string; date?: string }
  | { kind: "timetable" }
  | { kind: "bells" }
  | null;

const STRIP_KEY = "show-today-strip";

function loadShowStrip() {
  try {
    return localStorage.getItem(STRIP_KEY) !== "0";
  } catch {
    return true;
  }
}

// Occurrences are expanded for the same window the event cache keeps.
function expansionWindow() {
  const today = Temporal.Now.plainDateISO(TIMEZONE);
  return { from: today.subtract({ months: 3 }).with({ day: 1 }), to: today.add({ months: 7 }).with({ day: 1 }) };
}

function Schedule() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [timetable, setTimetable] = useState<TimetableState | null>(null);
  const [showStrip, setShowStrip] = useState(loadShowStrip);

  useEffect(() => syncEvents(setEvents, setStatus), []);
  useEffect(() => syncTimetable(setTimetable), []);
  const toggleStrip = (show: boolean) => {
    setShowStrip(show);
    try {
      localStorage.setItem(STRIP_KEY, show ? "1" : "0");
    } catch {}
  };
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

  return (
    <>
      <div className="toolbar">
        <p className={`status status--${status}`} role="status">
          <span className="status__dot" aria-hidden /> {STATUS_LABEL[status]}
        </p>
        <span className="toolbar__actions">
          <button className="button button--quiet" onClick={() => setSheet({ kind: "timetable" })} disabled={status === "offline"}>
            시간표
          </button>
          <button className="button button--primary button--small" onClick={() => onCreate()} disabled={status === "offline"}>
            ＋ 일정
          </button>
        </span>
      </div>
      <CalendarView occurrences={occurrences} onSelect={onSelect} onCreate={onCreate} />
      {showStrip && timetable && (
        <TodayStrip lessons={timetable.lessons} bells={timetable.bells} onOpen={() => setSheet({ kind: "timetable" })} />
      )}
      {sheet?.kind === "timetable" && (
        <TimetableEditor
          bells={timetable?.bells ?? []}
          isAdmin={currentUser()?.role === "admin"}
          showStrip={showStrip}
          onToggleStrip={toggleStrip}
          onEditBells={() => setSheet({ kind: "bells" })}
          onClose={close}
        />
      )}
      {sheet?.kind === "bells" && (
        <BellEditor bells={timetable?.bells ?? []} onClose={() => setSheet({ kind: "timetable" })} />
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
    </>
  );
}

export default App;
