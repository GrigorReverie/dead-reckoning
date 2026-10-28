import json, re, os, html, csv, collections

SRC = '/mnt/project-files/dead-reckoning/ui-layout-tuner-src/'
OUT = '/mnt/project-files/dead-reckoning/figma-spec/'
DEV = {'phone': 'phone', 'desk': 'desktop'}
SCREEN_TITLE = {
    '3D': '3D view', 'Skip': 'Skip-ahead dialog', 'Chart': 'Sea chart', 'Port': 'Port card',
    'Ship': 'Ship (cutaway, crew)', 'Book': "Navigator's book", 'Helm': 'Helm controls',
    'Helm+': 'Helm + legend + heave log', 'Menu': 'Menu', 'Assists': 'Assists', 'Strip': 'Info strip open'}

def rgb(c):
    m = re.match(r'rgba?\(([^)]+)\)', c or '')
    if not m: return None, 0
    p = [float(x) for x in m.group(1).replace('/', ',').split(',')]
    a = p[3] if len(p) > 3 else 1
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in p[:3]), a

def px(v):
    try: return float(str(v).split()[0].replace('px', ''))
    except: return 0.0

def fam(f): return f.split(',')[0].strip().strip('"')

def esc(s): return html.escape(s, quote=True)

def strip_tags(h):
    h = re.sub(r'<svg.*?</svg>', '', h or '', flags=re.S)
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h))).strip()

def seg(part):
    m = re.match(r'([a-zA-Z0-9]+)(?:\.([^:]+))?:(\d+)$', part)
    if not m: return re.sub(r'[^A-Za-z0-9_-]', '', part.lstrip('#'))
    tag, cls, i = m.groups()
    return '%s-%s' % (cls or tag, i)

def layer_name(key):
    parts = key.split('>')
    # start from the deepest element that has an id
    start = 0
    for i, p in enumerate(parts):
        if p.startswith('#'): start = i
    parts = parts[start:]
    parts = [p for p in parts if p not in ('div:0', 'div.main:2')] or parts
    return '__'.join(seg(p) for p in parts)

# design tokens from the game's CSS
DAY = dict(desk='#ebdfc2', desk2='#d9c9a2', paper='#f6eed9', paper2='#ece2c8', ink='#2e2519', inkSoft='#7b6a55',
           rule='#cbbd98', sea='#4a6a8a', ochre='#b2452c', shoal='#7b6a55', brass='#b8862a', pencil='#4a5a8a')
NIGHT = dict(desk='#0b1a40', desk2='#10245a', paper='#132a63', paper2='#0f2252', ink='#eadfb4', inkSoft='#a9a283',
             rule='#2d4688', sea='#8aa8d6', ochre='#e4905f', shoal='#a9a283', brass='#d9a940', pencil='#9db2e2')
CSSVAR = dict(desk='--desk', desk2='--desk-2', paper='--paper', paper2='--paper-2', ink='--ink', inkSoft='--ink-soft',
              rule='--rule', sea='--sea', ochre='--ochre', shoal='--shoal', brass='--brass', pencil='--pencil')
HEX2TOK = {}
for k, v in DAY.items(): HEX2TOK.setdefault(v, k)
FONTS = {'Spectral': 'body', 'IBM Plex Mono': 'data', 'IM Fell English SC': 'display', 'IM Fell English': 'italic'}

def tok(hexv):
    return HEX2TOK.get(hexv, '')

