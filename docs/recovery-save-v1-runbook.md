# Phase C-0 — save-compatible recovery candidate

UNAPPROVED CANDIDATE / Device PENDING / RELEASE HOLD. Nothing here authorizes deployment.

## Fixed identities and scope

- Recovery source main: `4d95d98bcac7723dfd006931400bf8b86ad212e0` (fetched origin/main still matches).
- Production integration candidate: `5a3499a6343a30885e042353e8fa921a63adc5c7` (PR #167).
- Phase B evidence: `540eb2c7a95aac7126e61f94e0cbc7cb3cd58c15` (PR #168).
- Immutable recovery code/test commit R: `9c70f3b32e2e9c1d494e9e3d160939df6b5c60df`.
- Artifact: `tarot-recovery-9c70f3b.tar`, created with `git archive --format=tar R`.
- Artifact SHA-256: `dbde6a6038f3ddef2de990a8b12fe7dbc71111bc284e210fa0cd4df3740b52d4`.
- Reproduce from the repository: `git archive --format=tar --output=tarot-recovery-9c70f3b.tar 9c70f3b32e2e9c1d494e9e3d160939df6b5c60df`, then `sha256sum tarot-recovery-9c70f3b.tar`.
- This document is a later docs-only commit; distinguish its PR HEAD from R. R is the deployable source archive, not an already deployed Pages artifact.

WORKING: registry recognition, exact-ID expectation, one compatibility test, procedure. LOCKED: all other runtime, format/key, assets, B-line feature, hosts, QA saves, Device Registry and existing PRs. Risk HIGH (save recognition). No functional B-line code is transplanted; this is old gameplay with read/write retention of the new fact. Unknown IDs remain invalid. No flags are deleted, converted or reordered.

## Automated evidence

The recovery test uses independent memory-only injected storage for old completed saves without the new ID and valid saves containing it. Real Progress, Public Continue controller inspect/launch, Garden receive/revalidate, normal arrival writes, fresh-reader reload and Garden/Landing roundtrip run without production origins. Both records retain exactly their event histories. Invalid JSON, future version, unrelated unknown IDs and contradictory companion data reject without writes/navigation. A throwing write returns nonpersistent state, leaves durable bytes unchanged, and does not touch an unrelated key.

Local regression: **507/507 PASS** (fixed-main 506 cases plus one new case), failures/skips/cancellations 0, baseline new=0. Syntax, assets/background/audio validators and diff check PASS. Runtime delta from fixed main is only the four registry lines; registry bytes match PR #167. These are Node module tests, not browser E2E or device proof. No live saves were read or written.

## Observed Pages delivery and release identity

Read-only Pages API observation: `build_type: legacy`, source `main:/`, URL `https://reverse-shion.github.io/tarot-breaker-game/`. The repository also contains `.github/workflows/pages.yml`, which triggers on main push or manual dispatch and uploads checkout root (`path: .`) via upload-pages-artifact/deploy-pages. These two facts do not establish which deployment will win a future race. Recheck actual settings and deployment history before any approved operation.

Do not manually dispatch the recovery branch now: branch dispatch alone cannot establish a stable recovery while legacy Pages still tracks main. Do not change hosting configuration under this task. If delivery ownership cannot be established, STOP for separately approved hosting/release work.

## Future recovery operation — only after device and explicit release approval

1. Freeze releases and record current main, deployed version, incident and owner approval. Read `gh api repos/reverse-shion/tarot-breaker-game/pages`, workflow runs and deployment history. Confirm all active publishing paths will serve one reviewed main tree. Concurrent/manual runs on another ref must not be allowed to overwrite it. If this cannot be guaranteed within approved release operations, STOP.
2. In a clean separate checkout with no live browser storage, fetch refs and verify R and its archive checksum. Build an auditable recovery-release branch from then-current main, not by force-pushing or rewinding main. Example preparation (NOT performed here):

   ```sh
   git fetch origin
   git switch -c recovery/release-from-current origin/main
   git read-tree --reset -u 9c70f3b32e2e9c1d494e9e3d160939df6b5c60df
   git commit -m 'Restore reviewed save-compatible recovery tree'
   git diff --exit-code 9c70f3b32e2e9c1d494e9e3d160939df6b5c60df HEAD
   ```

   This intentionally restores the full reviewed source tree in a new commit while preserving Git history; it changes no browser saves. Review the complete release diff against then-current production; any later save IDs/schema or required unrelated fixes make R stale and require STOP. Submit a separate release PR, run CI and obtain applicable release/device approvals. Do not reuse this preparatory Draft as publication authority.
3. Only after explicit authorization, merge that release PR. Record resulting main commit D and verify `git diff --exit-code R D` (replace R/D with recorded full SHAs). Both legacy main-source publication and any main-triggered Pages workflow must target that same tree. A skipped, failed, conflicting or stale deployment is STOP, not success.
4. Record actual Pages deployment/build ID, associated commit D, actions run and uploaded `github-pages` artifact ID/digest when present. Git archive SHA-256 identifies the source archive; it is not the compressed Pages artifact digest. Verify the served bytes against D before accepting recovery. Do not identify a release solely by URL or a green workflow badge.

## Cache / asset consistency gate

Existing HTML uses fixed query versions (including `route-registry.js?v=20260921-progress-v1`); restoring a tree does not invalidate cached responses. No service-worker registration/cache implementation was found in the inspected runtime. CDN/browser/BFCache can still retain old documents or modules.

- Close suspended game tabs before version changes; do not clear website data, localStorage, or Safari history to fix caches.
- Check served HTML, loaded script URLs and bodies, especially game.js, route-registry.js, progress.js, public-continue.js, garden-public-continue.js and star-gate-public.js, against the selected commit. Use network inspection with cache disabled and SHA-256 body comparison, preserving storage. Check referenced asset availability/body identity as well; a cache-busting diagnostic request alone does not prove the normal document's cached resources are consistent.
- On target Safari, use an approved inspection method to verify the actual loaded responses after navigation/reload, not only a separate curl request. If stale bytes cannot be replaced and verified without deleting saves, STOP. Cache-version changes or hosting adjustments require a separately reviewed change; this candidate does not silently add them.

## Official Continue acceptance and return to new version

Before any release, obtain owner-observed iPhone/iPad Safari evidence on an approved isolated delivery path, with explicit synthetic-save consent: old and new-ID saves each reach the correct official Continue checkpoint; completed story does not replay; follower state is correct; reload and Garden/Landing roundtrip preserve the new ID; prior QA-A storage remains protected. Also verify applicable old-game behavior after reverting the B-line feature. Do not import test saves into production or QA-A/QA-B under this task. No approved new delivery path is established by this document.

For a later return to PR #167-equivalent runtime, select an approved immutable new-version commit N (the current candidate is not release-approved). Repeat the release-branch/tree review, CI, deployment identity and cache checks above using N. Never reset, strip or rewrite the retained save flags. First validate compatibility and real Continue with recovery-produced saves on isolated storage, then obtain explicit release approval. Record the newly deployed commit and artifact, not only the original PR number.

## Stop conditions and remaining approval

STOP on invalid/unavailable save, unexpected ID/schema, bytes loss, changed checkpoint/history, repeated completed events, nonpersistent write, mismatched assets/scripts, unidentifiable deployed tree, competing publisher, new CI failure or failed device check. Suspend save-mutating acceptance work and preserve evidence; never reset, delete, remove the new flag or fall back to fixed old main. If recovery fails, do not repeatedly swap versions or overwrite saves; keep HOLD and request incident-specific authorization.

Pending: real-device old/new compatibility and cache behavior, approved delivery path, Pages publishing ownership, deployed artifact verification, future return-to-new-version device check and explicit owner release/recovery approval. Code/CI PASS does not establish recoverability. PR #167/#168 remain untouched; no merge, hosting change, deployment or Device Registry PASS is performed.
