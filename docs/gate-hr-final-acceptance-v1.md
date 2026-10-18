# Gate H/R — final limited acceptance and merge decision packet

Recorded 2026-10-18. WORKING: evidence/PR declaration consolidation only (LOW, documentation-only delta). LOCKED: all runtime, tests, workflows, gate rules, main, hosts/ports and Safari storage. No device retest or new QA environment. Main/publication await a separate final owner approval.

## Fixed identities

- Current main and latest observed legacy Pages build: `4d95d98bcac7723dfd006931400bf8b86ad212e0`.
- Production gameplay runtime H / PR #167: `5a3499a6343a30885e042353e8fa921a63adc5c7`.
- Recovery gameplay runtime R / PR #169: `9c70f3b32e2e9c1d494e9e3d160939df6b5c60df`.
- Phase B standalone test evidence / PR #168: `540eb2c7a95aac7126e61f94e0cbc7cb3cd58c15` (537/537); not silently merged into H.
- PR document HEADs and a future merge commit are distinct from H/R. Final main SHA cannot be reported as already published before the separately approved merge. Recheck the actual merge SHA/tree and deployment after approval.

## Human acceptance

The appended 2026-10-18 Gate H/R record in `DEVICE_VERIFICATION_REGISTRY.md` is authoritative for exact scope: H Continue/Garden, authored B route, normal display/control; R existing-save Continue/reload/Garden-Landing normal-save roundtrip; H Continue/Garden after R normal saving. Owner reports H_READY and local HTTP 198/198 with no mismatch after return. These checks are complete; do not repeat them. Device model/OS versions, detailed timing, Safari-received bytes/cache and direct save-byte readback were not measured.

## IC-002 applicability (owner-approved limited scope)

Rules: `INTEGRATION_CONTRACTS.md` IC-002, `MAIN_MERGE_GATE.md`, `change-risk-device-gate-v1.md` (affected checklists only) and Registry exact-runtime rules. This table records the already approved scope; it does not modify those rules.

| IC-002 condition | Classification | Evidence / affected source |
|---|---|---|
| Lumiere completion -> Star Gate activation exactly once | Existing evidence satisfies; no repeat | Historical exact-SHA PR151/152/114 records remain in Registry. H does not alter Lumiere/Stage3 source runtime; `star-gate-public.js` prerequisite/completion tests preserve eligibility and one-time completion. Historical PASS is not converted into H device PASS. |
| No duplicate trigger owner | Existing evidence satisfies; no repeat | Existing `star-gate-public.test.cjs`: `final actual Aftermath saves exactly once, validates readback and suppresses subsequent investigation`; public bootstrap tests preserve official arrival ownership. No new trigger system is introduced by this evidence update. |
| Journey/Progress ownership unchanged | Existing evidence satisfies; no repeat | H `star-gate-public.js`; existing `actual Continue revalidation rebinds the real meeting observer and Star Gate to one fresh Progress authority`; Phase B real-module official Continue chain at its separately pinned SHA. Progress core/save schema/key unchanged. |
| Return/re-entry does not replay completed segments | Existing evidence satisfies; no repeat | Existing `completion survives actual Progress route roundtrip and resolver without replay or lost companion`, historical completed-event records and QA-A/B owner observations retain their scope. R/H current-save compatibility roundtrip now accepted; no additional unobserved symptom is inferred. |
| No dev checkpoint state leaks | Existing evidence satisfies; no repeat | H excludes QA runtime/launcher paths. Existing public bootstrap test rejects fixture/Journey writes; immutable-H final comparison includes no QA code import. Official H/R serving uses empty approvedOrigin. No new synthetic-save operation is authorized. |
| All VGC tests pass | Applicable; latest CI required | Validate and Event Safety / Main Merge Gate must succeed on final PR evidence HEAD. Prior H 536-case, Phase B 537-case and R 507-case evidence remain separate; docs-only updates run normal CI, without manually rerunning broad tests. |
| Integrated-route human PASS at exact SHA | Applicable; now satisfied | Exact H Continue/Garden and Garden -> authored B, plus R -> H Continue/Garden owner PASS in Registry. Isolated historical checkpoint PASS alone is not used as integration acceptance. |
| Additional full-game/unchanged audio, gesture, Stage3 replay | Not applicable to this limited new acceptance | No runtime delta above fixed H/R; owner-approved affected-route scope applies. Historical exact-SHA records and existing regression tests remain intact; no blanket H device certification. |

QA-A before-event B closure, warning/repeated-input tolerance, mid-Aftermath Continue, completed opening and reload/roundtrip observations remain owner-confirmed with their original QA provenance. Storage write/readback and New Game failures are automated evidence only; no Safari failure injection is claimed or newly required beyond the approved scope.

## Recovery retention and approval boundary

PR #169 remains a Draft retained recovery candidate on `recovery/save-v1-compatible`, pinned to R; it is **not** to be merged as the normal gameplay update. Its later Registry/runbook commits are documentation only. R's runtime delta from fixed main is recognition of the new event ID, not the B feature. The reproducible fixed-R archive and checksum are in PR #169's `docs/recovery-save-v1-runbook.md`.

The existing-save R acceptance and return-to-H procedure are accepted for the exact scope above. Old-format save device acceptance remains UNVERIFIED (Node coverage retained). A real incident recovery still needs owner authorization and then-current production save compatibility, deployment ownership/artifact and cache checks. Do not deploy raw old main or delete/strip flags. Do not describe R as already deployed or unconditionally approved for future production recovery.

## Merge/publication boundary

Read-only Pages API: legacy `main:/`; latest legacy build commit is fixed main above. `.github/workflows/pages.yml` also publishes on main push. Thus merging #167 can publish through existing paths; this task changes neither path. Before any final approved merge, recheck latest main, exact PR HEAD/checks, intended merge method/resulting tree and no competing/stale deployment; record actual deployed SHA/artifact afterward. No separate hosting configuration change is required or performed by this packet.

Eligible for final owner decision only when final-head Validate and Event Safety / Main Merge Gate are SUCCESS, exact-runtime Registry/PR metadata agree, runtime remains H, main compatibility is unchanged, and independent documentation review passes. Draft status is retained until the authorized final merge procedure. Explicit final owner merge/publication approval is still outstanding; RELEASE HOLD remains.
