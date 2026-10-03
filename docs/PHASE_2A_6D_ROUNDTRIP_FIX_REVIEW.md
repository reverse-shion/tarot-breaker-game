# Phase 2A-6D Roundtrip Fix — Pre-Merge Review

Status: DEVICE PASS / PRE-MERGE
PR: #92
Runtime SHA: `579974955e418cccfbcec5dbb38dbcaf2ea95824`

## Reported regression

After the Shiopon meeting, the route Garden → Landing → Alenon could leave durable Progress at Landing. Reload → Continue therefore resumed the waiting-Shiopon Landing state, and a later Garden entry could replay the Shiopon meeting.

## Runtime fix

- Every real Landing → Alenon PAD departure now persists `alenon / pad_return`.
- The transition fails closed when the checkpoint cannot be durably persisted.
- Normal Landing → Garden arrival re-projects completed event and companion history from durable Progress into session Journey before authored dialogue eligibility is evaluated.

## Verification

- Validate #1398: PASS on the reviewed runtime/test state.
- Validate #1399: PASS after Device Registry evidence.
- Exact runtime Device PASS confirmed by the product owner:
  - reload → Continue resumes Alenon
  - Shiopon meeting does not replay on subsequent Garden entry
- All commits after the runtime SHA are tests/docs only.

## Merge boundary

No runtime change is permitted above the verified runtime SHA without a new Device Gate. Main merge requires a fresh Event Safety / Main Merge Gate PASS and explicit product-owner merge authorization.
