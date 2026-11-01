# Dead Reckoning: mechanics catalogue

This is a catalogue of the game's **mechanics as reusable logic**. It leaves out the UI, the art and the 3D drawing. The aim: when starting another game (a Zeppelin trader, a caravan, a space freighter) you can scan this list, pick the mechanics that fit, and only define how they *look*.

**Standing rule:** every new or changed mechanic must be added or updated here in the same change, together with its id in `GAME_MECHANICS` and its entry in `SCN_MECH` (see `CLAUDE.md`).

## How to read an entry

Each mechanic has the same fields:

- **Status**: `Live` (in `index.html`) or `Preview` (so far only in `preview/index.html`, DR Preview).
- **Id**: its id in `GAME_MECHANICS` / `SCN_MECH`, or "no id yet" for mechanics not yet registered (see "Registry gaps" at the end).
- **What it does**: the rule, in game-neutral words.
- **State / inputs / outputs**: what it keeps, what it reads, what it changes.
- **Tunables**: the numbers worth exposing in another game.
- **Visual layer must supply**: the only things a new game has to draw or word itself.
- **Pairs with**: other mechanics this one needs or naturally suggests.

Code names are for finding the original logic. Another game should copy the *rule*, not the names.

## Suggestion map (used when planning a new game)

When Grigor says what a new game does, match these phrases to mechanics:

| Game says | Suggest |
|---|---|
| "buy / sell goods at a market" | Trade market, Cargo hold, Quay loading, Visible cargo items, Ports and duties, Smuggling |
| "load / unload the vehicle" | Quay loading, Visible cargo items, Cargo hold |
| "travel between places" | Route and lanes, Shipping lanes and traffic, Time and skip, Dead reckoning |
| "weather matters" | Wind and sea, Weather sky, Sea events (hazard) |
| "terrain / current / tide affects movement" | Currents and tides, Land wind effects |
| "crew / staff" | Crew life, Crises, Hiring, Watches and jobs, Assists |
| "the vehicle gets damaged" | Hull, rigging, leaks and repairs, Spares |
| "random encounters" | Sea events, Pirates, Crises |
| "other vehicles about" | Shipping lanes and traffic, Harbour traffic, Pirates |
| "food and supplies run out" | Provisions and stores, Fishing, Crew life |
| "lost, only an estimate of position" | Dead reckoning, Heave the log, Noon sight, Bearings |
| "upgrade to a bigger vehicle" | Career and fleet ladder |
| "save and resume" | Saving, Skip and time |
| "test the rules in a sandbox" | Scenario registry |

---

## 1. World and movement

### Sail and wind model
- **Status** Live. **Id** `weather` (wind part), no separate id for the sail model.
- **What it does**: converts wind speed and direction into vessel speed. A polar table gives speed against the angle to the wind, with a no-go zone near the wind; the sails can be braced so the wind meets them at the best angle; sail area (bare poles up to all plain sail) sets driving force and a safe wind limit; a heading stuck in the no-go zone can put the vessel "in irons" until it is pushed off.
- **State**: heading, ordered heading, speed, sail setting, brace angle, `irons`, helm wander (random error that grows with wind and fatigue).
- **Inputs**: wind (knots, from-direction), sea state, hull and rigging condition, cargo weight, current.
- **Outputs**: speed through the water, drift, strain (see Hull).
- **Tunables**: `POLAR` table, `NOGO` angle, `SAILS` table (efficiency and safe wind per setting), brace limits `BMIN/BMAX`, helm wander size, cargo speed penalty (up to 14%).
- **Visual layer must supply**: the sails or propulsion shown, helm/compass controls, and the words for each sail setting. A balloon or airship game replaces the polar with its own thrust-versus-wind table.
- **Pairs with**: Wind and sea, Currents and tides, Hull and rigging, Cargo hold.

### Wind, sea and sky (weather)
- **Status** Live. **Id** `weather`.
- **What it does**: wind speed and direction vary by place and time; wave height follows from wind (real Beaufort scale) plus swell; cloud cover, rain and visibility follow the weather; squalls blow in as short, strong events with a warning.
- **State**: wind field, swell direction, wave height `H`, rain, cloud cover, next-squall time, per-day overcast flag.
- **Tunables**: Beaufort table `BFT`, squall timing and strength, scenario overrides (wind, direction, sea, sky).
- **Visual layer must supply**: sky, clouds, sea or terrain surface, rain, fog, sound.
- **Pairs with**: Sail and wind model, Hull, Noon sight (needs clear sky), Sea events.

