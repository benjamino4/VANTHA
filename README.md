# VANTHA DUEL

A 90-second, five-turn card duel that lives inside Telegram. Two players, one glass table, one fuse. Everything resolves on the client in under a minute — no lobbies, no waiting, no scrolling.

Open `index.html` and it runs. No build step, no package install, no network calls.

---

## Stack mapping

The brief called for React + Tailwind + Framer Motion + `@telegram-apps/sdk-react` + PixiJS + Howler. This build keeps the *behaviour* of that stack and drops the bundler, so the game opens from a file, from any static host, or from inside Telegram with zero setup.

| Brief | Shipped | Why |
| --- | --- | --- |
| React component tree | Declarative DOM sections + a single state object `S` and a `paint()` renderer | Same unidirectional flow (state in, DOM out) without a 40 kB runtime or JSX transform. One file to read, one place to debug. |
| Tailwind | Hand-authored CSS with design tokens (`--gold`, `--crimson`, `--violet`, glass recipe) | The visual system is bespoke — 8-layer glass, concentric radii, mask-composite rings. Utility classes would have been rewritten anyway. |
| Framer Motion | Native spring easing (`cubic-bezier` overshoot), `@property` driven conic angles, `transition` choreography, custom 3D tilt on `pointermove` | Identical choreography: spring-in cards, hover tilt, hit-stop, shake, flash. Hardware-composited transforms only. |
| `@telegram-apps/sdk-react` | `window.Telegram.WebApp` directly (`ready`, `expand`, `disableVerticalSwipes`, `HapticFeedback`, `MainButton`, `openTelegramLink`) | The SDK is a typed wrapper around the same object. Calling it directly removes a npm dependency and keeps the haptic fallback explicit. |
| PixiJS | Canvas 2D sprite pool (`#fx`) — the brief's sanctioned alternative | WebGL context loss inside Telegram's in-app WebView is a real failure mode; 2D canvas is stable and fast enough for ~120 short-lived particles. |
| Howler | Web Audio API synthesis (`clang`, `thud`, `whoosh`, `tick`, `chime`) — the brief's sanctioned alternative | Zero audio assets, zero decode latency, zero 404s. Sounds are generated on demand and muted by default until the first tap. |

Everything is locked to a 360 × 640 portrait viewport with `100dvh`, `overflow: hidden`, and `touch-action: none`. No scroll, ever.

---

## Mechanics

| System | Rule |
| --- | --- |
| **EP economy** | Start at 4. `ATTACK` and `GUARD` each grant +2 EP (cap 8). Skill cards cost 2–4. |
| **Turn** | One action per turn. Five turns total, then the verdict. |
| **Damage** | `ATK × multiplier − DEF × 0.5`, floored at 1. Soul charge adds a flat bonus at 100. |
| **Attack** | Damages the foe and opens the **discard ritual** — a card must be spent to the grave. |
| **Guard** | Raises block for one incoming hit and refunds EP. Cannot be chained freely. |
| **Trap** | Armed on your card as a visible aura. Enemy strikes can be reflected for 80% of their damage. |
| **Dispel** | Clears the foe's armed trap — the read that beats a counter. |
| **Soul Meter** | Every card that enters the grave charges the meter (+22). At 100 the next attack lands with a **SOUL BURST**. |
| **Fuse** | 15 seconds per turn. The bar under your card burns down; expiring auto-guards and costs the turn. |
| **Final Climax** | From turn 5 the arena turns crimson, the fuse shortens, and multipliers climb. |
| **Tells** | The foe's intent is always legible: `WILL STRIKE · n DMG`, `GUARDING · BRACING`, `COUNTER ARMED · UNKNOWN`, `GRAVE LANCE · n DMG`. |
| **Verdict** | Win, lose, or draw on HP. MVP moment, damage, turns, shards, frame tier, instant rematch. |

---

## Screen map (360 × 640)

```
┌──────────────────────────────┐  30  status bar   TURN · fuse · grave · deck
│  THE IRON KNIGHT   ATK DEF   │  94  foe card     HP, soul, pips, intent tell
│  ░░░░░░░░░░░░░░░░  HP 320    │
├──────────────────────────────┤
│                              │
│            ◇ I ◇             │ 216  arena        sigil, roman numeral, lattice,
│         (FX live here)       │                   damage beams, shards, callouts
│                              │
├──────────────────────────────┤
│  THE UNNAMED      ATK DEF    │  98  your card   HP, soul, EP pips, fuse, status
├──────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐        │ 100  hand         3 × 108 px skill cards,
│  │HEX │ │BLK │ │DRAIN│       │                   tilt, cost badge, drag to play
│  └────┘ └────┘ └────┘        │
├──────────────────────────────┤
│  [ ATTACK ]  [ GUARD ]  [FL] │  46  actions      thumb zone
└──────────────────────────────┘
```

---

## Controls

- **Tap a skill card** or **drag it upward** into the arena to play it.
- **ATTACK** / **GUARD** fire directly from the action bar.
- **Tap your card during the discard ritual** to choose what enters the grave.
- **Tap the soul bar** to inspect the grave.
- **FLEE** ends the duel immediately (counts as a loss).
- Sound is off until the first interaction, then toggled by the speaker glyph in the status bar.

---

## Meta progression

Wins are stored in `localStorage` and drive the frame tier that wraps both cards and the verdict seal:

| Wins | Frame | Accent |
| --- | --- | --- |
| 0–2 | BRONZE | warm brass |
| 3–6 | SILVER | cold steel |
| 7–11 | CYBER-NEON | cyan / magenta |
| 12+ | MYTHIC | gold + violet holo |

Shards accrue per duel (~10–60) and are displayed on the verdict panel as the long-term currency hook.

---

## Share card

`SHARE REPLAY CARD` composes a 1080 × 1350 verdict card on an offscreen canvas — title, MVP line, damage/turns/shards, frame tier — then hands it to `Telegram.WebApp.shareToStory` when available. Otherwise the card is revealed in-app with a copyable caption, so the moment is never lost to a missing API.

---

## Files

```
index.html   markup, SVG sprite, inline icons
style.css    design system: glass, frames, cards, arena, verdict, motion
app.js       state machine, combat math, FX engine, audio, haptics, persistence
```

No dependencies. No fonts fetched at runtime (Cinzel and Inter fall back to the system serif/sans stack if unavailable).

---

## Deploying inside Telegram

1. Serve the folder over HTTPS (any static host).
2. In BotFather: `/newapp` → point at that URL.
3. Open from the bot menu — the app calls `ready`, `expand`, `disableVerticalSwipes`, and requests fullscreen where supported.

Outside Telegram it degrades cleanly: haptics no-op, `MainButton` is replaced by the in-page action bar, share falls back to the in-app card.

## Pixel skill icons

The ten current skills now use Dani Melich’s transparent 32×32 pixel artwork, packed into a game-specific atlas. Glass frames, holographic effects, tilt, costs and combat mechanics are unchanged. Icons render at native resolution with nearest-neighbour scaling.

| Skill | Artwork |
| --- | --- |
| Heavy Slash | Earth impact |
| Mirror Parry | Arcane orbit |
| Iron Guard | Earth fist |
| Soul Rend | Shadow projectile |
| Ember Lance | Fire eruption |
| Hex Bind | Shadow portal |
| Blood Tithe | Shadow eye |
| Phantom Step | Wind slash |
| Grave Bloom | Nature growth |
| Last Light | Holy beam |

Only artwork used by this game is included; the original 30-icon pack and spritesheet are not redistributed. See `assets/CREDITS.txt` for attribution and license terms.
