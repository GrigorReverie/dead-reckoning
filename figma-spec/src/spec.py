import json, csv, glob, os, collections
OUT='/mnt/project-files/dead-reckoning/figma-spec/'
exec(open('gen.py').read().split("R = [build")[0].split("def build")[0])  # tokens + titles
typo=json.load(open('typo.json'))
ROLE={'Spectral':'Body','IBM Plex Mono':'Data','IM Fell English SC':'Display','IM Fell English':'Italic'}
L=[]
L+=["# Dead Reckoning: Figma-ready UI spec","",
"Measured from the live game (10 March 1745, 07:00, day theme) on a phone frame of 390 × 844 and a desktop frame of 1280 × 800. Every layer is named after the real panel or button in the game, so a later Figma-to-game sync can match them one to one.","",
"## What is in this folder","",
"| File | Use |","|---|---|",
"| `svg/phone/*.svg`, `svg/desktop/*.svg` | One importable frame per screen. Drag into Figma: groups become layers named after the game's elements, text stays editable. |",
"| `tables/<device>/<screen>.csv` | Every element on that screen: layer name, CSS selector, x, y, w, h, z-order, text, font, colour (with token name), background, radius, padding, layout, shadow. Opens in Sheets or Figma table plugins. |",
"| `tokens.json` | Colours (day and night modes), font families and sizes in the W3C design-token format. Import as Figma Variables (Variables panel > import, or the Tokens Studio plugin). |",
"| `layer-map.json` | Layer name → exact game selector, per device. This is the contract the sync will read. |","",
"## Importing into Figma","",
"1. In Figma, create a page per device (Phone, Desktop).",
"2. Drag the SVGs from `svg/phone/` onto the Phone page (and the same for Desktop). Each becomes a frame titled like `phone / Sea chart`.",
"3. Fonts are all Google Fonts, which Figma has built in: Spectral, IBM Plex Mono, IM Fell English, IM Fell English SC.",
"4. Import `tokens.json` as Variables, then swap hard colours for variables (the CSVs name the token for each colour, e.g. `#2e2519 ink`).",
"5. Create the text styles listed below and apply them; the CSV `font` column tells you which one each layer uses.","",
"## Layer naming (keep these names)","",
"- An element with an id in the game keeps that id as its layer name: `tbChart`, `bSkip`, `clock`, `portCard`, `compassBox`.",
"- An element without an id is named from its nearest id'd ancestor down, joined with `__`: `portCard__ptbl-1__span-0` is the first span in the second `ptbl` block inside `portCard`. The number is its position among siblings of the same kind.",
"- Sub-layers inside an element end in `__bg`, `__border`, `__border-bottom`, `__text`, `__icon`, `__box` (checkbox) or `__canvas`. These are the parts of one element, not new elements.",
"- Renaming or regrouping a layer breaks its link to the game. Adding new layers is fine; give them new names and the sync will report them as new.",
"- Layers starting with `_guide` are helpers (for example the dashed line marking the bottom of the screen where content scrolls beyond it). Hide or delete them freely.","",
"## Colours","",
"Use these as Variables with two modes, Day and Night. The game swaps the whole set at night.","",
"| Token | Day | Night | CSS variable | Used for |","|---|---|---|---|---|"]
use={'desk':'page and bar background','desk2':'deeper desk tone','paper':'panels, cards, buttons','paper2':'inset panels','ink':'main text, borders, pressed buttons','inkSoft':'secondary text, labels','rule':'divider lines','sea':'sea, current arrows','ochre':'warnings, danger, red accents','shoal':'shallows','brass':'highlights, gauges','pencil':'chart pencil marks'}
for k in DAY: L.append("| %s | `%s` | `%s` | `%s` | %s |"%(k,DAY[k],NIGHT[k],CSSVAR[k],use[k]))
L+=["","Colours seen in the capture that are not tokens: `#3f7a4a` (green, good state), `#2d6bd6` (blue, wind speed readout), `#a8452c` (gradient red). Consider turning them into tokens in Figma.","",
"## Text styles","",
"Four families. Suggested Figma style names are `Role/size/weight`. Sorted by how often they appear.","",
"| Suggested style | Family | Size | Weight | Extras | Layers | Example layer |","|---|---|---|---|---|---|---|"]
for (ff,fs,fw,fst,caps,tt,ls),n,ex in typo:
    if n<2: continue
    extras=', '.join(x for x in [fst if fst=='italic' else '', 'small caps' if caps=='small-caps' else '', 'uppercase' if tt=='uppercase' else '', ('tracking '+ls) if ls not in('normal','0px') else ''] if x)
    name='%s/%g/%s%s%s'%(ROLE.get(ff,ff),fs,fw,' italic' if fst=='italic' else '',' caps' if tt=='uppercase' else '')+((' +'+ls) if ls not in('normal','0px') else '')
    L.append("| %s | %s | %gpx | %s | %s | %d | `%s` |"%(name,ff,fs,fw,extras or '',n,ex))
