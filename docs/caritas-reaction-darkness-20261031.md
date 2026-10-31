# Caritas battle reaction images and moving Abyss

Main baseline: db56a417c0880b64b8bc1c3efe7a5a0a2e5677b8.
Event sandbox baseline: e48b1e95927f6c0e3a8d832f6755444e647f30bf (PR #201).
Target: caritas-heart-resonance / NOT TESTED / productionEnabled false.
Risk: HIGH (mobile battle visual changes). MAIN_MERGE: PROHIBITED.

WORKING: battle image presentation only; import the exact eight WebP blobs from main into the existing sandbox; select reaction art from the visible committed darkness, current attack, authored reply context and purification phase; animate masked CSS smoke over the actual image silhouette. Preload/decode before switching poses; ignore stale async requests. At visible darkness zero, immediately show the original uncorrupted `assets/events/hoshisuna/battle/caritas-battle.webp`, remove smoke and cancel stale tint/hit animations. The pre-existing visualBattle snapshot remains authoritative during an uncommitted hit animation.

LOCKED: battle arithmetic, resonance/HP/darkness calculation, special/save transaction timing, AI requests and replies, dialogue HTML/CSS and wording, map/prebattle Abyss, transformation, map routes, controls, collision, audio, production storage, all verified contracts and device records. No main merge or route integration is included.

## Pose mapping

| Situation | Image |
| --- | --- |
| Darkness 86–100 / closed off | 01 closed |
| Darkness 71–85 / defensive | 03 guarded |
| Darkness 56–70 / resisting Abyss | 06 resist |
| Darkness 36–55 / wavering | 04 hesitate |
| Darkness 16–35 / noticing the words | 02 notice |
| Darkness 1–15 or resonance finisher ready | 05 resolve |
| Receiving supportive words / personal reading reply | 07 accept |
| Receiving an open question / leaving room to choose | 02 notice |
| Receiving encouragement to step forward | 05 resolve |
| Word-strike impact, while previous visible meter is held | 03 guarded |
| Counterattack | 06 resist |
| Special purification before zero is committed | 08 relief |
| Darkness zero, in ALL phases and after reload | Original normal Caritas |

Smoke opacity follows the visible meter continuously (0.94 at 100, 0 at zero); its five drifting CSS layers share the current image's alpha mask and object-fit box. Reduced Motion keeps a static veil; existing page-away pause handling applies to its CSS animation. No new meter, timer stage or combat state is introduced. Image load failure leaves the last decoded art in place and never blocks gameplay.

## Acceptance / validation

- Every image path exists, matches the imported main blob and keeps alpha.
- All eight poses are reachable via the real battle/reply/special contexts.
- Positive darkness remains invaded; zero is unconditionally normal with no smoke, including a pending image load, victory dialogue and reload.
- Pose swaps cannot blank the image or resurrect a stale corrupted image after zero.
- Reading hit timing still uses getBattleView; no early visual damage/reward.
- Shared dialogue and all locked files remain unchanged.
- Pure projection/async-image tests, full existing suite and all contract checks; independent review.
- Real iPhone Safari: start with dense mobile smoke; deliver differing card readings/personal words; see reaction and counterattack; finish -> zero -> original normal image, farewell -> map, no dark residue. This remains PENDING until human confirmation. Desktop browser QA is not DEVICE VERIFIED.

## Verification evidence

- Main baseline: 536/536 Node tests PASS; original sandbox: 695/695 PASS; final candidate: 701/701 PASS, zero failures and no altered existing tests.
- Asset/background/audio validators and JS syntax PASS.
- Independent review identified an initial alpha-mask position/counter-lunge mismatch. Fixed before final review: identical 2% left / 58% width / 28% top / 60% height, `center bottom`, shared counter-lunge and Reduced Motion override. Re-review PASS.
- New optional `tests/caritas-reaction-browser.cjs` runs the real dev battle in Chromium at 390×844 and 844×390, normal and Reduced Motion. It validates all eight poses, actual card-reading/reply/counter, exact image/mask alignment, moving/static smoke, held visible meter during strike, actual special purification -> zero -> original art, and reload. Browser-only test writes the existing isolated dev battle key; external network calls are blocked.
- Browser observation prompted an explicit zero-state `transition:none`: smoke is immediately opacity zero and hidden, with no leftover opacity transition. Original normal artwork and dense start were visually inspected.
- The older optional `tests/caritas-special-browser.cjs` has an existing early cut-in left-edge assertion failure on both original sandbox e48b1e9 and this candidate in the same browser environment. Its assertion runs while the existing entry translation is still active. No cut-in source/test was changed or weakened; this separate baseline discrepancy is not reported as a pass.
- Physical iPhone Safari verification and integration/main merge remain PENDING / not authorized. Desktop Chromium is not real-device evidence.
