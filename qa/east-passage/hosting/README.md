# Isolated HTTPS QA host — bootstrap runbook (v2.4-C)

Status: **HOST NOT PROVISIONED / DEVICE PENDING / MAIN MERGE STOP**.
This directory is QA-only. The exact source for the game is PR #165 at
`671b4282aea2d3e9cb21a873e99c7b2221fe27e5` (Astra B5-only PASS).
Track work in Issue #163. Neither PR #165 nor `main` may be changed here.

## Safety invariant

The `qa/east-passage/approved-origin.js` setting MUST remain empty during
bootstrap. Never point it to `reverse-shion.github.io`, RawGitHack, any game
hostname, a shared QA hostname, an IP, or HTTP. Never delete, inject, copy,
export or otherwise access actual players' existing progress. QA fixture
creation is a separate opt-in phase **after** the live host is verified.
This bootstrap DOES NOT represent iPhone acceptance or production approval.

## Phase H1 — new external host, NOT the game release

1. Create a **new and separate** Cloudflare Pages project linked to
   `reverse-shion/tarot-breaker-game` using Git integration. Its Cloudflare
   production branch must be `qa/east-passage-device-host-v1`, **not** GitHub
   `main`. Do not attach the normal-game domain.
2. Framework: none. Build command `exit 0` (or the provider's documented
   blank command), and build output directory: repo root containing
   `index.html`. Use `.` only if accepted by the provider UI; do not
   assume a generated `dist` or `public` folder. Resolve deployment
   errors before moving on.
3. Set Preview branch deployments to **None** for this QA project. Do not
   link existing game or production deployment to this branch. The external
   provider login/authorization must be performed by the account owner.
4. Observe the actual new HTTPS hostname, its post-redirect final origin,
   project ID, deployment ID and deployed exact SHA. Must be distinct from
   every pre-existing game, legacy preview or QA origin.
5. With a checkout of the **same exact deployed commit**, run (Node 22+):
   `node --test qa/east-passage/hosting/verify-host.test.mjs`
   `node qa/east-passage/hosting/verify-host.mjs https://ACTUAL-NEW-ORIGIN`
   Do **not** add a slash to the origin. This probes byte-for-byte matches
   of 15 selected paths (HTML, JS, JSON, image), refusing redirects.
   It is **not** a substitute for full asset inventory or device tests.
6. Verify `/qa/east-passage/index.html` on the actual iPhone hostname says
   `安全ロック` and cannot seed anything while approval remains empty.
   The normal Title and route assets must resolve without cross-origin
   redirects. Record anonymized evidence and any broken paths.
7. If the host is still missing, probe fails, site lacks assets, origin is
   shared, or deployed SHA is not pinned: mark **HOST_GATE=STOP/PENDING**.

## Phase H2 — activation is a *separate reviewed change*

After H1 PASS, update only `qa/east-passage/approved-origin.js` on a new
QA-specific commit to the exact verified origin (scheme + host, no slash).
It must never be updated to a guessed value. Review test assertions and
QA-only CI before activation; the existing WebKit smoke workflow deliberately
asserts that approval stays empty, so it must not be mistaken for an
enabled-host test. A new CI run and QA isolation review are required.

For the legacy-save fixture use a **second new independent HTTPS origin**
and a separately approved config/QA branch; reusing the first origin and
clearing its data is not allowed. The real Title and `つづきから` should
be used. Direct `?entry=continue` access is not a valid test.

## Gate register

- Gate A and B1–B4/B6: retain separately scoped historical verdicts.
- Gate B5: PASS only for PR #165 fixed HEAD.
- Host Gate: PENDING until the external site and byte check are verified.
- Device Gate: PENDING until iPhone Safari physical acceptance with the
  same deployed game bytes and saved scenario evidence.
- Release Gate: STOP. No merge to main or public game deployment.

Host acceptance does not grant a release. Capture provider, final origin,
deployed SHA, actual bytes, CI result, iPhone device/version, exact steps,
screen captures and per-scenario verdict without collecting save bodies.

Reference: https://developers.cloudflare.com/pages/configuration/build-configuration/
and https://developers.cloudflare.com/pages/configuration/branch-build-controls/