### Land effects on wind and current
- **Status** Live (tuned from the Wind and Current Tuner). **Id** `weather` / `tides`.
- **What it does**: islands (or any obstacles with a height) block the wind and cast a wind shadow downwind, funnel it between close neighbours (venturi), add sea and land breezes by time of day, and steer or eddy the current around coasts.
- **Tunables**: `WINDK` (block, venturi, shadow, shadow length, sea/land breeze, thermal, diurnal) and `CURK` (steer, passage, eddy, wind drift). 1 is realistic.
- **Visual layer must supply**: the terrain heights (any heightmap or list of obstacles with radius and height). A mountain-range or city-canyon game can use the same logic.

### Currents and tides
- **Status** Live. **Id** `tides`.
- **What it does**: a steady ocean current (set direction and drift speed, varying by place) pushes the vessel, giving set-and-drift. Tides rise and fall twice a day with a spring/neap swing; tidal streams run in and out of harbours; some harbours have a bar that limits deep vessels at low tide (idea, not built).
- **State**: per-place tide phase and range; current set and drift.
- **Tunables**: `TIDEX` (range, phase, bar depth per place), tide period (12.42 h), spring cycle (354.4 h), `PV.tide` strength, `CURRENT.set/drift`.
- **Visual layer must supply**: water level visuals, tide table text, chart arrows.
- **Pairs with**: Sail and wind model, Harbour and docking, Dead reckoning (current is what makes reckoning drift).

### Time, day and night, skip
- **Status** Live. **Id** `setup` (clock triggers).
- **What it does**: a game clock in hours with local solar time by longitude; day, night, dawn, dusk; game-speed control and pause; **Skip** fast-forwards N hours by running the *full* simulation, with confirm and a notice.
- **State**: `t` (game hours), start time, last half-hour and hour markers.
- **Tunables**: max step (1 game second), skip lengths, game-speed multipliers.
- **Visual layer must supply**: clock face or text, skip confirm UI, sun/moon/stars.
- **Pairs with**: everything that is time-driven (almost all mechanics).

### Route and course plotting
- **Status** Live. **Id** `navigation`.
- **What it does**: the player lays waypoints; the helm steers toward the next one and advances on arrival. Voyages are scripted start/finish pairs with a mode (trial = true position shown, lost = reckoning only).
- **Visual layer must supply**: the map, waypoint markers, voyage cards.

### Shipping lanes and sea traffic
- **Status** Preview. **Id** `traffic`.
- **What it does**: other vessels sail along lanes between the major places. Lanes are found once by a grid search (obstacles kept clear, a preferred wind angle favoured), then straightened. Every vessel is a **pure function of the game clock** (out, layover, back), so nothing is stepped, saves are untouched and time jumps just work. A mix table says which vessel types appear.
- **State**: none per vessel (only the clock). Lane list is derived.
- **Tunables**: `TRAFDENS` (0 to 3), lane pairs, vessel mix weights, 3D range, chart range, pool size, grid size, clearance, preferred wind.
- **Visual layer must supply**: the vessel models/icons for each type, lane drawing, labels. A Zeppelin game would give airships and air corridors.
- **Pairs with**: Harbour traffic, Route, Pirates.

### Harbour traffic (moored ships)
- **Status** Preview. **Id** `harbour`.
- **What it does**: each port holds a set of moored and anchored vessels, chosen by weights per vessel type; big vessels lie in the roads and small ones at quays. Created when you come near, hidden when far, shared geometry.
- **Tunables**: `HARBOURK` density (0, .45, 1, 1.7), per-port counts and size, vessel weights, near and show distances.
- **Visual layer must supply**: vessel models, berth positions.

