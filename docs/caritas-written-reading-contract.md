# Caritas written-reading encouragement

Status: IMPLEMENTATION CANDIDATE. Device and integration gates remain pending.

## Baselines and scope

- Latest inspected main: `644ded5b548c301be7665ca59342b4e9a1c69bbe`.
- Battle working baseline: PR #192, `2f7d965b3c44d2644b80e8d95d2445cc9d02b020`.
- WORKING: the existing isolated Caritas free-text delivery, its reward, feedback,
  input validation and development checkpoint metadata.
- LOCKED: all main gameplay, shared dialogue implementation, map manifestation,
  navigation, collision, audio, ordinary three-choice attack calculation,
  production Progress/Save, ending and retreat ownership.
- Risk: HIGH because the candidate changes visible mobile UI and development
  persistence/reload behavior. This classification does not authorize main merge.

## Product behavior

The user authorized encouragement for writing a reading personally, while keeping
the three-choice route fully playable. A successfully delivered free-text reading
earns an additional fixed **25 resonance points**, or **50 points for the first
delivery recorded in this browser's isolated Caritas development profile**.
This is an addition to the existing grounded insight reward, not a percentage
multiplier. The meter remains capped at 100 and existing finisher behavior applies.

The fixed bonus does not depend on length, wording, keywords or recognized theme
count. Accept 1–700 trimmed characters. Whitespace alone is not a reading. The
existing insight system may separately award 4–12 points and release limited
darkness for supported themes; that calculation is unchanged.

One successful delivery consumes the current reading opportunity even when the AI
recognizes no themes. A failed/invalid response grants no reward and consumes no
successful-use allowance. Retry, double tap, reload and delayed responses must not
award the same opportunity twice. The existing limit of three successful AI
deliveries per encounter remains.

First-delivery history is development-only and must survive battle completion,
retreat and reload without writing production Progress/Save. Battle rewards and
their consumption metadata must be saved together. No cross-device/account-wide
claim is made, and clearing browser site storage resets this local history.

## Feedback

Tell the player that a short phrase is welcome and explain the upcoming fixed
bonus. After the existing Shion/Caritas dialogue, show their delivered words safely
as text, a brief light/release effect and the actual meter increase. Preserve
keyboard dismissal, dialogue ownership and the existing accessible controls.
Never treat user input as HTML or show a claimed 50-point gain when the cap only
allowed a smaller increase. No additional external telemetry or input archive.

## Acceptance and release gates

- Core tests: first/ordinary bonus, zero themes, unchanged insight arithmetic,
  clamping, terminal phases, repeated delivery, JSON roundtrip, next-turn unlock,
  and unchanged three-choice outcomes.
- API tests: nonempty short input accepted, empty/whitespace input rejected,
  700-character bound and existing upstream error handling preserved.
- UI/persistence tests: completion/retry ordering, stale response rejection,
  first-use persistence, failed storage, interrupted dialogue, input retained on
  connection failure, no duplicate meter effect.
- Compare full regression results against untouched PR #192 and current main;
  identify inherited failures by identity, not merely failure count.
- Real iPhone gate: short Japanese input/IME, keyboard dismissal, first +50 and
  later +25, reaching MAX, reload without repeat reward, and the ordinary choice
  route. Integration gate remains required before publication.
- The frontend uses a separately deployed interpretation endpoint. Changing this
  repository's API validation does not by itself update that live backend; verify
  or deploy the matching backend before claiming live short-input support.

No required device evidence is asserted by this document. This work remains on the
isolated PR stack; inherited release holds and main-merge restrictions remain.
