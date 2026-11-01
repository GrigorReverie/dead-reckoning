# Working on Dead Reckoning

**Scenario mode rule.** Every game mechanic must be listed in two places in `games/dead-reckoning/index.src.html`:
1. its id in the `GAME_MECHANICS` array (near the top of the script), and
2. an entry in the `SCN_MECH` registry (search "SCENARIO MODE"): its dials, trigger buttons and live readouts.

Scenario mode (the third start option, next to Free and Career) builds its setup sheet, Test panel and presets from that registry, so a new mechanic appears there automatically. The Test panel warns "Not in Scenario yet: ..." when an id is in `GAME_MECHANICS` but missing from the registry.

When you add or change a mechanic (fishing, pirates, weather, tides, crew crises, trading, navigation, damage and so on), update both places in the same change.

**Game Bible rule.** `docs/game-bible.md` is the living design document (vision, setting, pillars, loops, mechanics overview, ships, ports, economy, art and UI direction, roadmap). When you add or change a mechanic, ship, port, good, mode or art direction, update the Bible in the same change.

Publish to `main` only when Grigor says "publish".

**Source and build rule.** The game source is `games/dead-reckoning/index.src.html`; the root `index.html` is generated. After editing, run `python3 tools/build.py` and commit both, then `python3 tools/check.py` (validates `engine/catalog.json` and that `index.html` is up to date). Never edit `index.html` directly.

**Engine reuse rule.** Dead Reckoning's logic is being split into a game-neutral `engine/` (logic only, no UI, layout or look) shared by future games; each game owns its UI and aesthetic. Plan: `dead-reckoning/engine-plan/` in project files. Every new feature must put its logic in `engine/` (sim code emits events, never touches the screen), add an entry to `engine/catalog.json` (see `engine/catalog.schema.md`), and still be listed in `GAME_MECHANICS` and `SCN_MECH`.