### Dead reckoning, log and sights
- **Status** Live. **Id** `navigation`.
- **What it does**: the true position is hidden in "lost" mode. The player maintains an **estimated position** from heading, speed and elapsed time, and corrects it with fixes:
  - **Heave the log**: measure speed by a timed line (a sand glass of 4 s counts knots).
  - **Noon sight**: once a day around local noon, if sky is clear and the sea is not too heavy, give a latitude fix.
  - **Bearings**: take bearings on known landmarks to triangulate.
  The reckoning error grows with current and helm wander.
- **State**: estimated position, true position, heave count, fix count, noon-done day.
- **Outputs**: reckoning error, fix quality.
- **Tunables**: glass length, noon window (10:45 to 12:36 local), overcast and sea limits, fix noise.
- **Visual layer must supply**: the instruments (log line, quadrant, compass), the chart and plotting tools.
- **Pairs with**: Currents and tides, Weather (cloud blocks sights), Time.

### Harbour and docking
- **Status** Live. **Id** none yet (inside `trade` and `setup`).
- **What it does**: a port has a harbour plan (quays, depth, bar); the vessel can dock, anchor, or lie in the roads; manual dock heading; the port card shows services. Docking enables trade, hiring and loading.
- **Visual layer must supply**: harbour layout, dock points.

---

## 2. Economy and cargo

### Trade market
- **Status** Live. **Id** `trade`.
- **What it does**: 12 goods in three tiers (tier 1 from the start, tier 2 at standing 15, tier 3 only as free consignments on special contracts at standing 40). Each port makes some goods (cheap) and lacks others (dear); prices follow each port's stock, supply and demand, and events (glut, shortage, hurricane, war news). Prices elsewhere are known only as last seen, plus paid news.
- **State**: per-port stock per good, last-seen price board, purse, reputation (standing), contracts, event list.
- **Inputs/outputs**: buy and sell orders in units; purse and cargo change; standing rises with honest trade.
- **Tunables**: `GOODS` (name, unit, tons per unit, base price, tier, spoilage, wet damage, rough damage), `PRODN` (who makes what), `STKM` stock multipliers, `NORMST`, tier thresholds `REP2/REP3`, news price.
- **Visual layer must supply**: the goods' names, icons and units; the market screen. A Zeppelin game would supply its own goods list.
- **Pairs with**: Cargo hold, Quay loading, Ports and duties, Smuggling, Contracts, Cargo risks, Pirates.

### Ports, duties, harbour dues and smuggling
- **Status** Live. **Id** `trade`.
- **What it does**: each port charges import duty (3 to 7%) and export duty (2%) plus harbour dues; in quiet coves, cargo can be landed at night to dodge duty, with a risk of being caught.
- **Tunables**: `DUTYIN`, `DUTYOUT`, fee rules, smuggling risk, cove list.
- **Visual layer must supply**: port names, cove locations, the "caught" scene.

### Contracts and standing
- **Status** Live. **Id** `trade`.
- **What it does**: a contract board offers deliveries with a deadline and a reward; reputation unlocks better contracts and higher tiers.
- **Tunables**: reward formulas, deadlines, standing gains and losses (`REPN` bands: Unknown, Known, Trusted, Eminent).

### Cargo hold
- **Status** Live. **Id** `trade`.
- **What it does**: capacity in **tons** per vessel type (`CARGOT`); every good has a tonnage; the hold cannot be overfilled; cargo weight slows the vessel (up to 14% at full). Goods bought and waiting count against capacity at once.
- **State**: `cargo` map good to units and total cost (for profit tracking).
- **Tunables**: `CARGOT` per vessel, speed penalty, purchase-cost tracking.
- **Visual layer must supply**: the hold picture (see Visible cargo items).

### Cargo risks
- **Status** Live. **Id** `trade`.
- **What it does**: cargo spoils over time per good, gets wet in heavy seas, takes strain from rough seas when deep, and can be jettisoned in a gale to save the ship.
- **Tunables**: per-good `spoil`, `wet`, `rough` rates.

