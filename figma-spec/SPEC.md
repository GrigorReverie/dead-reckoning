# Dead Reckoning: Figma-ready UI spec

Measured from the live game (10 March 1745, 07:00, day theme) on a phone frame of 390 × 844 and a desktop frame of 1280 × 800. Every layer is named after the real panel or button in the game, so a later Figma-to-game sync can match them one to one.

## What is in this folder

| File | Use |
|---|---|
| `svg/phone/*.svg`, `svg/desktop/*.svg` | One importable frame per screen. Drag into Figma: groups become layers named after the game's elements, text stays editable. |
| `tables/<device>/<screen>.csv` | Every element on that screen: layer name, CSS selector, x, y, w, h, z-order, text, font, colour (with token name), background, radius, padding, layout, shadow. Opens in Sheets or Figma table plugins. |
| `tokens.json` | Colours (day and night modes), font families and sizes in the W3C design-token format. Import as Figma Variables (Variables panel > import, or the Tokens Studio plugin). |
| `layer-map.json` | Layer name → exact game selector, per device. This is the contract the sync will read. |

## Importing into Figma

1. In Figma, create a page per device (Phone, Desktop).
2. Drag the SVGs from `svg/phone/` onto the Phone page (and the same for Desktop). Each becomes a frame titled like `phone / Sea chart`.
3. Fonts are all Google Fonts, which Figma has built in: Spectral, IBM Plex Mono, IM Fell English, IM Fell English SC.
4. Import `tokens.json` as Variables, then swap hard colours for variables (the CSVs name the token for each colour, e.g. `#2e2519 ink`).
5. Create the text styles listed below and apply them; the CSV `font` column tells you which one each layer uses.

## Layer naming (keep these names)

- An element with an id in the game keeps that id as its layer name: `tbChart`, `bSkip`, `clock`, `portCard`, `compassBox`.
- An element without an id is named from its nearest id'd ancestor down, joined with `__`: `portCard__ptbl-1__span-0` is the first span in the second `ptbl` block inside `portCard`. The number is its position among siblings of the same kind.
- Sub-layers inside an element end in `__bg`, `__border`, `__border-bottom`, `__text`, `__icon`, `__box` (checkbox) or `__canvas`. These are the parts of one element, not new elements.
- Renaming or regrouping a layer breaks its link to the game. Adding new layers is fine; give them new names and the sync will report them as new.
- Layers starting with `_guide` are helpers (for example the dashed line marking the bottom of the screen where content scrolls beyond it). Hide or delete them freely.

## Colours

Use these as Variables with two modes, Day and Night. The game swaps the whole set at night.

| Token | Day | Night | CSS variable | Used for |
|---|---|---|---|---|
| desk | `#ebdfc2` | `#0b1a40` | `--desk` | page and bar background |
| desk2 | `#d9c9a2` | `#10245a` | `--desk-2` | deeper desk tone |
| paper | `#f6eed9` | `#132a63` | `--paper` | panels, cards, buttons |
| paper2 | `#ece2c8` | `#0f2252` | `--paper-2` | inset panels |
| ink | `#2e2519` | `#eadfb4` | `--ink` | main text, borders, pressed buttons |
| inkSoft | `#7b6a55` | `#a9a283` | `--ink-soft` | secondary text, labels |
| rule | `#cbbd98` | `#2d4688` | `--rule` | divider lines |
| sea | `#4a6a8a` | `#8aa8d6` | `--sea` | sea, current arrows |
| ochre | `#b2452c` | `#e4905f` | `--ochre` | warnings, danger, red accents |
| shoal | `#7b6a55` | `#a9a283` | `--shoal` | shallows |
| brass | `#b8862a` | `#d9a940` | `--brass` | highlights, gauges |
| pencil | `#4a5a8a` | `#9db2e2` | `--pencil` | chart pencil marks |

Colours seen in the capture that are not tokens: `#3f7a4a` (green, good state), `#2d6bd6` (blue, wind speed readout), `#a8452c` (gradient red). Consider turning them into tokens in Figma.

## Text styles

