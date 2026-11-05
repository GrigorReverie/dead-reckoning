# Dead Reckoning design system (draft, awaiting approval)

Look: a drafting table. Cobalt-brown ink on parchment, brass instruments, red-ochre warnings. Period chart and print, not a modern app. One responsive layout for phone and desktop. Light by day, deep blue "night chart" after dusk (auto, follows the game clock).

Source of truth: `design/tokens.json`. `python3 tools/tokens.py` writes `design/tokens.css`; `--check` reports drift against the game's `:root`. Nothing is wired into the game yet.

## Audit: what the game uses today (index.src.html)
- **Colour:** 11 named variables already (desk, desk-2, paper, paper-2, ink, ink-soft, rule, sea, ochre, brass, pencil), with a full dark set. `var(--ink)` is used 192 times, `--paper` 73, `--rule` 37. Good base.
- **Hard-coded colours that bypass the tokens:** about 60 distinct hex values. Main ones: red `#a8452c` (20x, a near-copy of ochre `#b2452c`), `#a83b2f` (9x, crew coat), green `#3f7a4a`/`#4d7d4e` (trim, stores), blue `#2a4fa8`/`#2d6bd6`/`#2f52b0` (selection and the primary-button hover), brown `#3a2614` (chart ink). Translucent glass is `rgba(246,238,217,.93)` repeated ~20 times and ignores dark mode except by a long override list.
- **Fonts:** four roles, all already variables: display (IM Fell English SC), italic (IM Fell English), body (Spectral), data (IBM Plex Mono). Fonts can be swapped live by the Look system.
- **Type sizes:** 14 distinct px sizes (9.5 to 26). Six cover almost everything: 10.5, 12, 13, 15, 17, 22.
- **Radius:** 2px (buttons), 3px (docks, toolbar buttons), 6px (round tool buttons), a few strays (4, 9, 12, 22).
- **Spacing:** 6px and 8px gaps dominate, then 4, 10, 3, 2. Padding mostly 6x8, 8x10, 5x10.
- **Icons:** pen-and-ink line icons, 24 viewBox, stroke 1.6 (tabs 1.7, fine 1), shown at 18, 22 or 26 px; tool buttons 40px with 24px gaps (`--ic`, `--icg`). Stroke width is adjustable in Look.
- **Elevation:** three shadows (dock, float, card). Z-index has 20+ values; the real layers are HUD 3, docks 16, menus 40, popovers 60, sheets 70, modals 91.
- **Components found:** `.btn` (+ `.primary`, `.sm`, `.ico`), `.tb` (top-bar button), `.seg` (segmented), `.tbicon`, `.fsb`, `.ctog`, `.mapicon`, `.dock`, `.panel`, `.card`, `.menupop`, `.portcard`, `.rwind` (bar), `.warn`, `.muted`, `.svhint`, `.trim.good/fair/bad`, chips and sliders in the Look sheet.
- **Existing Look system** (Menu > Preview > Look): runtime overrides for the colours, outline width, radius, opacity, shadow, texture, fonts, label case, icon weight, button style. Tokens must stay compatible: the Look system overrides the same variable names.

## Proposed token set
Names stay as the game already has them, so adopting costs nothing.

| Group | Tokens |
|---|---|
| Surface | desk, desk-2, paper, paper-2 |
| Text and line | ink, ink-soft, rule |
| Meaning | brass (focus, instruments, caution), ochre (warning, danger, destination), sea (water, wind), pencil (plotted lines, selection), **good** (new: healthy, profit), **chart-ink** (new) |
| Type | f-display, f-italic, f-body, f-data; scale fs-micro 10.5, fs-small 12, fs-body 13, fs-lead 15, fs-head 17, fs-brand 22 |
| Shape | r-1 2, r-2 3, r-3 6, r-4 12; line 1 and 2 px |
| Space | sp-1..sp-7 = 2, 4, 6, 8, 12, 16, 24 |
| Icon | stroke 1.6; sizes 18, 22, 26; tool button 40 |
| Elevation and layers | shadow-dock, shadow-float, shadow-card, glass; z-hud, z-dock, z-menu, z-popover, z-sheet, z-modal |

## Merge proposals (need approval)
1. Fold red `#a8452c` into `--ochre`; keep `#a83b2f` only as the Marine coat colour.
2. Add `--good` and replace the three greens.
3. Replace the primary-button hover `#2f52b0` (a stray bright blue) with `--paper-2` over ink, or a brass edge.
4. Selection blue `#2a4fa8`/`#2d6bd6` becomes `--pencil`.
5. Snap font sizes to the six-step scale and gaps to the spacing scale during normal edits, not in one sweep.

## Adoption plan (after approval)
1. Add the new variables (good, chart-ink, scales) to `:root`; no visual change.
2. Swap hard-coded colours for variables in small batches, checking each screen.
3. Keep `tools/tokens.py --check` in `tools/check.py` so drift is caught.
4. Components sheet (dashboard) shows every piece in every state; new UI should be copied from it.

## Rules for new UI
Use tokens, never raw hex. Buttons: `.btn`, `.tb`, `.ico` only. Labels over data: `f-data` micro caps. Headings: `f-display`. Every pressed state is `aria-pressed` ink fill. Focus ring is brass 2px. Both themes must work with no extra CSS.
