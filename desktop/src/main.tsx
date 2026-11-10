import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startHealth } from "./lib/health";

const RECOVER_AFTER_MS = 30_000;

/** A rendering error shouldn't leave a blank widget: say so, then start over. */
class Recover extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("widget crashed, reloading soon", error);
    setTimeout(() => location.reload(), RECOVER_AFTER_MS);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="widget">
        <section className="widget__empty" role="alert">
          문제가 생겨 잠시 후 다시 시작합니다.
          <button className="button button--quiet" onClick={() => location.reload()}>지금 다시 시작</button>
        </section>
      </main>
    );
  }
}

startHealth();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Recover>
      <App />
    </Recover>
  </React.StrictMode>,
);
