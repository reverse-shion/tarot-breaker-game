# TAROT BREAKER Repository Audit

## Audit Baseline

- Repository: `reverse-shion/tarot-breaker-game`
- Branch: `main`
- HEAD SHA (AUDIT BASELINE): `3f58bb417fb70a329700add0148b2932f8bd1e2e`
- Scope: read-only inspection of the checkout at this SHA. The findings below are code observations and architectural risks, not proof that a particular device exhibits a defect. No browser gameplay test was performed for this audit.
- Principal repository layout at baseline: root `index.html`, `alenon.html`, `star-country-landing.html` and root JS/CSS systems; `assets/maps/` (including `alenon/` and `star-landing/`), `assets/sprites/`, `assets/audio/`, `assets/tarot/`, `assets/ui/`; `.github/workflows/`, `scripts/`, `tests/`. There was no `docs/` directory or package manifest at baseline. The repo also contains separate editor/preview HTML pages at root.
- Official route observed in source: `index.html` title → `alenon.html?from=title` → `star-country-landing.html?from=alenon` → `index.html?from=landing`; links from landing to Alenon and from garden to landing provide returns (`game.js:1651-1662`, `alenon.html:3918-3933`, `star-country-landing.html:2323-2372`, `game.js:664-683`).

## Executive Summary

**FACT:** This is a multi-page, plain browser JS game, with a sizeable garden runtime (`game.js`, `dialogue.js`, `navigation.js`, scene files) and two map runtimes embedded in HTML. `shared-dialogue.js/css` centralize dialogue rendering/appearance across the three playable pages. `audio.js` handles shared BGM, while Alenon and landing implement their own ambience and SE. `map-journey.js` shares a small set of session-scoped story/companion fields. JSON owns authored collision/depth data, but collision runtime and editors differ by map.

**RISK:** Separate page reloads, route query parameters, session-only flags, manually versioned URLs and several wrappers around shared globals make cross-map changes easy to miss. There is no durable player save. The existing garden arrival preload is useful, but its readiness contract is local to that route.

**TARGET:** Define a small, explicit map handoff and progress contract first; then consolidate loading/audio where shared behavior exists. Keep authored map events and presentation local. Retain browser-native JS and GitHub Pages hosting; no framework migration is proposed.

## System Ownership Table

`DISTRIBUTED` means multiple independently writable owners; it is not an existing module name. Priorities correspond to the numbered findings in Technical Debt.

| System | Responsibility | Current Owner / Files | Current Source of Truth | Duplication | Risk | Target Source of Truth | Migration Required | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dialogue | Window, speaker, reveal/advance; authored lines | `shared-dialogue.js/css`; `dialogue.js`; inline map stories in `alenon.html`, `star-country-landing.html` | Shared UI: `shared-dialogue.js/css`; content/sequence: **DISTRIBUTED by map** | Map-level line orchestration and DOM mounting | New maps can diverge in advance/focus lifecycle | Shared UI for rendering/styles; map-owned dialogue content/event steps | Small interface cleanup, preserve map scripts | P2 (D2) |
| Audio | BGM, ambience, SE, local sound, unlock and fades | `audio.js`; inline Alenon/landing scripts | **DISTRIBUTED** | PAD audio copies and three playback paths | Repeat iOS/return/mix regressions | Shared lifecycle/mixer contract; map-owned sound cues and local mix policy | Yes, incremental | P1 (D3) |
| Event | Trigger, completion, replay policy | `dialogue.js`, `story-event-guard.js`, `game.js`, inline map scripts, `map-journey.js` | **DISTRIBUTED** | Multiple trigger observers and completion mechanisms | Repeated/skipped events when routes or state change | One progress/handoff contract; map-owned event definitions | Yes | P1 (D1) |
| Save | Resume location, position, story, settings | `map-journey.js` (session), `audio.js` (preference), editor local drafts | **DISTRIBUTED**; durable gameplay save **not implemented** | Storage keys scattered | Refresh/new session cannot reliably continue | Versioned game save schema/API separate from editor storage | Yes, after behavior is specified | P1 (D1) |
| Transition | Route, animation, asset readiness, handoff | `game.js`, `scene-effects.js`, `index.html`, inline Alenon/landing scripts | **DISTRIBUTED** | Each route has its own timer/fade/readiness rules | Visible partial map or stalled arrival on future routes | Shared transition/readiness contract; per-map visual sequence | Yes | P1 (D4) |
| Collision | Walk/block, pathing and depth | Map JSON; `navigation.js`, `blocked-collision.js`, `single-map-occlusion.js`, `scene-layout.js`, inline map geometry | Authored geometry: map JSON **plus** garden scene geometry; runtime: **DISTRIBUTED** | Standalone polygon checks and patched garden navigator | Visual/collision drift | Map-owned versioned walk/block/depth data; common validator/runtime | Yes, staged | P1 (D5) |
| Collision Editor | Author and export map polygons | `collision-editor.html`, `map-editor.js/css`, inline editors and separate editor HTML | **DISTRIBUTED** | Multiple editor copies and storage keys | Editing wrong map/version; inconsistent export | One shared editor engine with map-specific JSON/config | Yes, after collision contract | P2 (D6) |
| Character | IDs, names, sprites, animation, follow, speaker style | `game.js`, `dialogue.js`, `shared-dialogue.css`, inline map scripts, sprite manifests | **DISTRIBUTED** | Sprite paths/IDs and positions across pages | Growth to 30+ actors multiplies edits | Small registry for stable ID, name, sprite, speaker style; map runtime retains behavior | Yes when roster expands | P2 (D7) |

