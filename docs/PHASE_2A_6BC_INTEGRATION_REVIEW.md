# Phase 2A-6B/6C Public Continue — Integration Review

Status: REVIEWED / PRE-MERGE
Target: main
Integrated PR: #91
Supersedes: #90
Runtime SHA under Device Gate: `2c9189158360d7bffa99b845899607647db230cc`

## Review scope

Reviewed the integrated main diff for Public Continue across:

- Alenon
- PAD Landing
- Star Gate Garden
- Title Continue dispatch
- one-shot runtime entry admission
- durable Progress / session Journey boundaries
- Garden → Landing return
- explicit New Game reset behavior

## Findings

### 1. Continue and New Game are separated

Public Continue resolves the validated durable Progress checkpoint and routes only to the corresponding map receiver.

The Title New Game path is the only root gameplay path that calls:

`resetGame("title-new-game")`

Garden Public Continue is guarded by `enteringGardenRuntime` and cannot fall into that reset/navigation branch.

### 2. Durable Progress remains authoritative

Landing and Garden Public Continue receivers:

- load Progress v1
- resolve the checkpoint through `progress-resume.js`
- project legacy Journey state only after successful validation
- revalidate the durable save before gameplay becomes ready
- reject a changed/stale save instead of silently continuing

The Continue adapters do not call `resetGame`.

### 3. Runtime entry is one-shot

Internal map navigation issues a short-lived session token tied to exact pathname + query.

Direct/reloaded intermediate runtime URLs do not receive that token and therefore return to Title instead of bypassing the official entry flow.

### 4. Garden return is reachable after Continue

The previous unreachable fixed exit reference is removed.

Garden now derives its south exit reference with:

`collision.nearestWalkable(DEFAULT_SPAWN)`

The return trigger therefore sits on the actual reachable collision boundary for Landing entry, Dev Continue and Public Continue.

Landing receives `?from=garden` and commits:

- source: `star_gate_garden`
- destination: `star_country_landing`
- spawn: `garden_entrance`

### 5. Story / companion authority is preserved

Completed Devil Memory, Shiopon meeting and Lumiere states are reconstructed from Progress and remain suppressed when already completed.

Incomplete events remain eligible.

No Progress schema, route ID or event ID was changed by this integration.

## Evidence

- Validate #1393: PASS on the runtime + test state.
- Validate #1394: PASS after Device Registry evidence.
- Human Device Gate: PASS for exact runtime `2c9189158360d7bffa99b845899607647db230cc`.
- Changes after the runtime SHA are tests/docs evidence only.

## Review result

No blocking integration defect was found in the reviewed main diff.

Next gate:

1. run main-target Validate
2. run Event Safety / Main Merge Gate
3. confirm PR diff/lineage remains clean
4. remove Draft only after all required gates are green
5. merge to main only after explicit product-owner authorization
