import { Icon } from "./Icon";
import { Badge } from "./NextBoard";
import { useState } from "react";
import { formatRange } from "../lib/calendar";
import { canEdit, deleteEvent, skipOccurrence } from "../lib/events";
import { describeRepeat, type Occurrence } from "../lib/recurrence";

type Props = {
  occurrence: Occurrence;
  onEdit: () => void;
  onClose: () => void;
};

type Pending = "one" | "all" | null;

export function EventDetail({ occurrence, onEdit, onClose }: Props) {
  const { event } = occurrence;
  const repeat = describeRepeat(event.rrule);
  const editable = canEdit(event);
  // Deleting asks for a second click on the same button.
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(which: "one" | "all") {
    if (confirming !== which) return setConfirming(which);
    setBusy(true);
    setError("");
    try {
      await (which === "one" ? skipOccurrence(event, occurrence.date) : deleteEvent(event.id));
      onClose();
    } catch (err: any) {
      setError(err?.status === 0 ? "서버에 연결할 수 없습니다." : err?.response?.message || "삭제하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label={event.title} onClick={onClose}>
      <article className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__header">
          <h2 className="sheet__title">{event.title}</h2>
          <button className="button button--icon" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </header>
        <p className="sheet__meta">{formatRange(occurrence)}</p>
        {repeat && <p className="sheet__meta">반복 · {repeat}</p>}
        {event.location && <p className="sheet__meta">장소 · {event.location}</p>}
        <p className="sheet__meta"><Badge category={event.category} /> {event.category || "기타"}</p>
        {event.expand?.owner?.name && <p className="sheet__meta">등록 · {event.expand.owner.name}</p>}
        {event.description && <p className="sheet__body">{event.description}</p>}

        {editable && (
          <div className="form__actions">
            {event.rrule ? (
              <>
                <button className="button button--danger" disabled={busy} onClick={() => remove("one")}>
                  {confirming === "one" ? "이 날 삭제 확인" : "이 날만 삭제"}
                </button>
                <button className="button button--danger" disabled={busy} onClick={() => remove("all")}>
                  {confirming === "all" ? "전체 삭제 확인" : "반복 전체 삭제"}
                </button>
              </>
            ) : (
              <button className="button button--danger" disabled={busy} onClick={() => remove("all")}>
                {confirming === "all" ? "삭제 확인" : "삭제"}
              </button>
            )}
            <button className="button button--primary" disabled={busy} onClick={onEdit}>수정</button>
          </div>
        )}
        {error && <p className="login__error" role="alert">{error}</p>}
      </article>
    </div>
  );
}