Four families. Suggested Figma style names are `Role/size/weight`. Sorted by how often they appear.

| Suggested style | Family | Size | Weight | Extras | Layers | Example layer |
|---|---|---|---|---|---|---|
| Data/11/400 | IBM Plex Mono | 11px | 400 |  | 249 | `phone: svRoster__svrow-0__svw-1__button-0` |
| Data/10.5/400 | IBM Plex Mono | 10.5px | 400 |  | 185 | `phone: tPause` |
| Body/12/400 | Spectral | 12px | 400 |  | 181 | `phone: skTxt` |
| Body/12.5/400 | Spectral | 12.5px | 400 |  | 141 | `phone: posTxt` |
| Body/13/400 | Spectral | 13px | 400 |  | 132 | `phone: skOk` |
| Data/10/400 caps +0.6px | IBM Plex Mono | 10px | 400 | uppercase, tracking 0.6px | 85 | `phone: tabbar__span-0` |
| Data/11.5/400 | IBM Plex Mono | 11.5px | 400 |  | 80 | `phone: portCard__ptbl-1__span-0` |
| Data/10.5/400 caps +0.63px | IBM Plex Mono | 10.5px | 400 | uppercase, tracking 0.63px | 61 | `phone: oarSec__div-3__row-0__k-0` |
| Body/11/400 | Spectral | 11px | 400 |  | 56 | `phone: ibTog` |
| Body/13/700 | Spectral | 13px | 700 |  | 46 | `phone: svBill__b-0` |
| Body/11/400 italic | Spectral | 11px | 400 | italic | 44 | `phone: svRoster__svrow-0__svn-0__span-0` |
| Data/13/600 | IBM Plex Mono | 13px | 600 |  | 40 | `phone: svEff__b-0` |
| Data/10.5/400 caps +0.84px | IBM Plex Mono | 10.5px | 400 | uppercase, tracking 0.84px | 38 | `phone: modeTag` |
| Body/11.5/400 | Spectral | 11.5px | 400 |  | 35 | `phone: portCard__pnote-0` |
| Display/15/400 | IM Fell English SC | 15px | 400 |  | 33 | `phone: side-0__dock-0__sheet-0__dockgrid-2__sub-0__subhead-0` |
| Data/12.5/400 | IBM Plex Mono | 12.5px | 400 |  | 33 | `phone: bVoy` |
| Display/16/400 | IM Fell English SC | 16px | 400 |  | 30 | `phone: clock` |
| Data/12/400 | IBM Plex Mono | 12px | 400 |  | 27 | `phone: svAll` |
| Body/10/400 | Spectral | 10px | 400 |  | 23 | `phone: barTog` |
| Data/13/400 | IBM Plex Mono | 13px | 400 |  | 22 | `phone: side-0__dock-0__sheet-0__dockgrid-2__sub-0__dockbody-1__dockctl-1__mono-0` |
| Data/13/700 | IBM Plex Mono | 13px | 700 |  | 22 | `phone: ordTxt` |
| Display/17/400 | IM Fell English SC | 17px | 400 |  | 21 | `phone: portCard__pchead-0__b-0` |
| Italic/16/400 | IM Fell English | 16px | 400 |  | 20 | `phone: toast` |
| Data/15/400 | IBM Plex Mono | 15px | 400 |  | 20 | `phone: zIn` |
| Body/13/600 | Spectral | 13px | 600 |  | 18 | `desktop: trimTxt__lng-0` |
| Body/12.5/700 | Spectral | 12.5px | 700 |  | 13 | `phone: sailSlName` |
| Data/14/400 | IBM Plex Mono | 14px | 400 |  | 13 | `desktop: side-0__dock-0__sheet-0__dockhead-0__r-0__ctog-0` |
| Data/10/400 | IBM Plex Mono | 10px | 400 |  | 12 | `phone: svStrip__sw-0` |
| Display/16/400 italic | IM Fell English SC | 16px | 400 | italic | 11 | `phone: bLegend` |
| Body/11.5/700 | Spectral | 11.5px | 700 |  | 11 | `phone: oarNote__b-0` |
| Data/12.5/700 | IBM Plex Mono | 12.5px | 700 |  | 11 | `phone: oarHands__mono-0` |
| Data/18/400 | IBM Plex Mono | 18px | 400 |  | 11 | `phone: logKn` |
| Italic/13/400 | IM Fell English | 13px | 400 |  | 10 | `phone: shipView__sheet-0__sv-main-0__svhint-0` |
| Display/14/400 | IM Fell English SC | 14px | 400 | small caps | 10 | `phone: assistPop__ah-0` |
| Display/13/400 | IM Fell English SC | 13px | 400 |  | 8 | `phone: routePanel__rrow-0__rt-0` |
| Body/15/400 | Spectral | 15px | 400 |  | 6 | `phone: swap1` |
| Display/13.5/400 | IM Fell English SC | 13.5px | 400 |  | 6 | `phone: portCard__ptbl-1__h4-0` |
| Data/11/400 +0.33px | IBM Plex Mono | 11px | 400 | tracking 0.33px | 6 | `phone: windSpd` |
| Data/15/700 +0.33px | IBM Plex Mono | 15px | 700 | tracking 0.33px | 6 | `phone: windSpd__b-0` |
| Data/17/400 | IBM Plex Mono | 17px | 400 |  | 4 | `phone: paneV3__ctog-0` |
| Italic/14/400 italic | IM Fell English | 14px | 400 | italic | 4 | `phone: shipView__sheet-0__sv-main-0__plate-3__i-0` |
| Data/12.5/600 | IBM Plex Mono | 12.5px | 600 |  | 4 | `phone: posTxt__mono-0` |
| Data/10.5/400 caps +1.05px | IBM Plex Mono | 10.5px | 400 | uppercase, tracking 1.05px | 3 | `desktop: paneV3__plabel-0` |
| Display/20/400 | IM Fell English SC | 20px | 400 |  | 2 | `phone: shipView__sheet-0__sv-main-0__sv-top-0__h2-0` |
| Italic/30/400 italic | IM Fell English | 30px | 400 | italic | 2 | `phone: shipView__sheet-0__sv-main-0__plate-3__b-0` |
| Data/10/700 | IBM Plex Mono | 10px | 700 |  | 2 | `phone: svStrip__sw-1` |
| Body/12.5/600 | Spectral | 12.5px | 600 |  | 2 | `phone: destTxt__b-0` |
| Body/15/600 | Spectral | 15px | 600 |  | 2 | `phone: trimTxt__pct-1` |

