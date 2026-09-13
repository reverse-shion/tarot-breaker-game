# tarot-breaker-game

TAROT BREAKER 2D story-driven RPG.

## Current phase

Scale Test foundation for the physical setting **1000年前の星の国**.

Current goals:

- load the high-resolution map directly from `assets/maps/star-country-gate-garden.webp`
- use the source image resolution as the world coordinate system
- keep Shion at a readable RPG scale (52px world height baseline)
- use a bottom-center foot anchor
- follow Shion with the camera instead of fitting the whole map on screen
- support touch drag movement on iPhone/iPad
- keep collision temporary until scale is approved

## Run

Open `index.html` through a web server or GitHub Pages-compatible preview.

Add `?debug=1` to show provisional walk areas, player coordinates, map size, and zoom.

## Production order

Scale → Character Animation → Collision Mask → Foreground/Occlusion → Events

The current proxy character is intentionally temporary. The next character asset target is documented in `assets/characters/shion/README.md`.
