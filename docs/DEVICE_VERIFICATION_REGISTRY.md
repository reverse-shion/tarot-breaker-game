# TAROT BREAKER — Device Verification Registry

Status: ACTIVE

This file is the durable handoff between conversations and agents. Only explicit human real-device verification may add a PASS.

## Authority rules
- Record an exact commit SHA. Never record only a moving branch name.
- PASS may be added only after the product owner explicitly confirms that exact build was tested on a real device.
- CI PASS is not DEVICE PASS.
- AI/automation must never infer, manufacture, backfill, or upgrade a Device PASS.
- A later regression does not erase history. Add a regression/FAIL record and STOP affected work until repaired.
- A Device PASS for one SHA does not transfer to a later SHA. Any later code change requiring Device Gate needs a new explicit verification.
- Event/checkpoint PASS and integrated-route PASS are separate evidence. One does not imply the other.

## PR contract
A PR that requires real-device verification must contain:

```
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PASS
```

and the exact human-verified runtime commit SHA must already exist in this registry as an explicit human-confirmed PASS. The PR must also declare `DEVICE_RUNTIME_SHA: <40-char SHA>`. Later docs/tests/workflow/scripts evidence-only commits may sit above that runtime SHA only when no production/runtime file changed after it; those evidence commits do not require a new Device PASS.

Foundation/docs/test/CI-only work may use:

```
SCOPE: FOUNDATION
DEVICE_GATE_REQUIRED: NO
```

but FOUNDATION must not modify production/runtime files.

## Record format
Never edit a historical PASS into a different SHA. Append a new row.

### Event verification records
| Event / checkpoint | Commit SHA | Device | Result | Locked observable behavior | Human confirmation | Notes |
|---|---|---|---|---|---|---|
| Alenon Continue — intro incomplete | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Prologue starts from beginning and reaches playable Alenon; page-exit audio stops | Product owner explicit confirmation in ChatGPT | Audio stop observed with about 2 seconds of host WebView close latency |
| Alenon Continue — intro complete | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | No prologue replay; Shion renders/moves; audio normal | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Alenon Continue — PAD return | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Safe PAD-return spawn; movement; no replay, abnormal warp, or PAD retrigger | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Alenon Continue — PAD return / Shiopon waiting | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Shiopon absent locally; movement; completed events do not replay; PAD/audio normal | Product owner explicit confirmation in ChatGPT | Exact candidate build |
| Landing Continue — L3 / Shiopon waiting roundtrip | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Waiting Shiopon is preserved; Landing → Alenon → Landing automatic greeting rejoins Shiopon; Garden roundtrip preserves joined state; Garden return places Shiopon naturally beside Shion; Shiopon meeting does not replay; no companion-location-mismatch | Product owner explicit confirmation in ChatGPT | Exact runtime SHA; player-relative placement verified after prior placement-only device issue |
| Landing Continue — L2 / Devil Memory complete | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Devil Memory remains suppressed from the completed checkpoint and does not replay during Landing verification | Product owner explicit confirmation in ChatGPT | Exact runtime SHA |
| Landing Continue — L1 / Devil Memory incomplete | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Landing restores safely from the incomplete Devil Memory checkpoint; Devil Memory remains eligible as intended and the checkpoint behavior showed no device issue | Product owner explicit confirmation in ChatGPT | Exact runtime SHA |
| Garden Continue — G1 / before Shiopon meeting | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Garden restores before Shiopon meeting; Shiopon meeting remains eligible; Lumiere does not start early; post-meeting follow begins as intended | Product owner explicit confirmation in ChatGPT | Direct Garden Continue is isolated; Garden → Landing exit is intentionally inactive for this checkpoint test |
| Garden Continue — G2 / after Shiopon meeting | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Shiopon meeting remains suppressed; Shiopon is already joined/following; Lumiere event remains eligible | Product owner explicit confirmation in ChatGPT | Exact runtime SHA; direct Garden Continue checkpoint |
| Garden Continue — G3 / after Lumiere gate | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Shiopon meeting remains suppressed; Lumiere event remains suppressed; Shiopon restores already joined/following | Product owner explicit confirmation in ChatGPT | Exact runtime SHA; direct Garden Continue checkpoint |

