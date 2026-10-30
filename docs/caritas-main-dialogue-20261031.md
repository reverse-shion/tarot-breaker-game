# All Caritas speech uses the unchanged main dialogue component

SCOPE: EVENT_SANDBOX
RISK: HIGH (dialogue/choice layout)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

## Contract and evidence
- Current main: 6e05dabe164e3e2bac27faf8a4a91d323f3f8939.
- Prior preview: d88d823255d6f16b6cf8b90f3af451376c1eac5b.
- User request: the first dialogue differs from main; use main's dialogue window for all speech.
- WORKING: isolated inspection-choice presentation, dialogue-style overrides, choice input handling, cache tags and regression tests.
- LOCKED: shared-dialogue.js/css and dialogue.css (byte-identical to main), story text, main routes/saves, audio, movement, abyss, cards and transformation.

## Correction
The initial NOTICE already called the shared controller. However, the following inspection prompt rendered a second custom frame and text, without the main speaker/typing presentation. Its existing text now goes through the same controller and main dialogue IDs with Shion as speaker. Only the two action buttons remain outside the shared window, positioned 8px above its measured bounds. Selection stays explicit; tapping the dialogue cannot select Inspect, and Leave/recovery closes or restores it safely. Resize listeners are registered at initialization, before the first choice.

Remove the special dual-speaker name-color override and unused cb-intro dialogue styling. No encounter CSS targets shared dialogue classes/IDs. The regression assertion previously escaped the dot twice and missed a real .tb-dialogue-speaker override; it now detects such rules.

Independent review found the shared global Enter/Space handler intercepted native choice-button activation while dialogue remained active. The repair stops these keys from bubbling from the action row, without preventDefault or a shared-controller change. The new test runs the actual shared controller and covers Inspect/Leave with Enter, Space and legacy Spacebar.

## Validation and limits
- event-preflight PASS; target remains isolated, NOT TESTED, productionEnabled false.
- Current main 536/536; prior preview 680/680 (preceding correction's recorded suite); final candidate 682/682 PASS with unmocked external fetch rejected. No test skips or failures.
- Focused event/manifestation 46/46 PASS, including the real shared-controller keyboard regression.
- JS syntax and git diff --check PASS. Shared dialogue implementation/styles identical to current main.
- Independent code review: keyboard finding repaired; no remaining code blocker.
- Optional browser comparison script added for notice/choice/intro computed-style equality and action positioning at portrait/landscape and reduced motion. NOT executed successfully: local Chromium startup was denied socket access by the environment. No browser-rendering or iPhone Device PASS claimed.
- Required human check: first notice → Inspect/Leave → introduction, speaker colors/typing/tap behavior, choice layout and safe area on iPhone. main remains unmerged.
