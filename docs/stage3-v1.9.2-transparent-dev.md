# Stage 3 v1.9.2 transparent dev candidate — 2026-10-05

Supersedes the asset-blocked verdict in stage3-v1.9.2-preflight.md for the supplied ZIP only. This is an implemented, tested dev candidate, not Device PASS or publication approval.

## Work basis and scope

Branch: feature/stage3-v1.9.2-transparent-dev. Latest main retained: 5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3. PR105 reference: 177b3f5ab3cc512e2365b5ba403d24585657f949. Earlier audit commit retained: 56c4d9633dfc50efcfa9c5d0064d71712dc1e5a0. No reset to PR105, main merge, normal vision/aftermath connection, or Production progress/save write. Old formal assets remain in Git history. ZIP README/manifest/edit prompts retained under stage3-transparent-assets-v1.

AGENTS, regression locks, delegated contracts, event contracts and HIGH-risk rules applied. Independent architecture/review performed; reviewer did not edit the candidate. Event preflight PASS; event and segment remain NOT TESTED for human device verification.

## §104 connection record

- C1: full SHAs above, latest main changes retained; PR runtime selectively restored behind exact dev parameter and a dev-only flag.
- C2: stage3-dev-bootstrap.js establishes a detached in-memory garden fixture. star-gate-anomaly.js run captures P0 once before resonance/audio/camera changes. Latter half invokes future-stage3.js after the existing 100/1650/450ms handoff/ascent/hold. Public routes remain separate.
- C3: R0 pose03 shion_card_03_check.webp, 512×512, captured after stable check pose before first anomaly. Source feet03 (256,503),05 (256,496); common scale from actual rendered height/512. R1 restores embedded normal card, removes independent card, preserves fixed05 feet/scale.
- C4: game.js draws vision background separately from actors. Background canvas prepared before absorption, DPR capped at2, same scale1.10/offset(-72,-330), internal Stage2 black composite. Opaque #080A12 substrate; only surface transforms, current Shion composited once at inherited .55 alpha. Normal scenery/NPC hidden during vision. No World Loss SVG or final reframe in the new route.
- C5: event controls audio.js garden BGM only; no new SE/TTS/tap source. Landing/Alenon sources are outside this garden runtime. Session snapshots preserve position/playing/base, independent k, native pause at full white/black, bounded failed resume stays silent. Existing user mute preserved. say hides UI, records active closure time, retains100ms wait, remaining prescribed hold only.
- C6: retained P0 scene resources, owned lock, logical NPC reevaluation, redraw verification before release; expired restore work cannot mutate/draw. Recovery UI retries held P0 or navigates existing ./index.html title, no save reload. Lifecycle abort freezes active camera. Failed recovery keeps game locked; UI remains usable.
- C7: all four supplied files validated as 1024×1536 RGBA lossless roundtrips, SHA256 matches manifest. No cosmic background/circular glyph present. Anchor registration below is visually estimated from actual wound/dark throat, not geometric-center assumption. Device visual continuity remains pending.

## Asset registration and memory

|Role|Source wound anchor|Final width at390CSSpx|Main direction|Zero-alpha %|
|---|---|---|---|---|
|Small|(520,775)|96|near vertical dark slit|88.7155|
|Medium|(535,760)|200|vertical tear with diagonal branches|59.3758|
|Large|(535,765)|338|vertical tear and wide branches|55.4642|
|Vortex|(510,820)|338|dark throat with curling surrounding tear|56.8810|

All display heights are width×1.5; source anchors align to stopped Arcana center without moving Actor/card. Natural decoded memory6MiB each,24MiB total excluding other images, compositing/GPU overhead. Background surface390×844 atDPR1 ≈1.26MiB; capDPR2 ≈5.02MiB. Small/medium edge alpha0; Large max9/Vortex4 faint edge alpha must be checked on device. Manifest has exact byte counts/hashes; compressed sizes are not decoded memory.

## Verification results and limits

Full Node suite347/347 PASS (including13 deterministic timeline/recovery tests and8 audio tests). Chromium151,390×844,DPR1 full real runtime completed/restored, no page errors/audio failures/storage writes. 38 DOM geometry samples; fixed Actor/card changes0CSSpx; R1 feet difference≈.0048CSSpx, identical scale. White248.1ms, black230.4ms; black exceeded180ms minimum by50.4ms, recorded render extension, under2000ms deadline. High-DPR exploratory browser run timed out and is not PASS. Browser cannot establish iPhone audio silence or perceptual Device Gates.

|Tests|Status/evidence|
|---|---|
|T1–T3,T7–T9,T12–T18,T26,T29–T30,T33,T35|PASS deterministic timeline/audio tests; T35 native audio failures simulated|
|T4–T6|PASS dev runtime/diff has no final reframe or World Loss activation; no mere text-only verdict|
|T10–T11,T20|PASS real DOM fixed geometry and R1 restoration; device visual/audio pending|
|T19,T34|Implemented isolated canvas/opaque substrate; browser layers inspected, perceptual background-edge Gate pending|
|T21,T24,T28|PASS normal browser restoration/no durable writes/single P0; abnormal browser evidence recorded separately|
|T22–T23|PASS deterministic cancellation/expiry; browser fault results recorded separately|
|T25|Present NPC fixture verified; absent-NPC browser fixture not performed|
|T27|Existing regression suite PASS and dev Stage1/2/front full traversal; iPhone regression unperformed|
|T31|Prepared resources used, restoration has no new loader/decode/save read; dedicated browser network timing assertion not performed|
|T32|Existing per-dialogue tap wait retained, browser traversal PASS; rapid multitouch carryover stress not performed|

## Remaining visual Gate

Browser Large screenshot shows bright violet branched edges; D4 (not lightning) is NOT PASS. Small→medium→large dark core shares an anchor, but common growth/no switching feel needs human device judgement. Minimal asset correction if D4 fails: reduce branch glow/contrast while preserving the dark wound, transparency, registered origin and full dimensions; do not move Actor/Arcana. No automatic recoloring or alternate asset/dialogue was substituted.

The inherited Stage2 background registration shows a horizontal black lower boundary in390×844; absorption uses the same initial composite to preserve Stage2. No current garden leaks through, but D34 (no rectangular frame) is NOT PASS. If judged unacceptable, review the ruins plate coverage/source transparency and adjust the background-only surface coverage with a matching initial Stage2 composite; do not silently change Stage2 framing or hide it with erosion polygons.

## iPhone verification

D1–D36 all UNPERFORMED on physical iPhone. Record model/iOS/Safari/start mode/orientation/commit/mute/cold start/replay. Check wound growth/no lightning/rings, background landmarks pulling toward anchor/no frame or garden exposure, Actor/card fixed, R1 feet/body/card, white/black native silence/resume position, background/rotation cancellation, failure recovery buttons, present/absent NPC fixtures, repeated taps without skipping, normal route and Stage1/2/front regression. No human Device PASS recorded.

Verification URL will use the pushed commit-specific dev path; local HTTP is not reachable from iPhone. No production deployment or main merge is part of this work.
