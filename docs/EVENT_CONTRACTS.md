# TAROT BREAKER — Event Contracts

Status: ACTIVE
Machine-readable Source of Truth: `event-contracts.json`.

Contract maintenance rule: status and segment truth are authored in `event-contracts.json`. This document mirrors that registry for humans; CI validates that the mirror stays consistent instead of pinning a historical status such as `NOT TESTED`.

## EC-001 — Star Gate Anomaly
event_id: star-gate-anomaly
map: star_gate_garden
status: PARTIALLY DEVICE VERIFIED / unreleased
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
- star-gate-aftermath — NOT TESTED

Device verification baseline: `1c75354ea3b1de2f5e8cedeb0fbbc90d7cb3f839` (CI #1147 PASS). Verified scope ends at Star Gate choice → normal resonance → anomaly/reverse flow → dark energy 01→02→03→04 → skyward release/afterglow → Lumiere「……？」→ camera return. The later vision/aftermath sequence is outside this verified scope and remains NOT TESTED. Production remains disabled until explicit release approval.

Existing production behavior remains governed by VGC-002 through VGC-007. This registry does not invent historical device SHAs.
