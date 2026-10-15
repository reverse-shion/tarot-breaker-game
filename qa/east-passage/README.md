# 東側通路Bライン｜隔離QA入口（未有効化）

Status: **STAGED / ORIGIN APPROVAL EMPTY / NO LIVE DEVICE URL**
Date: 2026-10-15
PR: #154
Working: QA origin guard and disposable seed; Locked: original Garden/Star Gate/Progress/Audio/character/UI/route/runtime + B_LINE
Primary purpose: test mid-Aftermath browser reload and old-save migration without touching existing production or RawGitHack previews.

## What has been implemented

- `qa/east-passage/index.html` loads the real `route-registry.js` and `progress.js`, plus an isolated QA-only guard and launcher.
- `qa-safety.js` refuses to read or write ANY storage unless the current **exact HTTPS origin** matches `approved-origin.js`, and refuses known shared hosts `raw.githack.com`, `reverse-shion.github.io`, other GitHub Pages hosts, GitHub, raw GitHub content, localhost/IP.
- `approved-origin.js` is intentionally **empty**, so the page is currently BLOCKED on every host. This is not a usable gameplay checkpoint yet and must NOT be linked to a player as working.
- Only an explicit click after user consent can create one synthetic, schema-validated Progress v1 save on the disposable QA origin. If a save already exists on that QA origin, refuse to overwrite it; no deletion/reset or import/export of real saved data.
- Two states: `pending-aftermath` (all meetings done; gate/route unfinished) and `legacy-completed` (gate completed but independent Star Sand fact missing). Both open the **actual Title** `../../index.html` on the SAME isolated origin; click **つづきから** to authorize the one-shot `?entry=continue` handoff. Direct `?entry=continue` navigation is intentionally blocked by the verified runtime.
- The QA entry has NO production gameplay HTML/JS integration and is not referenced by normal `index.html`. It has zero import-time storage effects.
- `tests/east-passage-qa-isolation.test.cjs` covers fail-closed known origins/unconfigured gate, no hidden writes, strict fixture validity, one-time isolated write, readback failure and blocked launcher.

## Provisioning requirements: stop until separately hosted

1. Provision a **new disposable HTTPS hostname** for a complete static mirror of PR #154's candidate source tree, with the repository root as web root; examples of providers include a Pages-style preview with a distinct hostname. **No known QA hostname exists yet**. A different path under `raw.githack.com` or `reverse-shion.github.io` does **not** meet this requirement.
2. Confirm the final browser origin is not shared with any normal-game/prod/previous-QA save. Use an actual device's loaded address, not an assumed redirect target. Confirm all relative game assets/HTML pages can be served.
3. Only after review, set `TarotEastPassageQAApprovedOrigin` in `approved-origin.js` to the **exact final origin** (no trailing path or slash); commit to a QA-only branch; run CI. Do not set it to production, RawGitHack or any existing saved-data origin.
4. Open `https://<isolated-host>/qa/east-passage/index.html` in a fresh QA context. Confirm it displays the verified origin before any user-triggered save. If blocked, STOP rather than bypassing the guard.
5. Pick ONE scenario per *empty QA storage origin*, check consent and explicitly seed it. The launcher will refuse to overwrite; use a separate new disposable origin/context for a second state. Do **not** clear production/browser data as a shortcut.

## iPhone test sequence once origin is approved and independently verified

- **Scenario A: pending Aftermath.** Select `pending-aftermath`, open the Title and use the on-screen **つづきから** button, investigate Star Gate, progress until one companion has been spoken to / before the final conversation. Reload the browser page, Continue. Verify the gate interaction resumes according to its contract and B is still blocked, with no `garden_star_sand_route_known` recorded. Resume/finish the real event, verify B opens only at final validated completion, then reload and check durability.
- **Scenario B: old-save migration.** On a *different empty isolated QA origin/context*, seed `legacy-completed`, Continue. Verify corrupt Gate is restored, Lumiere is departed, no Star Gate replay, B is open after the verified one-time migration, and Garden→Landing→Garden/reload keeps the route open. Record any errors. Test is synthetic old-save migration, **not** proof of a particular real user's original saved bytes.
- **Failure-mode coverage.** Do NOT tamper with the real device's normal-game storage to simulate write failure. Use separate Node-injected failures or a specially designed isolated QA runtime/adapter after independent review. Failed storage currently leaves the passage locked; any user-facing recovery change requires product decision.
- Record exact deployed SHA, hostname, device/browser, before/after evidence and outcome in `docs/DEVICE_VERIFICATION_REGISTRY.md`. Only human observed results can be DEVICE VERIFIED.