## Dialogue

- **FACT:** All three playable pages load `shared-dialogue.js` and `shared-dialogue.css` (`index.html:18-19,105-106`; `alenon.html:1864,2076-2077`; `star-country-landing.html:713,833-835`). The shared controller creates/binds elements, renders one character at a time, reveals on first advance, advances on the next, and handles button and keyboard input (`shared-dialogue.js:29-235`). Garden creates its DOM in `dialogue.js:367-398`; Alenon and landing bind pre-existing HTML nodes (`alenon.html:1937-1942,2544-2579`; `star-country-landing.html:827-828,945-972`). The original story text/steps stay in their respective map scripts (`dialogue.js:19-339`, `alenon.html:2858-3050`, `star-country-landing.html:969-988`).
- **FACT:** `shared-dialogue.css:63-75,120-148` currently defines white/near-white names with character-specific restrained glow using `data-speaker`. Search of the three playable HTML files and `game.css` found no competing `.tb-dialogue-*`/speaker selectors at this SHA. `dialogue.css` contains only the separate `.story-objective` rule. This is *not* evidence of current CSS override duplication.
- **RISK:** The map pages still own DOM placement and sequencing/focus. Future event wrappers can bypass a shared controller; character names and glow selectors are coupled by displayed Japanese string rather than stable actor ID (`shared-dialogue.js:142-151`; `shared-dialogue.css:120-148`).
- **TARGET:** Keep window layout, white-ish speaker lettering, subtle actor glow and advance semantics in shared UI. Let each map own lines, sequencing and stage effects. Prefer actor ID for styling with a fallback for existing speaker strings; keep names visually below body-text prominence.

## Audio

- **FACT:** `audio.js:6-17,70-177` owns a looping shared BGM, preference key `tarot-breaker:bgm-enabled`, `HTMLAudioElement.volume` fades, gesture unlock through `startFromMovement`, interaction ducking, `visibilitychange/pagehide/pageshow` handlers and a hidden toggle. `alenon.html` has its own wind, gust, Orb, tarot and PAD audio. Its Orb/wind path uses `AudioContext` → analyser → `GainNode` (`alenon.html:2196-2390`), with Orb muted outside its hall and a separate story audio context (`alenon.html:2668-2755`). Landing implements PAD audio again, including a two-element loop and gate fade (`star-country-landing.html:2110-2181,2334-2372`). These are distinct responsibilities from shared BGM.
- **FACT:** On Alenon return, code attempts wind/Orb restart and installs user-gesture listeners (`alenon.html:4620-4650`); landing/garden call `TarotAudio.startFromMovement()` on input (`star-country-landing.html:2414,2453,2483`; `game.js:1694,1716,1830`). Cross-page navigation creates fresh audio elements; state is recovered by route/gesture, not a continuous player.
- **RISK:** PAD loop logic is copied, and BGM uses media volume while Alenon uses WebAudio gain. User-activation constraints and silent playback failures must be evaluated per path/device. No code-only claim is made that a particular iOS volume bug still occurs.
- **TARGET:** One small playback/gesture/visibility lifecycle API shared by maps, with map-specific cues and Alenon's spatial mix retained. Test return routes on actual iOS before migrating its proven GainNode path.

