# WORDUEL Design System

## Purpose & Tone
Multiplayer word game with sharp, competitive energy. Dark, polished interface inspired by NYT Wordle but built for co-op and versus multiplayer. Clean, high-contrast, purposeful motion only—no decorative flourishes.

## Color Palette (OKLCH)

| Token | L | C | H | Usage |
|-------|---|---|---|-------|
| Background | 0.12 | 0 | 0 | Deep dark substrate |
| Foreground | 0.96 | 0 | 0 | Bright readable text |
| Card | 0.18 | 0 | 0 | Elevated surfaces (lobbies, results) |
| Primary | 0.7 | 0.18 | 70 | Interactive elements, active state |
| Secondary | 0.65 | 0.15 | 66 | Secondary actions, player names |
| Accent | 0.75 | 0.18 | 66 | Highlights, co-op turn indicators |
| Success | 0.58 | 0.18 | 142 | Tile correct (green) |
| Destructive | 0.62 | 0.25 | 29 | Tile present (yellow), warnings |
| Tile Absent | 0.22 | 0 | 0 | Tile absent (dark gray) |
| Muted | 0.28 | 0 | 0 | Disabled, secondary text |
| Border | 0.25 | 0 | 0 | Subtle dividers |

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display | Space Grotesk | Headers, tile letters, result overlays, player names |
| Body | Figtree | Instructions, chat, labels, match info |
| Mono | Geist Mono | Room codes, invite links, debug info |

## Shape Language

- **Tiles**: 8px radius, 2px border, sharp grid alignment
- **Cards**: 8px radius, subtle internal padding (1rem)
- **Buttons**: 8px-12px radius, full width on mobile, tight on desktop
- **Modals**: 12px radius, centered overlay with dark backdrop
- **Input**: 8px radius, 2px border transition on focus

## Structural Zones

| Zone | Background | Border | Purpose |
|------|------------|--------|----------|
| Header/Title | Card (0.18) | Border (0.25) | Game name, room code, player names |
| Main Grid | Background (0.12) | None | 6x5 tile grid center stage |
| Keyboard | Background (0.12) | Subtle | Q-Z key buttons below grid |
| Opponent Grid | Card (0.18) | Border (0.25) | Opponent's tiles (versus mode only) |
| Co-op Turn | Card (0.18) | Primary (0.7) | Indicator showing active player |
| Result Overlay | Card (0.18) | None | Win/loss screen with fade backdrop |
| Lobby | Background (0.12) | Border (0.25) | List of active games, join/create UI |

## Motion & Animation

| Name | Trigger | Duration | Effect |
|------|---------|----------|--------|
| Tile Flip | Letter submitted | 600ms | 3D flip reveal tile state |
| Shake | Invalid word | 400ms | Horizontal shake with 4px offset |
| Invalid Pulse | Invalid word | 500ms | Border flicker red/transparent |
| Loss Reveal | Game ends (loss) | 600ms | Answer scales in from 0.9 |
| Worduel Slide | Modal/overlay enter | 400ms | Slide down from -100% |
| Float Emoji | Win state | 800ms | Emoji floats up, fades |
| Confetti Fall | Win co-op | 3s | Particles fall, rotate 720°, fade |
| Pulse Subtle | Co-op turn indicator | 1.5s infinite | Breathing pulse 1.0→0.7 opacity |

## Interaction Patterns

- **Tile states**: Empty (card bg + border), input (card + primary accent on active), correct (green + white text), present (yellow + white text), absent (dark + muted text)
- **Co-op indicator**: Bright primary accent border, player name in bold display font, pulse dot
- **Versus layout**: Two player sections side-by-side (responsive stack on mobile), each with own grid + keyboard
- **Active/Inactive**: Active player keyboard enabled + cursor visible, inactive keyboard grayed out (opacity 0.5) + pointer-events: none
- **Result**: Modal overlay (loss shows answer + "Game Over", win shows confetti + "You Won")
- **Sound**: Toggle in header, optional per-action feedback (tile click, valid submit, win, loss)

## Responsive Breakpoints

- **Mobile** (`sm`, <640px): Single column, tiles 3rem×3rem, full-width keyboard
- **Tablet** (`md`, 768px+): Tiles 3.5rem×3.5rem, centered grid
- **Desktop** (`lg`, 1024px+): Tiles 4rem×4rem, versus side-by-side, lobby sidebar

## Accessibility

- Foreground text lightness 0.96 on bg 0.12 → contrast ratio >14:1 (AAA)
- All interactive elements keyboard accessible (Tab, Enter, arrow keys)
- Screen reader labels on game state changes ("Tile revealed: green, correct", "Game won", "Invalid word")
- High-contrast tile feedback (not color alone)
- Focus states: 2px primary-colored ring

## Anti-Patterns to Avoid

- No rainbow gradients or pastel overlays
- No animations longer than 800ms (except confetti)
- No 3D effects beyond tile flip
- No drop shadows > 20px blur (stay subtle)
- No decorative background patterns (scanlines optional)
- No mixed font families in single UI section
- No tile feedback relying on color alone (shape + color + text)

## File References

- Token source: `src/frontend/src/index.css` (lines 6–109)
- Tailwind config: `src/frontend/tailwind.config.js` (lines 18–94)
- Utilities: `src/frontend/src/index.css` (lines 137–308)
- Keyframes: `src/frontend/src/index.css` (lines 310–454)
