# VANTHA — Turn-Based Clash

A complete 2D turn-based battle system for a Telegram Mini App. Liquid Glass over OLED black, gold and crimson light, no emoji anywhere — every icon is hand-drawn inline SVG.

Open `index.html` in a browser and it runs. No build step, no framework, no network fetch of its own (only the optional Google Fonts link; system serif/sans fall back cleanly offline).

---

## Files

| File | Contents |
| --- | --- |
| `index.html` | 360×640 stage, inline SVG icon library, enemy card, clash arena, player panel, hand, action buttons, verdict overlay. |
| `style.css` | The whole visual system: glass recipe, typography, hidden-stat chips, HP bars, cards, buttons, and every keyframe (`shake`, `cardFly`, `floatDamage`, `fxFrames`, `fxCore`, `chipFlip`, `pipPop`). |
| `app.js` | State, turn loop, card resolution, enemy AI, sight reveals, FX choreography, verdict, haptics, keyboard. |
| `assets/impact.png` | 8×8 atlas (64 frames) — the clash burst. |
| `assets/burst.png` | Heavy-attack burst atlas. |
| `assets/ring.png` | Arcane ring atlas, played when a card is cast. |
| `assets/sight.png` | Spark atlas for Foresight reveals. |

---

## How a turn works

1. **3 AP** refill at the start of every player turn, and the hand is redrawn to five cards.
2. **Tap a card** — it costs its AP, flies to the centre of the arena, resolves, and the slot is cleared.
3. **Basic Attack** (1 AP) always available — a steady hit when your hand is expensive.
4. **End Turn** — AP drains, the enemy resolves the intent it has been telegraphing, then your next turn begins.

The enemy's intent is shown in the arena for the whole turn (`WILL STRIKE · 13 DMG`), and every third turn it becomes a `GRAVE LANCE` heavy. Once you land your first hit its real HP numbers appear; before that the bar moves but reads `???`.

---

## Hidden information

The four enemy stats sit veiled at `???`. **Foresight** (1 AP) breaks one veil, **Second Sight** (2 AP) breaks two. Each reveal flips the chip on its X axis, swaps the value mid-rotation, turns the chip gold, and pushes a spark burst across the arena.

A sight card is only force-fed into your opening hand while *nothing* is revealed. After that the deck decides — no dead slots.

---

## The juice, in order

1. **`cardFly`** — a ghost clone of the card launches from the hand, arcs to the arena centre, shrinks and vanishes (440ms).
2. **`shake`** — the stage itself jolts through ten decaying steps. It animates the independent `translate`/`rotate` properties, so it never fights the scale transform used to fit the 360×640 frame.
3. **`floatDamage`** — the number rises off the enemy card, overshoots, settles and fades; crits are larger and gold.
4. **`fxFrames`** — the 8×8 atlas plays its 64 frames in 0.6s, plus **`fxCore`**, a hot centre flash.
5. **HP** — the fill animates on a 0.5s curve while a pale ghost bar lags behind it.

---

## About the 64-frame animation

The spec asks for `steps(64)` over 0.6s. A single-axis `steps(64)` only works on a 1×64 strip; the supplied art is an 8×8 grid. So `fxFrames` is generated as **64 discrete stops at 9.375ms each** (0.6s ÷ 64) with `step-end` timing — mathematically the same thing, exact frame count, and no JS timer in the hot path. Each frame is `background-position: -col×cell -row×cell`.

Two things were done to make the supplied atlases read at phone size:

- **Tinted offline.** The originals are pale smoke; a CSS filter turned them yellow and blown out. The RGB is now baked crimson / gold / ice-blue in the PNGs, with the alpha untouched, so `mix-blend-mode: screen` gives exact hue on black.
- **Feathered per cell.** Each 64px cell's alpha is eased to zero toward its borders, so the grid’s seams never show as a rectangle.

Three rotated copies (0°, 124°, 238°, with -42ms and -86ms offsets) stack into one dense burst instead of a single faint pass.

---

## Rules and numbers

- Player: 74 HP, 3 AP, power 7.
- The Hollow Knight: 112 HP, power 4 — hits for ~10, heavy for ~17.
- Card damage = base + 35% of power, ±8% variance, 15% chance of a 1.6× crit.
- A good hand kills in 3–5 turns; a bad one gets you killed. Playing cards you cannot afford shakes the card and refuses the click.

All of it lives in `ENEMY_BASE`, `PLAYER_BASE` and `CARD_POOL` at the top of `app.js`.

---

## Controls

Tap everything. On desktop: `1`–`5` play a card, `Space` basic attack, `E` end turn.

Haptics fire through `Telegram.WebApp.HapticFeedback` on select, hit, crit and verdict, and silently no-op outside Telegram.
