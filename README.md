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
- Level picker, progress unlock, and in-progress save per level
- Sound effects and plate-drop animations (toggle in Settings)
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

## Levels

Levels live in `public/levels/*.json`. See [docs/LEVEL_FORMAT.md](docs/LEVEL_FORMAT.md) for the schema. Add an id to `public/levels/index.json` to ship a new puzzle.

## GitHub Pages

Pushes to `main` run tests, build, and deploy via GitHub Actions (same pattern as [simple-sudoku](https://github.com/kimmania/simple-sudoku)).

1. Repo **Settings → Pages → Build and deployment → Source:** GitHub Actions
2. Live site: [https://kimmania.github.io/game-nutsandbolts/](https://kimmania.github.io/game-nutsandbolts/)

## Install on iPhone / iPad

1. Open the site in Safari
2. Share → **Add to Home Screen**

## License

MIT
