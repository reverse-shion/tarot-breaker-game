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
| _No new checkpoint recorded yet_ | — | — | — | — | — | Add only after explicit device confirmation |

### Integration verification records
| Route / integration | Commit SHA | Device | Result | Verified route behavior | Human confirmation | Notes |
|---|---|---|---|---|---|---|
| _No new integration record yet_ | — | — | — | — | — | Add only after explicit device confirmation |

## Legacy baseline
Existing production gameplay contracts VGC-002 through VGC-007 remain governed by `docs/VERIFIED_GAMEPLAY_CONTRACTS.md`. Historical exact device SHAs were not recorded, so this registry does not invent them.
