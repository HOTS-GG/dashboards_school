import "./App.css";

// M0 placeholder: frameless widget shell. Calendar and timetable arrive in M3/M5.
function App() {
  const today = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <main className="widget">
      <header className="widget__header" data-tauri-drag-region>
        {today}
      </header>
      <section className="widget__body">일정이 여기에 표시됩니다</section>
    </main>
  );
}

export default App;
