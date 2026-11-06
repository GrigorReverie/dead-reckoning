# Dead Reckoning: game Bible

The single place that says what this game is. Mechanics detail lives in [`mechanics.md`](mechanics.md) (the reusable, UI-free catalogue) and [`sea-events.md`](sea-events.md) (how to add an encounter). If this file and the code disagree, fix whichever is wrong in the same change.

**Status keys:** Live = in `index.html`. Preview = only in `preview/index.html` (DR Preview). Idea = not built.
**Scope of this edition:** only what exists today. Lore gaps are listed under "Open questions", not invented.

## 1. Vision
Captain a sailing ship in the 1700s. Manage crew, stores and upkeep, trade between ports, and sail seas where wind and waves matter. Navigate by dead reckoning: you know your speed in knots and heading, so you estimate where you are and correct it with fixes. A chart shows the major trade ports.

It runs in the browser as an installable PWA (GitHub Pages), on phone and desktop, works offline, and saves per device with optional private-gist sync.

## 2. Setting
- **Default scenario:** the brig *Hesper* in the Lesser Antilles, March 1745.
- **Sea:** Windward and Leeward Islands, with a hidden "true" position in lost mode.
- **Ports (5):** Bridgetown, Castries, St John's, Kingstown, Basseterre. There is also a start-only spot, open sea west of Barbados.
- **Era choices made:** octant-era navigation; no gun combat; the slave trade is left out of the trade system (from the original brief).

## 3. Design pillars
1. **You are the captain, not the ship.** Orders go through the helm, the crew and the sails.
2. **Uncertainty is the game.** Position is an estimate; weather, current and error all push it off.
3. **The sea has rules.** Real Beaufort wind and sea, polar-based sailing, tides and set-and-drift.
4. **Trade is a puzzle of ports.** Each port makes some goods and lacks others.
5. **Forgiving realism.** Assists exist so the depth is optional, not a wall.
6. **Looks like a period chart and print**, not a modern UI (see section 10).

## 4. Modes
| Mode | What it is |
|---|---|
| Free | Sail and trade freely. Start money £120. |
| Learn to sail | A guided first voyage: a button on the start screen next to Free, Career and Scenario. Out of Bridgetown and back in 7 short steps (cast off and steer, set sails, heave the log, reckon, take a bearing, mark position, dock). Same sea and rules; the Assists switch decides Captain or Casual. Pirates, crew crises and squalls are switched off for the lesson. | Live |
| Career | Start in a cutter (£40), earn, and move up the fleet at the shipyard (60% part-exchange). |
| The Short Run | The first voyage: Bridgetown to Castries with Mr Haskell's 6 tons of flour before tomorrow noon's tide. A scripted run (calm, falling glass, a squall and one choice, haze that hides the land, landfall) ends in a verdict card. A new player sees it alone until it is done or skipped; it stays on the start sheet as a replay. Casual (true position shown) gets hints and a softer squall; Captain (reckoning only) gets neither. | Preview |
| Scenario | Sandbox/test mode built from the `SCN_MECH` registry: setup sheet, Test panel, presets. |

Voyages can also be scripted start/finish pairs: trial (true position shown) or lost (reckoning only).

## 5. Core loops
- **Moment to moment:** set heading, sails and braces; watch wind, sea, speed and condition; handle events.
- **Voyage:** plot a course, reckon position, correct with a log, noon sight or bearings, arrive, dock.
- **Port:** read prices, load and unload at the quay, hire crew, repair, resupply, pay duties.
- **Campaign:** build standing and money, unlock better goods and contracts, buy a bigger ship.

## 6. Mechanics overview
Full rules are in `mechanics.md`. Registered ids in `GAME_MECHANICS`: `setup`, `weather`, `tides`, `fishing`, `pirates`, `crew`, `trade`, `navigation`, `damage`, `shortrun`. Preview adds `traffic`, `harbour`, `events` and quay loading. `tutorial` is registered too.

