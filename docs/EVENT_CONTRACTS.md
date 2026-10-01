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
