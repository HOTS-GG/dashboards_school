---
name: 학교 일정 (School Schedule Widget)
description: A desktop departure board for a school's shared schedule — now, next, and how long until it.
colors:
  line-academic: "#0052a4"
  line-meeting: "#7d4f93"
  line-event: "#00843d"
  line-trip: "#c25a00"
  line-other: "#5f6773"
  now-amber: "#ffb81c"
  on-now: "#15181d"
  board: "#15181d"
  board-ink: "#f2f4f6"
  board-muted: "#a9b1bb"
  board-rule: "#2a2f37"
  accent-light: "#0052a4"
  accent-dark: "#6cb4ff"
  ground-light: "#f6f7f9"
  surface-light: "#ffffff"
  surface-sunk-light: "#eceef1"
  ink-light: "#15181d"
  ink-muted-light: "#4e5661"
  rule-light: "#dcdfe4"
  ground-dark: "#1c1f24"
  surface-dark: "#262a31"
  surface-sunk-dark: "#15181c"
  ink-dark: "#eef1f4"
  ink-muted-dark: "#b3bbc5"
  rule-dark: "#353a43"
  ok: "#128043"
  warn: "#b45309"
  danger: "#c42b1c"
typography:
  countdown:
    fontFamily: "Segoe UI Variable Display, Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "2.571rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Segoe UI Variable Display, Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.429rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1.143rem"
    fontWeight: 600
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Malgun Gothic, system-ui, sans-serif"
    fontSize: "0.857rem"
    fontWeight: 600
rounded:
  window: "14px"
  panel: "10px"
  control: "7px"
  badge: "50%"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-quiet:
    textColor: "{colors.ink-muted-light}"
    rounded: "{rounded.control}"
    padding: "6px 8px"
  line-badge:
    textColor: "{colors.surface-light}"
    rounded: "{rounded.badge}"
    size: "20px"
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.panel}"
    padding: "12px 12px 4px"
  lesson-now-chip:
    backgroundColor: "{colors.now-amber}"
    textColor: "{colors.on-now}"
    rounded: "5px"
    padding: "1px 6px"
  input:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.control}"
    padding: "6px 8px"
    height: "34px"
---

# Design System: 학교 일정 (School Schedule Widget)

Source of truth for values: `desktop/src/styles/tokens.css` (theme via `<html data-theme>`, text size via `--text-scale`, both set by `desktop/src/lib/prefs.ts`). Category colours are mirrored in `desktop/src/lib/calendar.ts` (`CATEGORIES`).

## Overview

**Creative North Star: "The Platform Board"**

The widget is a subway platform's departure board brought to a teacher's desktop. One inverted dark panel sits at the top of a quiet translucent window and answers the only question a glance has time for: what's next, and how long until it. The countdown is the one large thing on screen; everything else is small, aligned and tabular, like rows of trains in time order. Categories are read as line colours on round lettered badges, the way riders read line numbers.

Density is calm rather than sparse: every row carries a time, a badge, a title and a relative state, and the calendar below is a working month view. The window belongs on Windows 11 — system type, neutral translucent ground, standard controls — and the world enters only through the board, the line colours, the reserved amber and the tabular rhythm.

**Key Characteristics:**
- One inverted board panel (dark in both themes); the rest of the window is neutral and translucent.
- Hierarchy by scale contrast: a 36px countdown against 12–16px everything else.
- Five category line colours, each on a lettered badge so colour is never the only cue.
- A single reserved amber for "happening now".
- Tabular numerals wherever time is shown.
- Light, dark or automatic theme, and four text sizes, chosen per PC.

## Colors

Neutral grounds in both themes, five saturated line colours for categories, one amber reserved for the present, and an accent blue for actions.

