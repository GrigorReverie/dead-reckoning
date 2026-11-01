#!/usr/bin/env python3
"""Checks: catalog.json matches its schema, and index.html is up to date with its source.
Usage: python3 tools/check.py"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build
ROOT = build.ROOT
errs = []

cat = json.loads((ROOT / "engine/catalog.json").read_text())
REQ = {"id": str, "module": str, "summary": str, "inputs": list, "outputs": list,
       "knobs": list, "tags": list, "adaptation": str, "games": list}
ids = set()
for i, f in enumerate(cat.get("features", [])):
    for k, t in REQ.items():
        if not isinstance(f.get(k), t):
            errs.append(f"feature {i} ({f.get('id')}): '{k}' missing or not {t.__name__}")
    if f.get("id") in ids:
        errs.append(f"duplicate id {f.get('id')}")
    ids.add(f.get("id"))
    mod = f.get("module")
    if isinstance(mod, str) and mod and not (ROOT / "engine" / mod).exists():
        errs.append(f"{f.get('id')}: module file engine/{mod} not found")

for g in sorted((ROOT / "games").iterdir()):
    if (g / "index.src.html").exists():
        if build.target(g.name).read_text(encoding="utf-8") != build.build(g.name):
            errs.append(f"{g.name}: built index.html is out of date; run python3 tools/build.py {g.name}")

if errs:
    print("\n".join(errs)); sys.exit(1)
print(f"ok: {len(cat.get('features', []))} catalog features, builds up to date")
