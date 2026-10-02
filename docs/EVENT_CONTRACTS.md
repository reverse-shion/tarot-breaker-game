# TAROT BREAKER — Event Contracts

Status: ACTIVE
Machine-readable companion: `event-contracts.json`.

## EC-001 — Star Gate Anomaly
event_id: star-gate-anomaly
map: star_gate_garden
status: NOT TESTED / unreleased
start_condition: disabled in production by VGC-001 until explicit release approval
required_state: Shiopon and Lumiere garden progression completed before production activation
trigger_owner: Star Gate interaction runtime when released
start_event: tarot-breaker:star-gate-investigate
progress_changes: none authorized by this foundation
return_behavior: normal Garden route remains governed by VGC-001

Segments:
- star-gate-choice — NOT TESTED
- star-gate-camera — NOT TESTED
- star-gate-normal-resonance — NOT TESTED
- star-gate-reverse-flow — NOT TESTED
- star-gate-sky-release — NOT TESTED
- star-gate-camera-return — NOT TESTED
- star-gate-aftermath — NOT TESTED

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
status: NOT TESTED / recovery implementation working scope
productionEnabled: false
segments:
- landing-resume-entry — NOT TESTED
- garden-resume-entry — NOT TESTED
- garden-landing-roundtrip — NOT TESTED
start_event: tarot-breaker:landing-resume-ready for the registered Landing receiver; Garden transit is admitted only by its registered isolated Landing Continue session
trigger_owner: existing Landing and Garden authored runtimes after the isolated Continue readiness projection succeeds
required_state: a registered Phase 2A-5c checkpoint with validated Progress v1 history, companion authority, exact map, and authored spawn
progress_changes: isolated development session only; production Progress, Journey, settings, and editor storage writes are forbidden
return_behavior: the isolated Garden roundtrip returns to the originating Landing Continue session; ordinary production Journey routing remains unchanged
implementation_contract: docs/phase-2a-5c-landing-garden-continue-spec.md

WORKING behavior is limited to Garden observer/bootstrap, isolated Garden transit and return, Landing receiver, Continue waiting/disembark/dialogue/follower restoration, Garden re-entry authority, tap endpoint safety, and development/production isolation. Alenon, Audio, unrelated Story/Movement/Collision/Dialogue, the Star Gate anomaly, VGC-001 through VGC-007, ordinary production Journey behavior, and existing device records remain LOCKED.

No segment in this event is DEVICE VERIFIED. CI or preflight PASS must not be recorded as Device PASS.