### Integration verification records
| Route / integration | Commit SHA | Device | Result | Verified route behavior | Human confirmation | Notes |
|---|---|---|---|---|---|---|
| Title → Alenon → PAD → Landing → Garden → Landing → Alenon return | 96edc22bcc4d1f1ae7a988a8726217dfccecd7fa | iOS ChatGPT in-app browser | PASS | Ordinary route completes end-to-end with no Loading stall, unintended event replay, missing/unnatural Shiopon follow, Garden return failure, PAD return failure, or companion-location-mismatch | Product owner explicit confirmation in ChatGPT | Exact verified runtime SHA for Phase 2A-5c |
| Title → Alenon → PAD → Landing → Alenon return | 660475d30f99aec50fc82930d03af72b4509827d | iOS/iPad ChatGPT in-app browser | PASS | Ordinary route completes through Alenon return without abnormal replay, placement, movement, screen, or audio behavior | Product owner explicit confirmation in ChatGPT | Exact candidate build |\n| Title → Alenon → PAD → Landing → Alenon return | e4ea07d48ada103db367f74c6f726de086d46455 | iOS/iPad ChatGPT in-app browser | PASS | Ordinary route completes through Alenon return without abnormal replay, placement, movement, screen, or audio behavior | Product owner explicit confirmation in ChatGPT | Exact post-lineage-sync runtime; staged background/map reveal observed and explicitly deferred as a separate loading-presentation issue |

## Legacy baseline
Existing production gameplay contracts VGC-002 through VGC-007 remain governed by `docs/VERIFIED_GAMEPLAY_CONTRACTS.md`. Historical exact device SHAs were not recorded, so this registry does not invent them.

## Phase 2A-6A human device evidence — 2026-10-03

Exact runtime: `2b2302d78c065ca61b680a3990854187ce4f261a`. Source: product owner messages and screenshots in this conversation, 11:32–11:49 JST. iPhone Safari is visible in the Production screenshots; exact OS version and separate iPad coverage are not established. No previous Device PASS is transferred.

| Check | Result | Explicit evidence / limits |
|---|---|---|
| Title with existing unsupported-map save | PASS | Screenshot IMG_7299: preparing message; controller identifies a valid Landing/Garden save as unsupported by this Alenon-only release. |
| Isolated intro incomplete | PARTIAL | Owner observed beginning-of-prologue start. Completion of this session-only fixture was not explicitly confirmed. Production prologue completion below is separate. |
| Isolated intro complete | PASS (no replay) | Owner: opening dialogue absent. Movement was not independently confirmed in this specific reply. |
| Isolated PAD return | PASS | Owner confirmed requested safe return spawn, no opening replay and movement checklist without issue. |
| Isolated PAD return / companion waiting | PASS | Owner confirmed requested return spawn, no opening replay, movement and Shiopon absent in Alenon checklist without issue. |
| Production Title / save / Public Continue | PASS | Private Safari test: IMG_7300 no save; completed authored prologue; IMG_7301 saved checkpoint available; IMG_7302 Public receiver ready. Subsequent owner confirmation covered no replay, movement and PAD roundtrip. Reopening Title is verified; explicit browser refresh at the restored checkpoint is not separately confirmed. |
| Public Continue → Landing → Alenon | PASS | Owner confirmed roundtrip without load stall and movement after return. |
| Garden meeting → Landing waiting → Alenon → Landing greeting/rejoin and audio | PASS (tested route behaviors) | Owner confirmed requested waiting/rejoin and audio checklist, with separately reported pre-existing transient Shiopon rendering defect below. Does not claim flawless companion visuals. |

### Deferred existing defect — LANDING-SHIOPON-TRANSIENT-VISIBILITY

Owner reports Shiopon briefly disappears while walking in Landing; Shion remains visible. More frequent on initial traversal, sometimes recurs. Owner explicitly dates the symptom to the original Landing companion-follow implementation, before this Continue change. Cause and baseline reproduction remain unverified; do not assert an identified root cause or erase previous records. Movement, dialogue and waiting/rejoin were reported functional. Owner agreed to defer this separate rendering fix; no runtime, collision, story, audio or follower changes are included in this evidence update.

### Remaining verification / release status

Overall DEVICE_RESULT remains PENDING. Confirm isolated incomplete fixture reaches playable completion, explicit refresh/re-entry behavior at the Alenon saved checkpoint, applicable iPad viewport coverage and Public failure/manual Title recovery. Automated negative-path coverage is already PASS and is not human Device evidence. No blanket PASS, main merge authorization or production enablement is added.

### Additional explicit human confirmation — 2026-10-03 11:58 JST

Exact runtime remains `2b2302d78c065ca61b680a3990854187ce4f261a`; no runtime change.