## Rollout rules

- PR #154 stays Draft, `DEVICE_RESULT: PENDING`; no merge or production deployment until the required independent/Device/merge approvals.
- Browser-origin isolation cannot be certified by CI alone. Until a host is configured and tested, this is **working guard code but NO LIVE ISOLATED QA**.
- Preserve the owner-confirmed `B_LINE (1398,740)→(1398,844)`, all existing working event/audio/Progress files, plus historical locked preview SHA tests.
- New QA launcher does not claim to be a registered `dev-checkpoints.js` production-compatible checkpoint; it is an independent disposable-site test launcher using an actual normal Continue runtime after isolated seeding.

## Branch ownership / PR scope

This QA launcher is developed on **`feature/east-passage-qa-origin-isolation`**, a separate branch targeting the B-line foundation feature branch. It is **not part of the tested gameplay runtime** on PR #154 and must not be merged directly into main. The parent PR's safety guard recognized these QA HTML/JS files as new executable files, so their integration gate correctly blocked; do not weaken or circumvent that gate. This separate branch exists to keep human-tested Garden gameplay and QA-site development isolated. The source stays intentionally disabled until an independently reviewed HTTPS QA hostname has been provisioned and precisely approved.


## Automated WebKit mobile browser verification — 2026-10-15

The GitHub Actions workflow `.github/workflows/east-passage-webkit-qa.yml` installs pinned Playwright WebKit on a Linux CI runner and executes `qa/east-passage/tests/webkit-smoke.test.cjs` with a 393×852 mobile-sized viewport, touch mode, and device scale factor 3.

**No public deployment and no production saved data.** The test intercepts **every** HTTP(S) request and fulfills permitted files from the CI checkout using synthetic HTTPS hostnames `east-a.playwright.test` and `east-b.playwright.test`. It aborts all external requests. Actual RawGitHack and GitHub Pages origins are simulated inside a disposable browser context; no requests are sent to those services. The checked-in `approved-origin.js` remains empty/blocked. Test-only network interception supplies an origin approval on the synthetic hosts, never by updating the deployed file.

The real Title one-shot entry contract is retained. After seeding the isolated synthetic Progress record, the launcher navigates to the real `../../index.html` Title; WebKit explicitly clicks **つづきから** before it receives the `?entry=continue` token. Direct navigation to the internal URL is correctly rejected. After reloading the consumed internal URL, the browser is returned to Title; WebKit clicks Continue again and checks the durable record.

Covered browser assertions:
1. The QA launcher on simulated RawGitHack/GitHub Pages stays locked and preserves pre-existing storage marker bytes despite attempted clicks.
2. An incomplete Aftermath fixture launches real Garden Continue, then reloads and re-enters via Title without creating the independent route-known event.
3. A legacy complete Star Gate fixture is migrated by the real Garden runtime exactly once; reload and Title Continue retain the new event, while a separate synthetic QA origin in the **same browser context** remains empty.

Evidence: [WebKit run #38759907789](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38759907789) at `7e02ed1d6784527e879d1f8042f847f3293717ab`: **3/3 PASS**; [normal regression run #38759907701](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38759907701): **530/530 PASS**. If this README is committed later, obtain new CI evidence for the new HEAD.

**Limits:** This is Linux WebKit mobile emulation, not a physical iPhone/Safari or its page lifecycle; no real halfway-through-cinematic pagekill, write-denial device test, audio/sprite review, or actual hosted-origin verification has occurred. The old-save fixture is synthetic, not copied user data. Do not mark `DEVICE_RESULT: PASS` or merge PR #156/PR #154 based on automated browser results alone.

Run locally in a disposable checkout (optional):
```sh
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install --with-deps webkit
node --test qa/east-passage/tests/webkit-smoke.test.cjs
```
