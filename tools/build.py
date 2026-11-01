#!/usr/bin/env python3
"""Assemble the playable index.html from a game's source plus engine modules.

Usage: python3 tools/build.py [game]      (default: dead-reckoning)

A game source line that is exactly `//@engine path/to/file.js` (path relative
to engine/) is replaced by that file's contents. With no such lines the output
is the source, byte for byte. Dead Reckoning is served from the repo root, so
its output goes to ./index.html; other games go to games/<game>/index.html.
"""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent

def build(game):
    src = (ROOT / "games" / game / "index.src.html").read_text(encoding="utf-8")
    out = []
    for line in src.split("\n"):
        s = line.strip()
        if s.startswith("//@engine "):
            mod = ROOT / "engine" / s[len("//@engine "):].strip()
            out.append(mod.read_text(encoding="utf-8").rstrip("\n"))
        else:
            out.append(line)
    return "\n".join(out)

def target(game):
    return ROOT / "index.html" if game == "dead-reckoning" else ROOT / "games" / game / "index.html"

if __name__ == "__main__":
    game = sys.argv[1] if len(sys.argv) > 1 else "dead-reckoning"
    target(game).write_text(build(game), encoding="utf-8", newline="")
    print("built", target(game).relative_to(ROOT))