| Check | Device / browser | Result | Human evidence |
|---|---|---|---|
| Isolated Public intro incomplete: authored completion, movement, same-tab reload and no opening replay | iPhone / browser not explicitly identified for this fixture (owner corrected device at 11:59 JST) | PASS | Owner explicitly states steps 1–3 completed without issue. Screenshot confirms registered public-continue-alenon-intro-incomplete ready banner and expected initial TOUCH TO BEGIN overlay. This completes the earlier PARTIAL fixture evidence; session-only persistence does not establish Production refresh. |

Owner explicitly corrected the tested device to iPhone at 11:59 JST; IMG_0631 must not be used to infer an iPad test. Separate iPad coverage remains unconfirmed. Earlier Production screenshots establish iPhone Safari coverage. Production restored-checkpoint refresh, Public failure/manual Title recovery, iPad Title UI and intro-complete movement are not inferred from this additional confirmation. Overall DEVICE_RESULT remains PENDING.

### Additional explicit human confirmation — 2026-10-03 12:03 JST

Exact runtime: `2b2302d78c065ca61b680a3990854187ce4f261a`.

| Check | Device | Result | Explicit confirmation / limits |
|---|---|---|---|
| Public invalid entry error / retry / manual Title return | iPhone | PASS | Owner confirmed the supplied `alenon.html?entry=invalid` checklist without issue: Japanese invalid-link explanation; retry does not fall back to normal gameplay; manual Title return works. This confirms this entry-validation failure path only, not human reproduction of every asset/storage failure. |

Public manual error/Title recovery is now confirmed for invalid-entry rejection. Overall DEVICE_RESULT remains PENDING for remaining applicable iPad display/input coverage and Production restored-checkpoint refresh. No runtime change or main merge.

## Phase 2A-6A success-status fix — exact-runtime human verification 2026-10-03 12:26 JST

Runtime SHA: `01afd254e815f01ab9dd2779e072311e2ad6e838`. Owner explicitly confirmed both exact-build checks without issue ("1、2問題なかったよ"). The checklist specified the previous iPad Safari test context; OS version and viewport dimensions were not provided.

| Check | Commit SHA | Device | Result | Human-confirmed observable behavior |
|---|---|---|---|---|
| Production Title Continue success / refresh | 01afd254e815f01ab9dd2779e072311e2ad6e838 | iPad Safari (specified test context) | PASS | From Title Continue, the whole resume status panel and Title link disappear after success; subsequent refresh does not replay the opening dialogue and movement remains available. |
| Public invalid-entry error / manual Title recovery | 01afd254e815f01ab9dd2779e072311e2ad6e838 | iPad Safari (specified test context) | PASS | `entry=invalid` retains its error explanation; manual Title return works. |

### Proportional gate boundary

The success-status fix changes only the status panel visibility in Alenon (7 runtime additions / 1 deletion), plus additive tests and contract text. Independent review confirmed no change to Progress, Journey projection, readiness admission, audio, touch/movement handlers, collision, route, spawn, story or companion behavior. Automated targeted 27/27 and full 293/293 tests passed; the published tree exactly matched reviewed local content.

The selected visual/Continue refresh/error-return smoke checklist is explicitly PASS on this new exact runtime. Prior broader route/fixture evidence for `2b2302d78c065ca61b680a3990854187ce4f261a` remains historical and is NOT relabelled as a new-SHA route PASS; no new full-game retest or flawless companion-visual claim is manufactured. Independent evidence review returned PASS. Overall PR Device Gate is PASS for the reviewed proportional scope and selected checklist. CI and main merge authorization remain separate.

Deferred LANDING-SHIOPON-TRANSIENT-VISIBILITY remains an open existing defect. No rendering-cause claim or follower repair is included.


## Phase 2A-6C Garden Public Continue — exact-runtime human verification 2026-10-03

Runtime SHA: `2c9189158360d7bffa99b845899607647db230cc`.

| Check | Commit SHA | Device | Result | Human-confirmed observable behavior |
|---|---|---|---|---|
| Public Continue → Star Gate Garden → south exit → PAD Landing | 2c9189158360d7bffa99b845899607647db230cc | Device not restated in this confirmation | PASS | Product owner explicitly confirmed “問題なかった” after testing the exact fixed build. Garden resumed from Continue and the south-edge return successfully transitioned to the PAD landing map. |

### Scope boundary

This PASS covers the reported blocking defect repaired in Phase 2A-6C: a Garden Public Continue session can use the physically reachable south exit and return to Landing. It does not manufacture broader device coverage, OS/browser details, or unrelated route behavior not explicitly confirmed in this check. The runtime fix derives the exit boundary from collision geometry; later commits above the runtime SHA are tests/evidence only.


