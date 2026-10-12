# PR #114 Safari preview investigation contract

Status: WORKING / HIGH (Safari delivery); MAIN MERGE GATE: STOP.

- Current main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
- Audit/source HEAD: `b093e355f8ba409f8a87de0de5c828604d2bf905`.
- Runtime SHA: `b8cd71755f7eafabf7c23fc3c85c779f345ea948`.
- Independent branch: `fix/pr114-safari-preview`, derived from the audit HEAD.
- WORKING: identify the boot exception; build a reproducible, commit-pinned,
  same-origin static preview export; record browser/byte-integrity evidence.
- LOCKED: all runtime JavaScript/CSS/HTML, artwork, audio, dialogue, event
  timeline, camera, Lumiere compositor, Save/Continue, ordinary routes,
  tests/validators/baselines, Device Registry Guard and device records.
- Expected repository changes: additive script and investigation documentation
  only. The exported preview's index configuration may replace the existing
  remote Shiopon asset base with the pinned local copy; disclose both hashes.
- No gameplay repair unless browser evidence establishes a runtime defect.
- No main merge, production deployment, existing Pages changes or PR #114 head
  update. Keep PR #114 Draft. Hosting must use an isolated preview deployment.

Facts at contract creation: the two pinned SHAs have identical runtime bytes;
same-origin Stage3 boots in Chromium; redirecting the Lumiere source image to a
second origin produces SecurityError at `lumiere-sway.js:77`, called from
`game.js:2589`; the actual RawGitHack endpoint is blocked with HTTP 403 from
this executor. The reported iPhone stack is not yet captured.

Acceptance: all Node tests and current-main comparison; existing asset/audio/
background validators and syntax checks; real Chromium and desktop WebKit boot,
image and Canvas probes; recorded failure and successful same-origin control;
unchanged runtime byte hashes; immutable HTTPS deployment URL and served-byte
verification; human iPhone confirmation. Automated results do not satisfy the
last item. Independent Astra review receives the actual diff and evidence.

Unresolved external inputs: exact failed URL, hosting connection, physical
iPhone results. These do not authorize a runtime change or release.