## Sizes and spacing

| Token | Value | Notes |
|---|---|---|
| icon | 38px | tab-bar icon buttons (`tbChart`, `tbView`, `tbShip`, `tbBook`, `ctlIcon`) |
| icon-gap | 22px | gap between tab-bar icons |
| gap | 8px desktop / 6px phone | general panel gap (`--gp`) |
| radius | 2–3px buttons, 0 bars | the look is square-cornered paper; keep radii tiny |
| border | 1px ink on buttons and panels, 2px ink under the top bar | |

Phone layout switches at 860px wide: at 860 or less the game uses the phone layout (bottom tab bar, controls in a drawer); above it the desktop layout (side dock at 340px wide, 3D or chart view fills the rest).

## Screens

### Phone

| Frame | File | Height | Elements | Main regions (top-level layers) |
|---|---|---|---|---|
| 3D view | `svg/phone/3D.svg` | 844px | 32 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `tabbar` |
| Assists | `svg/phone/Assists.svg` | 844px | 46 | `bar-0`, `infobar-1`, `assistPop`, `paneV3`, `chartwrap-0`, `toast`, `tabbar` |
| Navigator's book | `svg/phone/Book.svg` | 844px | 55 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `posTxt`, `destTxt`, `noonTxt` |
| Sea chart | `svg/phone/Chart.svg` | 844px | 50 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `routePanel`, `toast`, `paneV3`, `tabbar` |
| Helm + legend + heave log | `svg/phone/Helm-plus.svg` | 1938px | 138 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `side-0`, `hdgTxt`, `tabbar` |
| Helm controls | `svg/phone/Helm.svg` | 1823px | 120 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `side-0`, `windSpd`, `tabbar` |
| Menu | `svg/phone/Menu.svg` | 844px | 40 | `bar-0`, `infobar-1`, `menuPop`, `paneV3`, `chartwrap-0`, `toast`, `tabbar` |
| Port card | `svg/phone/Port.svg` | 844px | 99 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `routePanel`, `portCard`, `toast`, `paneV3` |
| Ship (cutaway, crew) | `svg/phone/Ship.svg` | 3664px | 334 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `tabbar`, `svBill`, `svStrip` |
| Skip-ahead dialog | `svg/phone/Skip.svg` | 844px | 54 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `routePanel`, `toast`, `skipBar`, `paneV3` |
| Info strip open | `svg/phone/Strip.svg` | 853px | 45 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `toast`, `tabbar` |

