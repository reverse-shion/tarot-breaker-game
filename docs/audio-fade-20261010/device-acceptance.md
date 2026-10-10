# PR #142 — Human iPhone audio acceptance evidence

Date: 2026-10-10 JST.

Tested standalone pinned preview: `docs/audio-fade-20261010/iphone-audio-check.html` at commit `bf735b5c76d0e782b706ef100c8a663e57d9fb65`. The exact audio runtime is `0884d760acb50545818f94c7195dcfe5f32f122d`.

The product owner answered `問題ない全て合格` to the previously sent checklist, which covered BGM start; conversation start/end level transitions; BGM OFF/ON; background and foreground; and quick repeated button operations. This is user-reported iPhone listening acceptance of **the standalone smoke page**. It does not claim measured dB levels, absence of console errors, full-game BGM wiring, all tracks, or full game route coverage.

Automated pre-fix strict media-volume reproduction and post-fix unit + regression tests are independent evidence. No production/runtime source was edited after the exact runtime SHA. The user has confirmed checks, but has not separately requested the main-branch merge in that message.
