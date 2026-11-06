# Caritas tactical reading — implementation contract

Main baseline: ac5645a261125c8dbe0b8c99a7449666b1b71b43.
Development baseline: aa8970084d1b369e00657b0c1da3e61c7a25ca15 (PR #219).
Branch: feature/caritas-tactical-reading-20261106. Risk: HIGH.

User intent: implement the discussed battle improvements after inspecting latest development; no main merge authorized.

WORKING: opt-in `battle=tactical` in the real isolated `dev=hoshisuna` event. Moon/Compass observes, Strength/Trigger offers support or reach, Star/Route shapes delivery. Both input methods consume one turn, pressure costs maintenance HP, all-support cannot win, reckless reach twice withdraws, one mistake can recover. Resonance alone cannot finish until darkness <=25. Author preview remains memory-only; ordinary tactical development saves use a separate key.

LOCKED: ordinary/legacy battle and its saves, production Progress, shared dialogue component and styles, authored encounter/manifestation/farewell, audio, map movement/collision/navigation, special commit/once-only resolution. No API deployment or new canon. Special arithmetic/ownership remains in the existing special-state module.

Implementation: additive tactical core and scoped UI CSS; conditional adapter at the existing event boundaries; new HTML module registration; development checkpoint metadata; tests. Legacy core and special-state remain unchanged. No general CSS cleanup or unrelated portrait changes.

Free text: same action budget, no extra stance form or writing bonus. Conservative local recognition of explicit forward invitation (e.g. 一歩踏み出そう) selects reach; negated/ambiguous input defaults to support. Display the inferred action and forecast BEFORE sending, including while typing. This prototype recognizer is NOT general semantic understanding. Existing remote API supplies Shion's paraphrase only; its tags never own tactical scores. Its generic Caritas reply is not used because the deployed legacy API does not have the new tactical observations. Caritas uses the authored tactical response. Matching contextual/personalized Caritas generation is deferred until a separately verified backend update. No third-party deployment needed. Failed API consumes nothing and retains input. After three successful AI deliveries, selection can complete the battle.

Acceptance: support/reach differ by visible state and resources; two reckless reaches defeat; one can recover; repeated supportive text cannot farm resonance through surge; writing/selection use identical deterministic settlement; every reply advances once; stale/double submit/save failure cannot double-spend; reveal dark only at actual action outcome; no early special; all three specials retain the existing persisted sequence. Check iPhone layout/IME/background/resume before integration. Device status PENDING, productionEnabled false.

Validation: baseline and candidate full available regression, targeted state-machine and tactical action tests, real event browser integration with mocked API (not live-service proof), independent read-only review, GitHub CI. No test/baseline weakening. Device verification and main integration remain separate gates.
