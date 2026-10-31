# Caritas: use main-native dialogue and choice UI exactly

SCOPE: EVENT_SANDBOX / `fix/caritas-edge-surge-20261031`
MAIN_MERGE: PROHIBITED
DEVICE_RESULT: PENDING

## Dialogue / choice source of truth
- All spoken text, starting with Shion's first NOTICE, uses **main's unchanged `shared-dialogue.js`, `shared-dialogue.css`, and `dialogue.css`**, mounted in `#game-shell` under the existing IDs `dialogue-layer`, `dialogue-advance`, `dialogue-speaker`, `dialogue-text`.
- The inspection choice **reuses existing main `star-gate-interaction.css` unchanged**. Its panel markup uses `#star-gate-interaction-choice`, `#star-gate-interaction-text`, and `.star-gate-interaction-actions`; only the event text and click actions differ.
- After the first NOTICE ends, its main dialogue window closes before the original main choice panel opens. The choice is not a second dialogue window, does not use a local CSS layout, and does not reposition based on dialogue bounds.
- `caritas-battle-event.css` has no choice/dialogue styling or overrides; its rules are limited to the Caritas event battlefield, and all custom choice CSS, inline left/width/bottom positioning, resize listeners and special keyboard propagation handling have been deleted.
- On selecting Inspect, the event returns directly to the original shared main dialogue UI for Caritas and all subsequent speech. Leave closes the panel and rearms the original interaction logic.

## Testing
- Updated unit regression covers first Shion speech, choice without duplicate speech, Inspect/Leave, keyboard interaction and unchanged shared IDs.
- Updated optional browser regression compares computed dialogue styling with the main shared component and choice styling with main's existing `star-gate-interaction.css`.
- iPhone Safari visual verification and CI results still require confirmation. Do not merge to main pending owner's approval.
