# engine/
Shared game logic (no UI, layout or look). Modules arrive step by step (core, field, nav, crew, economy, weather, threat, damage). See `catalog.schema.md`. Games live in `games/<name>/` and are assembled by `tools/build.py` (a source line `//@engine core/events.js` is replaced by that file).

## core/ (step 1)
- `events.js` `EV.on / off / once / emit` and `say(msg, opts)`. Handlers run synchronously in order, so an event behaves exactly like the direct call it replaced.
- `settings.js` `optOn(id)`; the game answers with `OPT.def(id, fn)` and `OPT.use(fn)`.
- `rng.js` `mulberry32`, `rng`, `gauss`, `hashStr`.
- `state.js` `S`, `speedMult`, `paused`, `MAXSTEP`, `clockStr`.
- `save.js` `saveEncode`, `saveDecode`, `savePack`.

Engine files are plain script inlined into the game's single script, so names are shared; check a new name is not already used in the game.

## Events Dead Reckoning listens to
| event | args | DR does |
|---|---|---|
| `say` | message, {pause, slow, log, toast} | toast, log line, slow or pause the clock |
| `refresh` | force | `updateUI(force)` |
| `log` | | `renderLog()` |
| `bell` | bells 1-8 | ring the ship's bell |
| `route` | | redraw the route panel |
| `cargo` | state | cargo-loaded badge |
| `crisis` | crisis | open the crisis card |
| `voyageEnd` | ok, where | end-of-voyage screen |

Options asked with `optOn`: `bosun`, `mateLog`, `aSail`, `aCrew`, `aNoon`, `aFix` (Assists switches) and `crisisOpen`.

Still calling the DR UI directly (to convert in their own steps): nav actions (`setCourse`, `takeBearing`, `startObserve`, `markNoon`, `plotFix`, `setSail`, `rowStep` call `updateUI`), crew roster helpers (`svBalance`, `hireHand`, `removeHand`), and `crisisStep` reads the `modalOpen` flag.
