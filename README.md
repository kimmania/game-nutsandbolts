# Nuts & Bolts

A mobile-first screw puzzle PWA. Unscrew bolts from metal plates, park them in spare holes, and clear every plate without jamming.

**Play online:** [https://kimmania.github.io/game-nutsandbolts/](https://kimmania.github.io/game-nutsandbolts/)

Inspired by the *nuts and bolts* screw-puzzle genre (layered plates, limited stash holes). Original levels and artwork.

## How to play

1. **Tap a bolt** on the board to unscrew it (only bolts on the top layer at that hole are reachable).
2. **Tap an empty hole** — on the board or in the spare row — to park the bolt.
3. When every anchor on a plate is empty, the plate drops away.
4. **Clear all plates** to win. If you run out of moves with plates left, you hit a screw jam — use **Restart**.

## Features

- Tap-only controls (no drag)
- 15 unique puzzle layouts (stacking, shared pins, chains, crosses, and more)
- Level picker, progress unlock, in-progress save per level, and **undo** (⌘/Ctrl+Z)
- Custom bolt-on-wood PWA icons
- Sound effects, plate-drop animations, and single-screw plate hang (toggle motion in Settings)
- Reduce motion option (respects system preference by default)
- Installable PWA (Add to Home Screen)
- Pure TypeScript puzzle engine with unit tests

## Development

```bash
npm install
npm run dev
```

Open the URL from the terminal (usually `http://localhost:5173/game-nutsandbolts/`).

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run validate-levels` | BFS solvability check for every level in `index.json` |
| `npm run generate-icons` | Regenerate PNG icons from `public/icons/icon.svg` |

## Levels

Levels live in `public/levels/*.json`. See [docs/LEVEL_FORMAT.md](docs/LEVEL_FORMAT.md) for the schema. Add an id to `public/levels/index.json` to ship a new puzzle.

## Roadmap

Planned work is tracked in [docs/ROADMAP.md](docs/ROADMAP.md) — work through Phase A → B → C in order.

## GitHub Pages

Pushes to `main` run tests, build, and deploy via GitHub Actions (same pattern as [simple-sudoku](https://github.com/kimmania/simple-sudoku)).

1. Repo **Settings → Pages → Build and deployment → Source:** GitHub Actions
2. Live site: [https://kimmania.github.io/game-nutsandbolts/](https://kimmania.github.io/game-nutsandbolts/)

## Install (PWA)

Works on **HTTPS** (GitHub Pages) or `npm run preview` locally.

### iPhone / iPad (Safari)

1. Open [the game](https://kimmania.github.io/game-nutsandbolts/) in **Safari** (not an in-app browser).
2. Tap **Share** → **Add to Home Screen**.
3. Launch from the home screen icon for standalone play.

A one-time hint appears on first visit in iOS Safari (dismiss with ×; stored in `localStorage`).

### Android (Chrome)

1. Open the site in Chrome.
2. Menu → **Install app** or **Add to Home screen** when offered.

### After deploy

The service worker uses **auto-update**. Level JSON is precached with the app shell and also fetched **network-first** so new level packs appear after you **Reload** when the “New version available” toast shows.

## Lighthouse (quality check)

```bash
npm run build
npm run lighthouse
# In another terminal:
npx lighthouse http://localhost:4173/game-nutsandbolts/ \
  --form-factor=mobile \
  --chrome-flags="--headless=new" \
  --view
```

On a production build, recent runs hit **100** performance and **100** best-practices (mobile). Installability is covered by the web manifest, service worker, and icons — verify under Chrome DevTools → **Application** → Manifest / Service workers.

## License

MIT
