# Caritas cinematic revision — implementation contract

Status: isolated candidate; physical-device and integration gates PENDING.

## Baselines and authority

- Latest main inspected: `5ebd187710ee03db3f694e86d135b30f3ff4f191`.
- User's exact source: `e76adbb367445d68b95144f868673d99911e119b` (`feature/caritas-battle-v01-isolated`).
- Target: `caritas-heart-resonance`; preflight PASS before edits.
- Risk: HIGH (visual presentation, timed event ownership and input).
- User explicitly requests exact main dialogue, Abyss engulfing at battle entry, Shion/Shioriel face cut-ins for skill activation, darkness dissolving followed by one Caritas line before returning to the map. Dedicated technique art will be supplied later.

## Facts / limits

The supplied candidate uses unchanged main shared-dialogue assets but overrides their speaker colors, glows and layer order locally. Its victory path hides the battle immediately. Its skill changes numbers without a cut-in. These are the approved changes.

Main has 536/536 automated tests passing. Before any edits, the supplied candidate has 575/577 passing: a malformed local-dialogue-style assertion and a stale Starroad byte hash. The latter is outside this change: neither map pixels nor its test/baseline may be changed to hide the failure. Track its exact identity separately from newly introduced failures.

## WORKING

- `caritas-battle-event.js`, `caritas-battle-event.css`: isolated presentation and guarded sequence ownership.
- `hoshisuna-main.html`: cache version for changed local presentation only, if needed.
- Caritas runtime tests and this contract / EC-006 text.
- `assets/events/hoshisuna/cutins/shioriel-reference.png`: unchanged previously authored source sheet, displayed with CSS cropping. Source: `シオリエルの四面ピクセルスプライト.png`, Library ID `libfile_75e5903b399881919ca3ab81deec0974`. Existing Shion card sprite supplies the other portrait. This does not approve new character artwork.

## LOCKED

Main shared-dialogue JS/CSS, game/dialogue styles, main title and all other maps, audio, movement, following, navigation, collision implementation, Save/Progress/Journey, battle balance/card meanings and unrelated map assets. Main merge/public release is not part of this revision.

## Acceptance

1. Dialogue uses main files, mount, IDs, typing, tap-to-reveal, advance, geometry, colors and glow with no Caritas-specific override. Battle stacking adapts to the main UI.
2. Entering battle visibly engulfs the white Caritas in black-violet Abyss; commands unlock only after entry finishes.
3. Skill first shows both recognizable face cut-ins, then the technique effect, then applies the outcome once. Later dedicated technique art can replace the effect image without changing the sequence. Ordinary readings still finish without mandatory skill.
4. Winning keeps battle visible, shows the final reading response where applicable, dissolves the darkness, holds the freed white Caritas, then displays the existing line `……世話になった。` through main dialogue.
5. Only after the player advances that line does the map transition finish and release control/collision once. No advance/click may skip pending effects or commit twice.
6. Background / BFCache pause and resume the active sequence without consuming unseen stages, replaying entry or leaving controls locked. Reduced motion preserves the event order and readable holds.

## Verification

Run targeted runtime/order/input tests; byte-compare main dialogue sources; compare computed styles with the main component in browser at portrait/landscape sizes; verify visible start/cut-in/ending stages and ordinary-read/skill wins; run all repository tests and validators and report inherited failures honestly.

Required human smoke before main integration: exact-SHA iPhone dialogue parity, engulfing, both face cut-ins, freed Caritas -> single line -> map, repeated taps and background return. Automated browser checks are not physical-device evidence.