### Desktop

| Frame | File | Height | Elements | Main regions (top-level layers) |
|---|---|---|---|---|
| 3D view | `svg/desktop/3D.svg` | 1199px | 131 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `side-0`, `compassBox`, `toast`, `hdgTxt` |
| Assists | `svg/desktop/Assists.svg` | 1258px | 151 | `bar-0`, `infobar-1`, `assistPop`, `paneV3`, `chartwrap-0`, `side-0`, `compassBox`, `toast` |
| Navigator's book | `svg/desktop/Book.svg` | 1199px | 154 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `side-0`, `compassBox`, `toast`, `hdgTxt` |
| Sea chart | `svg/desktop/Chart.svg` | 1199px | 136 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `side-0`, `paneV3`, `routePanel`, `toast` |
| Helm + legend + heave log | `svg/desktop/Helm-plus.svg` | 1317px | 149 | `bar-0`, `infobar-1`, `paneV3`, `chartwrap-0`, `side-0`, `compassBox`, `toast`, `hdgTxt` |
| Menu | `svg/desktop/Menu.svg` | 1258px | 145 | `bar-0`, `infobar-1`, `menuPop`, `paneV3`, `chartwrap-0`, `side-0`, `compassBox`, `toast` |
| Port card | `svg/desktop/Port.svg` | 1199px | 185 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `side-0`, `paneV3`, `routePanel`, `portCard` |
| Ship (cutaway, crew) | `svg/desktop/Ship.svg` | 2496px | 433 | `bar-0`, `infobar-1`, `shipView`, `svBill`, `paneV3`, `chartwrap-0`, `side-0`, `svStrip` |
| Skip-ahead dialog | `svg/desktop/Skip.svg` | 1199px | 140 | `bar-0`, `infobar-1`, `paneChart`, `chartwrap-0`, `side-0`, `paneV3`, `routePanel`, `toast` |

Frames taller than the screen (Ship, Helm, the desktop side dock) include the content you reach by scrolling; the dashed `_guide__screen-bottom` line marks where the screen ends.

## What the spec does not carry

- **Live canvases** (`view3d`, `hud`, `chart`, `dial`, `baro`, `shipCv` and similar) are drawn by the game every frame. They appear as dashed placeholder boxes with the right name and size. Design the frame around them; their insides are not Figma territory.
- **Shadows and gradients** are listed in the CSV `shadow` column but not drawn in the SVG. Add them in Figma as effects if you want them.
- **Mixed inline text** (for example `windTxt`: "From **E by S** · Force 4") arrives as a parent text layer plus a bold child layer, which can overlap slightly. Retype these as one text layer with mixed styling and keep the parent's name.
- **Text positions** are measured boxes; baselines are estimated, so a line may sit a pixel or two off. Sizes, fonts and colours are exact.
- **States**: each frame shows one state (for example the Ship tab with the brig selected, day theme). Night colours come from the token modes.

## Getting changes back into the game

When you have edited the frames, the next step is a sync: read your Figma file (via the Figma connector or an exported JSON), match layers by name through `layer-map.json`, and turn the differences into CSS changes (colours, fonts, sizes, spacing, positions). Nothing changes in the game until you say publish.
