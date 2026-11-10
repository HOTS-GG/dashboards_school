import { useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loginWithGoogle, pb } from "../lib/pb";

export function Login({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setBusy(true);
    setError("");
    try {
      await loginWithGoogle();
      onDone();
    } catch (err: any) {
      setError(
        err?.status === 0
          ? "서버에 연결할 수 없습니다. 아래 서버 주소를 확인하세요."
          : err?.response?.message || err?.message || String(err) || "로그인하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login">
      <p className="login__lead">학교 일정을 보려면 로그인하세요.</p>
      <button className="button button--primary" onClick={login} disabled={busy}>
        {busy ? "브라우저에서 로그인하는 중…" : "학교 Google 계정으로 로그인"}
      </button>
      <p className="login__hint">@chunchon.gwe.hs.kr 계정만 사용할 수 있습니다.</p>
      {error && <p className="login__error" role="alert">{error}</p>}
      <ServerAddress />
    </section>
  );
}

/** Lets the school point the widget at its server (saved per PC). */
function ServerAddress() {
  const [url, setUrl] = useState(() => pb().baseURL);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await invoke("set_server_url", { url });
      location.reload();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <details className="login__server">
      <summary>서버 주소</summary>
      <form className="form" onSubmit={save}>
        <label className="field">
          <span className="field__label">학교 일정 서버 (예: http://192.168.0.10:8090)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8090" />
        </label>
        {error && <p className="login__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="submit" className="button button--quiet">저장 후 다시 연결</button>
        </div>
      </form>
    </details>
  );
}
