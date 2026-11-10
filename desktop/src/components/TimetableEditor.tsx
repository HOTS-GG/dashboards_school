import { Icon } from "./Icon";
import { useEffect, useState, type FormEvent } from "react";
import {
  copyTerm,
  currentTerm,
  manualSource,
  previousTerm,
  saveLesson,
  type BellTime,
  type Lesson,
} from "../lib/timetable";

const WEEKDAYS = ["월", "화", "수", "목", "금"];
const DEFAULT_PERIODS = 7;

type Props = {
  bells: BellTime[];
  isAdmin: boolean;
  onEditBells: () => void;
  onClose: () => void;
};

function termLabel(term: string) {
  const [y, t] = term.split("-");
  return `${y}학년도 ${t}학기`;
}

export function TimetableEditor({ bells, isAdmin, onEditBells, onClose }: Props) {
  const thisTerm = currentTerm();
  const [term, setTerm] = useState(thisTerm);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [cell, setCell] = useState<{ weekday: number; period: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setLessons(await manualSource.load(term));
      setError("");
    } catch (err: any) {
      setError(err?.status === 0 ? "서버에 연결할 수 없습니다." : "시간표를 불러오지 못했습니다.");
    }
  };
  useEffect(() => {
    setLessons(null);
    setCell(null);
    void reload();
  }, [term]);

  const periods = Math.max(DEFAULT_PERIODS, ...bells.map((b) => b.period), ...(lessons ?? []).map((l) => l.period));
  const at = (weekday: number, period: number) => lessons?.find((l) => l.weekday === weekday && l.period === period);

  async function copyPrevious() {
    setBusy(true);
    try {
      const n = await copyTerm(previousTerm(term), term);
      if (n === 0) setError(`${termLabel(previousTerm(term))} 시간표가 비어 있습니다.`);
      await reload();
    } catch {
      setError("복사하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label="내 시간표">
      <div className="sheet__card">
        <header className="sheet__header">
          <h2 className="sheet__title">내 시간표</h2>
          <button className="button button--icon" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </header>

        <div className="field-row">
          <label className="field">
            <span className="field__label">학기</span>
            <select value={term} onChange={(e) => setTerm(e.target.value)}>
              {[previousTerm(thisTerm), thisTerm].map((t) => (
                <option key={t} value={t}>{termLabel(t)}{t === thisTerm ? " (현재)" : ""}</option>
              ))}
            </select>
          </label>
        </div>

        {lessons === null && !error && <p className="field__hint">불러오는 중…</p>}
        {lessons && (
          <table className="tt">
            <thead>
              <tr>
                <th />
                {WEEKDAYS.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periods }, (_, i) => i + 1).map((p) => (
                <tr key={p}>
                  <th>{p}</th>
                  {WEEKDAYS.map((_, i) => {
                    const l = at(i + 1, p);
                    const selected = cell?.weekday === i + 1 && cell.period === p;
                    return (
                      <td key={i}>
                        <button
                          className={`tt__cell${l ? " tt__cell--filled" : ""}${selected ? " tt__cell--selected" : ""}`}
                          onClick={() => setCell({ weekday: i + 1, period: p })}
                          aria-label={`${WEEKDAYS[i]}요일 ${p}교시 ${l ? `${l.subject} ${l.classLabel}` : "비어 있음"}`}
                        >
                          <span>{l?.subject}</span>
                          <small>{l?.classLabel}</small>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {cell && lessons && (
          <CellForm
            key={`${term}-${cell.weekday}-${cell.period}`}
            title={`${WEEKDAYS[cell.weekday - 1]}요일 ${cell.period}교시`}
            lesson={at(cell.weekday, cell.period)}
            onSave={async (data) => {
              await saveLesson(term, { ...cell, ...data });
              await reload();
              setCell(null);
            }}
            onCancel={() => setCell(null)}
          />
        )}

        {lessons?.length === 0 && (
          <button className="button button--quiet" disabled={busy} onClick={copyPrevious}>
            {termLabel(previousTerm(term))} 시간표 복사해 오기
          </button>
        )}
        {error && <p className="login__error" role="alert">{error}</p>}

        {bells.length === 0 && (
          <p className="field__hint">
            교시 시각이 아직 없어 현재 교시를 표시할 수 없습니다.{isAdmin ? "" : " 관리자에게 요청하세요."}
          </p>
        )}
        {isAdmin && (
          <button className="button button--quiet" onClick={onEditBells}>교시 시각 편집 (관리자)</button>
        )}
      </div>
    </div>
  );
}

type CellData = Pick<Lesson, "subject" | "classLabel" | "room">;

function CellForm({ title, lesson, onSave, onCancel }: {
  title: string;
  lesson?: Lesson;
  onSave: (data: CellData) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<CellData>({
    subject: lesson?.subject ?? "",
    classLabel: lesson?.classLabel ?? "",
    room: lesson?.room ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent, clear = false) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(clear ? { subject: "", classLabel: "", room: "" } : v);
    } catch (err: any) {
      setError(err?.status === 0 ? "서버에 연결할 수 없습니다." : err?.response?.message || "저장하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <form className="form tt__form" onSubmit={submit}>
      <strong>{title}</strong>
      <div className="field-row">
        <label className="field">
          <span className="field__label">과목</span>
          <input autoFocus maxLength={50} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">반</span>
          <input maxLength={20} placeholder="2-3" value={v.classLabel} onChange={(e) => setV({ ...v, classLabel: e.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">교실</span>
          <input maxLength={50} value={v.room} onChange={(e) => setV({ ...v, room: e.target.value })} />
        </label>
      </div>
      {error && <p className="login__error" role="alert">{error}</p>}
      <div className="form__actions">
        {lesson && <button type="button" className="button button--danger" disabled={busy} onClick={(e) => submit(e, true)}>비우기</button>}
        <button type="button" className="button button--quiet" onClick={onCancel}>취소</button>
        <button type="submit" className="button button--primary" disabled={busy}>저장</button>
      </div>
    </form>
  );
}
