# PR #114 interruption / retry candidate v1.0

Risk: HIGH (Safari lifecycle, event replay and input ownership).

Fetched PR #114 HEAD: `d8bf38d93fd1676c75432e411b6d683e9f0a6846`.
Fetched main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
Branch: `fix/pr114-star-gate-interruption-retry`, based directly on PR HEAD.
Specification: https://github.com/reverse-shion/tarot-breaker-game/pull/114#issuecomment-6122069415
Preflight: `node scripts/event-preflight.cjs --target star-gate-anomaly` PASS;
productionEnabled remains false. No integration, main merge or deployment authorized.

WORKING: dev-only interrupted Stage3 recovery, deliberate spatial rearm,
strict successful-completion consumption, stale notification / double input protection.
LOCKED: uninterrupted story/dialogue/visual/audio sequence, Lumiere art and hover,
gate light and corruption, Aftermath eligibility/one-shot/camera return,
ordinary movement/follow, Save/Continue, normal route exposure, all guards/baselines.

FACT: hidden visibility aborts `run()` with reason `background`; `recoverPresent()`
restores and verifies P0 under black, waits for visible paint and reveals ordinary
audio, then the finalizer unlocks the scene and releases the audio lease. Both
completion and interruption emit the same session-ended event. Interaction
unconditionally consumes completion, making dev `progressReady()` false forever.
The behavior was introduced by `c6964bbe50b3926059b36fb91f4ae2681de6bf72`;
its parent lacks the unconditional session-ended handler.

UNKNOWN: exact physical Safari visibility/pagehide/pageshow/BFCache ordering,
whether a page was reloaded, and actual audio autoplay behavior on the new SHA.
The in-memory bootstrap would start a fresh fixture on reload; no persistence
is added to infer or repair a different reload failure.

PROPOSED: consume only matching, fully completed/restored clean reports. An
interrupted attempt remains unconsumed; rearm requires verified recovery and
released audio ownership, a visible/prepared present scene, free scene/camera,
free player/NPC controls, no active dialogue/foreign interaction/overlays, and
an intentional exit beyond the existing 96-unit boundary. Reapproach within
46 units offers the existing choice; explicit inspect starts from the beginning.
Failed recovery retains scene lock and existing recovery alert. A successful
manual recovery clears the old recovery error before reporting readiness.
Audio readiness here means its event lease was released, not audible playback;
existing autoplay rejection and movement-gesture retry remain unchanged.

Expected runtime edits: `star-gate-interaction.js`, small lifecycle/report additions
in `star-gate-anomaly.js`. `star-gate-aftermath.js`, `stage3-dev-bootstrap.js`,
`audio.js`, `game.js`, all CSS/assets remain unchanged.

Acceptance tests: success once; background/viewport/cancel recovery and deliberate
retry; restore failure and manual recovery; no automatic replay; double input;
stale/duplicate/malformed reports; dialogue/scene/input/camera/audio lease guards;
retry completion with one Aftermath handoff; existing audio restoration/silence
contracts. Run full main and original PR baseline, candidate suite, validators,
syntax and actual browser simulations. Physical iPhone proof remains separate.

The existing integration assertion that interruptions permanently set completed
is explicitly superseded by the owner's repair contract. Preserve that test's
lock-before-P0 and no-autoreplay assertions, replace its completion expectation
with strict success/failure/retry coverage; do not skip/delete/relax other tests.

Independent Astra audit and exact-SHA physical iPhone Home-return/reapproach/retry,
full completion/Aftermath/audio/blackout checks are required before any integration.
No unresolved product decision is needed to implement this candidate.