L+=["","## Sizes and spacing","",
"| Token | Value | Notes |","|---|---|---|",
"| icon | 38px | tab-bar icon buttons (`tbChart`, `tbView`, `tbShip`, `tbBook`, `ctlIcon`) |",
"| icon-gap | 22px | gap between tab-bar icons |",
"| gap | 8px desktop / 6px phone | general panel gap (`--gp`) |",
"| radius | 2–3px buttons, 0 bars | the look is square-cornered paper; keep radii tiny |",
"| border | 1px ink on buttons and panels, 2px ink under the top bar | |","",
"Phone layout switches at 860px wide: at 860 or less the game uses the phone layout (bottom tab bar, controls in a drawer); above it the desktop layout (side dock at 340px wide, 3D or chart view fills the rest).","",
"## Screens",""]
for dev in ['phone','desktop']:
    L+=["### %s"%dev.capitalize(),"","| Frame | File | Height | Elements | Main regions (top-level layers) |","|---|---|---|---|---|"]
    for f in sorted(glob.glob(OUT+'tables/%s/*.csv'%dev)):
        rows=list(csv.DictReader(open(f)))
        nm=os.path.basename(f)[:-4]
        key=nm.replace('-plus','+')
        svgh=open(OUT+'svg/%s/%s.svg'%(dev,nm)).read().split('height="')[1].split('"')[0]
        tops=[r['layer'] for r in rows if '__' not in r['layer'] and r['tag'] in('DIV','ASIDE','SECTION') ]
        tops=list(dict.fromkeys(tops))[:8]
        L.append("| %s | `svg/%s/%s.svg` | %spx | %d | %s |"%(SCREEN_TITLE.get(key,key),dev,nm,svgh,len(rows),', '.join('`%s`'%t for t in tops)))
    L.append("")
L+=["Frames taller than the screen (Ship, Helm, the desktop side dock) include the content you reach by scrolling; the dashed `_guide__screen-bottom` line marks where the screen ends.","",
"## What the spec does not carry","",
"- **Live canvases** (`view3d`, `hud`, `chart`, `dial`, `baro`, `shipCv` and similar) are drawn by the game every frame. They appear as dashed placeholder boxes with the right name and size. Design the frame around them; their insides are not Figma territory.",
"- **Shadows and gradients** are listed in the CSV `shadow` column but not drawn in the SVG. Add them in Figma as effects if you want them.",
"- **Mixed inline text** (for example `windTxt`: \"From **E by S** · Force 4\") arrives as a parent text layer plus a bold child layer, which can overlap slightly. Retype these as one text layer with mixed styling and keep the parent's name.",
"- **Text positions** are measured boxes; baselines are estimated, so a line may sit a pixel or two off. Sizes, fonts and colours are exact.",
"- **States**: each frame shows one state (for example the Ship tab with the brig selected, day theme). Night colours come from the token modes.","",
"## Getting changes back into the game","",
"When you have edited the frames, the next step is a sync: read your Figma file (via the Figma connector or an exported JSON), match layers by name through `layer-map.json`, and turn the differences into CSS changes (colours, fonts, sizes, spacing, positions). Nothing changes in the game until you say publish.",""]
open(OUT+'SPEC.md','w').write('\n'.join(L))
print(len(L))