### Quay loading (purchases to hold)
- **Status** Preview. **Id** `loading`.
- **What it does**: a **three-stage process** replaces instant loading: (1) goods are put in a *basket*, (2) on confirm they are paid for and stacked on the *quay*, (3) on "Load" the crew carries them aboard over time at a rate that depends on hands on duty. Loading continues while the game is paused in the ship view (its own clock). Other vessel types still load instantly (`loadsByHand()` is the switch).
- **State**: `basket`, `quay`, `loading`, `loadTotal`, `docked`.
- **Outputs**: hold fills gradually; "cargo loaded %"; estimated time left.
- **Tunables**: `loadRate` (tons per game hour, scaled by hands on duty, clamped .35 to 2), who loads by hand, harbour fee on confirm.
- **Visual layer must supply**: the quay stack picture, carriers, a loading progress display. *This is the mechanic to reuse for any "buy goods, then physically load them" game.*
- **Pairs with**: Trade market, Cargo hold, Visible cargo items, Crew jobs.

### Visible cargo items
- **Status** Preview (the hold drawing builds as goods arrive; see `vzHold`). **Id** `loading` (shared).
- **What it does**: every unit of cargo is a **discrete visible item** placed in the hold according to a layout polygon (`HOLDPOLY`), built up as goods are loaded and removed as sold or jettisoned. The data is just `cargo[good].n`; the logic rebuilds the picture from it.
- **Tunables**: item packing rules, layout polygon, rebuild rate.
- **Visual layer must supply**: one picture per good, and the hold shape. A Zeppelin game would give crates, passenger cabins or ballast bags, and its own hold outline.

### Career and fleet ladder
- **Status** Live. **Id** none yet (should be `career`).
- **What it does**: start in a small vessel with a little cash; trade; buy bigger vessels at the shipyard with the old one taken in part exchange (60%). Net worth = purse + trade-in value + cargo value.
- **Tunables**: `LADDER` (vessel and price), `TRADEIN`, `CAREER_PURSE`, `CAREER_START`.
- **Visual layer must supply**: the vessel list, shipyard.

---

## 3. People

### Crew life
- **Status** Live. **Id** `crew`.
- **What it does**: each hand has morale, skill, health, susceptibility, personality traits, friends and rivals. Morale responds to rum, pay, food, discipline and events; skill decides who takes the helm; scurvy, injury and sickness arise from conditions (no limes, bad weather) and are treated by the surgeon and medicine chest.
- **State per hand**: role, name, `mo`, `sk`, `hp`, `scv`, `sus`, `sick`, mode (duty/rest), traits.
- **Tunables**: morale gains and losses, scurvy rate, skill table `SKILL0`, injury chance.
- **Visual layer must supply**: crew portraits/figures, names, roles. A Zeppelin game renames roles (engineer, rigger) and keeps the logic.

### Hiring, shore leave and attrition
- **Status** Live. **Id** `crew`.
- **What it does**: hire hands in port from a list; pay off; shore leave; desertion and death remove hands. Parked: pay and shares (wait for the economy).

### Surgeon and medicine
- **Status** Live. **Id** `crew`.
- **What it does**: a surgeon and a mate treat the sick and hurt using the medicine chest; if the surgeon dies the mate is promoted; fever spreads.

### Crises (decision moments)
- **Status** Live. **Id** `crew`.
- **What it does**: man overboard, galley fire, mutiny, surgery decision. Each is a card with 2 to 3 options and weighted outcomes that change morale, health, hull and purse.
- **Tunables**: trigger chances, option outcomes.
- **Visual layer must supply**: the card art and text.

### Watches, quarters, jobs and assists
- **Status** Live. **Id** `crew` / `damage`.
- **What it does**: the crew is split into watches (hands on duty); jobs (caulk, rig, sails, pumps) need spares, specific crew and suitable weather, and run over game hours with a progress bar; **Assists** let hands do small jobs automatically (a percentage of hands on watch).
- **Tunables**: job hours, gains, requirements (`JOBS`), weather gates, watch percentage.

### Discipline
- **Status** Live. **Id** `crew`. Punishment trades morale against order.

---

## 4. Vessel condition

### Hull, rigging, leaks and repairs
- **Status** Live. **Id** `damage`.
- **What it does**: hull and rigging are 0 to 1. The hull leaks at a rate that grows sharply as it is damaged and with sea height; water in the hold is pumped out; spares (timber, canvas, rope, pitch) are bought and used by repair jobs. Forgiving by design: the brig never founders but a flooded hull is slow and a worn rig sails badly.
- **State**: `hull`, `ship.rig`, `canvas`, `leak`, `water`, `spares`, `jobs`.
- **Tunables**: `leakRate`, `JOBS`, spares prices `SPAREP`.
- **Visual layer must supply**: damage visuals, pump and repair UI.

