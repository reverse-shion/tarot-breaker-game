# TAROT BREAKER — Event Contracts

Status: ACTIVE
Machine-readable companion: `event-contracts.json`.

## EC-001 — Star Gate Anomaly
event_id: star-gate-anomaly
map: star_gate_garden
status: DEVICE VERIFIED / unreleased
start_condition: disabled in production by VGC-001 until explicit release approval
required_state: Shiopon and Lumiere garden progression completed before production activation
trigger_owner: Star Gate interaction runtime when released
start_event: tarot-breaker:star-gate-investigate
progress_changes: none authorized by this foundation
return_behavior: normal Garden route remains governed by VGC-001

Segments:
- star-gate-choice — DEVICE VERIFIED
- star-gate-camera — DEVICE VERIFIED
- star-gate-normal-resonance — DEVICE VERIFIED
- star-gate-reverse-flow — DEVICE VERIFIED
- star-gate-sky-release — DEVICE VERIFIED
- star-gate-camera-return — DEVICE VERIFIED
- star-gate-aftermath — DEVICE VERIFIED

Device verification baseline: `1c75354ea3b1de2f5e8cedeb0fbbc90d7cb3f839` (CI #1147 PASS). Verified through Star Gate choice → normal resonance → anomaly/reverse flow → dark energy 01→02→03→04 → skyward release/afterglow → Lumiere「……？」→ camera return. Production remains disabled until explicit release approval.

Existing production behavior remains governed by VGC-002 through VGC-007. This registry does not invent historical device SHAs.