### Primary
- **Line 1 Blue** (academic, 학사): the 학사 line; also the light theme's action colour (primary buttons, focus rings, selection).
- **Line Violet** (meeting, 회의), **Line Green** (event, 행사), **Line Orange** (trip, 출장), **Line Slate** (other, 기타): category line colours. Each carries white badge letters at ≥4.5:1. On the dark theme, calendar marks use lifted versions of the same hues (`dark` in `CATEGORIES`).

### Secondary
- **Platform Amber** (now): in-progress board rows and the current lesson chip. It sits on the dark board or under dark text (`on-now`), never as text on the light ground.

### Neutral
- **Board Black** with **Board Ink** / **Board Muted** text and **Board Rule** dividers: the departure board panel, identical in both themes.
- **Cool Mist** ground (light) / **Night Platform** ground (dark): the translucent window field (92% / 90% opacity over the wallpaper).
- **Surface** / **Surface Sunk**: inputs, filled timetable cells, segmented tracks, hover fills.
- **Ink** / **Ink Muted** / **Rule**: text, secondary text (≥4.5:1 on the ground), dividers and field borders.
- **Status**: OK green dot for live, Warn amber-brown text and dot for offline, Danger red for destructive actions and errors.

### Named Rules
**The Reserved Amber Rule.** Platform Amber means "happening now" and nothing else: the in-progress board row and the current lesson. It never decorates, highlights, warns or marks selection.

**The Line Letter Rule.** A category is always shown as its line colour *with* its letter (학 회 행 출 기). Colour alone never identifies a category.

**The Quiet Past Rule.** Events that have ended stay on the board, marked 지남, in the board's muted ink with a dimmed badge. The day keeps its shape; nothing silently disappears.

## Typography

**Display Font:** Segoe UI Variable Display (with Segoe UI, Malgun Gothic, system-ui)
**Body Font:** Segoe UI Variable Text (with Segoe UI, Malgun Gothic, Apple SD Gothic Neo, system-ui)

**Character:** The Windows system faces, so the widget sits naturally next to the OS. The voice comes from scale contrast and tabular figures, not from an expressive face.

### Hierarchy
- **Countdown** (600, 2.571rem ≈ 36px, line-height 1, -0.02em, tabular): minutes until the next event; its unit (분/시간) set at body size in Board Muted.
- **Headline** (600, 1.429rem ≈ 20px): sheet titles (일정 수정, 내 시간표, 설정).
- **Title** (600, 1.143rem ≈ 16px): the next event's title on the board, the header date.
- **Body** (400, 1rem = 14px, line-height 1.5): board rows (0.929rem), form inputs, memo text.
- **Label** (600, 0.857rem ≈ 12px): field labels, board meta, relative states, status. This is the floor: no functional text below 11px at the smallest text size.

All sizes are rem and follow the text-size setting (`--text-scale` 0.93 / 1 / 1.15 / 1.3 on a 14px root).

### Named Rules
**The One Big Number Rule.** Only the countdown is set large. Nothing else on the main window exceeds title size.

**The Timetable Figures Rule.** Every time, date and period number uses tabular numerals, so columns of times align like a printed timetable.

## Layout

A single column inside the widget window (default 380×520, user-resizable). From top to bottom: header row (date; status and settings; it is the drag handle) → the board (inset 12px) → a toolbar row (folded legend strip, 시간표, ＋ 일정) → a calendar nav row (‹ range ›, 오늘, 월/주/일/목록) → the calendar, which takes the remaining height and scrolls → today's-lessons strip pinned to the bottom. Sheets (event detail, forms, timetable, settings) rise from the bottom over a scrim and fill up to 88% of the height.

Spacing uses a 4px base (4 / 8 / 12 / 16 / 20). Horizontal rhythm is 16px at the window edge and 12px for inset panels. When the window is wide enough, Schedule-X may switch from the month agenda to the week grid, and the view tabs follow it.

## Elevation & Depth

Mostly flat with tonal layering: the translucent ground, the darker board panel, and solid sheets. Shadows mark only things that float.

