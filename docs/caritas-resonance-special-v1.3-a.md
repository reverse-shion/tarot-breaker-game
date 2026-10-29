# Caritas resonance special v1.3-A — implementation / QA handoff

2026-10-29. Author's supplied v1.3-A and asset addendum are the product contract.
NO MAIN MERGE, NO AUTO-MERGE, NO PRODUCTION DEPLOYMENT. Device result: PENDING.

## Entry audit / implementation contract

- Current main inspected: `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
- Starting branch: feature/caritas-written-reading-reward, exact latest at checkout
  `91a789e37f3ab8877b6b0da7036e8b50738928c0`. Clean original checkout.
- Candidate: feature/caritas-resonance-special-v1.3-a. No main merge/rebase.
- Read AGENTS.md, Regression Lock, delegated development/risk/role contracts,
  Event Development System/Contract, Verified Gameplay/Event Contracts, Device
  Registry and AI Change Safety. Registered preflight: caritas-heart-resonance,
  PASS / NOT TESTED / productionEnabled false. Risk HIGH.
- WORKING: isolated Caritas special state/save/UI/visuals and tests; existing
  namespaced dev-only save key retained. The owner explicitly authorizes v14→15
  persistence in this encounter; no Production Progress/Journey write is added.
  EC-006's older restart-on-reload description is superseded for this requested
  special route only. No device contract is upgraded.
- LOCKED: shared dialogue engine/design and type/reveal/advance behavior, normal
  three-card reading and AI arithmetic/transport, map movement/navigation/audio,
  Title/Alenon/Landing/Garden/Production Progress and existing device records.
- Expected files: event JS/CSS, isolated caritas-special-state.js, HTML script/cache
  entries, five copied images, Caritas tests and this report. Core unchanged.
- Acceptance: immutable A/B separation, page-boundary recovery at all nine phases,
  fail-closed corrupt saves/revision conflict, write failure retry, retained DONE,
  three player-selected equal-result techniques, real art/full shared dialogue,
  visible-time lifecycle recovery, seen-only shortening and fallback without seen.

## Assets (actual bytes copied only from inspected main)

- assets/battle/cutins/shion-cutin.webp
- assets/battle/cutins/shioriel-cutin.webp
- assets/battle/special/shioriel-18-astral-mirage.webp
- assets/battle/special/shioriel-08-astral-brave.webp
- assets/battle/special/shioriel-17-astral-grimoire.webp

No generation, replacement, rename, main-wide merge or re-upload of altered images.
Moon: 星幻迷宮 / Astral Mirage. Strength: 星獣咆哮 / Astral Brave.
Star: 星望祈願 / Astral Grimoire. Dialogue strings follow the supplied specification.

## Staged work / evidence

1. State first: isolated immutable v15 record module, A/commit and B/result split,
   exact phase validation, stable run commit ID, single-write/readback, revision
   byte check, v14 migration, retained DONE. Dedicated state tests: 5 PASS before
   adding the selection/animation functions.
2. Event integration/tests: handlers reject committed state; invalid bytes remain
   untouched behind reload/title-only recovery. Persisted special.phase controls
   restored UI and map lock. First-written receipt/AI allowance survive migration.
   Written delivery now retries the same pending snapshot after quota failure;
   no second AI request or first-use reward is issued.
3. Selection: all three cards independent of prior interpretation. Cancel writes
   nothing. Short mode is initially off and available only for that seen card.
4. Shared main dialogue: solo Shion, solo Shioriel, one explicit shion-shioriel
   actor page; encounter-scoped color only. Type/reveal/advance engine unchanged.
5. Art: original WebPs, background blur/foreground contain, safe-area/dvh sizing,
   WAAPI completion and phase/generation-checked visible watchdog; preload/decode,
   visible 1200ms wait/fallback, lifecycle pause, reduced motion. No art substitute.
6. Reply/return: three distinct Caritas replies, one farewell; DONE snapshot before
   idempotent map/companion/collision restoration. No new reward.
7. Automated Safari failure models: reload every phase, PURIFICATION restart,
   DONE boot, failed writes, stale tab, image error/decode/timeout, background 15s,
   BFCache event sequence, reduced motion and normal/short timing.

## Validation commands and limits

- `node scripts/event-preflight.cjs --target caritas-heart-resonance`
- `node --test tests/caritas-*.test.cjs`: 72 PASS at initial UI integration.
- `node --test tests/*.test.cjs` on untouched current main: 536/536 PASS.
- Same command on untouched starting branch: 626/626 PASS.
- Initial restricted execution falsely reported two failed files due to subprocess
  EPERM/empty subprocess output. Re-running with working subprocess permissions
  produced the baseline totals above; no test was weakened to bypass that issue.
- Two source-shape assertions required explicit updates: exact event cache version
  and the AI allowance's atomic snapshot expression. Runtime AI delivery/rollback
  tests retain their behavioral assertions and now exercise storage-only retry.
- `git diff --check`; syntax checks; required contract tests included in full suite.

Revision checking + storage-event notification stops observed stale writes.
Web Locks / BroadcastChannel are not used. localStorage check/write is NOT atomic
cross-tab exclusion; simultaneous-tab correctness is not completely guaranteed.

## Human iPhone Safari gate (all PENDING)

Use the fixed-SHA RawGitHack hoshisuna-main.html?dev=hoshisuna link, walk to Caritas,
inspect, complete readings to MAX, select each card and tap all dialogue pages.
This origin retains the same dev save key across SHA URLs; a new SHA is not a new
save namespace. Do not erase production Progress to test this feature. For three
fresh runs use separate Safari profiles/isolated browsing sessions, or deliberately
archive only the named Caritas dev record through browser debugging first.

Required real-device evidence: all three techniques, typography/tap feel, no
cropped wings/characters/book, viewport/safe area, normal vs short, 15s background,
BFCache, reload on every page/art/PURIFICATION/RETURNING, DONE reload (departed
Caritas, collision off, Shiopon restored), image failure/decode/timeout, storage
quota and concurrent tabs. Record exact tested runtime SHA and operation log or
screen recording. Automated tests and desktop browser emulation are NOT iPhone
Safari device PASS. No human confirmation exists for this candidate.

## Final automated / review evidence

- Final full local regression: **644/644 PASS**, 0 skipped (`node --test tests/*.test.cjs`).
- Final state + event fault/lifecycle tests: **34/34 PASS**.
- Independent reviewer full execution: **643/643 PASS**, before the additional
  dialogue-only storage-failure test; independent final diff: no blocking code
  findings. Release/device disposition stays STOP/PENDING, not release PASS.
- Required six event/verified/checkpoint/integration/merge contract test suites plus
  the event runtime suite: PASS after registering the new state module dependency.
- Asset, background and audio validators: PASS. JavaScript syntax/diff check: PASS.
- `node tests/caritas-ai-http-integration.cjs`: three turns + CORS rejection PASS;
  this uses local mocked transport, does not spend Gemini quota or verify live AI.
- Desktop Chromium, touch viewport 390×844: all three real images decoded at
  864×1536, foreground contain, one dual actor page, art hides dialogue/controls,
  replies/farewell/map/DONE reload completed; zero uncaught page errors. Star
  additionally tested with reduced-motion. Screenshots inspected for image bounds.
  This is desktop browser automation, NOT Safari or physical-iPhone evidence.
- Optional reproduction: run a static server on port 8765, install Playwright in
  your QA environment, then `node tests/caritas-special-browser.cjs`.
  `CARITAS_BROWSER_EXECUTABLE`, `CARITAS_QA_URL`, `CARITAS_QA_OUTPUT` configure it;
  default output `/tmp/caritas-special-browser`. Use only a disposable browser
  context; fixtures seed only the isolated Caritas dev key, not Production saves.
- Reviewer corrections: reject missing/falsy battle and malformed canonical cards;
  wait for storage before ordinary attack/release and legacy map exposure;
  preserve visible retry through the legacy return fade; stale retry double tap
  cannot repeat a saved transaction. The decoded preload element itself is used
  as foreground. Missing-WAAPI-finished/stale-generation watchdog test added.
- Narrow reduced-motion compatibility fix lives in event currentLine(): the
  unchanged shared engine's instant reveal invalidates its visibility RAF token;
  only this instance's existing visible classes are restored. No dialogue design,
  shared file, reveal/tap sequence or combat formula change.
- Image Git blob IDs independently matched main for all five files.
- Re-fetched main at completion: still `6e05dabe164e3e2bac27faf8a4a91d323f3f8939`.
  Shared dialogue, controls, navigation, audio and game engine have no diff to it.
- Game implementation commit: `f351b8356fb9b7cf7f0af8b75f1005e8fac0e506`.
  Later handoff/registry-only commit does not alter these reviewed game file bytes.
- RawGitHack returned the exact local HTML bytes for the fixed implementation SHA.
  Remote GitHub Actions CI has not been run for this new branch (push branch is
  outside the existing Validate workflow allowlist). Local tests are not a remote
  CI claim. No PR, auto-merge setting, main merge or production deployment made.

### Complete changed-file inventory (relative to starting branch)

- caritas-special-state.js
- caritas-battle-event.js
- caritas-battle-event.css
- hoshisuna-main.html
- dev-checkpoints.js (existing Hoshisuna checkpoint dependency registration only)
- tests/caritas-special-state.test.cjs
- tests/caritas-main-interaction.test.cjs
- tests/caritas-ai-api.test.cjs (atomic allowance source assertion)
- tests/caritas-manifestation.test.cjs (exact new cache version assertions)
- tests/caritas-special-browser.cjs
- docs/caritas-resonance-special-v1.3-a.md
- The five exact asset paths listed above (copied from main, identical hashes).

REGRESSION LOCK: no protected-system diff, no new automated failure. Required
human iPhone Safari DEVICE GATE: **PENDING / 実機未検証**. No merge authorization.
