# TAROT BREAKER — Event Contracts

Status: ACTIVE
Machine-readable companion: `event-contracts.json`.

## EC-001 — Star Gate Anomaly
event_id: star-gate-anomaly
map: star_gate_garden
status: IMPLEMENTED / normal-route candidate; specified normal-route Device Gate human-confirmed PASS at integration SHA f4909bc17a2568101e277c2a8fb08b692c7d71f8 (main/publication not authorized)
start_condition: owner-approved VGC-001 candidate activation; explicit investigation after real prerequisite completion
required_state: Shiopon and Lumiere garden progression completed before production activation
trigger_owner: Star Gate interaction runtime when released
start_event: tarot-breaker:star-gate-investigate
progress_changes: observer-only garden_star_gate_anomaly completion after actual final Aftermath/departure/control restoration; validated durable readback
return_behavior: normal Garden routing preserved; completed reload/Continue/roundtrip suppress replay and restore gate/departure

Segments:
- star-gate-choice — NOT TESTED
- star-gate-camera — NOT TESTED
- star-gate-normal-resonance — NOT TESTED
- star-gate-reverse-flow — NOT TESTED
- star-gate-sky-release — NOT TESTED
- star-gate-camera-return — NOT TESTED
- star-gate-aftermath — NOT TESTED
- future-fixation-stage3 — NOT TESTED / dev=star-gate-full v1.9.2 candidate; isolated memory only, productionEnabled remains false
- public-star-gate-integration — IMPLEMENTED / normal route, completion persistence, specified four-plus-three-check Device Gate PASS at exact SHAs in Device Registry; unrelated untested stress cases remain outside evidence
- lumiere-to-star-gate — NOT TESTED / dev=star-gate-from-lumiere; real authored Lumiere meeting -> existing Stage3/Aftermath, in-memory only, productionEnabled remains false

No Star Gate segment is DEVICE VERIFIED merely because historical branches contain implementations.

Existing production behavior remains governed by VGC-002 through VGC-007. This registry does not invent historical device SHAs.


## EC-002 — Alenon isolated Continue receiver
event_id: alenon-resume
map: alenon
status: NOT TESTED / isolated verification only
productionEnabled: false
segment: alenon-resume-entry — NOT TESTED
start_event: tarot-breaker:alenon-resume-ready
trigger_owner: registered development entry into the real Alenon runtime
required_state: independently validated temporary Progress v1 Alenon checkpoint
progress_changes: development namespace only at the existing authored completion boundary; no production durable writes
return_behavior: normal title and mounted PAD return remain unchanged; sandbox cross-map departure is contained
implementation_contract: docs/phase-2a-5b-alenon-implementation-contract.md

No Alenon resume segment is DEVICE VERIFIED until explicit exact-candidate human confirmation.


## EC-003 — Garden / Landing isolated Continue recovery
event_id: garden-landing-continue-recovery
maps: star_country_landing, star_gate_garden
status: DEVICE VERIFIED / isolated Continue + ordinary integration route
productionEnabled: false
segments:
- landing-resume-entry — DEVICE VERIFIED
- garden-resume-entry — DEVICE VERIFIED
- garden-landing-roundtrip — DEVICE VERIFIED
start_event: tarot-breaker:landing-resume-ready for the registered Landing receiver; Garden transit is admitted only by its registered isolated Landing Continue session
trigger_owner: existing Landing and Garden authored runtimes after the isolated Continue readiness projection succeeds
required_state: a registered Phase 2A-5c checkpoint with validated Progress v1 history, companion authority, exact map, and authored spawn
progress_changes: isolated development session only; production Progress, Journey, settings, and editor storage writes are forbidden
return_behavior: the isolated Garden roundtrip returns to the originating Landing Continue session; ordinary production Journey routing remains unchanged
implementation_contract: docs/phase-2a-5c-landing-garden-continue-spec.md

Verified behavior is limited to Garden observer/bootstrap, isolated Garden transit and return, Landing receiver, Continue waiting/disembark/dialogue/follower restoration, Garden re-entry authority, tap endpoint safety, and development/production isolation. Alenon, Audio, unrelated Story/Movement/Collision/Dialogue, the Star Gate anomaly, VGC-001 through VGC-007, ordinary production Journey behavior, and existing device records remain LOCKED.

Exact human-verified runtime SHA: `96edc22bcc4d1f1ae7a988a8726217dfccecd7fa`. L1/L2/L3/G1/G2/G3 and the ordinary Title → Alenon → PAD → Landing → Garden → Landing → Alenon integration route are recorded as PASS in `docs/DEVICE_VERIFICATION_REGISTRY.md`.

