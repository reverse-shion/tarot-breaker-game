# 星砂の道・カリタス戦 — 視認性 / 攻撃 / 防御の隔離補正 v1

Status: **Dev-only / Draft / iPhone Safari device gate PENDING**. No main merge.

## Source and change scope
- Base: `fix/caritas-cinematics-main-dialogue` at `10527e55c40b63d2c761c3783e46dc7148aa1ac6` (Draft PR #182).
- Edited only `caritas-battle-core.js`, `caritas-battle-event.js`, `caritas-battle-event.css`, `hoshisuna-main.html` (cache IDs) and `tests/caritas-main-interaction.test.cjs`.
- `shared-dialogue.js`, `shared-dialogue.css`, `dialogue.css`, main runtime, save, navigation, collision, map artwork and encounter story were NOT edited.
- The event only boots at `/hoshisuna-main.html?dev=hoshisuna`.

## Dialogue
- First automatic notice, subsequent dialogue and last Caritas line are all displayed by the same `TarotDialogueUI.create` instance and the unchanged shared main CSS.
- Same mount `#game-shell`, IDs `dialogue-layer`, `dialogue-advance`, `dialogue-speaker`, `dialogue-text`. Local CSS does not alter `.tb-dialogue-*` or main speaker colors.
- The first-notice line content is unchanged.
- Full computed-style parity with main on physical Safari is **not yet certified**.

## Battle phase
- The Starroad battlefield uses a brighter celestial palette and localized purple shadow around Caritas. The dark full-screen treatment is avoided.
- Existing Caritas art is unchanged. Behind on the right: Shion (`shion_idle.png` first idle frame); in front: Shioriel (temporary crop of pre-existing approved reference sheet); enemy left. Character proportions and illustration crop require visual/device approval.
- Both HUDs appear at the top, tarot cards and commands below; announced enemy damage appears over the arena; no page scrolling intended.
- The dedicated final skill illustration remains out of scope; prior face cut-ins/technique stage remain intact.

## Exact defensive and enemy rules
- `forecast(s)` uses the pre-action turn count: **normally 12**, **24** when `turn % 3 === 1`. Forecast HUD shows both type and base value.
- Every non-winning card-reading and non-winning skill triggers **one** enemy counter. Defense also consumes a turn and receives one attack.
- `defend`: damage = ceil(base × 0.25), thus 3 for a normal hit and 6 for a heavy hit. The 75% reduction does not decay with low HP.
- When reading, ROUTE `癒し` reduces damage 50%; `願い` reduces 25%; `希望` reduces 0% (existing route tradeoff). Mitigation uses the telegraphed attack, not random or visual-only damage.
- A successful finishing reading or skill ends combat **without a post-victory retaliation**.
- The core function applies the actual HP change once. `enemy-turn` phase (1050 ms) **visualizes** the result, blocks further input and prevents double counting. It is paused when the page is backgrounded.
- `hp === 0` enters the existing retry screen after the attack presentation finishes.

## Completion sequence
`notice (shared main dialogue)` → explicit 調べる → unchanged intro/invocation → dark engulfing → battle → attack/defense/read/skill → victory → purification 2600 ms → freed-white Caritas hold 1100 ms → one established line `……世話になった。` (shared dialogue) → player advances → map fade 900 ms → map/collision release.

## Validation
- Source JS parsing passed for core/event/test; CSS scope and unchanged shared UI source were inspected.
- Core simulations: read damage, normal/heavy defense, skill retaliation, three-read victory without skill — PASS.
- Mocked event regression tests: 9/9 PASS including animation ownership, BFCache pause/resume, defeat/retry, shared dialogue, one farewell and counterattack.
- These are **not** browser screenshot, hosted CI, accessibility, or physical iPhone test results.
- Existing unrelated stale Starroad hash and main-lineage blocker from PR #182 remain inherited baseline debt; do not adjust their tests to hide the failures.

## iPhone acceptance checklist (portrait)
1. Compare very first line and subsequent named dialogue directly against main for frame, colors, typography, typewriter, reveal-on-tap, advance-on-tap and safe-area padding.
2. Compare to the owner's bright central reference: Caritas left large, Shioriel front of Shion, sky background and all meters/cards/buttons legible. Inspect actual Shioriel crop (currently a reference-sheet crop).
3. See full initial engulfing without a global dark overlay.
4. Normal forecast 12 → read/guard → visible counter → HP decrease; heavy forecast 24 → defense → exactly 6 HP decrease; no double attack on rapid taps.
5. Skill cinematic → one outcome → counterattack only if fight continues. Full victory through readings remains possible.
6. Check defeat/retry, final darkness dissolve, white Caritas, single final line, then map return. No abrupt disappearance or repeated event.
7. Check 375×667, 390×844 and 430×932 Safari safe areas, dynamic browser chrome, landscape, reduced-motion, repeated tap and background/resume.
8. Check main `index.html` and its shared files remain byte-identical in the isolated candidate; no merge.

## Known open issues
- Visual design and source-sheet crop require the owner's reference-image comparison and actual iPhone validation. This commit does **not** certify 1:1 visual parity with the mockup.
- Existing cards and Shioriel battle-actor art are still provisional; creating new artwork is explicitly excluded.
- Hosted CI/device result is pending until separately reported.
- Do not merge or deploy to main without author acceptance.
