# Hoshisuna battle presence and observation panel

Owner request: ground the party in the new panorama, make the beast's situation readable, and give both allies visible movement and hit reactions.

Main baseline: b832ebd7b1d3426919d92d81ebbfd426cb542858. Sandbox baseline: 3d2609e981ca258853e610cb2978904013d9d1b3 (PR228). This is isolated camera/tactical work; no main activation or merge.

WORKING: camera=a02 contact shadows, grounded breathing/delivery/impact/guard poses; a defensive camera view during the existing enemy-turn; initial camera paint when the viewport equals its default dimensions; tactical observation headings, visible signs and short actionable advice, including ready-to-release guidance. Reuse the existing stage duration and actual model state. Risk HIGH (visual/camera).

LOCKED: approved actor positions/art; background asset; all numerical rules, choices, AI, action settlement, turn/stage timings, dialogue/story, audio, Save/Progress, map movement/collision, special sequences and fixed-mode layout. No test or baseline weakening.

FACT: inherited camera initialization skips its first paint at exactly390x330. Three existing tests fail at baseline; only this presentation initialization is repaired. The counter camera previously stayed on the beast, offscreen from the receiving party. Existing hit artwork only changes brightness and neither ally has breathing/delivery motion.

Acceptance: shadows sit beneath feet; subtle idle movement stays anchored; delivery reaches toward the beast; the receiving party is framed before impact at48% of the unchanged1050ms counter; Shioriel recoils while Shion braces; reduced motion shows static impact cues without translation or repeated flashing. Observation panel separates state/signs/advice and updates from the visible state, with no premature reveal. Unlock guidance appears only when the model phase is finisher.

Validation: preflight caritas-heart-resonance; camera lifecycle/defense tests; tactical panel lifecycle and finisher tests; existing full regression and assets/audio; independent read-only diff review. Human iPhone visual gate remains PENDING. Browser automation is not device evidence.

Verification: targeted31/31 PASS; full794/794 PASS,0failed/0skipped (offline external-transport fence). Before change the camera baseline had791tests/788pass/3initial-paint failures; the initial-paint repair resolves them and adds3meaningful lifecycle/panel tests. Existing manifestation/cache contract tests remain unchanged; event cache bust uses an appended presence parameter, preserving the contract prefix. Asset/background/audio validators and diff whitespace PASS. Independent read-only review found no blocking code issues after the cache-parameter correction. Visual/device rendering remains PENDING; no main merge.
