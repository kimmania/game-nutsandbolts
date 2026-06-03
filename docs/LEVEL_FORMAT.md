# Level format

Each level is a JSON file in `public/levels/{id}.json`. The level id must appear in `public/levels/index.json`.

## Schema

```json
{
  "id": 1,
  "name": "Display name",
  "holes": [
    { "id": "h1", "x": 200, "y": 180, "kind": "board" },
    { "id": "s1", "x": 200, "y": 390, "kind": "stash" }
  ],
  "plates": [
    {
      "id": "p1",
      "layer": 0,
      "anchors": ["h1", "h2"],
      "width": 140,
      "height": 36
    }
  ],
  "screws": {
    "h1": "bolt-a",
    "h2": "bolt-b"
  }
}
```

## Fields

| Field | Description |
|-------|-------------|
| `holes` | Positions in the 400×460 SVG view box. `board` holes hold plates; `stash` holes are spare parking slots. |
| `plates` | Metal bars. `layer` controls stacking (higher = on top). `anchors` lists hole ids. |
| `screws` | Initial placement: hole id → unique bolt id. |

## Design tips

- Coordinates should sit on the wood panel (`y` roughly 140–280).
- Plates auto-size to cover all anchors; `width` / `height` are minimums.
- Shared holes need a top-layer plate so the bolt stays reachable.
- A plate with *n* anchors needs at least *n − 1* empty holes (stash or board) to clear in one go, since the last bolt can be held in hand when the plate drops. Do not put *n* anchors on one plate when only *n − 2* spare holes exist unless other board holes can be freed first.
- Prefer **at most 3 anchors** per plate when the level only offers 2–3 spare holes.

## Plate pose (rendering)

Level JSON does not encode rotation. The renderer places each plate from anchor coordinates.

**Today:** The bar stays aligned across **all** anchor holes until every anchor is empty, then the plate drops.

**Planned ([ROADMAP.md](./ROADMAP.md) A5):** When only **one** screw remains on a multi-anchor plate, the bar **hangs** from that screw (pivot + gravity-down tilt). Rules (when the plate is removed, which bolts are pickable) do not change.

## Validation

Run `npm test` — the `levels.test.ts` suite loads every indexed level and checks the schema plus initial game state.