## Event

- **FACT:** Garden events and completion flags are in `dialogue.js:19-339,341-364,473-608`. Its control-step observer checks proximity (`dialogue.js:555-606`), then `story-event-guard.js:17-115` additionally wraps `TarotDialogue.start` and `TarotControls.createControls` to force mandatory starts. The script load order makes both wrappers active (`index.html:101-112`). Alenon keeps `story` and Orb/PAD triggers inline; its return/prologue bypass uses `from=landing-return` and editor flags (`alenon.html:2104-2165,4136-4176`). Landing uses `landingMemoryDone` plus transient flags and route checks (`star-country-landing.html:885-943,975-988,2258-2277`).
- **FACT:** `map-journey.js:3-15` persists `gardenStory`, `landingMemoryDone` and `companion` to `sessionStorage` when the map scripts call it. It is reset when starting from the title (`game.js:1651-1662`). In-progress dialogue step indices and Alenon prologue completion are not persisted through this API.
- **RISK:** Two garden trigger wrappers plus map-local checks complicate ordering and one-time guarantees. Route strings can stand in for historical completion; a direct URL or reload does not prove a story event actually completed. This is a structural risk, not a confirmed replay bug at baseline.
- **TARGET:** Define event IDs, first-visit/completed/active meanings and an explicit per-map trigger policy, with one persisted progress API. Keep event dialogue and choreography in map-owned data/code.

## Save

- **FACT:** There is **no durable gameplay save/load system** and no UI to choose a save slot. `map-journey.js:4-15` provides session-scoped `get/set/reset`; `game.js:1659` resets it on title start. `audio.js:8,28-40` stores a BGM preference in `localStorage`; various editor drafts use different `localStorage` keys. No examined gameplay path serializes a current map, player coordinate/direction, active event step or persistent story checkpoint. Map entry positions are derived from constants, route query parameters or nearest walkable positions (`game.js:15-16,1898-1904`; `alenon.html:4158-4179`; `star-country-landing.html:2696-2729`).
- **RISK:** Closing the tab/session or reopening the root URL cannot resume at the last position/progress. Storage of editor drafts must never be mistaken for a game save.
- **TARGET:** First specify a checkpoint/resume policy and versioned schema for map, safe spawn, completed events and settings; then implement one game save owner. Do not persist half-played animations or transient audio objects. Include schema migration and explicit reset/recovery paths.

## Transition

- **FACT:** Full-page `location.href` changes coordinate maps (`game.js:679,1660`; `alenon.html:3931`; `star-country-landing.html:2330,2370`). Alenon departure uses an 820 ms timer; landing return uses 760 ms and landing→garden uses 1,800 ms with gate sound/fade (`alenon.html:3913-3933`; `star-country-landing.html:2323-2372`). Garden awaits its map, `TarotSceneEffects.ready`, collision and character sprites, hides its arrival behind CSS and an error screen, and has a 45 s watchdog (`index.html:25-71`; `scene-effects.js:13-49`; `game.js:1883-2007`). Alenon preloads Shion movement sheets before its prologue reveal; landing preloads several images without awaiting that preload before `boot()` (`alenon.html:2910-2922`; `star-country-landing.html:1279-1300,2696-2750`).
- **RISK:** There is no single cross-map readiness promise/timeout/cover contract. The garden route guards incomplete paint, but the same guarantee is not evident for all routes. The title's `game.js` boot awaits garden assets before enabling the start button even though the title enters Alenon (`game.js:1883-1977,1651-1662`), adding a dependency on a later map.
- **TARGET:** Common handoff contract (destination, return context, required assets, error/timeout, visibility) with map-owned animation and duration. Only reveal a destination once its required first frame is ready; keep unrelated later-map assets off the title's blocking path.