| Area | Summary | Status |
|---|---|---|
| Sailing | Polar speed table, no-go zone (67 degrees), sail settings from bare poles to all plain sail, brace angle, irons | Live |
| Weather | Wind and Beaufort sea state, swell, cloud, rain, squalls, land wind shadows; logic lives in `engine/field/wind.js` and `engine/weather/weather.js` (optional altitude for future airborne games). Scenario: Squall now trigger, Glass and Squall readouts | Live |
| Currents and tides | Set and drift; tides twice daily with spring/neap | Live |
| Navigation | Dead reckoning, heave the log, noon sight, bearings on points in sight (peaks, headlands, lighthouses, beacons, ports: tap one on the chart to pick it, then draw the line; out-of-range points are hidden and cannot be picked), chart position lock, **Mark position** (a button on the chart and in the bearing list: least-squares fix from every bearing held, pulled toward the reckoning, which is weighted more when the log was hove in the last 5 game minutes; one bearing gives only a line so accuracy is Poor or Fair, two bearings near 90 degrees plus a fresh log is Excellent; marking clears the bearing lines and draws a solid path between marked points from the starting port, bending the leg since the last mark to end on the new dot); logic lives in `engine/nav/nav.js` (events `navBearing`, `navNoon`, `navFix`, `navMark`) | Live |
| Time | Real-time with pause, game speed (+ and − only change the stored target speed shown in the middle; tapping it runs at that speed; 1× is real time and keeps the stored speed), Skip runs the full simulation | Live |
| Crew | Personalities, watches, jobs, hiring, surgeon, discipline, crises; logic lives in `engine/crew/crew.js` (events `crewRemoved`, `crewHired`, `crewBill`, `crisis`) | Live |
| Vessel condition | Hull, rigging, leaks, repairs, spares | Live |
| Provisions | Stores, fishing (patches, hand-lines), wildlife | Live |
| Trade | 12 goods, port prices, news, duties, smuggling, contracts, standing | Live |
| Pirates | Open-sea chase or prowl, boarding crisis, no gun combat | Live |
| Short Run script | Beats placed by progress along the leg (so they land the same at any game speed), squall choice (shorten sail or press on) with real rigging consequences, freight paid by time against the deadline; logic in `engine/voyage/shortrun.js`, Scenario entry `shortrun` | Preview |
| Sea events | Derelict, castaway, squall encounters with weighted outcomes | Preview |
| Traffic | Other vessels on lanes, moored harbour ships | Preview |
| Quay loading | Basket, receipt, crates loaded one by one into the hold | Preview |
| Tutorial | `engine/tutorial/tutorial.js` runs a lesson (steps with done tests, stuck hint after 25 s, skip at any time); Dead Reckoning's lesson and card are in the game file. Registered id `tutorial`; Scenario can start, step and leave it | Live |

## 7. Ships
Ten ships, each with its own hull, rig, cutaway and camera settings (`SHIPSPEC`, `CAMCFG`):

| Ship | Role |
|---|---|
| Jolly boat (c. 1780) | Utility, oars and spritsail |
| Cumberland Fleet yacht (1775) | Pleasure cutter, the career start |
| HMS Sultana (1767) | Customs schooner |
| Brig *Hesper* (1745) | The game's default merchant brig |
| HMY Royal Caroline (1749) | Royal yacht |
| HM Bark Endeavour | Collier hull, exploration |
| Spanish xebec | Mediterranean raider |
| Götheborg (1738) | East Indiaman |
| USS Constitution (1797) | Heavy frigate |
| Santísima Trinidad | Largest warship of the century |

Per-ship stats are compared in the Ship Stats Compare dashboard. Hull capacity (tons) sets the cargo limit; cargo weight slows the ship by up to 14%.

## 8. Economy
- **Goods (12):** tier 1: sugar, molasses, lumber, flour. Tier 2: rum, cotton, coffee, bar iron. Tier 3 (free consignments on special contracts only): Madeira, indigo, tortoiseshell, ambergris.
- **Prices** follow each port's stock (makers cheap, others dear), plus events (glut, shortage, hurricane, war news). Other ports' prices are known only as last seen, unless you pay for news.
- **Costs:** import duty 3 to 7%, export duty 2%, harbour dues, spoilage, wet and rough-sea damage.
- **Standing:** Unknown, Known, Trusted, Eminent. It unlocks tier 2 (at 15) and contracts.
- **Smuggling:** land cargo at night in quiet coves to dodge duty, with a risk of being caught.
- **Tuning:** the Trade Economy and Career Pace dashboards.

