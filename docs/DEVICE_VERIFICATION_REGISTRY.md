# TAROT BREAKER — Device Verification Registry

Status: ACTIVE

This file is the durable handoff between conversations and agents. Only explicit human real-device verification may add a PASS.

## Authority rules
- Record an exact commit SHA. Never record only a moving branch name.
- PASS may be added only after the product owner explicitly confirms that exact build was tested on a real device.
- CI PASS is not DEVICE PASS.
- AI/automation must never infer, manufacture, backfill, or upgrade a Device PASS.
- A later regression does not erase history. Add a regression/FAIL record and STOP affected work until repaired.
- A Device PASS for one SHA does not transfer to a later SHA. Any later code change requiring Device Gate needs a new explicit verification.
- Event/checkpoint PASS and integrated-route PASS are separate evidence. One does not imply the other.

## PR contract
A PR that requires real-device verification must contain:

```
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PASS
```

and the exact candidate commit SHA must already exist in this registry as an explicit human-confirmed PASS.

Foundation/docs/test/CI-only work may use:

```
SCOPE: FOUNDATION
DEVICE_GATE_REQUIRED: NO
```

but FOUNDATION must not modify production/runtime files.

## Record format
Never edit a historical PASS into a different SHA. Append a new row.

### Event verification records
| Event / checkpoint | Commit SHA | Device | Result | Locked observable behavior | Human confirmation | Notes |
|---|---|---|---|---|---|---|
| Alenon Continue — intro incomplete | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Prologue starts from beginning and reaches playable Alenon; page-exit audio stops | Product owner explicit confirmation in ChatGPT | Audio stop observed with about 2 seconds of host WebView close latency |
| Alenon Continue — intro complete | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | No prologue replay; Shion renders/moves; audio normal | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Alenon Continue — PAD return | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Safe PAD-return spawn; movement; no replay, abnormal warp, or PAD retrigger | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Alenon Continue — PAD return / Shiopon waiting | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Shiopon absent locally; movement; completed events do not replay; PAD/audio normal | Product owner explicit confirmation in ChatGPT | Exact candidate build |

### Integration verification records
| Route / integration | Commit SHA | Device | Result | Verified route behavior | Human confirmation | Notes |
|---|---|---|---|---|---|---|
| Title → Alenon → PAD → Landing → Alenon return | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Ordinary route completes through Alenon return without abnormal replay, placement, movement, screen, or audio behavior | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Title → Alenon → PAD → Landing → Alenon return | e4ea07d48ada103db367f74c6f726de086d46455 | iOS/iPad ChatGPT in-app browser | PASS | Ordinary route completes through Alenon return without abnormal replay, placement, movement, screen, or audio behavior | Product owner explicit confirmation in ChatGPT | Exact post-lineage-sync build; staged background/map reveal observed and explicitly deferred as a separate loading-presentation issue |

## Legacy baseline
Existing production gameplay contracts VGC-002 through VGC-007 remain governed by `docs/VERIFIED_GAMEPLAY_CONTRACTS.md`. Historical exact device SHAs were not recorded, so this registry does not invent them.
