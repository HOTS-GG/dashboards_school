import { formatRange } from "../lib/calendar";
import type { EventRecord } from "../lib/events";

export function EventDetail({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  return (
    <div className="sheet" role="dialog" aria-label={event.title} onClick={onClose}>
      <article className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__header">
          <h2 className="sheet__title">{event.title}</h2>
          <button className="button button--icon" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <p className="sheet__meta">{formatRange(event)}</p>
        {event.location && <p className="sheet__meta">장소 · {event.location}</p>}
        {event.category && <p className="sheet__meta">분류 · {event.category}</p>}
        {event.expand?.owner?.name && <p className="sheet__meta">등록 · {event.expand.owner.name}</p>}
        {event.description && <p className="sheet__body">{event.description}</p>}
      </article>
    </div>
  );
}
