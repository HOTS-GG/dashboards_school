---
version: 1
slug: "desktop-src-app-tsx"
primary_target: "desktop/src/App.tsx"
related_targets: ["desktop/src/App.css","desktop/src/styles/tokens.css"]
---

# Widget (desktop) surface brief

Scope: the whole desktop widget (`desktop/src`), all sheets included. Mode: **Operate**. Code-led.

Audience & job: a teacher at their staff-room PC glancing at the desktop between tasks — what's on now, what's next, and how long until it; occasionally adds/edits an event or their timetable. Constraints: ~380×520 frameless translucent window over any wallpaper; Korean UI; offline state must be obvious; user-selectable light/dark/system theme and text size; WCAG AA contrast, 11px minimum functional text.

Memorable moment: the departure board at the top — minutes-until-next in one large amber-free numeral, rows lining up like trains.

Unresolved: product name and school identity (later).

## Direction contract

THESIS: Today runs like a platform board — 지금/다음 events queue by time with a countdown, categories read as line colours. Refuses the category default of a plain list of cards under a big date.

OWN-WORLD: Mica-like translucent neutral ground (light/dark), one inverted dark "board" panel, tabular time column, round line badges in five category colours (학사 blue, 회의 purple, 행사 green, 출장 orange, 기타 grey), a single reserved "now" amber used only for in-progress events and the current period. System UI type (Segoe UI Variable / Malgun Gothic); scale contrast does the hierarchy.

STORY: The teacher sees how many minutes until the next thing, what it is and where, what is happening now, what already passed (dimmed, not gone), then the month with dots, and today's lessons at the bottom; adds an event with one button.

FIRST VIEWPORT: header (date left; live/offline status right; drag region). Board panel: "다음" label, countdown numeral (~34px) + title/time/place, then up to 4 rows: time | line badge | title | relative state. Collapsed category legend strip. Segmented view tabs + ＋ 일정 + 시간표. Calendar (month agenda with category dots, today inverted). Bottom: today's-lessons strip, current lesson chip in amber.

FORM: Platform departure board, candidate 7 of 7 on the grounded list (assigned). seed:28c0a8080dd45196. Raises: reserved now-colour (orienteering), scale-only hierarchy for the countdown (type specimen), past events stay as 지남 (ticket wallet), legend folded to a colour strip that decodes on hover (Saville).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
