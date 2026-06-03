# Nuts & Bolts — Development Roadmap

Work through this list top to bottom. Each item has clear **done when** criteria. Skip only if you explicitly defer an item (note why in a commit or issue).

**Live site:** [https://kimmania.github.io/game-nutsandbolts/](https://kimmania.github.io/game-nutsandbolts/)

---

## How to use this doc

- [ ] = not started · [~] = in progress · [x] = complete (change in this file as you go)
- One PR or focused commit series per numbered item is ideal.
- Run `npm test` and `npm run build` before marking an item complete.
- Level changes: run fingerprint test (`tests/levelFingerprints.test.ts`) and any new solver test.

---

## Phase A — Trust & polish (do first)

### A1. Custom PWA icons
**Why:** Branding; stop reusing simple-sudoku placeholders.

**Tasks:**
- [x] Design 192×512 (+ maskable) bolt/wood icons
- [x] Add to `public/icons/` (source `icon.svg`, run `npm run generate-icons`)
- [x] Confirm `vite.config.ts` manifest paths and `index.html` `apple-touch-icon`
- [x] Verify icons appear after install / Add to Home Screen (manual check on deploy)

**Done when:** Lighthouse manifest icons pass; home-screen icon looks on-brand.

---

### A2. Level solvability checker (CI)
**Why:** Prevent impossible puzzles (e.g. old level 14) from shipping.

**Tasks:**
- [ ] Add `src/core/solver.ts` — BFS over game states (respect `canPickScrew` / `canPlaceScrew`, move limits)
- [ ] Add `scripts/validate-levels.ts` — load all levels from index, assert each solvable
- [ ] Wire `npm run validate-levels` and run in `.github/workflows/deploy.yml` before build
- [ ] Document in README and `docs/LEVEL_FORMAT.md`

**Done when:** Breaking a level JSON fails CI; all current levels pass.

---

### A3. Undo (one step)
**Why:** Faster playtesting; expected in puzzle games.

**Tasks:**
- [x] Snapshot holes, plates, picked screw, status before each successful move
- [x] Undo button in footer; disabled when stack empty
- [x] Clear undo stack on restart / level change
- [x] Optional: keyboard shortcut (e.g. `z`) on desktop

**Done when:** Single undo reliably reverses last pick/place; tests cover basic undo.

---

### A4. PWA & install polish
**Why:** Phase 3 was functional but not fully validated.

**Tasks:**
- [x] Run Lighthouse (PWA + performance) on production build; fix regressions
- [x] First-visit hint: one-line “Add to Home Screen” for iOS (dismissible, `localStorage`)
- [x] Confirm service worker updates levels after deploy (precache + network-first levels, reload toast)

**Done when:** Lighthouse PWA score ≥ 90 on mobile emulation; install path documented in README.

---

### A5. Plate physics (single screw)
**Why:** A real bar with one bolt left **hangs** from that pin; today the plate stays a rigid span between all anchor positions until every screw is gone.

#### Current behavior (baseline)

- Plate pose in `src/ui/board.ts` (`plateLayout`) uses **every** anchor hole in the level JSON, whether or not that hole still has a screw.
- Two or more anchors → bar aligned through those points (angle from first→second anchor in list order).
- Exactly one anchor on the plate definition → bar centered on that hole, angle `0` (no hang).
- **Rules are unchanged:** a plate is removed when all anchor holes are empty (`refreshPlateRemoval`); picking still follows top-layer exposure at each hole.

#### Target behavior

When a plate has **more than one** anchor in level data but **exactly one** anchor hole still has a screw:

| Screws on plate | Visual |
|-----------------|--------|
| 2+ | Rigid bar through occupied + empty anchor positions (today) |
| **1** | Bar **pivots** on the remaining screw; free end hangs **down** (gravity along +Y in the SVG view) |
| 0 | Existing plate-drop animation, then remove |

**Angle:** Derive from geometry only — pivot at the occupied anchor; aim the plate centroid (or the midpoint of removed anchors) downward. No extra fields in level JSON unless we later need author overrides.

**Logic:** Visual-only for v1 of this feature — `canPickScrew`, placement, and plate removal stay as they are. Revisit only if a swung plate should block taps on covered holes (unlikely at puzzle scale).

**Edge cases to handle:**

- 3+ anchors stepping down to 1 (intermediate 2-screw poses can stay rigid until only one remains).
- Shared-pin holes: a plate with one screw **does not hang** if another active plate still shares that screwed anchor (same physical pin).
- Undo / restart / level load: angle is **recomputed** from holes + anchors (do not store tilt in undo snapshots).
- **Reduce motion:** snap to final hang angle or skip tilt animation (match Settings / `prefers-reduced-motion`).

**Tasks:**

- [x] Spec accepted (this section) — no ambiguity between “one anchor in JSON” vs “one screw left”
- [x] `src/ui/plateLayout.ts` — branch on **count of anchors with `screwId !== null`**
- [x] Pivot transform: origin at remaining screw; rotate so free end hangs down
- [x] Web Animations tilt when count goes from 2→1 (snap when reduce motion; 1→0 uses existing drop)
- [ ] Manual check on levels with 2- and 3-anchor plates (e.g. 4, 5, 14) after deploy
- [x] Tests in `tests/plateLayout.test.ts`

**Done when:** On a two-screw bar, removing one screw shows the bar tilted from the remaining bolt; with both screws in, the bar stays straight; win/drop/undo still behave correctly.

---

## Phase B — Content & growth

### B1. Level pack expansion (25–30 levels)
**Why:** 15 levels are a tutorial pack, not a full game.

**Tasks:**
- [ ] Add levels 16–30 with **unique fingerprints** (see `levelFingerprints.test.ts`)
- [ ] Vary mechanics: shared pins, chains, tripod, tight stash, crosses, staircases
- [ ] Run solvability checker on each new file
- [ ] Smooth difficulty curve (easy → hard in index order)

**Done when:** `index.json` has 25+ levels; all pass tests + solver.

---

### B2. Level select UX improvements
**Why:** Easier navigation as level count grows.

**Tasks:**
- [ ] Show level name under number in picker (or tooltip)
- [ ] Indicate completed vs locked vs current
- [ ] Optional: “Continue” on load (resume last in-progress level)

**Done when:** Picker scales to 30 levels without confusion.

---

### B3. Share puzzle via URL
**Why:** Share challenges with friends; no backend.

**Tasks:**
- [ ] Encode `levelId` + compressed state (or seed) in URL hash
- [ ] Parse hash on boot; load level + state if valid
- [ ] “Copy link” on win screen or header
- [ ] Handle invalid hash gracefully

**Done when:** Opening a shared link reproduces the same board mid-puzzle.

---

## Phase C — Tools & depth

### C1. Level editor (MVP)
**Why:** Author levels without hand-editing JSON.

**Tasks:**
- [ ] Route or mode: `#edit` / `?edit=1` (dev-only flag optional)
- [ ] Tap to place hole (board vs stash); tap to add plate anchors
- [ ] Set layer, export JSON, copy to clipboard
- [ ] Run solvability check on export before copy

**Done when:** You can create a new 2-plate level in the editor and pass CI tests after dropping JSON into `public/levels/`.

---

### C2. Daily puzzle
**Why:** Reason to return without new manual content every day.

**Tasks:**
- [ ] Deterministic level pick from date seed (from unlocked pool or full pool)
- [ ] “Daily” entry on home / header; separate progress flag
- [ ] Streak or “last played” in `localStorage` (optional)

**Done when:** Same calendar day shows same daily level for all users.

---

### C3. Themes / skins
**Why:** Visual variety; matches original product vision.

**Tasks:**
- [ ] CSS variables for wood, plate, bolt colors
- [ ] Settings: 2–3 presets (e.g. Workshop, Cool metal, High contrast)
- [ ] Persist choice in settings

**Done when:** Switching theme updates board + UI without reload.

---

## Phase D — Nice to have (backlog)

| ID | Item | Notes |
|----|------|--------|
| D1 | Local stats | Clears per level, no analytics |
| D2 | Haptic feedback | `navigator.vibrate` on pick/place (Android) |
| D3 | Drag bolt optional | Setting alongside tap-only |
| D4 | More sound variety | Per-material clinks |
| D5 | Expert pack | 10 hardest levels, 1 stash |
| D6 | Contributor guide | PR template + level checklist |

---

## Suggested timeline (flexible)

| Week | Focus |
|------|--------|
| 1 | A1 icons + A2 solver CI |
| 2 | A3 undo + A4 PWA pass + A5 plate hang (optional) |
| 3 | B1 levels 16–25 |
| 4 | B2 picker + B3 share URL |
| 5+ | C1 editor, then C2/C3 as desired |

Adjust pace as needed; A2 before large B1 work saves rework.

---

## Definition of “v1.0”

- [ ] 25+ solvable, unique levels
- [ ] Undo, level picker, settings, deploy CI
- [ ] Custom icons + PWA installable
- [ ] Solvability checker in CI
- [ ] README with play, dev, deploy, level authoring pointers

When all above are checked, tag `v1.0.0` in git.

---

## Quick commands

```bash
npm run dev          # local play
npm test             # unit + level tests
npm run build        # production build
npm run validate-levels   # (after A2)
```

---

## Related docs

- [LEVEL_FORMAT.md](./LEVEL_FORMAT.md) — JSON schema for levels
- [../README.md](../README.md) — setup & GitHub Pages