## Collision

- **FACT:** Authored files include `assets/maps/alenon-collision.json`, `assets/maps/star-landing/collision.json`, `assets/maps/star-landing/passage-layers.json`, `assets/maps/star-country-gate-garden-collision.json` and garden depth JSON. All encode the 1448×1086 reference space. Garden uses `navigation.js` walk polygons, `blocked-collision.js` to decorate/patch its validator and `createCollision`, plus scene solid bases and occlusion/depth processing (`navigation.js:13-85`; `blocked-collision.js:1-16,123-190`; `game.js:252-269`; `scene-effects.js:3-31`; `single-map-occlusion.js:34-83`). Alenon and landing independently load/check walk polygons and perform movement collision in their HTML (`alenon.html:4098-4121`; `star-country-landing.html:1460-1506,1746-1805,2627-2644`).
- **FACT:** `assets/maps/star-landing/passage-layers.json` currently has `passageAreas: []`; its runtime checks `pointInPassage` to render a foreground overlap when areas exist (`star-country-landing.html:1838-1876`). Behind traversal is a rendering/depth layer, not an additional walk permission. The garden code also patches an empty-walk-map case and mutates scene layout occluder/solid-base arrays (`single-map-occlusion.js:34-82`), so authored collision JSON alone is not the complete effective garden geometry.
- **RISK:** Multiple geometry functions and layout mutations can make a visual alignment edit change collision unexpectedly or leave a map-specific behavior out of sync.
- **TARGET:** Map JSON owns walk/block and behind-depth authoring; one validated collision runtime owns movement semantics. Keep rendering occlusion separate from permission to walk. Validate reference size, map ID and representative traversal paths per map.

## Collision Editor

- **FACT:** `collision-editor.html` is a garden v8 frame-based editor driven by `map-editor.js/css`. It reads garden collision and depth JSON, offers walk/block/behind polygons, stores a local draft and exports JSON (`collision-editor.html:7-50`; `map-editor.js:3-54,181-210`). The older `map-editor.html` loads the same current `map-editor.js` using older DOM controls/queries, so its current compatibility is unverified (`map-editor.html:1`; `map-editor.js:9-20,208-220`). `alenon.html` contains an embedded legacy collision editor; `alenon-collision-editor.html` carries a separate large implementation (`alenon.html:3422-3515`; `alenon-collision-editor.html:1984-2060`). Landing has a separate editor HTML and residual editor routines in the production HTML, with `collisionMode=false` and `passageMode=false` in production (`star-country-landing.html:885-901,1508-1510,1896-1898`; `star-country-landing-editor.html:885-905`).
- **FACT:** `alenon.html:7-13` redirects `?collision=1` (without `legacyCollision=1`) to `./tools/map-zone-editor.html?map=alenon`, but no `tools/` directory is present in the audited tree. This editor URL is broken by inspection; the separate editor pages still exist.
- **RISK:** Editors target different data subsets, some have stale links or local drafts, and copy/export is not an automatic commit to the runtime JSON. A shared editor cannot safely assume all maps have a garden depth file or identical camera rendering.
- **TARGET:** A single editor shell for polygon editing/export parameterized by per-map configuration and JSON capabilities (walk/block/optional behind/passage). Keep map visuals and data map-owned. Migrate one map at a time and compare exported coordinates with the current runtime.

## Character