## Phase 2A-6D Alenon roundtrip / Shiopon history fix — exact-runtime human verification 2026-10-03

Runtime SHA: `579974955e418cccfbcec5dbb38dbcaf2ea95824`.

| Check | Commit SHA | Device | Result | Human-confirmed observable behavior |
|---|---|---|---|---|
| Shiopon complete → Landing → Alenon → reload → Continue | 579974955e418cccfbcec5dbb38dbcaf2ea95824 | Device not restated in this confirmation | PASS | Product owner explicitly confirmed the reported reproduction path is fixed: after reaching Alenon, reload → Title → Continue resumes from Alenon rather than the Landing waiting-Shiopon return state. |
| Alenon roundtrip → Landing → Garden after Shiopon completion | 579974955e418cccfbcec5dbb38dbcaf2ea95824 | Device not restated in this confirmation | PASS | Product owner explicitly confirmed the Shiopon meeting does not replay after the roundtrip. Durable Progress completion history remains authoritative on Garden re-entry. |

### Scope boundary

This PASS covers the exact reported regression and the supplied reproduction path. It does not infer unrelated route, OS/browser, or viewport coverage. Commits above the runtime SHA are tests/evidence only.


## Title menu visual / first-visit preview — exact-runtime human verification 2026-10-03

Runtime SHA: `8e831832fd5e3e9d6a6534e70d0ce0074148162d`.

| Check | Commit SHA | Device | Result | Human-confirmed observable behavior |
|---|---|---|---|---|
| Saved-game Title menu | 8e831832fd5e3e9d6a6534e70d0ce0074148162d | Device not restated in final confirmation | PASS | Product owner confirmed the locked Continue / New Game layout and interaction were without issue. Continue uses the approved blue-silver three-beat heartbeat; New Game confirmation cancel no longer leaves the persistent white focus pill. |
| First-visit Title preview | 8e831832fd5e3e9d6a6534e70d0ce0074148162d | Device not restated in final confirmation | PASS | Product owner confirmed the isolated first-visit view remains on “物語をはじめる / BEGIN” and the antique-gold frame heartbeat is acceptable. The preview is visual-only and does not establish save mutation behavior. |

### Scope boundary

This PASS is limited to the title-menu visual and interaction changes explicitly checked on the exact runtime above. It does not infer unrelated gameplay, route, OS/browser, or viewport coverage. Main merge authorization and CI remain separate.

Evidence note: PR #98 metadata was synchronized after recording this exact-runtime PASS; this note is evidence-only and does not modify runtime content.


## Production Continue prologue-entry regression — exact-runtime human verification 2026-10-03

Runtime SHA: `124f3ac8003fe4384311d37850f3418086dc456a`.

| Check | Commit SHA | Device | Result | Human-confirmed observable behavior |
|---|---|---|---|---|
| Public Continue incomplete Alenon prologue | 124f3ac8003fe4384311d37850f3418086dc456a | Device not restated in confirmation | PASS | Public Continue no longer exposes the developer/manual `TOUCH TO BEGIN` gate; the incomplete Alenon story enters the authored flow automatically. |
| Completed Alenon / PAD resume checkpoints | 124f3ac8003fe4384311d37850f3418086dc456a | Device not restated in confirmation | PASS | Owner confirmed completed-prologue and PAD-return recovery checks without issue; completed story did not replay. |
| Landing arrival / Devil Memory completed recovery | 124f3ac8003fe4384311d37850f3418086dc456a | Device not restated in confirmation | PASS | Owner confirmed both Landing recovery cases without issue; completed Devil Memory remains completed. |
| waiting_at_landing full PAD roundtrip | 124f3ac8003fe4384311d37850f3418086dc456a | Device not restated in confirmation | PASS | Starting with Shiopon waiting at Landing, owner completed PAD → Alenon → PAD return; after disembark the authored return greeting started, completed, Shiopon rejoined, and Garden progression was available. |

### Scope boundary

This PASS covers the exact production-Continue regression and the locked historical recovery contracts explicitly exercised above. The direct `landing-resume-waiting` fixture intentionally restores the waiting state only; the greeting belongs to the authored Alenon PAD roundtrip return. Regression tests added after the runtime SHA are evidence/test-only and do not change runtime behavior. No broader device, OS/browser, viewport, or unrelated gameplay coverage is inferred.


PR #99 gate refresh note — 2026-10-03: metadata now records the exact-runtime device result as PASS. This is evidence-only; runtime content is unchanged.
