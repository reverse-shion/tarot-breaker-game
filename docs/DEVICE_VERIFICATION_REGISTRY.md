# TAROT BREAKER — Device Verification Registry

Status: ACTIVE

This file is the durable handoff between conversations and agents. Only explicit human real-device verification may add a PASS.

## Rules
- Record exact commit SHA; never record only a moving branch name.
- PASS means the listed observable behavior was tested on a real device by the product owner.
- CI PASS is not DEVICE PASS.
- A later regression does not erase history: record the regression and stop affected work until repaired.
- Do not infer PASS from prior conversation text unless the product owner explicitly confirmed the exact tested build.

## Current verified baseline
Existing production gameplay contracts VGC-002 through VGC-007 are governed by docs/VERIFIED_GAMEPLAY_CONTRACTS.md. Their detailed historical device SHAs were not recorded there, so this registry does not invent them.

## Event verification records

| Event / checkpoint | Commit SHA | Device result | Locked observable behavior | Notes |
|---|---|---|---|---|
| _No new checkpoint recorded yet_ | — | — | — | Add only after explicit device confirmation |

## Integration verification records

| Route / integration | Commit SHA | Device result | Verified route behavior | Notes |
|---|---|---|---|---|
| _No new integration record yet_ | — | — | — | Add only after explicit device confirmation |