- **FACT:** Garden actor IDs `shion`, `shiopon`, `lumiere`, names and stage commands are hard-coded in `dialogue.js:5-18,340-341,453-465`; movement, following, coordinates and frame selection reside in `game.js:15-90,150-248,664-683,1766-1830`. Manifest JSONs exist per actor, but `game.js:156-173,1886-1917` explicitly constructs sprite paths and validates mainly Shion's manifest. Alenon/landing independently name sprites, positions and movement (`alenon.html:2081-2110,3978-4010`; `star-country-landing.html:1010-1120`). Speaker colors are keyed to rendered strings in `shared-dialogue.css:120-148`.
- **RISK:** Adding 30+ actors would require coordinated edits to several string tables, sprite paths and map scripts; mismatched IDs/names/style could silently fall back. A manifest is not currently a global character registry.
- **TARGET:** A compact registry with stable ID, display name, sprite metadata and speaker theme; maps still own spawn/follow/choreography and any scene-specific variant. Introduce after the cross-map event/save contract, with validation against existing manifests; do not move every behavior into character data.

## State Management

| State surface | FACT / evidence | Scope and limitation |
| --- | --- | --- |
| `window.TarotJourney` | `map-journey.js:3-15`; keys `gardenStory`, `landingMemoryDone`, `companion` from map scripts | `sessionStorage` for same-tab journeys; title start resets; not durable save |
| `window.TarotDialogueUI`, `window.TarotDialogue`, `window.TarotStage` | `shared-dialogue.js:233-237`; `dialogue.js:608-616`; `game.js:1795-1822` | In-memory UI/event/staging; garden only for latter two |
| `window.TarotNavigation`, `window.TarotControls`, `window.TarotSceneLayout`, `window.TarotSceneEffects` | `navigation.js`, `blocked-collision.js`, `controls.js`, `scene-layout.js`, `scene-effects.js` | Load-order-dependent garden globals; collision and controls can be wrapped after definition |
| `window.TarotAudio` | `audio.js:163-175` | Per-page BGM state; `tarot-breaker:bgm-enabled` preference in `localStorage`; no saved per-source volumes |
| Map-local variables | Garden `story`/actors; Alenon `story`, `orbInteraction`, `ride`; landing `devilEventStarted`, `ride`, `companion` | Recreated on page load, some reconstructed from journey and `from` query |
| Editor drafts | `map-editor.js`, Alenon and landing inline editor keys | `localStorage`, map/editor-specific; not player progress |
| Route parameters | `from`, `mapEditor`, `collision`, `passage`, `edit`, `skipPrologue`, etc. | Select route and development modes; URL is not proof of event completion |

## Cache Management

- **FACT:** Manual queries (`?v=...`, `?asset=...`, `?build=...`) appear in HTML links/scripts/images, inline JS asset constants and dynamic stylesheet links. Examples: dialogue assets use the same dated query on the three map HTML files (`index.html:18-19,105-106`; `alenon.html:1864,2076`; `star-country-landing.html:713,834`), whereas garden image URLs are independently set in `index.html:8-12,72-94` and `single-map-occlusion.js:13-30`. Garden collision JSON is fetched with `{cache:'no-store'}` (`game.js:258`); garden depth adds a timestamp (`scene-effects.js:5`); Alenon and landing collision JSON use fixed query plus `no-store` (`alenon.html:2110,4101`; `star-country-landing.html:898,1463`). `audio.css` and `audio.js` already have different query values across pages (`index.html:17,103`; `star-country-landing.html:8,833`).
- **RISK:** A shared CSS/JS edit can leave one HTML version unchanged, particularly for previously cached URLs. `no-store` for JSON does not solve cached CSS/JS/images; changing a query on one consumer does not update all other consumers. CDN/browser cache behavior on a particular iPad is not established by source alone.
- **TARGET comparison:** (1) Content-hashed filenames/manifest: strongest immutable asset identity, but requires a build/rewriter and may be heavy for this static repo. (2) Central build version injected into every generated HTML/asset URL: smaller migration, but only safe if automated and every page/dynamic URL participates. (3) CI-generated asset manifest with content digests and a small static HTML rewrite at publish time: good GitHub Pages fit if deployment serves generated output, while keeping authored files readable. For now prefer a small automated asset/version manifest or deterministic URL rewrite plus CI checks; do not replace manually until all dynamic and HTML references are inventoried. Avoid a timestamp on every gameplay asset: it defeats caching.

## Duplication

