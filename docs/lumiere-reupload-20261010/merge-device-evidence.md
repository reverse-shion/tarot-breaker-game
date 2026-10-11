# PR #141 — merge verification ledger (2026-10-10)

Target: `main`. Candidate runtime SHA: `37247552f7885650dfa937a8d2228a7dc0053ad2`.
Owner visual acceptance: after opening the corrected immutable standalone 4-direction preview `docs/lumiere-sprite-replacement-20261010/lumiere-official-3724755.html`, owner responded 「問題ないのでイラストをマージして」 and explicitly requested 「#141をマージして」. See `docs/DEVICE_VERIFICATION_REGISTRY.md` for deliberately limited evidence scope.

Only four Lumiere WebP files and their manifest change in production. The images originate from the latest Asset Studio #136, #137, #138, #140 uploads. Lossless WebP verification and preservation of existing render/bob contracts passed. Historical immutable preview tests use fixed old manifest fixture without changing historical hashes. No runtime file changed after the candidate runtime SHA.

This evidence note is documentation-only; it neither authorizes bypass of the CI/device checks nor claims comprehensive iPhone/route verification.
