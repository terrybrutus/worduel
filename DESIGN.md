# Design Brief

> Brutalist arcade-duel word game. Sharp corners, electric lime accent, monospace display, single-loop focus.

## Tone & Differentiation
Anti-generic brutalist arcade — chunky tiles, hard 2px corners, lime-vs-coral tension. No soft gradients, no rounded softness.

## Color Palette (OKLCH)
| Token | Value | Usage |
|---|---|---|
| background | 0.18 0.005 240 | Dark charcoal canvas |
| card | 0.22 0.006 240 | Tile + panel surface |
| foreground | 0.96 0.005 120 | Primary text |
| muted-foreground | 0.62 0.01 120 | HUD labels, hints |
| primary | 0.86 0.23 130 | Electric lime — active tile, CTA, accent |
| destructive | 0.68 0.21 28 | Coral — wrong answer, timer danger, skip |
| border | 0.32 0.006 240 | 2px hairline on tiles + HUD rule |
| ring | 0.86 0.23 130 | Focus ring matches primary |

## Typography
- Display: JetBrains Mono (700/800) — title, tiles, HUD numbers, score
- Body: General Sans (400/600) — how-to-play line, button labels, hints
- Mono numerals for timer + score; uppercase tracking-wide for HUD labels

## Shape Language
- Radius 0.125rem (2px) everywhere — tiles, buttons, panels, inputs
- 2px solid borders, no soft shadows except the active tile lift
- Square corners = arcade machine feel

## Elevation & Depth
- One shadow only: `shadow-tile-lift` (hard 6px offset + soft drop) on active/selected tile
- Inactive tiles: flat, border-only
- HUD: separated by 2px top rule, no card elevation

## Structural Zones
| Zone | Content |
|---|---|
| Header | Worduel wordmark (mono), Best score badge, HUD row (round / streak / score / timer) |
| Stage | Centered answer row (slots) above scrambled letter pool |
| Controls | Submit (primary lime) + Skip (coral outline) below stage |
| Start/End | Title, one-line how-to, Start button / final score + Play again |

## Spacing & Rhythm
- 8px base grid; tiles 64px min with 12px gaps
- HUD uses 16px horizontal padding, 12px vertical
- Stage vertical centering with generous breathing room

## Component Patterns
- Letter tile: square card, 2px border, mono uppercase glyph, hover lifts 1px, active fills lime + shadow-tile-lift
- Answer slot: empty = dashed border, filled = solid tile
- Timer: mono number, pulses coral via timer-pulse under 10s
- Buttons: 2px border, sharp corners, mono uppercase labels

## Motion
- `tile-pop` on tile enter/return (springy 0.22s)
- `timer-pulse` on countdown when low
- 150ms color shift on submit feedback (lime flash correct / coral flash wrong)

## Constraints
- No multiplayer, no difficulty levels, no real-time duel (per doNotBuild)
- Single loop: start → 10 rounds → score screen → play again
- Dark theme only; light tokens mirror dark for safety

## Signature Detail
Lime active tile with hard 6px drop shadow — the one moment of depth in an otherwise flat brutalist system. Reads as a pressed arcade button.