def build(devkey):
    D = json.load(open(SRC + 'data-%s.json' % devkey))
    W, H, S = D['w'], D['h'], D['styles']
    dev = DEV[devkey]
    os.makedirs(OUT + 'svg/' + dev, exist_ok=True)
    os.makedirs(OUT + 'tables/' + dev, exist_ok=True)
    layers = {}
    typo = collections.Counter(); typo_ex = {}
    colours = collections.Counter()
    for sname, scr in D['screens'].items():
        nodes = scr['nodes']
        keys = {n['k'] for n in nodes}
        names = {}
        used = collections.Counter()
        for n in nodes:
            nm = layer_name(n['k'])
            used[nm] += 1
            if used[nm] > 1: nm += '_%d' % used[nm]
            names[n['k']] = nm
        kids = collections.defaultdict(list)
        for n in nodes:
            par = n.get('p') if n.get('p') in keys else None
            kids[par].append(n)
        maxb = max([H] + [n['r'][1] + n['r'][3] for n in nodes])
        rows = []
        out = []

        def emit(n, depth):
            st = S[n['s']]
            x, y, w, h = n['r']
            nm = names[n['k']]
            ind = '  ' * depth
            label = n.get('n') or ''
            out.append('%s<g id="%s" data-selector="%s"%s>' % (ind, esc(nm), esc(n['k']), (' data-label="%s"' % esc(label)) if label else ''))
            bg, ba = rgb(st['backgroundColor'])
            rad = px(st['borderRadius'])
            bws = [px(st['border%sWidth' % s]) if st['border%sStyle' % s] != 'none' else 0 for s in ('Top', 'Right', 'Bottom', 'Left')]
            bcs = [rgb(st['border%sColor' % s])[0] for s in ('Top', 'Right', 'Bottom', 'Left')]
            op = float(st.get('opacity', 1) or 1)
            opa = ' opacity="%.2f"' % op if op < 0.99 else ''
            if n['t'] == 'CANVAS':
                out.append('%s  <rect id="%s__canvas" x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#9fb3c8" fill-opacity="0.35" stroke="#4a6a8a" stroke-dasharray="6 4"/>' % (ind, esc(nm), x, y, w, h))
                out.append('%s  <text x="%.1f" y="%.1f" font-family="IBM Plex Mono" font-size="11" fill="#4a6a8a">live canvas · #%s (drawn by the game)</text>' % (ind, x + 6, y + (32 if n.get('id') == 'hud' else 16), esc(n.get('id', nm))))
            else:
                if ba > 0.02 or 'gradient' in st['backgroundImage']:
                    fill = bg if ba > 0.02 else '#b8862a'
                    sw = bws[0] if len(set(bws)) == 1 and bws[0] > 0 else 0
                    stroke = ' stroke="%s" stroke-width="%.1f"' % (bcs[0], sw) if sw else ''
                    fo = ' fill-opacity="%.2f"' % ba if ba < 0.99 else ''
                    out.append('%s  <rect id="%s__bg" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"%s%s%s/>' % (ind, esc(nm), x, y, w, h, rad, fill, fo, stroke, opa))
                    colours[fill] += 1
                    if sw: bws = [0, 0, 0, 0]
                elif len(set(bws)) == 1 and bws[0] > 0:
                    out.append('%s  <rect id="%s__border" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="none" stroke="%s" stroke-width="%.1f"%s/>' % (ind, esc(nm), x, y, w, h, rad, bcs[0], bws[0], opa))
                    bws = [0, 0, 0, 0]
                for i, (bw, bc) in enumerate(zip(bws, bcs)):
                    if bw <= 0: continue
                    side = 'top right bottom left'.split()[i]
                    x1, y1, x2, y2 = [(x, y + bw / 2, x + w, y + bw / 2), (x + w - bw / 2, y, x + w - bw / 2, y + h),
                                      (x, y + h - bw / 2, x + w, y + h - bw / 2), (x + bw / 2, y, x + bw / 2, y + h)][i]
                    out.append('%s  <line id="%s__border-%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (ind, esc(nm), side, x1, y1, x2, y2, bc, bw))
                # icon
                svgm = re.search(r'<svg[^>]*>.*?</svg>', n.get('h', '') or '', re.S)
                if n['t'] == 'svg' or svgm:
                    s = n['h'] if n['t'] == 'svg' else svgm.group(0)
                    if not s.rstrip().endswith('</svg>'): s = s[:s.rfind('>') + 1] + '</svg>'
                    iw = px(re.search(r'width="([\d.]+)', s).group(1)) if re.search(r'\swidth="([\d.]+)', s) else min(w, h) * 0.62
                    ih = px(re.search(r'height="([\d.]+)', s).group(1)) if re.search(r'\sheight="([\d.]+)', s) else iw
                    ix, iy = (x, y) if n['t'] == 'svg' else (x + (w - iw) / 2, y + (h - ih) / 2)
                    col = rgb(st['color'])[0]
                    s = s.replace('currentColor', col)
                    s = re.sub(r'<svg[^>]*>', lambda m: re.sub(r'\s(id|style|class|data-[\w-]+|aria-[\w-]+)="[^"]*"', '', m.group(0)), s, count=1)
                    s = re.sub(r'<svg', '<svg id="%s__icon" x="%.1f" y="%.1f"' % (esc(nm), ix, iy), s, count=1)
                    s = re.sub(r'\s(width|height)="[^"]*"', '', s, count=0)
                    s = s.replace('<svg id', '<svg width="%.1f" height="%.1f" id' % (iw, ih), 1)
                    out.append(ind + '  ' + s)
                # text
                txt = ''
                if n['t'] == 'TABLE':
                    trs = re.findall(r'<tr[^>]*>(.*?)</tr>', n.get('h', ''), re.S)
                    lines = [' | '.join(strip_tags(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, re.S)) for tr in trs]
                else:
                    if n['t'] in ('BUTTON', 'LABEL'): txt = strip_tags(n.get('h', ''))
                    elif n['t'] == 'INPUT': txt = '' if n.get('ty') in ('checkbox', 'radio', 'range') else n.get('v', '')
                    else: txt = n.get('x', '')
                    lines = [txt] if txt else []
                if n['t'] == 'INPUT' and n.get('ty') in ('checkbox', 'radio'):
                    out.append('%s  <rect id="%s__box" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="2" fill="%s" stroke="%s"/>' % (ind, esc(nm), x, y, w, h, '#2e2519' if n.get('ck') else 'none', '#2e2519'))
                if n['t'] == 'LABEL' and 'checkbox' in n.get('h', ''):
                    ck = 'checked' in n['h']
                    out.append('%s  <rect id="%s__box" x="%.1f" y="%.1f" width="13" height="13" rx="2" fill="%s" stroke="%s"/>' % (ind, esc(nm), x + px(st['paddingLeft']), y + (h - 13) / 2, '#2e2519' if ck else 'none', '#2e2519'))
                fs = px(st['fontSize']) or 14
                if lines:
                    ff = fam(st['fontFamily'])
                    col, ca = rgb(st['color'])
                    fw = st['fontWeight']; fst = st['fontStyle']
                    al = st['textAlign']
                    if n['t'] == 'BUTTON' and al in ('start', 'left') and st['justifyContent'] in ('center', 'normal'): al = 'center'
                    pl, pr = px(st['paddingLeft']), px(st['paddingRight'])
                    if n['t'] == 'LABEL' and 'checkbox' in n.get('h', ''): pl += 18
                    anchor, tx = ('middle', x + pl + (w - pl - pr) / 2) if al == 'center' else (('end', x + w - pr) if al in ('right', 'end') else ('start', x + pl))
                    lh = px(st['lineHeight']) if st['lineHeight'] != 'normal' else fs * 1.25
                    if lh <= 0: lh = fs * 1.25
                    tt = st['textTransform']
                    extra = ''
                    if fst == 'italic': extra += ' font-style="italic"'
                    if st['letterSpacing'] not in ('normal', '0px'): extra += ' letter-spacing="%s"' % px(st['letterSpacing'])
                    if st['fontVariantCaps'] == 'small-caps': extra += ' font-variant="small-caps"'
                    total = lh * len(lines)
                    y0 = y + max(px(st['paddingTop']), (h - total) / 2) + lh / 2 + fs * 0.35
                    out.append('%s  <text id="%s__text" font-family="%s" font-size="%.1f" font-weight="%s" fill="%s"%s text-anchor="%s"%s>' % (ind, esc(nm), esc(ff), fs, fw, col, ' fill-opacity="%.2f"' % ca if ca < 0.99 else '', anchor, extra))
                    for i, ln in enumerate(lines):
                        if tt == 'uppercase': ln = ln.upper()
                        out.append('%s    <tspan x="%.1f" y="%.1f">%s</tspan>' % (ind, tx, y0 + i * lh, esc(ln)))
                    out.append('%s  </text>' % ind)
                    tkey = (ff, fs, fw, fst, st['fontVariantCaps'], st['textTransform'], st['letterSpacing'])
                    typo[tkey] += 1; typo_ex.setdefault(tkey, nm)
                    colours[col] += 1
            ch = sorted(kids.get(n['k'], []), key=lambda c: (c['z'], c['o']))
            for c in ch: emit(c, depth + 1)
            out.append('%s</g>' % ind)
            bgc = rgb(st['backgroundColor'])
            rows.append(dict(layer=nm, selector=n['k'], label=label, tag=n['t'], x=x, y=y, w=w, h=h, z=n['z'],
                             text=(n.get('x') or strip_tags(n.get('h', '')) if n['t'] != 'TABLE' else 'table')[:80],
                             font='%s %s %s%s' % (fam(st['fontFamily']), st['fontSize'], st['fontWeight'], ' italic' if st['fontStyle'] == 'italic' else ''),
                             color='%s %s' % (rgb(st['color'])[0], tok(rgb(st['color'])[0])),
                             background=('%s %s' % (bgc[0], tok(bgc[0]))) if bgc[1] > 0.02 else '',
                             radius=st['borderRadius'], padding='%s %s %s %s' % (st['paddingTop'], st['paddingRight'], st['paddingBottom'], st['paddingLeft']),
                             layout=('%s %s gap %s' % (st['display'], st['flexDirection'], st['columnGap'])) if 'flex' in st['display'] else st['display'],
                             shadow=st['boxShadow'] if st['boxShadow'] != 'none' else ''))
            layers[nm] = n['k']

        for n in sorted(kids[None], key=lambda c: (c['z'], c['o'])):
            emit(n, 1)
        fname = sname.replace('+', '-plus')
        title = '%s / %s' % (dev, SCREEN_TITLE.get(sname, sname))
        svg = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, round(maxb), W, round(maxb)),
               '<title>%s</title>' % esc(title),
               '<g id="%s">' % esc(title.replace(' / ', '__').replace(' ', '-')),
               '  <rect id="page-background" x="0" y="0" width="%d" height="%d" fill="%s"/>' % (W, round(maxb), DAY['desk'])]
        svg += out
        if maxb > H + 1:
            svg.append('  <line id="_guide__screen-bottom-%dpx" x1="0" y1="%d" x2="%d" y2="%d" stroke="#b2452c" stroke-dasharray="8 6" stroke-width="1"/>' % (H, H, W, H))
        svg += ['</g>', '</svg>']
        open(OUT + 'svg/%s/%s.svg' % (dev, fname), 'w').write('\n'.join(svg))
        rows.sort(key=lambda r: (r['y'], r['x']))
        with open(OUT + 'tables/%s/%s.csv' % (dev, fname), 'w', newline='') as f:
            wr = csv.DictWriter(f, fieldnames=list(rows[0].keys())); wr.writeheader(); wr.writerows(rows)
        print(dev, sname, len(rows), round(maxb))
    return dict(dev=dev, W=W, H=H, screens=list(D['screens'].keys()), layers=layers, typo=typo, typo_ex=typo_ex, colours=colours)

