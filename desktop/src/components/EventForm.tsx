import { useState, type FormEvent } from "react";
import { CATEGORIES, TIMEZONE, toPbDate, toZoned } from "../lib/calendar";
import { createEvent, updateEvent, type EventRecord } from "../lib/events";
import { formatRRule, parseRRule, type Freq } from "../lib/recurrence";

type Props = {
  /** Existing event to edit; omit to create one. */
  event?: EventRecord;
  /** Pre-filled date for a new event ("YYYY-MM-DD"). */
  date?: string;
  onClose: () => void;
};

const REPEAT_OPTIONS: Array<[Freq | "", string]> = [
  ["", "반복 안 함"],
  ["DAILY", "매일"],
  ["WEEKLY", "매주"],
  ["MONTHLY", "매월"],
  ["YEARLY", "매년"],
];

function initialValues(event?: EventRecord, date?: string) {
  if (event) {
    const s = toZoned(event.start);
    const e = toZoned(event.end);
    const repeat = parseRRule(event.rrule);
    return {
      title: event.title,
      allDay: event.all_day,
      startDate: s.toPlainDate().toString(),
      startTime: s.toPlainTime().toString({ smallestUnit: "minute" }),
      endDate: e.toPlainDate().toString(),
      endTime: e.toPlainTime().toString({ smallestUnit: "minute" }),
      location: event.location,
      category: event.category || "기타",
      description: event.description,
      freq: (repeat?.freq ?? "") as Freq | "",
      until: repeat?.until?.toString() ?? "",
    };
  }
  // New event: next full hour, one hour long.
  const now = Temporal.Now.zonedDateTimeISO(TIMEZONE);
  const day = date ?? now.toPlainDate().toString();
  const hour = Math.min(now.hour + 1, 22);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    title: "",
    allDay: false,
    startDate: day,
    startTime: `${pad(hour)}:00`,
    endDate: day,
    endTime: `${pad(hour + 1)}:00`,
    location: "",
    category: "기타",
    description: "",
    freq: "" as Freq | "",
    until: "",
  };
}

export function EventForm({ event, date, onClose }: Props) {
  const [v, setV] = useState(() => initialValues(event, date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((old) => ({ ...old, [k]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const start = toPbDate(v.startDate, v.allDay ? "00:00" : v.startTime);
    const end = toPbDate(v.endDate, v.allDay ? "00:00" : v.endTime);
    if (end < start) return setError("끝나는 시각이 시작보다 빠릅니다.");
    if (v.freq && v.until && v.until < v.startDate) return setError("반복 종료일이 시작일보다 빠릅니다.");

    const input = {
      title: v.title.trim(),
      description: v.description.trim(),
      location: v.location.trim(),
      start,
      end,
      all_day: v.allDay,
      category: v.category as EventRecord["category"],
      rrule: v.freq
        ? formatRRule({ freq: v.freq, interval: 1, until: v.until ? Temporal.PlainDate.from(v.until) : null })
        : "",
    };
    setBusy(true);
    setError("");
    try {
      await (event ? updateEvent(event.id, input) : createEvent(input));
      onClose();
    } catch (err: any) {
      const fields = err?.response?.data ? Object.values(err.response.data).map((f: any) => f?.message) : [];
      setError(
        err?.status === 0
          ? "서버에 연결할 수 없습니다. 연결되면 다시 시도하세요."
          : [err?.response?.message, ...fields].filter(Boolean).join(" ") || "저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label={event ? "일정 수정" : "일정 등록"}>
      <form className="sheet__card form" onSubmit={submit}>
        <header className="sheet__header">
          <h2 className="sheet__title">{event ? "일정 수정" : "새 일정"}</h2>
          <button type="button" className="button button--icon" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <label className="field">
          <span className="field__label">제목</span>
          <input required maxLength={100} autoFocus value={v.title} onChange={(e) => set("title", e.target.value)} />
        </label>

        <label className="field field--inline">
          <input type="checkbox" checked={v.allDay} onChange={(e) => set("allDay", e.target.checked)} />
          <span>종일</span>
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__label">시작</span>
            <input type="date" required value={v.startDate}
              onChange={(e) => setV((o) => ({ ...o, startDate: e.target.value, endDate: o.endDate < e.target.value ? e.target.value : o.endDate }))} />
          </label>
          {!v.allDay && (
            <label className="field">
              <span className="field__label">시각</span>
              <input type="time" required value={v.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </label>
          )}
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">끝</span>
            <input type="date" required min={v.startDate} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
          {!v.allDay && (
            <label className="field">
              <span className="field__label">시각</span>
              <input type="time" required value={v.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </label>
          )}
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">분류</span>
            <select value={v.category} onChange={(e) => set("category", e.target.value)}>
              {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">반복</span>
            <select value={v.freq} onChange={(e) => set("freq", e.target.value as Freq | "")}>
              {REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {v.freq && (
          <label className="field">
            <span className="field__label">반복 종료일 (비우면 계속)</span>
            <input type="date" min={v.startDate} value={v.until} onChange={(e) => set("until", e.target.value)} />
          </label>
        )}
        {event?.rrule && <p className="field__hint">반복 일정은 전체가 함께 수정됩니다.</p>}

        <label className="field">
          <span className="field__label">장소</span>
          <input maxLength={100} value={v.location} onChange={(e) => set("location", e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">메모</span>
          <textarea rows={3} maxLength={2000} value={v.description} onChange={(e) => set("description", e.target.value)} />
        </label>

        {error && <p className="login__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="button button--quiet" onClick={onClose}>취소</button>
          <button type="submit" className="button button--primary" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
        </div>
      </form>
    </div>
  );
}