## 9. People
Named crew with personalities, two watches, jobs by room, fatigue, morale, beer and biscuit, injuries and a surgeon. Crises give decision moments. Assists let the player hand work to the crew at 25/50/75/100% on watch. The "Dead reckoning only" assist toggle is hidden for now (always on, hard mode) behind the `EASY_MODE_DR_TOGGLE` flag in the source; set it true to bring the toggle back for an easy/hard choice. Crew limbs keep sensible angles with bending knees and elbows. In the Ship tab, All decks also shows a faint outer shell with masts, yards and rigging.

## 10. Art and UI direction
- **Chart:** 17th-century-style chart look with contour and depth lines (in progress); pen-and-ink icons.
- **3D:** three.js scenes: port plans in 3D, painted walking crew, cutaway of every ship, Deck camera at eye level, spyglass (looked through from each ship's lookout point, the foretop or high on the foremast; spyglass button sits beside the eye icon in the 3D view, tap again or Esc to return to the previous angle; a bearing strip at the bottom shows the compass bearing you are looking along, ticks finer as you zoom), sun and cloud shadows, day/night sky and constellations. Bearing point labels and the strip under the heading tape are hidden by default; the eye menu has a Bearing points switch (landmark icon) to show them. Mark position and the eye-menu switches use the same pen-and-ink icons as the rest.
- **Styles:** Visuals dropdown (Original, New, Images); Menu > Preview > Style presets; UI Look and 3D Style sliders; one responsive layout for phone and desktop.
- **Performance:** automatic quality (Auto/Low/Medium/High). Distance detail: berthed ships lose rigging lines when far, sea-traffic hulls lose their deck, far birds update every fourth frame, far splashes are skipped, the ship's shadow map is redrawn every other frame, the chart is redrawn only when something changed, phones are capped at 60 frames a second and draw a lower-detail sea at a distance. While the spyglass is up, everything is drawn at full quality. Menu > Cheats > Performance shows frame time, draw calls and triangles and switches each saving on or off (also a Scenario mechanic, "Performance and distance detail").
- **Design system:** `design/DESIGN.md` and `design/tokens.json` (draft). Pass 1 is in DR Preview only: lighter inner borders, 40px touch targets on touch screens, six-step type scale, tokens `--good` and `--chart-ink`. Parchment, ink and brass identity is kept. Pass 4: remaining CSS colours use tokens, shared heading and row spacing, double-rule dividers between panels, money with thousands separators, headings as three digits.
- **Tools:** private tuner dashboards, listed in the Dashboards hub, are where values are tuned before being pasted into the game.

## 11. Roadmap and open ideas
Live (promoted from Preview 2026-11-04): lookout spyglass, ship controls module with the fixed helm deck layout, compass redraw capped to ~30fps.
In progress (Preview): traffic, harbour ships, sea events, quay loading, engine/games folder split (`engine-plan/`; step 0 folders and build done, step 1 `engine/core` events, settings, rng, state and save live; step 2 `engine/field` wind and `engine/weather` live; step 3 `engine/nav` navigation live; step 4 `engine/crew` built on a branch, awaiting publish).

Decided 2026-11-06 (design in `dead-reckoning/design/lili-hook-goals-pacing.md`): the Short Run replaces the new-game start for first-timers; Career will get a debt ladder where failure means demotion and keeping the crew (not built); sea events become the beat deck for voyage pacing (not built).

Ideas not built: St John's reefs in 3D; bar depth blocking deep ships at low tide; wind-sea wavelength; pay and shares; chronometer as a late upgrade (from the brief).

## 12. Open questions for Grigor
- Backstory for the captain, the *Hesper* and the owners (none written yet).
- Factions, nations and their relations in the islands.
- A win condition or story arc for Career beyond "grow the fleet".
- More ports beyond the five.

## 13. Keeping this file true
Update it in the same change whenever a mechanic, ship, port, good or mode changes, alongside `GAME_MECHANICS`, `SCN_MECH` and `mechanics.md`.
