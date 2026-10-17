---
version: 1
name: hboardgame-preserved-brand
description: Existing rendered Vietnamese board-game interface preserved for compatibility work.
colors:
  canvas: '#f4f0e6'
  ink: '#25291f'
  primary: '#344a39'
  primary-active: '#263c2b'
  liberal: '#246975'
  fascist: '#a44832'
  surface: '#faf8f1'
  muted: '#6c705d'
  hairline: '#bdbdab'
typography:
  display: { fontFamily: 'Noto Serif Variable', lineHeight: 1.3 }
  body: { fontFamily: 'Noto Sans Variable', lineHeight: 1.55 }
---

# HBoardGame visual contract

Source: rendered https://shboardgame.vercel.app captured 2026-10-16.
Computed styles, loaded fonts and wordmark pixel samples are recorded in
`../specs/003-align-frontend-backend/ux/brand-signals.json`.
The mark is text, not an image logo; dominant wordmark pixels are #25291f.

## Precedence

The user requires preserving the current interface. `ux recommend` and
`ux design-md` were run with captured brand input; generic alternate font/palette
suggestions must not replace the actual brand. The raw generated document is
retained in `ux/DESIGN.generated.md`. This normalized contract and
`effective_tokens` in recommendation.json preserve the rendered source.
Do not adopt Cormorant/Inter or a new white canvas.

## Components and layout

Preserve `frontend/src/app/globals.css`, existing spacing, 6px button corners,
5px inputs, desktop columns and native confirmation dialog. Keep existing
colors and Noto Vietnamese subsets. No new gradients, hero cards, themes, UI
framework. The role card may flip on user activation; disable this transition
for prefers-reduced-motion. Reuse Button, Field, ConfirmDialog and StatusNotice.

Confirmation dialogs must stay centered in the viewport, including after page
scroll. Bound their height to the viewport and allow internal scrolling. Any
future button-associated popover must appear beside its trigger and stay within
the viewport, per the user's popup placement requirement.
The chancellor picker uses a native top-layer popover next to its trigger,
with a bounded scrolling list, public names, eligibility reasons and a selected
mark. Preserve keyboard arrows, Home/End, Enter/Space, Escape and outside-click
dismissal. Selecting a candidate still requires the separate nomination confirmation.

## Game results layout

Keep the existing paper palette and Noto fonts. Use an unboxed result heading
with the winning faction as its color accent, followed by a two-column layout:
public role roster on the left, rematch actions on the right. Use compact rows,
hairline separators and text role badges, not illustrated cards or a new hero.
On narrower windows, stack the columns. Place the policy board and public log
inside a native disclosure below the result. Never fabricate absent roles or
statistics. Artwork is optional and must not carry button labels or private data.

## Behavior

Use the uploaded paper texture, office and faction icons, vote icons and role
illustrations from `frontend/public/images/`. Distinguish public offices with
named badges and icons. A green border and explicit text mark players whose
input the phase is waiting for; voting marks only living players without a vote.
Private role artwork is mounted only while its owner opens the private panel.
Hitler may see server-supplied teammates at 5–6-player tables. At 7–10-player
tables, strip ally IDs from Hitler's decoded view and omit the teammate row.
Count eliminated players as members of the table, not just living players.
Use the same 5:7 frame and object-fit: contain for its face and back. Keep the
toggle and privacy note beside this frame so revealing a role never resizes or
moves the card. All role illustrations use the same frame, without cropping.
Both the card button and the text button toggle the same reveal state. Use a
short 3D flip with hidden backfaces. Remove the private face and text immediately
when closing, even while the flip is running; no timers retain private data.
Public role portraits are allowed in the game-over roster when supplied by BE.
Show private investigation results below the investigated player's name, with
an explicit "Chỉ bạn thấy" label. Retain only results received by this recipient
in session memory; clear them on room/session reset, identity mismatch, lobby
and game over. Never persist them, announce them in live regions, infer them
from public investigation flags, or display them on another player's screen.
Keep illustrations supplementary to HTML text, with no animated turn markers.
Use item-cluster-2 and the wax seal enlarged and tilted in the bottom-left
viewport corner on desktop, with reserved space below the home introduction.
Hide this corner decoration on narrow or short windows. Place enlarged, tilted
item-cluster-1 in the lower-left viewport corner behind the opaque lobby panel,
so the panel partially conceals the stationery. Hide it on narrow or short windows.
Use item-cluster-3 beside the result heading and a small card stack
beside deck counts. Decorations occupy their own layout space, ignore pointer
events and use empty alt text. Shrink or hide them on narrow windows; never
place them over controls or use them to indicate private game state.

Readable Vietnamese notices, keyboard focus, escape/cancel, explicit confirmations.
Interface text and images are not selectable; images cannot be dragged. Room
codes remain selectable for copying. Text inputs, textareas and editable fields
retain native selection so players can edit their names and room codes.
Missing backend data receives a factual note, never fabricated game results.
Never expose private roles/cards in public live regions or diagnostic artifacts.

## Desktop viewport layout

At desktop widths (1100px+) and usable heights (600px+), the entry and room
layouts use the available viewport height. Keep the room header and current
phase visible. Give remaining space to the player list, policy board and action
column with min-height: 0 and explicit internal scrolling for long content.
Keep lobby start controls outside its scrolling member list. Results scroll
their roster and expanded history internally. Reduce decoration/spacing before
reducing text legibility. Do not hide body overflow to mask clipped controls.
Narrow windows and browser zoom retain the normal accessible document flow.

## Implementation quality

Descriptive names, multiline JSX, clear responsibilities, named timing constants,
comments explaining race/recovery decisions. Only FE changes. No commit/push/deploy.

## React migration — 2026-10-17

Frontend now uses React + TypeScript with Vite and React Router. No Next.js runtime/server components. Preserve the same visual tokens and globals.css. Backend is pulled unchanged from origin/develop at 3e50528; new results may be displayed only when supplied for the correct recipient/phase. Branch: align-frontend-backend.
