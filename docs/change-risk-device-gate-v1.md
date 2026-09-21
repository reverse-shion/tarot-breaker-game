# Change Risk and Device Gate v1.0

## Purpose
Keep delegated development proportional: lightweight for harmless changes, strict where browser/device/gameplay behavior can regress.

Risk level is assigned by Architect from the actual diff expected, not by task size or convenience. If uncertain between levels, use the higher level.

## LOW
Examples:
- repository documentation
- comments with no runtime effect
- non-executable process text

Required:
- dedicated branch / PR
- scope review
- Reviewer diff review
- applicable CI

Device validation: NOT APPLICABLE unless the actual diff affects runtime.

## NORMAL
Examples:
- ordinary isolated runtime behavior not touching a Regression Lock
- additive tests
- contained UI/logic changes with deterministic automated coverage

Required:
- Architect contract
- Implementer
- adversarial Reviewer
- targeted tests
- full available regression/CI gate
- current-main comparison

Device validation only when the actual change matches a device trigger below.

## HIGH
Any change that can affect:
- Audio or browser gesture unlock
- touch/pointer input
- map transition, route, spawn, camera or visual layout
- persistence, reload, Progress/Save
- collision/navigation
- event replay/duplication or companion cross-map state
- a Regression Lock
- iOS/Safari-specific behavior

Required:
- full delegated pipeline
- targeted regression tests
- full available CI
- adversarial review
- applicable device smoke checklist before merge

A Regression Lock modification itself always requires explicit human authorization; HIGH does not grant permission to change it.

## Device smoke checklist selection
Run only checklists affected by the diff. Do not require a full-game replay when unrelated.

### Audio / browser gesture
- start through the official user-gesture route
- expected audio is audible
- expected stop/fade/restart behavior occurs
- no duplicate playback is apparent
- leave and return through the affected route; audio restores correctly
- compare relative balance when the contract specifies one

### Touch / movement
- tap works
- drag/joystick works when applicable
- cancel/interruption does not leave movement stuck
- repeated input does not duplicate or lock control
- affected route remains usable on target device

### Route / spawn / map transition
- enter through the official source route
- destination and spawn are correct
- transition does not immediately retrigger
- return/roundtrip works when supported
- no duplicate event is triggered by the roundtrip

### Persistence / Progress / Save
- complete the affected event/state
- reload at the defined checkpoint
- completed event does not replay unless explicitly designed to
- restored spawn/state is safe
- affected trigger remains suppressed/re-armed according to its contract
- failed/unavailable storage does not prevent gameplay when graceful degradation is required

### Visual / camera
- affected viewport has no clipping/blank area/incorrect layer order
- camera framing and movement match the contract
- interaction remains visible and usable
- check the target iPhone/iPad viewport when the change is mobile-sensitive

## PASS evidence
Device PASS should record:
- device/browser when relevant
- exact short route tested
- checklist items exercised
- PASS/FAIL and any observed difference

If a required device check cannot be performed, status is PENDING and merge must wait.