R = [build('phone'), build('desk')]

# layer map for a later Figma -> game sync
json.dump({r['dev']: dict(sorted(r['layers'].items())) for r in R}, open(OUT + 'layer-map.json', 'w'), indent=1)

# DTCG design tokens (Figma variables / Tokens Studio)
tokens = {'color': {}, 'font': {}}
for k in DAY:
    tokens['color'][k] = {'$type': 'color', '$value': DAY[k], '$extensions': {'mode': {'day': DAY[k], 'night': NIGHT[k]}, 'css': CSSVAR[k]}}
tokens['font'] = {
    'body': {'$type': 'fontFamily', '$value': 'Spectral', '$extensions': {'css': '--f-body'}},
    'display': {'$type': 'fontFamily', '$value': 'IM Fell English SC', '$extensions': {'css': '--f-display'}},
    'italic': {'$type': 'fontFamily', '$value': 'IM Fell English', '$extensions': {'css': '--f-italic'}},
    'data': {'$type': 'fontFamily', '$value': 'IBM Plex Mono', '$extensions': {'css': '--f-data'}}}
tokens['size'] = {'icon': {'$type': 'dimension', '$value': '38px', '$extensions': {'css': '--ic'}},
                  'icon-gap': {'$type': 'dimension', '$value': '22px', '$extensions': {'css': '--icg'}},
                  'gap-desktop': {'$type': 'dimension', '$value': '8px', '$extensions': {'css': '--gp'}},
                  'gap-phone': {'$type': 'dimension', '$value': '6px', '$extensions': {'css': '--gp'}}}
json.dump(tokens, open(OUT + 'tokens.json', 'w'), indent=1)

# text styles summary for the spec
ts = collections.Counter(); ex = {}
for r in R:
    for k, v in r['typo'].items():
        ts[k] += v; ex.setdefault(k, '%s: %s' % (r['dev'], r['typo_ex'][k]))
with open('/tmp/claude-0/-home-user-dead-reckoning/ce88e2bc-6ba3-59ba-8500-27e8d847b66a/scratchpad/typo.json', 'w') as f:
    json.dump([[list(k), v, ex[k]] for k, v in ts.most_common()], f)
cl = collections.Counter()
for r in R: cl.update(r['colours'])
json.dump(cl.most_common(), open('/tmp/claude-0/-home-user-dead-reckoning/ce88e2bc-6ba3-59ba-8500-27e8d847b66a/scratchpad/col.json', 'w'))
