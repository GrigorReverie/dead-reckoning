# engine/
Shared game logic (no UI, layout or look). Modules arrive step by step (core, field, nav, crew, economy, weather, threat, damage). See `catalog.schema.md`. Games live in `games/<name>/` and are assembled by `tools/build.py` (a source line `//@engine core/events.js` is replaced by that file).

## core/ (step 1)
- `events.js` `EV.on / off / once / emit` and `say(msg, opts)`. Handlers run synchronously in order, so an event behaves exactly like the direct call it replaced.
- `settings.js` `optOn(id)`; the game answers with `OPT.def(id, fn)` and `OPT.use(fn)`.
- `rng.js` `mulberry32`, `rng`, `gauss`, `hashStr`.
- `state.js` `S`, `speedMult`, `paused`, `MAXSTEP`, `clockStr`.
- `save.js` `saveEncode`, `saveDecode`, `savePack`.

## field/ and weather/ (step 2)
- `field/wind.js` `windAt(s,x,y,t,alt)` -> `{from,kn,lee,pass,breeze}`; `passage`, `passK`, `landHeat`. Knobs `WINDK` (land and thermal, 1 = realistic), `WIND_BASE` (prevailing wind, gale easing, height shear). `alt` (metres) is optional: left out, the wind is at the surface.
- `weather/weather.js` `genWx(s,x,y)`, `wxStep(s,dt,w)`, `squallStep(s)`, `pressureAt(s,t)`. Knobs `WXK`.
- The game describes its world through `FIELD` hooks: `localHour(s,t)`, `land()` (`{I:[{c,r,hf,h,name}],P:[passage(...)]}`), `hold()` (test-menu holds `{wind,sea,wx}`) and `day(s)` (`{overcast,cl}`). DR sets them next to its `landInit`.

Engine files are plain script inlined into the game's single script, so names are shared; check a new name is not already used in the game.

## nav/ (step 3)
- `nav/nav.js` `navReckon(s,ordered,dt)` (reckoned position and error growth; call before `s.t` advances), `navTrail(s)`, `navLogReading(s,knots)`, `navBearing(s,from,lm,spread,typeK)`, `navCrossFix(s)`, `navPlotFix(s,fix)`, `navNoonSight(s,{decl,lat0,trueLat,day,time,lost})`, `navMarkPosition(s,{time})`. Knob `MARK_SPEED_FRESH`.
- The game keeps the player actions (`takeBearing`, `markNoon`, `plotFix`, `markPosition`, `noonAvailable`) as thin wrappers that gather inputs (wind, sun declination, clock text) and call the engine. Uses the game's helpers `norm`, `angDiff`, `D2R`, `R2D`, `gauss`.

## crew/ (step 4)
- `crew/crew.js` `crewMake(spec)` (roster from named hands, seamen, berth order, doctors), `watchInfo`, `isDuty`, `effOfMan`, `crewX`, `medTeam`, `crewLife`, `crewStep(s,dt,w)`, `hireList`, `hireHand`, `removeHand`, `payOff`, `shoreLeave`, `issueRum`, `punish`, `crisisKind`, `crisisStep`, `crewRota`, `crewBosunWatch`. Knob `WB` (watch boundaries).
- The game describes its world and data through the `CREWG` hooks: `localHours`, `dayIndex`, `atPort`, `modalOpen`, `skipping`, `money`, `maxCrew`, `minCrew`, `effN`, `role`, `dutyRate`, `berths`, `berthOwner`, `watchNames`, `names`. DR sets them right after the engine include.

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
| `navBearing` | bearing {lm,brg,t} | notice and compass-log line |
| `navNoon` | {max,lat,stillRising,trueLat} | noon notice (and true-latitude check in trial mode) |
| `navFix` | {x,y,hrs,mx,my,mm} | fix notice and reckoning-vs-fix comment |
| `navMark` | {x,y,sx,sy,tier,fresh,lines,nb,off,dir} or null | mark-position notices; null means no bearings |
| `crewRemoved` | man, index | fix the selected man in the Ship tab, rebuild the roster |
| `crewHired` | man | rebuild the roster |
| `crewBill` | | redraw the watch bill |
| `wx` | kind, e | weather notice text (`WX_SAY`): `wave1-3`, `front1-3`, `surge`, `lull`, `squallNear`, `shift` {dd, from} |

Options asked with `optOn`: `bosun`, `mateLog`, `aSail`, `aCrew`, `aNoon`, `aFix` (Assists switches) and `crisisOpen`.

Still calling the DR UI directly (to convert in their own steps): helm actions (`setCourse`, `setSail`, `rowStep` call `updateUI`) and the nav wrappers (`takeBearing`, `startObserve`, `markPosition` call `updateUI` after the engine call), `svBalance` (the Ship-tab rebuild between the rota and the bosun's watch). Crew logic itself is now in the engine; the crisis card (`showCrisis`), `crewInfo`, `crewExtra` and `hireUI` stay in the game.
- `tutorial/tutorial.js` lesson runner (tutStart, tutStep, tutAck, tutSkip, tutGo, tutInfo). Events `tutStep`, `tutStuck`, `tutDone`.

## voyage/shortrun.js
A scripted first voyage (beats by progress, one choice, a verdict). Emits `sr` events: `hint`, `glass`, `decide`, `chose`, `squallPast`, `haze`. The game answers with notices, the choice card (`showCrisis`) and low visibility (`PV.vis`).