## EC-004 — Public Continue entry registration
event_id: public-continue
maps: title, alenon, star_country_landing, star_gate_garden
status: NOT TESTED / Alenon candidate runtime / unreleased
productionEnabled: false
segments:
- public-continue-title — NOT TESTED
- public-continue-alenon — NOT TESTED
- public-continue-landing — NOT TESTED
- public-continue-garden — NOT TESTED
- public-continue-integration — NOT TESTED
start_event: tarot-breaker:public-continue-request (candidate Title success emitter; release pending)
trigger_owner: explicit Title Continue gesture and dedicated Production controller in candidate
required_state: validated durable Progress v1 record and an individually proven map/spawn receiver
progress_changes: none on registration or Continue entry; future gameplay uses existing Production completion/save boundaries only
return_behavior: future Public entry must restore normal Production routes; isolated dev sessions remain separate
implementation_contract: docs/phase-2a-6-public-continue-implementation-contract.md

WORKING now: Title/Alenon Public candidate, explicit adapter/controller, registry, contract documentation, and automated acceptance coverage.
LOCKED: normal Title/Journey reset, Production Progress reset policy, existing PAD-return save path, all isolated receivers and VGC-001 through VGC-007.

Preflight PASS proves target registration only. It does not prove device verification, release eligibility, or permission to modify a locked system. Alenon candidate fixtures are registered and exercised by runtime tests; exact-build remote links require publication and independent review before presentation. Landing/Garden Public runtime remains unavailable.

Runtime integration proceeds Alenon → Landing → Garden with separate implementation, review, test, applicable device, CI, and merge gates per map. Public destination allowlist contains only proven map/spawn combinations. Invalid, unavailable, contradictory, or unsupported saves fail closed without altering durable save bytes. New Game reset and Production PAD-return checkpoint saving remain out of scope.

### EC-004 Alenon candidate implementation

Title and Alenon runtime exist on the Phase 2A-6A candidate branch; release status remains NOT TESTED / productionEnabled false until the required review, CI and human Device Gates. Title success emits `tarot-breaker:public-continue-request`; the real Alenon boot emits `tarot-breaker:alenon-resume-ready` after readiness. Public marker is `entry=continue`, durable save is sole authority, and only Alenon intro/pad_return are admitted. Landing/Garden Public runtime is absent.

Four `public-continue-alenon-*` fixtures are registered and exercise the real Public adapter using injected session-only storage. Detached Journey projection and contained PAD departure preserve zero Production writes in these fixtures. They do not prove the Production roundtrip. Full details and pending Device checklist: implementation contract §13. No historical device record is changed or transferred.


## EC-005 — East Passage B-line / Star Sand route knowledge (Draft PR #154)

event_id: garden-east-passage
map: star_gate_garden
status: IMPLEMENTED / normal-route candidate only / NOT DEVICE VERIFIED
productionEnabled: true on feature branch (does NOT imply merged main or public release)
segment: east-passage-b-line — IMPLEMENTED, pending full iPhone Device Gate
start_event: tarot-breaker:star-sand-route-known — RESERVED; the production event uses validated Aftermath completion to persist its independent typed fact, not a new emitted signal
progress_changes: adds durable event `garden_star_sand_route_known` after successful validated Star Gate Aftermath final completion; existing saves with validated completed Star Gate are migrated when restored in Garden; failed writes never claim durable unlock
return_behavior: normal Garden, Star Gate, Continue, follower and Garden-to-Landing routes preserved
implementation_contract: docs/garden-east-passage-b-implementation-contract.md

Current Draft candidate **does** load `garden-east-passage.js` from Garden `index.html`, guard the player (not NPC) crossing, and use the shared dialogue UI for Shion's warning. Fixed B-line candidate: (1398, 740) → (1398, 844). The author confirmed the warning position on 2026-10-15. After receiving a fixed-SHA normal route and 3-point checklist, the owner reported 「問題なかったよ」 for (1) pre-event B blockade with Shion warning, (2) passage opening after full Aftermath, and (3) opening preserved after reload/Continue, at runtime `587ed2e16b6e484993a54aca53a8eb4384188f39`. This is a **human scoped 3-check PASS**, not proof of every interruption, repeat-input, separate middle-state, existing-save migration, or Garden↔Landing roundtrip. [CI #38742867459](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38742867459) was 518/518 PASS at tested SHA; later documentation-only candidate [CI #38745957805](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38745957805) also 518/518 PASS, with runtime files unchanged. Full integration Device Gate, final release review, main merge and publication remain PENDING. See the exact scope in `docs/DEVICE_VERIFICATION_REGISTRY.md`.
