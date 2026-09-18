# TAROT BREAKER Map Zone Editor v1.0

## Purpose

A reusable in-browser editor for map movement and depth zones.
It is designed for TAROT BREAKER's 1448x1086 runtime maps, but custom map sizes are supported.

## Editor

Open:

`tools/map-zone-editor.html?map=star-landing`

Built-in presets:

- `star-landing`
- `alenon`
- `star-country-gate-garden`

Custom single-image map:

`tools/map-zone-editor.html?map=my-map&image=../assets/maps/my-map/ground.webp&w=1448&h=1086`

Optional existing data can be supplied with:

- `collision=../assets/maps/my-map/collision.json`
- `depth=../assets/maps/my-map/depth.json`

## Zone types

### Walkable

Saved to `walkAreas`.

Use this for the normal area where the player's feet may move.

### Blocked

Saved to `blockedAreas`.

Use this inside or around a walkable area for walls, holes, pillars, scenery bases, and other places the player must not enter.

### Behind foreground

Saved to `behindForegroundAreas`.

Use this where the player's feet entering a polygon means the actor must render behind a foreground object such as a pillar, arch, tree, gate, roof edge, or elevated passage.

This does not mean the area is blocked. It is a draw-order/depth zone.

## Editing

- Tap: add polygon vertex.
- Drag: pan the map freely.
- Tap near the first vertex: close the polygon.
- Fit: reset to full-map view.
- Plus/minus: zoom.
- The lower editor panel can be collapsed so it does not cover the drawing area.
- Drafts are autosaved per map in localStorage, but are never silently restored.
- Use "Restore draft" explicitly when needed.
- "Select delete area" removes a polygon by tapping inside it.

## Output files

Collision JSON:

```json
{
  "version": 1,
  "map": "map-id",
  "referenceSize": { "width": 1448, "height": 1086 },
  "walkAreas": [],
  "blockedAreas": []
}
```

Depth JSON:

```json
{
  "version": 1,
  "map": "map-id",
  "referenceSize": { "width": 1448, "height": 1086 },
  "behindForegroundAreas": []
}
```

## Project rule

For new maps, use the standalone Map Zone Editor instead of embedding a new collision editor into each map page.

Map-specific pages should only consume the exported JSON.
The editor is the authoring tool; runtime pages are the consumers.

## Recommended next extensions

Not part of v1:

- exit / map-transition zones
- event trigger zones
- spawn points
- interaction radii / object anchors
- one-way ledges
- slow / hazard surfaces
- named zone IDs and notes

These should be added only when runtime gameplay needs them, so collision/depth authoring stays simple.
