# PR #114 STOP repair v2.1 — Implementation contract

Date: 2026-10-11. Risk: HIGH (BGM lifecycle/iOS and latest-main visual integration).
Status: IMPLEMENTATION, Draft only. No main merge, force push, or production deployment authorized.

## FACT

- Fresh origin/main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
- Fresh PR #114 head: `ee6ee0992652660dfb8398ddb33c14a7c252cb22`.
- Both match the user's audit references; no intervening commits at work start.
- Original PR uses fixed pose rendering instead of completed main compositor; original PR mocks still expect the superseded 2172×724 strip.
- Main preserves [0,1] progress/media-volume clamps in ordinary fade. PR has event-only media ownership and native hard mute, but pagehide/pageshow/release recovery is incomplete.
- Preflight `star-gate-anomaly`: PASS, NOT TESTED, productionEnabled false.

## WORKING

Integrate current main into safe `fix/pr114-stop-v21` worktree; individually resolve game.js overlaps, preserving main manifest/compositor plus PR dev runtime. Repair BGM lifecycle ownership, play rejection/deferred completion, release and accepted-movement retry. Repair outdated image/DOM/card-detail fixtures without changing event rendering. Preserve immutable historical previews through exact Git source fixtures without changing their hashes or documents.

Expected production-file repairs: audio.js and game.js only. Main brings its index loader, validator, assets, manifest, tests and evidence unchanged through a normal two-parent merge. Additional tests/docs are permitted within this repair scope.

## LOCKED

All current main functionality; normal Title/Save/Continue/Progress/Journey; routes, collision, movement, story, Alenon native audio; VGC-001 through VGC-007; all historical device evidence and validator/baseline policy. Completed Lumiere four directions, local hair/hem sway, wings/face/torso geometry, ~63.984px body height, bob 2.4px/5.2sec, exact sprite bytes. PR gate Normal/Corrupted, gate-void asset, four inner-light registration values, soft edge erosion, 3 pulses, Re hold, Rift→Vortex→White→Black, 1550ms return after R06, R01–R14 content/order, either companion order, group after both, Lumiere first departure, Shiopon follow, dev separation. No Star Sand movement restriction, illustration generation, asset replacement, sizing or timing change.

## Acceptance and validation

Zero failed Node tests. Compare current-main full suite, regression baseline, validators (game/assets/background/audio), Stage3 eight-file focused suite, main four fade-boundary tests, Lumiere tests, pagehide/pageshow and deferred-play/rejection tests, dev/gameplay/save/route contracts. Run Device Registry Guard honestly: missing exact-candidate human evidence must STOP main integration, never bypass or mark PASS. Inspect latest pushed PR head CI. Reviewer independently inspects actual candidate diff/evidence read-only.

## UNKNOWN / device requirement

Physical iPhone Safari visual/audio/operation, auto-resume permission, speaker silence and next-gesture fallback remain pending user verification. Local automation and Chromium simulations cannot upgrade the registry. No unresolved product decision is needed for this explicitly authorized repair. Final candidate is handed back for Astra re-audit; main merge/deployment remains prohibited.
