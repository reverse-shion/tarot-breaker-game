# Future Vision audio CORS repair candidate

Baseline candidate: `4a33356727ea001788eee038f6d5dd4323cd1d4b`.
Current main: `5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3`.

## Report and evidence

The owner reports that only the two newly added Future Vision tracks are silent on iPhone; the ordinary BGM is audible. Disabling the phone's silent mode did not fix it. This is a real-device FAIL for the new tracks, not a Device PASS.

The new tracks feed HTMLAudioElement into MediaElementAudioSourceNode, whereas ordinary BGM uses native media playback. The new elements previously loaded their src in the constructor without crossOrigin. Web Audio requires a CORS-cross-origin media source to output silence, even when playback advances and play() resolves. Therefore local same-origin output recording does not establish hosted playback safety.

The hosted MP3 request attempted in this environment followed a redirect to raw.githubusercontent.com before timing out. This establishes a redirect in that request, not successful final delivery, response CORS headers, or the exact network path on the owner's phone. Earlier requests also encountered403. The iPhone root cause remains a strong hypothesis pending retest.

Normative reference: https://www.w3.org/TR/webaudio/#MediaElementAudioSourceOptions-security

## Smallest repair

Create each future media element without src, set crossOrigin='anonymous', then assign the existing src. This requests a CORS-approved resource before the load starts. The host must still permit CORS. No proxy, unsafe fallback, or security bypass is introduced.

WORKING: future-vision-audio.js media construction, request-order regression test, this evidence.
LOCKED: original MP3 bytes, cues, gains, fades, audio.js, Stage3/Aftermath behavior, Save/Continue, main/Production.

## Validation

- Added request-time regression verifies both tracks are anonymous-CORS loads, including initialization order. It fails on the previous source because both requests have undefined CORS, and passes on the candidate.
- Candidate full suite390/390 PASS; main326/326 PASS. No existing tests weakened.
- Event preflight, validate, background assets, audio validation, diff-check PASS.
- An actual two-origin redirect/output reproduction harness was prepared, but could not run: Chromium was absent, and browser installation returned invalid ZIP downloads. This is NOT a browser/audio-output PASS.
- Hosted playback and physical iPhone speaker output remain UNPERFORMED for this candidate. No claim that the user's silence is fixed until they retest.

Keep PR114 Draft, same dev route, no main merge. Retest ruins/fix/white-return audio plus white/black silence and ordinary BGM return on the new SHA. If still silent, collect currentSrc, readyState/networkState/media error, AudioContext state, play rejection and gain/output information before another speculative repair.
