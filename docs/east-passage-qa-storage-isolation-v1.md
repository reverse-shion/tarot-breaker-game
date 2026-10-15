# TAROT BREAKER — PR #154 QA Origin & Save Isolation Audit v1.0

Date: 2026-10-15
Scope: risk assessment and acceptance design ONLY
Status: READ-ONLY RESEARCH / NOT IMPLEMENTED / NO NEW DEVICE URL
Review basis: PR #154 normal-route executable SHA `587ed2e16b6e484993a54aca53a8eb4384188f39`; later branch commits are docs and tests only.
Priority: CRITICAL for any further destructive/interrupted-save/manual legacy-migration device tests.
Main merge / public production release: NOT APPROVED.

## Confirmed repo facts and browser-origin implications

- `progress.js` hardcodes `STORAGE_KEY = "tarot-breaker:progress-v1"`. `createProgress({storage})` falls back to `globalThis.localStorage` when no injected `storage` is supplied. Both load and save use this same key.
- `garden-public-bootstrap.js`, `garden-progress-observer.js`, `game.js` and `star-gate-public.js` invoke or indirectly bind normal production Progress. In particular, `star-gate-public.js` invokes `TarotProgressCore.createProgress().load()` to independently read back persistent completion; replacing storage on only one earlier call does NOT isolate all paths.
- Browser Web Storage is scoped by **origin** (scheme + host + port), not by URL path, query parameter, Git commit, or SHA. URLs `https://raw.githack.com/reverse-shion/tarot-breaker-game/SHA_A/index.html` and `.../SHA_B/index.html` therefore have the same storage origin if both actually load under that `raw.githack.com` origin. The browser-reported final document origin/redirect chain should be checked on the device, but distinct SHA paths are **not** a storage-isolation mechanism.
- `https://reverse-shion.github.io/...` and `https://raw.githack.com/...` are different origins. This report does **not** claim that RawGitHack previews can directly overwrite GitHub Pages localStorage. RawGitHack previews **can** affect other RawGitHack previews sharing the same origin/key.
- Historical fixed-SHA iPhone checks remain valid for the specific observed B position/lock/unlock/Continue/roundtrip behavior; none of them establishes isolated storage between separate RawGitHack SHAs. No actual save corruption has been evidenced.

## Verdict on the five external audit observations

1. Test fragility — **CONFIRMED maintainability risk**. `tests/garden-east-passage-mid-event-resume.test.cjs` reads other test-file source then uses `source.slice(0, source.indexOf("test('"))`, `new Function` and `vm`. This is a trusted-repo test harness, not a production dynamic-code vulnerability, but upstream test layout/realm changes can break it without gameplay changes. Plan: move the needed fixtures into explicit `tests/helpers/` exports with stable APIs, do not alter existing locked historical test sources/fixtures or their hashes; add equivalence tests.
2. Reload coverage — **LIMITED**. Node tests instantiate a newly loaded Progress instance / cancel an Aftermath; they do not run iOS Safari page reload, pagehide/BFCache, or new-document boot. Do not label them device reload PASS.
3. Failed writes — **CONFIRMED design behavior**. `routeKnown()` requires persisted knowledge; a permanently unavailable storage provider leaves B blocked even if the scene completes. Fail-closed protects against false durable progress but can trap the player. Owner decision required before changing policy: (A) preserve locked behavior with actionable error/retry, or (B) allow a separately flagged session-only post-verified-Aftermath passage with no durable-continue claim. Do not silently toggle policy in this QA task.
4. Contract wording — **AMBIGUOUS STATUS, not necessarily a contradiction**. `event-contracts.json` `productionEnabled:true` describes that the candidate's normal Garden runtime is wired on its feature branch; it does NOT mean main production is published. `NOT DEVICE VERIFIED` means the **overall** gate is pending while Registry records four human-scoped PASS checks. Future contract wording should explicitly state `candidateWired:true / releasedOnMain:false / scopedDeviceChecks:4 PASS / overallDeviceGate:PENDING` in prose or a compatible schema without weakening existing event-contract tests.
5. Save isolation — **HIGH CONFIDENCE risk from code + Web Storage model**. Same-origin RawGitHack SHA previews default to one `localStorage` area and same progress key. No QA code may invoke resetting/overwriting that area as an allegedly isolated fixture. Confirm final origin and all storage read/write/readback paths before creating the next migration test.

## Safe QA architecture and acceptance gates

### Immediate low-risk approach: owner iPhone private browsing

Use a newly opened **Safari Private Browsing** session for exploratory normal-route replay only, after confirming it has no prior private session game save. The private context does not share ordinary Safari localStorage. Keep the private tab/session alive through any Continue/reload checks; private state may vanish once all private tabs are closed. **This is a mitigation, not a certified full old-save migration fixture**, because it does not synthesize an older saved record or guarantee failure-mode behavior. Never tell users to clear/delete their existing regular saves.

### Robust integration approach: genuinely separate origin per QA deployment

Use a dedicated, independently verified **hostname/origin** for each QA build or controlled QA environment (e.g. a distinct HTTPS preview subdomain per commit). Merely using a new GitHub Pages repository under the *same* `reverse-shion.github.io` host or a different RawGitHack SHA path is NOT isolation. If Cloudflare/Netlify-style commit-specific preview deployment is chosen, validate the final address/origin and ensure QA and production do not coincide.

QA acceptance:
1. The fixed preview has a distinct final origin from production and from other relevant QA previews, or a fully reviewed storage adapter isolates **every** read/write/readback without changing any production keys.
2. All forms of Progress, initial Load, Event completion, old-save migration, Continue, cross-map return, `TarotProgressCore.createProgress().load()` readback, Title/New Game reset, and any separate Journey/Settings storage owner are inventoried.
3. A synthetic old version-1 save is seeded **only** in the disposable isolated QA storage, then tested for one-time `garden_star_sand_route_known` migration without duplicate event, normal Gate restore, checkpoint/companion consistency, and Garden → Landing → Garden.
4. Deliberate mid-Aftermath page reload and negative incomplete/cancelled checkpoint are observed in QA origin. For any write denial, verify defined fallback and error presentation, no false claim of persistent success.
5. A separate control origin is shown byte-for-byte unchanged before/after the experiment. Never copy, mutate, reset or delete an existing user's regular save.
6. Run targeted + full CI, independent read-only reviewer, and explicit iPhone device checks on an **exact executable SHA**. A new runtime storage adapter would invalidate old runtime-only device assurance and require new human verification.

### Before merge

- Keep PR #154 Draft and `DEVICE_RESULT: PENDING` while required device cases and explicit owner merge approval are lacking.
- `525/525 PASS` on [Validate #38749756024](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38749756024) supports automated scope only; it does not settle Web Storage origin isolation or real reload.
- Preserve B_LINE `(1398,740)→(1398,844)`, verified normal Garden/Star Gate contracts, audio, character rendering, saved-event semantics, and immutable historical preview sources.
