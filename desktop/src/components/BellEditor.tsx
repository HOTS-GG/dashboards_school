import { useState, type FormEvent } from "react";
import { saveBellTimes, type BellTime } from "../lib/timetable";

// Typical high-school day, offered when nothing is set yet.
const SUGGESTED: BellTime[] = [
  { period: 1, start: "08:40", end: "09:30" },
  { period: 2, start: "09:40", end: "10:30" },
  { period: 3, start: "10:40", end: "11:30" },
  { period: 4, start: "11:40", end: "12:30" },
  { period: 5, start: "13:30", end: "14:20" },
  { period: 6, start: "14:30", end: "15:20" },
  { period: 7, start: "15:30", end: "16:20" },
];
const MAX_PERIODS = 9;

export function BellEditor({ bells, onClose }: { bells: BellTime[]; onClose: () => void }) {
  const [rows, setRows] = useState<BellTime[]>(() => (bells.length ? bells.map((b) => ({ ...b })) : SUGGESTED));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, key: "start" | "end", value: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.end <= r.start) return setError(`${r.period}교시: 끝나는 시각이 시작보다 늦어야 합니다.`);
      if (i > 0 && r.start < rows[i - 1].end) return setError(`${r.period}교시가 앞 교시와 겹칩니다.`);
    }
    setBusy(true);
    setError("");
    try {
      await saveBellTimes(rows);
      onClose();
    } catch (err: any) {
      setError(err?.status === 0 ? "서버에 연결할 수 없습니다." : err?.response?.message || "저장하지 못했습니다. 관리자만 바꿀 수 있습니다.");
      setBusy(false);
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label="교시 시각">
      <form className="sheet__card form" onSubmit={submit}>
        <header className="sheet__header">
          <h2 className="sheet__title">교시 시각 (학교 공통)</h2>
          <button type="button" className="button button--icon" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        {bells.length === 0 && <p className="field__hint">일반적인 시각을 미리 채워 두었습니다. 학교에 맞게 고쳐서 저장하세요.</p>}
        {rows.map((r, i) => (
          <div className="field-row" key={r.period}>
            <span className="bell__period">{r.period}교시</span>
            <label className="field">
              <span className="field__label">시작</span>
              <input type="time" required value={r.start} onChange={(e) => update(i, "start", e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">끝</span>
              <input type="time" required value={r.end} onChange={(e) => update(i, "end", e.target.value)} />
            </label>
          </div>
        ))}
        <div className="form__actions">
          <button type="button" className="button button--quiet" disabled={rows.length <= 1}
            onClick={() => setRows((r) => r.slice(0, -1))}>마지막 교시 빼기</button>
          <button type="button" className="button button--quiet" disabled={rows.length >= MAX_PERIODS}
            onClick={() => setRows((r) => {
              const last = r[r.length - 1]?.end ?? "08:40";
              return [...r, { period: r.length + 1, start: last, end: last }];
            })}>
            교시 추가
          </button>
        </div>
        {error && <p className="login__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="button button--quiet" onClick={onClose}>취소</button>
          <button type="submit" className="button button--primary" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
        </div>
      </form>
    </div>
  );
}