| Classification | Evidence | Decision for later phases |
| --- | --- | --- |
| MIGRATE | PAD activation/movement/landing sound implementations in `alenon.html:3733-3810` and `star-country-landing.html:2110-2181` | Share playback/lifecycle only after route and iOS tests |
| MIGRATE | Garden `dialogue.js` trigger observer plus `story-event-guard.js` wrapper (`dialogue.js:555-606`; `story-event-guard.js:17-115`) | Establish one event trigger owner and preserve mandatory encounter behavior |
| MIGRATE | Polygon containment/collision in `navigation.js`, `blocked-collision.js`, Alenon/landing inline code | Define collision contract, then move by map |
| MIGRATE | Editor shell, drafts and export rules in garden/Alenon/landing pages | Shared editor with optional map-specific layers |
| KEEP | `shared-dialogue.js/css` and per-map authored stories | They serve different responsibilities |
| KEEP | Alenon Orb GainNode and local volume curve | Spatial mix is map-specific; guard on actual iOS |

## Legacy / Remove Candidates

These labels identify review candidates, **not** permission to delete. Usage was checked via source references and page entry points, but external bookmarks cannot be proven absent.

| Classification | Candidate | Evidence / next check |
| --- | --- | --- |
| LEGACY | `map-editor.html` | Older DOM/schema points at v8 `map-editor.js`; compare against `collision-editor.html` before retiring |
| LEGACY | `alenon-collision-editor.html` and Alenon inline editor | Separate editor paths; preserve saved local drafts and exported geometry first |
| LEGACY | `alenon-preview-20260918.html` | Dated snapshot page; determine whether any external preview uses it |
| REMOVE CANDIDATE | `alenon.html` redirect to missing `tools/map-zone-editor.html` | Missing target in baseline tree; fix route in a later implementation phase |
| REMOVE CANDIDATE | `star-country-landing.html` routines gated by constant `collisionMode=false` / `passageMode=false` | Production branches are unreachable by those constants, but editor copy still uses related routines |
| UNKNOWN | `foreground-alignment-v8.js`, `foreground-calibrator-v9.js`, `map-editor.html`, `scene-preview41-fix.js`, `single-map-occlusion.js` | Some are query-activated helpers and some are loaded by the official page; trace public links/runtime dependencies before removal |
| KEEP | `blocked-collision.js` and `single-map-occlusion.js` | Actively loaded and modify current garden runtime; cannot call them unused |

## Technical Debt

Priorities assess baseline code and likely impact; they do not assert reproduced user-facing defects. Each ID is counted once.

### P0 — 0

- None established by this static audit. A future runtime finding may change this priority.

### P1 — 5

1. **D1 — Event/save ownership:** session-only completion and route-derived history, duplicate garden trigger wrappers; progress and replay semantics lack one contract (`map-journey.js:3-15`; `dialogue.js:555-606`; `story-event-guard.js:17-115`; `alenon.html:2104-2110`).
2. **D3 — Audio lifecycle:** map-local unlock/return paths and duplicated PAD audio can reintroduce multi-map/iOS regressions (`audio.js:70-177`; `alenon.html:2196-2390,4620-4650`; `star-country-landing.html:2110-2181`).
3. **D4 — Route readiness:** map-specific fixed timers and uneven first-frame preload contracts; title waits on garden assets (`game.js:1883-2007`; `star-country-landing.html:1279-1300,2334-2372`).
4. **D5 — Collision ownership:** effective garden geometry combines authored JSON, runtime patches and layout mutation, while other maps use separate functions (`game.js:252-269`; `single-map-occlusion.js:34-83`; `alenon.html:4098-4121`).
5. **D8 — Manual asset queries:** HTML and dynamic URL versions are independently maintained, leaving shared CSS/JS and images vulnerable to stale mixes (`index.html:8-22,99-114`; `single-map-occlusion.js:13-30`).

### P2 — 5

