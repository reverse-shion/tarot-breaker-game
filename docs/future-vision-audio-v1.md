# Future Vision audio v1.0 — dev candidate

Author contract: 2026-10-06, Future Vision 音響演出仕様書 v1.0. This explicitly replaces the previous future-event selection/volume contract only. Normal audio, native Alenon playback, settings and Save/Continue remain locked. No release or main merge authorization.

## Preflight and preservation

- PR #114, existing `fix/star-gate-front-stage3-integration` branch and `index.html?dev=star-gate-full`.
- Starting local and remote PR HEAD: `820a805bb8a9107e349e92aaa877e9ae265d3865`.
- Fetched main: `5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3`.
- Existing registered target `future-fixation-stage3`: preflight PASS; productionEnabled false. The URL parameter is not a preflight target.
- Before-change candidate 371/371 and fresh main 326/326 passed. These are baseline results, not changed-candidate results.
- Risk HIGH: new event audio and browser gesture/iOS behavior. Independent review and physical audio Device Gate required. Device status remains UNPERFORMED.
- Full pre-change branch and both v1.5/normal-card preservation refs retained in `/workspace/future-audio-v1-evidence/pr114-before-audio.bundle`.

WORKING: two original MP3 assets; dev-only media/Gain controller; direct entry/reveal/card/white/black/P0 cues; necessary registry, tests and evidence. LOCKED: visual timing/positions, 2950ms card transformation, red03 R0, Stage 1–3 dialogue, Aftermath 14Box/flight/Follow/input, normal audio engine, native Alenon, Save/Continue, routes/maps, device records. No unrelated ordinary fade or ruins-boundary repair.

## Source assets and initial settings

Original bytes are added without transcoding, cutting or normalization:

| Path | SHA256 | Duration | Bytes |
|---|---|---:|---:|
| `assets/audio/bgm/future_ruins.mp3` | `c4f53111f049e4efd89d751605f6b01508a1a5be0e758042a0ddfa9d9e0eabb2` | 210.048s | 4,831,498 |
| `assets/audio/bgm/future_fix.mp3` | `a5d24a2e107fd5f9df7d32237ed53c7bae5fc67940435145ce5391683c964be0` | 229.608s | 5,348,291 |

Both are 48kHz stereo. Ruins starts at 1.8s: trim `10^(-6.48/20)` × mix .70 (about .332). Fix starts at 20.0s: trim `10^(-5.23/20)` × mix .50 (about .274). Post-white ruins restarts at 1.8s with mix .25 (about .119). Gains additionally use the existing Stage 3 coefficient, linear crossfade and music preference, without the old event base .16. Values are candidate settings, not device listening PASS.

Dark entry pauses ordinary BGM immediately. The first positive ruins opacity starts a 250ms fade, without a silent delay. Existing card TRANSFORM drives the only 800ms linear ruins→fix crossfade; ordinary card HOLD/SETTLE retain ruins. White/black use both gain zero and actual pause. White reveal starts low ruins, not a fix snapshot. Current restoration uses the original P0 source/time/playing and 550ms curve; Aftermath inherits the restored current BGM. No future source is written into the normal audio snapshot.

## Validation status

Fresh changed-source regression: 389/389 PASS, targeted controller/current-preparation/ordinary-audio/card tests 32/32 PASS, main 326/326 PASS. Syntax, event preflight, validate, background/audio validation, exact original hashes, full MP3 decoding and diff checks PASS. No old candidate count is transferred.

Current-position preparation uses the existing ordinary API only after verified current restoration under black: set the P0 base and coefficient zero, `resume({...p0.audio, playing:false})`, then use the unchanged actual P0 snapshot at reveal. It does not change `audio.js`, its 500ms timeout, the 550ms reveal curve, or a originally stopped source. Preparation failures are recorded without blocking visual restoration.

Chromium 151, DPR1: final prepared landscape 844×390 completes the original approach/choice, front, card transformation, Stage 3, red03 restoration, continuous Aftermath 14Box, whole-rectangle flight exit, held-input release, actual canvas tap and existing Follow. Audio failures, page errors and post-gesture event storage writes are zero. P0 native play completed in about 254ms in this successful case. Latest prepared portrait and final public exact-SHA results are separately recorded in PR evidence; no earlier SHA is relabelled as a new-SHA PASS.

Recordings capture the actual future-track GainNode output with test-only side taps; ordinary BGM is not connected to the recording graph in final tests. Its restored source/time/paused/volume and native play fulfillment are logged instead. This is neither a microphone/speaker recording nor complete native-current-output listening proof. Future recording PCM peak is below .20; White/Black windows are near codec noise floor while native sources are paused and gains zero. MediaRecorder packet gaps are aligned for the timeline plot; inserted gaps are not independent silence evidence. Human listening and physical iPhone output remain UNPERFORMED.

Failed attempts remain recorded: immediate native seek getter checks were repaired and protected by an asynchronous-seek test. A Range-less local HTTP server returned seek completion at zero; the same bytes and browser reached 1.8s with byte-range HTTP206 support. A P0 native play took about 930ms and exceeded the unchanged 500ms API deadline in one pre-preparation landscape run. A future-only portrait succeeded before preparation, so the failure cannot be assigned solely to the abandoned ordinary captureStream recording tap. Silent position preparation then succeeded in the tested landscape case; it does not guarantee all native play latencies stay below 500ms. The original ordinary negative-volume fade exception is independently reproduced on starting SHA820a at `audio.js:80`; it remains out of scope. No blanket browser or integration Device PASS.

Real browser simulated hidden during TRANSFORM aborts the original Stage 3 session, stops both future tracks at gain0, restores P0, and leaves Aftermath NOT_STARTED. Targeted lifecycle/failure tests additionally cover OFF, failed/stalled load/seek/play/context, late completion, initial unlock after Black/White/pagehide, tail fade and disposal. These are not physical iOS lifecycle evidence.

Physical iPhone remains UNPERFORMED and the existing Device registry gate remains pending/failing without exact-device evidence. Existing ruins lower image boundary and ordinary Audio fade issue remain out of scope. No main merge, Production enablement, new checkpoint or user-facing audio button.
