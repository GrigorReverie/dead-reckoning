# Engine catalog

`engine/catalog.json` lists every engine feature, game-neutral, so a new game can be scouted against it.

Each entry in `features`:
- `id` unique slug, same as the id in `GAME_MECHANICS` / `SCN_MECH`
- `module` path under `engine/` of the code (e.g. `field/wind.js`)
- `summary` one plain sentence
- `inputs`, `outputs` lists of what goes in and out (no UI)
- `knobs` tunable numbers
- `tags` free words (wind, trade, crew, weather...)
- `adaptation` how it would change for another vehicle, e.g. a blimp
- `games` games that use it, e.g. `["dead-reckoning"]`

Run `python3 tools/check.py` to validate.

Ids starting with `core.` are engine infrastructure (events, settings, rng, state, save), not game mechanics, so they have no `GAME_MECHANICS` / `SCN_MECH` entry.

Ids of the form `<mechanic>.<part>` (e.g. `weather.wind`) are parts of that mechanic and share its `GAME_MECHANICS` / `SCN_MECH` entry.
