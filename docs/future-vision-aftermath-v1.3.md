# Future Vision Aftermath v1.3 — dev implementation record

PR #114 / `fix/star-gate-front-stage3-integration`. Implementation starts at `8461475634e9d53bf6dd14ad82b6f5f3127ce1a3`; inspected remote main is `5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3`. Both matched the requested versions before editing. No reset, whole-file replacement, main merge, production connection, new checkpoint, map, route or asset.

## Scope and connection

WORKING: dev Aftermath after successful Stage 3, 11 author-specified boxes, explicit nearby gate reinspection, steady weak inner light, Lumiere east departure, Shion movement and original Shiopon Follow. LOCKED: front extension sky/approach choice/light registration, Stage 1–3 dialogue/timing/card/anchors/audio/restoration, ordinary Save/Continue/Progress/Route/Follow.

`stage3-dev-bootstrap.js` loads `star-gate-aftermath.js` and its CSS last, only under the existing explicit `star-gate-full` conditions. Existing `dev-checkpoints.js` entry lists that runtime; no new entry. The synchronous `tarot-breaker:stage3-session-ended` listener accepts only finite session ID, completed/restored true, running false, no error/reason/recoveryError, and cleaned present scene without owner/vision/absorption/future overlays. Original interaction listener runs first and consumes its investigation. Notification semantics and Stage 3 code are unchanged. A page-local consumed guard prevents duplicate starts.

A0 is captured from the clean present scene before the Aftermath owner lock. The same task acquires that owner before displaying weak light and A01; no intervening game frame or input event. Gameplay returns during explicit inspection wait, then observation reacquires the owner. Each return clears pending movement and requires releases of physically held keys/pointers. Distance is rechecked on the inspection click; entering range alone does not advance. The 48 CSS px button is local to Aftermath. Existing dev south-map transition guard `!stage3Dev` already suppresses external travel and remains in effect after completion.

## Minimal adapters and lifecycle

`game.js` exposes `TarotAftermathScene` only in this dev page. It reuses existing scene locks, facing/performer/navigation and camera. A0 holds affected actors, directions and offsets, visibility, Follow state, camera world reference, input prior state and Lumiere enabled state. Restore cancels only tracked Aftermath motion, restores those values, uses current normal zoom after resize, draws and verifies them under its own lock before unlocking. A failed restore keeps the owner lock and reload notice. Unrelated locks, settings and saves are untouched.

Existing Lumiere render, shadow, NPC collision and conversation candidates exclude her only when the page-local departure flag is set. No companion registration or durable deletion. Flight uses original pose and local lift −8 reference pixels, east speed 140 reference pixels/s; a short existing performer move to y245 is used if necessary to clear the gate corridor. Full normalized wings/body rectangle plus ground shadow/blur must have left > viewport width before disabling the NPC. Camera stays with Shion and Shiopon. Measured full-flow flight intervals: portrait 2201.5ms, landscape 3256ms; the landscape exceeds the nominal 1.5–2.5s target to preserve speed and full offscreen exit.

The existing Stage 3 active clock pauses Aftermath waits while hidden. Only tracked Aftermath actor actions, Follow/bob and camera updates pause. `shared-dialogue.js` adds an optional instance `wait` callback; default callers keep the original timer. Aftermath typewriter uses the active clock and preserves the same Box. Resize retains Beat/world flight progress; Focus recalculates from one stable world baseline, bounded ±36 reference pixels, rather than accumulating shifts. Stage 3 background/resize cancellation is unchanged.

Normal completion removes transient dialogue/button/listeners/clock/owner lock, retains steady weak light, objective `アリエットに相談する` and disabled departed NPC. Cancellation instead restores A0, never replays Stage 3 or marks completion. No common finally rolls back a successful departure. No new audio calls, sound or volume setting changes.

## Gate state and author decisions

Aftermath owns `.aftermath-weak-light` on the existing inner light image: visible opacity1, steady brightness .58, existing pseudo-effects disabled. Existing normal flow uses brightness1.08 and resonance1.18. Image, gate frame, dimensions, mask and registration are unchanged; normal resonance classes are not restarted. Values are not Device visual PASS.

White restoration remains the author-corrected R0 red/black card pose. Card source/detail assets, 1000ms D02-preceding cut and background side overscan are untouched. New Shiopon address is `シオンさん`; earlier main dialogue address inconsistencies are recorded rather than globally replaced. Author decisions about starsand and Lumiere flight are used only for this scene; no travel mechanism or Notion update is added.

## Verification

- Candidate regression suite: 364/364 PASS, zero skip/cancel; latest-main comparison 326/326 PASS. Existing protected expectations retained. Preflight, validation, syntax and diff checks PASS. Independent review identified Focus drift and incomplete A0 verification; both repaired and reviewed again.
- Chromium151/DPR1, 390×844 and 844×390, actual same-entry approach → original inspect → front/Stage1–3/card/white/R0/P0 → Aftermath11Box → explicit inspection → departure → actual canvas tap movement and Shiopon Follow completed. Completed/restored true, localStorage/sessionStorage write interception zero, full NPC rectangle offscreen before disabling.
- Original leave causes no vision/Aftermath. Holding ArrowDown through final intro advance does not move during inspection wait; release and new ArrowDown moves. Proximity alone does not advance. Reload returns initial dev state; ordinary page has no Aftermath runtime/adapter/UI.
- Landscape full flow had zero page exceptions. Portrait full flow and input test observed ordinary Audio fade negative-volume exception. Unmodified `audio.js` SHA256 `50aad39eb4ee6b74d3cda069aad5e03aeeb541a5186b8dec0655b945b7d7ac43` matches baseline exactly; executing baseline846 audio with a queued RAF timestamp earlier than fade start reproduces RangeError. Ordinary `fadeTo` lacks a lower clamp on progress. This is an inherited console failure, not a zero-error PASS; Audio is LOCKED and was not changed here. Minimal separate repair would clamp ordinary fade progress to [0,1], with dedicated audio regression review.
- Physical iPhone validation remains UNPERFORMED; browser/CI evidence is not Device PASS. Existing registry evidence is not weakened or fabricated. The inherited ruins-image bottom horizontal boundary remains out of scope and unresolved.

Local automation artifacts are retained under `/workspace/aftermath-evidence`; publicly served SHA and post-push full-through evidence are recorded in PR #114 after exact remote verification. Updated link retains the same host/repository and `index.html?dev=star-gate-full`; old846 URL remains immutable.