1. **D2 — Dialogue map integration:** shared appearance/advance are in place, but DOM and orchestration remain map-specific (`shared-dialogue.js:29-235`; `alenon.html:2544-2579`).
2. **D6 — Editor fragmentation:** multiple implementations and a redirect into a missing directory (`collision-editor.html:7-50`; `alenon.html:7-13`; `star-country-landing-editor.html:885-905`).
3. **D7 — Character data fragmentation:** names, sprite paths, styles and motion constants are separate, increasingly expensive as roster grows (`dialogue.js:5-18`; `game.js:15-90,156-173`; `shared-dialogue.css:120-148`).
4. **D9 — Validation gaps:** CI checks a selected list of JS files and runs tests, but does not syntax-check map inline scripts or validate the editor redirect (`.github/workflows/validate.yml:20-41`).
5. **D10 — Title bootstrap dependency:** garden sprites/scene load before title start can enter Alenon (`game.js:1883-1977,1651-1662`); potential loading delay/availability coupling.

### P3 — 2

1. **D11 — Obsolete preview/editor pages:** existence of dated and older shells adds navigation ambiguity; usage needs confirmation (`alenon-preview-20260918.html`; `map-editor.html`).
2. **D12 — Extra editor/scene parameters:** numerous debug and preview modes make entry points harder to inventory (`index.html:53-71`; `alenon.html:2104-2110`; `star-country-landing-editor.html:885-905`).

## Target Architecture

```text
Browser runtime (small shared APIs)
  Progress / save + explicit map handoff
  Transition readiness + asset manifest
  Dialogue UI, audio lifecycle, collision validator
  Character registry (ID / name / sprite / speaker theme)
Maps (garden, Alenon, landing)
  Map artwork + collision / optional depth JSON
  Event script + triggers + map-specific visual/audio cues
Developer tool
  Shared collision editor + per-map configuration / exports
```

This describes a target, not current modules. Continue to use static HTML/JS on GitHub Pages. Do not introduce Phaser or a general engine for three maps. Map audio cues, scene composition and event choreography remain local.

## Migration Order

1. **Phase 2A — Progress and route contract (D1, D4 foundation).** Define event completion/replay semantics, map IDs and arrival contexts, reset/checkpoint rules, save schema/version and recovery from direct URLs. Add focused round-trip/refresh/resume tests, then introduce a single progress API behind current routes without changing authored events. Reason: all later transition, event and save work depends on unambiguous state; changing it last would multiply regressions. Deliver a playable vertical path title → Alenon → landing → garden → return.
2. **Phase 2B — Transition and cache readiness (D4, D8, D10).** Make destination first-frame readiness/error cover consistent, separate title readiness from garden loading, inventory URL consumers and automate deterministic versions. Preserve established gate timing as presentation, allowing loading to extend the cover if needed. Reason: later system changes must reach clients consistently and not expose incomplete maps.
3. **Phase 2C — Audio lifecycle (D3).** Centralize user gesture, page visibility, source stop/resume and PAD playback; keep map-specific Orb GainNode and wind levels until measured on iOS. Reason: route/handoff readiness now provides stable boundaries for per-page audio ownership.
4. **Phase 2D — Collision runtime/data, then editor (D5, D6).** Lock walk/block/depth semantics and representative traversal cases; migrate one map at a time, compare visual occlusion and exports; only then parameterize a shared editor. Reason: an editor built on unsettled runtime semantics risks exporting incompatible polygons.
5. **Phase 2E — Dialogue and characters (D2, D7).** Keep shared UI, replace name-string styling with stable actor IDs and introduce a small registry as actors grow; preserve story text and choreography. Reason: the current display CSS is already shared, so early changes here offer less safety benefit than state/route work.
6. **Phase 2F — Candidate cleanup and validation (D9, D11, D12).** Fix missing editor target, evaluate external preview links/drafts, remove only proven unused paths and expand checks for inline script/route integrity. Reason: deletion is safe after functional owners and references are known.

## Phase 2 Recommendation

Start with **Phase 2A** as a narrow PR series: (a) document and test the currently intended first-visit/revisit and title-reset rules; (b) define stable map/event IDs and versioned checkpoint format; (c) route the existing `gardenStory`, `landingMemoryDone` and companion handoff through one owner; (d) verify direct navigation and reload behavior before enabling durable resume. Do not begin by deleting `story-event-guard.js` or rewriting event text. Preserve current playable route while moving one responsibility at a time.