### Shadow Vocabulary
- **Board lift** (`box-shadow: 0 2px 8px rgb(0 0 0 / 0.18)`): separates the board from the ground.
- **Sheet** (`box-shadow: 0 8px 24px rgb(21 24 29 / 0.14), 0 1px 3px rgb(21 24 29 / 0.08)`; darker on the dark theme): rising sheets.
- **Selected segment** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.12)`): the active option in segmented controls.

### Named Rules
**The One Inverted Panel Rule.** The board is the only dark-on-light (or darker-on-dark) panel. Other content sits directly on the ground or in sheets; no nested cards.

## Shapes

Soft but not rounded-toy: a 14px window corner, 10px for the board, 7px for controls and inputs, 5–6px for chips and timetable cells, and fully round line badges and status dots. Borders are 1px rules; empty timetable cells use a dashed rule, filled cells a solid one.

## Components

### Departure Board (signature)
- **Lead:** the countdown (number large, unit small) beside the next event's title and "time · place". When nothing remains today, the lead names the next day's first event instead; with nothing scheduled it says 예정된 일정 없음.
- **종일 line:** all-day events today, each with its badge.
- **Rows:** up to four: time (tabular, muted) | line badge | title (truncates) | relative state (지남 / 진행 중 / N분 후). In-progress rows turn Platform Amber with one short amber sweep as they arrive (0.9s, ease-out; none under reduced motion). Every row opens the event's detail.

### Line Badge
- **Shape:** 20px circle, the category's line colour, white 11px bold letter.
- **Use:** board rows, all-day items, event detail.

### Legend Strip
- **Folded:** a 4px strip of the five line colours (120px wide).
- **Decoded:** on hover or keyboard focus it opens to full width at 20px tall, naming each category in white.

### Buttons
- **Shape:** 7px radius.
- **Primary:** Accent background, contrasting text, 600 weight (＋ 일정, 저장, 수정). Hover mixes 14% ink into the accent.
- **Quiet / Icon:** transparent, Ink Muted; hover fills Surface Sunk and turns Ink. Icon buttons are 32×32.
- **Danger:** transparent with Danger text (삭제); destructive actions need a second click to confirm.
- **Disabled:** 45% opacity, `not-allowed` cursor (e.g. editing while offline).

### Inputs / Fields
- **Style:** Surface background, 1px Rule Strong border, 7px radius, 34px minimum height, body size.
- **Focus:** border and a 1px outline in Accent.
- **Labels:** Label style above the field; hints in Ink Muted.

### Segmented Control
- A Surface Sunk track with 2px gaps; the selected option is a Surface pill with a light shadow (theme, text size, calendar views).

### Today's Lessons Strip
- A summary (지금 N교시 / 다음 N교시 / 오늘 수업 끝 / 주말) followed by chips "period subject class". The current lesson chip is Platform Amber; the next one is outlined and bold.

### Icons
- One drawn set on a 16px grid, 1.5px stroke, round caps (plus, close, settings, timetable, sign-out, chevrons). No Unicode glyphs or emoji as icons.

## Do's and Don'ts

### Do:
- **Do** keep the countdown as the only large type on the main window (2.571rem).
- **Do** pair every category colour with its letter badge.
- **Do** use tabular numerals for every time, date and period.
- **Do** keep ended events visible as 지남, in muted board ink.
- **Do** keep functional text at 0.857rem or larger so it stays ≥11px at the smallest text size.
- **Do** theme browser defaults from tokens: selection, caret, focus ring, scrollbars.

### Don't:
- **Don't** use Platform Amber for anything except what is happening now.
- **Don't** add a second inverted panel or nest cards inside the board.
- **Don't** use Unicode glyphs or emoji as icons; add paths to the shared icon set.
- **Don't** put coloured side stripes on rows, cards or callouts.
- **Don't** add kickers or eyebrow labels above headings.
