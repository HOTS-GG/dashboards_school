# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Rendered in a Tauri 2 WebView2 window on Windows 10/11 desktops, frameless and transparent, pinned to the desktop layer. It should feel at home next to Windows 11 widgets.)

## Users

Teachers at 춘천고등학교 (Chuncheon High School), signed in with their school Google accounts (`@chunchon.gwe.hs.kr`). The widget lives on each teacher's own desk PC in the staff room (교무실), visible only to that teacher, sitting on the desktop all day while they work in other programs. Some teachers also act as admins (교무부 and the like) who tidy up other people's events and set the school's period times.

## Product Purpose

One shared school calendar that every teacher sees on their desktop without opening anything: anyone signs in and adds an event, and it appears on every teacher's widget within a second. Alongside it, each teacher's own lesson timetable shows today's classes and the current period. Success: teachers glance at the desktop instead of asking around or checking a group chat, and the widget never gets in the way of their real work.

## Positioning

Not a calendar app to open, but a calm, always-present glance surface on the desktop, owned by the school: it runs on a school-hosted server, accepts only school accounts, survives Win+D and Explorer restarts, and steps aside during presentations and full-screen programs.

## Operating Context

- Glanced at between other tasks on a busy staff-room PC; read at arm's length, often for a second or two.
- Default size is small (about 380×520 px), sitting over the teacher's own wallpaper, which varies (light or dark, busy or plain).
- Most interaction is reading. Adding/editing an event, editing the timetable, and admin bell-time editing happen in sheets over the widget.
- Must keep working offline from the server (shows the last saved data with a clear offline state).
- Korean language UI, Asia/Seoul time, school terms (학기) and periods (교시).

## Capabilities and Constraints

- Calendar: month agenda / week / day / list views (Schedule-X), categories 학사·회의·행사·출장·기타, repeating events, event detail, create/edit/delete (owner or admin).
- Today's-classes strip from the teacher's manually entered timetable; current and next lesson highlighted.
- Connection status (실시간 연결됨 / 연결 중 / 오프라인).
- Reminders as Windows notifications 10 minutes before timed events.
- Tray menu controls: always on top, lock (click-through), start with Windows, quit.
- Theme must be user-selectable: light, dark, or follow Windows.
- Text size must be user-adjustable.
- All visual values live in `desktop/src/styles/tokens.css` so the look can be swapped without touching components.
- Undecided: display name, school logo/colours (to be decided later; currently "학교 일정", no school marks).

## Brand Commitments

None yet. Name and any school identity are explicitly undecided; do not invent a logo, mascot or school colours.

## Evidence on Hand

Real data only from the school server; no sample customers, testimonials or claims exist and none should be fabricated.

## Product Principles

1. **Glance first.** What's happening today and next should read in a second from arm's length.
2. **Stay out of the way.** The widget sits on the desktop, never demands attention, and goes quiet during presentations.
3. **Trustworthy state.** Always clear whether what you see is live or saved-offline, and who added an event.
4. **Belongs on Windows.** Familiar desktop conventions over novelty; the teacher's wallpaper is part of the scene.

## Accessibility & Inclusion

- User-adjustable text size (some teachers have tired eyes or use magnification).
- Readable contrast over any wallpaper; keyboard focus visible; status never conveyed by colour alone.
