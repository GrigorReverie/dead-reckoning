# Dead Reckoning

A browser game: captain the brig *Hesper* in the Lesser Antilles, March 1745. Navigate by dead reckoning, sail by the wind, manage the crew.

Play it: the GitHub Pages address of this repository. On a phone, use "Add to Home Screen" (iPhone, in Safari) or "Install app" (Android, in Chrome) to get a full-screen app that also works offline.

## Updating the game
Edit `index.html` and push to `main`. GitHub Pages republishes in a minute or two, and the installed app picks up the new version the next time it is opened while online.

## Saves across devices
Menu, Save game (or "Saved games and sync" on the start screen). Saves are kept on the device. To carry them between devices, connect GitHub sync with a classic personal access token that has only the `gist` permission. Saves are then mirrored into a private gist called "Dead Reckoning saves" in your own account.

## Files
- `index.html` the whole game
- `three.min.js` three.js r128, bundled for offline play
- `manifest.webmanifest`, `icons/`, `sw.js` the installable-app parts
