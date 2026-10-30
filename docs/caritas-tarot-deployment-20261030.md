# Map tarot deployment before the first invocation

SCOPE: EVENT_SANDBOX / caritas-heart-resonance
RISK: HIGH (visual layout and authorized dialogue sequencing)
DEVICE_GATE_REQUIRED: YES
DEVICE_RESULT: PENDING
MAIN_MERGE: PROHIBITED

Main baseline: 6e05dabe164e3e2bac27faf8a4a91d323f3f8939 (unchanged,536 tests passed).
Immediate parent: 684bfb191880f47835cc2b80f1b1fef5068ba36d (668 tests passed).
Branch: fix/caritas-transformation-scale-20261030. Event preflight PASS.

Owner requests: after Shion says 「タロット展開」, show three softly glowing backs from assets/tarot/backs/tarot-card-back.webp around Shion in a triangle, scaled to the map actor, never overlapping Shion; then 「いくぞしおぽん」 and the chant.

WORKING: split the existing combined utterance into two shared-dialogue lines, insert a650ms card appearance between them, retain Shiopon's reply and actual forward walk before the existing chant/5500ms transformation. Add map-native card drawing and isolated asset preload. A sideways triangle (upper-left, right-middle, lower-left) keeps the central front/back lane free for Shiopon and leaves Shion's complete native sprite rectangle plus8px clearance empty. Portrait cards have height DRAW_HEIGHT*.34 and retain the actual image aspect ratio; static triangle follows the actor's map foot/stage offset. No orbit, connecting neon lines, CSS effect, character scale/camera change or new dialogue content. Soft450ms fade/rise, reduced motion fades without travel. Cards remain through chant, then fade4100–4700ms of transformation; final800ms pose is clear. Pause/resume/clear shared with existing invocation service; failed required card asset uses normal loading error, not silent omission.

LOCKED: other dialogue/story, existing follower movement and forward-placement algorithm, camera, collision/routes, main/shared audio, battle rules/AI/checkpoints/Progress, source asset bytes, historical verified contracts and preview isolation. No main merge. VGC-001 through007 unchanged.

Acceptance: actual requested asset, exactly3 portrait cards, no intersection with Shion at any entry frame/scale, ordered spoken cue → visible cards → buddy cue → reply/walk → chant → transformation. Pause on background/BFCache, no duplicate deployment/advance, no residual cards after reveal/return/recovery, no ordinary map effect. Targeted/full tests, original-image raster review and independent reviewer required; real iPhone visual gate pending.

Validation: focused45/45 PASS; full674/674 PASS,0fail/0skip with external-network-denial preload (mock API tests only). JavaScript syntax, background/audio validators and diff check PASS. Original requested image and native actor art rasterized360 frames; contact sheet inspected for sizes, static triangle, readable artwork and clear actor lane. Independent read-only review found no code blocker. Test changes replace the explicitly reopened combined dialogue with separate-line/ordering assertions, update exact cache keys, and add card/pause/recovery coverage; no locked test or validator weakened. Physical iPhone visual/soft-glow acceptance remains PENDING; raster and Node evidence do not certify Safari. Main remains unmodified/unmerged.
