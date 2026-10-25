# TAROT BREAKER — Caritas Cinematic Candidate v1 (Astra review handoff)

**Scope:** Starroad isolated `hoshisuna-main.html?dev=hoshisuna` only. **Main merge: STOP.**  
**Status:** IMPLEMENTED CANDIDATE / independent reviewer PENDING / CI PENDING / DEVICE GATE PENDING.  
**Source of truth:** working branch `feature/caritas-cinematics-v1-20261026` from user-specified `e76adbb367445d68b95144f868673d99911e119b`.  
**Latest main inspected prior to work:** `5ebd187710ee03db3f694e86d135b30f3ff4f191` (diverged; do not merge blindly).

## Approved owner experience (2026-10-25)
1. At the start of combat Caritas is engulfed by Abyss; original map sprite art remains white/unchanged, battle display uses a **non-destructive dark-violet overlayer**.
2. Battle control is available **only after** the Abyss ingress cinematic finishes.
3. Shion/Shioriel simultaneous cut-in presentation precedes the **existing** skill's actual outcome; portrait slots remain placeholders until owner-approved image assets are provided. **This does not claim that the final face art exists.**
4. At completion, battle stays visible while the black-violet mantle dissolves; an explicit "心象共鳴 成立" marker appears. Then one line of **existing** Caritas writing plays in the canonical shared main dialogue UI: 「……まだ、答えは出ぬ。だが……もう一度歩いてみようと思う。」
5. On final dialogue advance, and **not earlier**, switch to map and remove the isolated Caritas sprite and footprint. No production save or Progress writes.

## WORKING
- `caritas-battle-event.js` — isolated sequencing and strict input gate
- `caritas-battle-event.css` — only isolated cinematic layers and speaker Caritas tint
- `tests/caritas-main-interaction.test.cjs` — sequence and UI parity regressions
- This documentation

## LOCKED / OUT OF SCOPE
- Production/main `game.js`, `shared-dialogue.js`, `shared-dialogue.css`, ordinary scene/Progress/Save, routing, movement, companion and camera
- Caritas source WebP assets, map asset, collision source boundaries, other events
- Tarot combat core rules and existing card outcomes, new skill illustration, canon identity reveal

## Canonical dialogue rule
The Starroad scene uses the **same** shared `TarotDialogueUI.create` constructor, `game-shell` mount, `dialogue-*` IDs, shared CSS and tap-to-reveal behavior as main. Do **not** recolor or restyle Shion/Shioriel name labels locally. Caritas gets only a local color variable because there is no main character palette entry.

## Device acceptance gate (owner iPhone, exact SHA)
- Enter from the isolated Starroad, approach, initial main dialogue, deliberate 調べる/離れる (no automatic combat).
- Abyss animation visible; taps during ingress cannot fire reads, defense or skill.
- Canonical main dialogue panel and named labels unchanged; six introduction lines and typing/skip advance behave normally.
- Three correct readings and skill-at-resonance route. Skill cut-in shows both placeholders **as temporary artwork slots**, correct names, and blocks double-taps.
- Both skill-finish and normal-read-finish show dark cloak dissipating **before** one Caritas line, no abrupt disappearance.
- During final speech, collision still blocks Caritas; one final tap returns to map, Caritas gone, obstacle now passable.
- Failed reading, defense, defeat/retry; re-entry prevention; iPhone safe area, no scroll, overlay layering; reload does not mutate production saves.
- Confirm no baseline regressions in movement/follow and main production. CI cannot stand in for actual iPhone device confirmation.

## Review flags
- **HIGH** for touch/visual event choreography.
- No final portrait assets exist for cut-ins. Portrait-slot visual acceptance is **not** final cut-in image approval.
- Current main and isolated Starroad branch are diverged. Require a separate integration audit and explicit owner approval.
- Do not mark Astra PASS, Device PASS, MAIN VERIFIED or publish based on this document.
