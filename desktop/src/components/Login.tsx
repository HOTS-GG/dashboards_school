import { useState } from "react";
import { loginWithGoogle } from "../lib/pb";

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
      setError(err?.response?.message || err?.message || String(err) || "로그인하지 못했습니다.");
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
    </section>
  );
}