### Ship stats (per vessel type)
- **Status** Live. **Id** `setup`.
- **What it does**: ten vessel types each have their own table: polar, sail plan, brace limits, hold tons, crew, rooms, camera. Add a type by adding a row.
- **Tunables**: `SHIPSPEC`, `CARGOT`, `CAMCFG`.

---

## 5. Supplies and nature

### Provisions and stores
- **Status** Live. **Id** `fishing` / `crew`.
- **What it does**: biscuit, meat, beer, fish, limes, rum, medicine are bought by weight in port (price by port factor), consumed by the crew, with a store capacity of about 75 per hand.
- **Tunables**: `PRICE0`, `PORTF`, `storeCap`.

### Fishing
- **Status** Live. **Id** `fishing`.
- **What it does**: schools (dolphinfish, bonito, tuna) drift on the water; banks sit near islands. The vessel streams lines; when over a school, catch accrues at a rate; the catch goes to the stores; signs (birds, boiling water) hint at schools.
- **State**: list of fish patches (position, radius, amount, rate, drift), lines out/in.
- **Tunables**: `FISHX` catch multiplier, per-kind rates, bank size, patch count.
- **Visual layer must supply**: fish and bird visuals, the hand line.

### Wildlife
- **Status** Live. **Id** none yet.
- **What it does**: seasonal, place-dependent animals (birds, fish, dolphins) appear for atmosphere and as hints for fishing.
- **Tunables**: `PV.fauna` density.

### Pirates
- **Status** Live. **Id** `pirates`.
- **What it does**: only at open sea (more than 6 nm from ports). Chance per hour grows with cargo value (about 2%/h at value/1500 scale). A sloop either **chases** or **prowls**; its predicted track for the next hour is shown; if it catches the vessel a boarding crisis with 2 to 3 options follows. No gun combat.
- **Tunables**: frequency (never/normal/often), speeds, chase logic, option outcomes.
- **Visual layer must supply**: the pursuer model and its track marker.
- **Pairs with**: Cargo hold (value drives risk), Crises, Sea events.

### Sea events (random encounters)
- **Status** Preview. **Id** `events`.
- **What it does**: a spawn table `EV_DEFS` of encounters, each with a `kind` that sets behaviour: **salvage** (drifting wreck, choose to board), **rescue** (stationary person in need), **hazard** (weather cell that moves onto the vessel). Each option has weighted outcomes that change purse, hull, rigging, morale, injuries, reputation, stores, spares, or a cargo haul. Skill-based outcomes (`p:"skill"/"fail"`) exist.
- **State**: `s.ev` list, `evNext` (next spawn time).
- **Tunables**: `w` spawn weight, `sight`, `life`, frequency (`EVFREQ`), option outcomes. Adding an event is documented in `docs/sea-events.md`.
- **Visual layer must supply**: chart icon, 3D mesh, card text. The logic is reusable for any "meet something, choose, get a weighted result" system.

---

## 6. Tools and infrastructure (not gameplay, but reusable)

### Scenario registry (test sandbox)
- **Status** Live. **Id** n/a (it is the registry).
- **What it does**: each mechanic describes its dials, triggers and live readouts once in `SCN_MECH`; the setup sheet, Test panel and presets are built from that. A warning lists mechanic ids missing from the registry. A new game that copies this pattern gets a sandbox for free.

### Saving and loading
- **Status** Live.
- **What it does**: the state `S` is plain data and is saved to the device and optionally to a private gist; old saves are filled in lazily by `crewX`-style migrations. Everything time-driven (traffic) is a function of the clock so saves stay small.

### Quality, camera and look systems
- **Status** Live. **UI-only**: automatic quality, camera table `CAMCFG`, UI Look and 3D Style layers. Listed here only so nobody mistakes them for game logic.

---

## Registry gaps (to fix when next touched)

Mechanics that exist but have no id in `GAME_MECHANICS` / `SCN_MECH` yet: sail model, harbour and docking, career and fleet ladder, provisions and stores, wildlife, route. Add them there and keep the id column here in sync.
