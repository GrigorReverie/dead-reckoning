# Working on Dead Reckoning

**Scenario mode rule.** Every game mechanic must be listed in two places in `index.html`:
1. its id in the `GAME_MECHANICS` array (near the top of the script), and
2. an entry in the `SCN_MECH` registry (search "SCENARIO MODE"): its dials, trigger buttons and live readouts.

Scenario mode (the third start option, next to Free and Career) builds its setup sheet, Test panel and presets from that registry, so a new mechanic appears there automatically. The Test panel warns "Not in Scenario yet: ..." when an id is in `GAME_MECHANICS` but missing from the registry.

When you add or change a mechanic (fishing, pirates, weather, tides, crew crises, trading, navigation, damage and so on), update both places in the same change.

**Game Bible rule.** `docs/game-bible.md` is the living design document (vision, setting, pillars, loops, mechanics overview, ships, ports, economy, art and UI direction, roadmap). When you add or change a mechanic, ship, port, good, mode or art direction, update the Bible in the same change.

Publish to `main` only when Grigor says "publish".
