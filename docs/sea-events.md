# Adding a random sea event

Events live in `index.html` (and `preview/index.html` while in preview), in the block "RANDOM SEA EVENTS".

1. Add an entry to `EV_DEFS`. Pick the `kind` that behaves like your event:
   - `salvage`: a wreck that drifts; sail close to be offered a choice (template: derelict).
   - `rescue`: someone in need who stays put (template: castaway).
   - `hazard`: a weather cell that moves down on the ship (template: squall).
2. Give it `name`, `icon` (`wreck`, `smoke` or `squall`, or add a case in `evIcon`), `mesh` (a function in `EV_MESH`), `sight` (nm), `life` (hours), `w` (spawn weight), `title`, `text` and `opts`.
3. Each option has `out`: a list of `{p, text, fx}`. One is picked by weight `p`, and `fx` may set `purse` (shillings), `hull`, `rig`, `mo`, `hurt`, `rep`, `beer`, `bis`, `spares`, `cargo:"rich"` and `squall` (boost).
4. Add a trigger button for it in the `events` entry of `SCN_MECH`, and an option in the Cheats menu spawn list.
