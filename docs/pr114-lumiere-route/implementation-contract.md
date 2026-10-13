# Lumiere -> Star Gate real-entry integration checkpoint v1.0

Risk HIGH. User 2026-10-13: proceed to the next stage after verified PR150 repair
and PR114 integration. Candidate base PR114: dad86541bfd00fd70439b542c01d7c9fbd302bb2.
main: 22c07ae94d7491c3818b57574da7ee3af12edfc4.
Branch: feat/pr114-lumiere-star-gate-route, PR targets PR114, never main.

FACT: current star-gate-full fixture pre-completes the Lumiere meeting. The real
dialogue.js / story-event-guard.js already implement its trigger and completion.
Dev transit deliberately suppresses dialogue's durable Journey writes. Stage3
P0 verification reads an in-memory Journey; that projection must observe real
Lumiere completion rather than pre-mark it complete. The authored route remains
disabled in production under VGC-001.

WORKING: registered dev=star-gate-from-lumiere entry at safe (810,400), with
Shiopon already joined but Lumiere unfinished; load the exact existing authored
dialogue/guard and real Stage3/Aftermath runtime; observe live dialogue facts
into in-memory Journey; enable existing inspect/leave choice only after real
completion and freed scene/input/camera; no automatic investigation; retain
retry/completion behavior; checkpoint diagnostics and regression coverage.

LOCKED: production activation/VGC-001, all normal Title/Alenon/PAD/Garden
routes, existing star-gate-full fixture, Continue/Save/Progress/Journey storage,
dialogue text/staging, actor assets/hover, music/silence, camera/card/rupture/
Aftermath timings, collision/movement, baselines/validators/guards/workflows.

Expected files: index.html (early guard script only), star-gate-route-entry.js, stage3-dev-bootstrap.js, small additional dev admission in
game.js/star-gate-anomaly.js/future-vision-audio.js, dev-only interaction
prerequisite gate, new star-gate-route.js observer, checkpoint/event registry,
tests and docs. dialogue.js and story-event-guard.js remain unchanged.

Acceptance: no inspect before/during Lumiere; original dialogue/mandatory guard
must run and complete; no early/spoofed completion via lifecycle notification;
after controls return, near gate offers inspect/leave; leave remains spatial;
P0 matches observed Journey; normal completion only once; interrupted Stage3
restores then explicit retry works; failure retains locks; no production
durable writes, fake UI stand-in, new trigger owner or normal-route leakage;
malformed/duplicate/conflicting dev requests fail closed; old checkpoint remains
unchanged. Registered safe spawn is verified with real collision/layout.

Run real dialogue+guard+interaction+route observer integration tests, checkpoint
boot/admission/storage tests, Stage3/Aftermath regression and full suite versus
main and PR114 base. Independent read-only Reviewer mandatory. Remote CI,
fixed-SHA link and iPhone route smoke required before integrating candidate.

Device: approach Lumiere from (810,400) -> original meeting -> walk to gate ->
inspect or leave -> Stage3 -> return/Aftermath -> free input/companion follow;
one Home interruption and explicit retry after Lumiere completion. Human PASS
must be recorded on this changed runtime; existing runtime PASS is historical.

No production enablement, production completion/save schema, cross-map durable
checkpoint or main/publication authorization is inferred. This candidate verifies
the missing real local story handoff; it is not a Title-to-Garden full-route test.
No unresolved story/product decision is needed for this isolated checkpoint.

Independent review boundary repair: validate this route before title URL rewriting and editor startup; allow only dev plus optional single returnDebug=1. Rejected requests neutralize competing URL switches, display an error, and never boot an event/editor. Ordinary URLs and valid checkpoint URLs remain unchanged.
