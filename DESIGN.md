---
version: 1
name: hboardgame-preserved-brand
description: Existing rendered Vietnamese board-game interface preserved for compatibility work.
colors:
  canvas: "#f4f0e6"
  ink: "#25291f"
  primary: "#344a39"
  primary-active: "#263c2b"
  liberal: "#246975"
  fascist: "#a44832"
  surface: "#faf8f1"
  muted: "#6c705d"
  hairline: "#bdbdab"
typography:
  display: { fontFamily: "Noto Serif Variable", lineHeight: 1.3 }
  body: { fontFamily: "Noto Sans Variable", lineHeight: 1.55 }
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
framework or motion. Reuse Button, Field, ConfirmDialog and StatusNotice.

## Behavior

Readable Vietnamese notices, keyboard focus, escape/cancel, explicit confirmations.
Missing backend data receives a factual note, never fabricated game results.
Never expose private roles/cards in public live regions or diagnostic artifacts.

## Implementation quality

Descriptive names, multiline JSX, clear responsibilities, named timing constants,
comments explaining race/recovery decisions. Only FE changes. No commit/push/deploy.

## React migration — 2026-10-17

Frontend now uses React + TypeScript with Vite and React Router. No Next.js runtime/server components. Preserve the same visual tokens and globals.css. Backend is pulled unchanged from origin/develop at 3e50528; new results may be displayed only when supplied for the correct recipient/phase. Branch: align-frontend-backend.
