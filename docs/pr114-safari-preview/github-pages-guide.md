# PR #114 — GitHub Pages dedicated preview (2026-10-12)

Status: **PREPARED / NOT DEPLOYED / DEVICE PENDING / MAIN MERGE STOP**

This replaces Vercel **as the proposed transport** without editing any game runtime or the production Pages deployment. The previously audited Vercel local build evidence remains historical evidence, not external Pages proof.

## Isolation and fixed identities

- Game repository: `reverse-shion/tarot-breaker-game`; **do not change its main, Pages, or PR #114**.
- Draft tool PR: [#148](https://github.com/reverse-shion/tarot-breaker-game/pull/148); keep Draft.
- Separate new **public** repository required: `reverse-shion/tarot-breaker-pr114-preview`.
- Audited game HEAD: `b093e355f8ba409f8a87de0de5c828604d2bf905`.
- Runtime SHA: `b8cd71755f7eafabf7c23fc3c85c779f345ea948`.
- Exporter ref (immutable): `b8590add71ab194a469ee4d61a27fbfe1cdfea2a`.
- Only preview output `index.html` changes the Shiopon base to a local pinned copy; manifest records the exact source/deployed hashes.
- Export: 193 game files, 1 intentional HTML config transform, plus validation files. No main/PR114/runtime/test/asset/registry changes.

## Activation (GitHub account owner)

1. Create a **new public repository** named exactly `tarot-breaker-pr114-preview` under `reverse-shion`. Initialize with README. **Never point existing production Pages settings or its custom domain to this repository.**
2. Install [github-pages-deploy.yml](./github-pages-deploy.yml) as `.github/workflows/deploy-pr114.yml` on the **new preview repository's main** only. It has a built-in fail-closed repository-name assertion.
3. In the **new repository only**, open Settings → Pages → Build and deployment → Source → **GitHub Actions** (when required). The workflow runs on push to new repo main or can be manually started using Actions → workflow → Run workflow.
4. Wait for the new repository's `deploy` job to succeed and use the job's recorded deployment URL. Do not treat the URL below as deployed until confirmed.

Expected project Pages URL **after successful enablement/deployment**, not active/verified yet:

`https://reverse-shion.github.io/tarot-breaker-pr114-preview/`

Verify page (once deployed):

`https://reverse-shion.github.io/tarot-breaker-pr114-preview/__preview__/verify.html`

Game page (once deployed):

`https://reverse-shion.github.io/tarot-breaker-pr114-preview/index.html?dev=star-gate-full&returnDebug=1`

The workflow fetches only fixed Git SHAs from the public source repository, generates the same-origin static export using the reviewed exporter, verifies the 193 output-file digests and declared runtime SHA, and deploys via GitHub Pages **in the dedicated repository only**. It never writes to `tarot-breaker-game` or `reverse-shion.github.io`.

## Review and iPhone Safari gate

Once Pages has actually deployed:
- Check the live deployment URL and its manifest, and click "配信ファイルを照合" on `__preview__/verify.html` (193/193).
- In regular iPhone Safari (not an in-app browser), open the above game URL. Confirm `ERROR: none`, then manually test the full Stage3/Aftermath, 4-direction Lumiere sway, camera, inner light, event SFX/BGM, black silence, normal audio recovery, touch/continue/save.
- Record actual URL, device and iOS/Safari version, source/runtime SHA, pass/fail for each tested item, and remaining untested cases. Only a human's explicit observed PASS belongs in the Device Registry.
- Re-run independent review and the required Device Guard/CI under the same pinned runtime. **No main merge or production unlock** before those gates and explicit user approval.

## Known limits

- No GitHub integration currently available to create new repositories or change Pages Settings. Those two account-owned setup steps cannot be performed by the existing GitHub connector; workflow installation and content changes can be done through the connector once the repository exists and is accessible.
- No external Pages URL is currently verified, and no physical iPhone PASS can be assumed from local Chromium/WebKit evidence.
- GitHub Pages' site size/build quotas, public visibility, asset MIME/redirect responses, and caching must be checked after the new site's first build. Files must remain from the fixed source; if hosting requires a runtime change, do it on a separate candidate and re-audit.
- The preview has a separate origin from the production game; existing localStorage saves do not carry over.
- GitHub Actions uses deployment permissions **only on the separate preview repository**. Public preview resources should not contain secrets. The source assets are already in a public repository.
