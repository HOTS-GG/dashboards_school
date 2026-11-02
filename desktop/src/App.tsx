import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { CalendarView } from "./components/CalendarView";
import { EventDetail } from "./components/EventDetail";
import { Login } from "./components/Login";
import { clearCache, syncEvents, type EventRecord, type SyncStatus } from "./lib/events";
import { currentUser, initClient, logout, pb, refreshSession } from "./lib/pb";

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
      <Header onLogout={phase === "main" ? () => { logout(); clearCache(); setPhase("login"); } : undefined} />
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

function Schedule() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => syncEvents(setEvents, setStatus), []);
  const selected = useMemo(() => events.find((e) => e.id === selectedId) ?? null, [events, selectedId]);

  return (
    <>
      <p className={`status status--${status}`} role="status">
        <span className="status__dot" aria-hidden /> {STATUS_LABEL[status]}
      </p>
      <CalendarView events={events} onSelect={setSelectedId} />
      {selected && <EventDetail event={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

export default App;
