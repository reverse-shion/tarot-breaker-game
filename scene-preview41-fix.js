(function (root) {
  "use strict";
  const layout = root.TarotSceneLayout;
  if (!layout) return;

  // Preview 41+: use the gate already painted into the authored map as the
  // visible gate body. Keep the standalone high-detail gate mask-only.
  layout.paintBackground = function paintBackground(ctx, background) {
    ctx.clearRect(0, 0, layout.referenceSize.width, layout.referenceSize.height);
    ctx.drawImage(background, 0, 0, layout.referenceSize.width, layout.referenceSize.height);
  };

  // Preview 53: draw the supplied foreground exactly once. Preview 45 shifted
  // the plate left and then painted a second copy into the far-right gap,
  // duplicating the right bridge/edge architecture. Keep only the established
  // -15px alignment correction; do not clone, blend, mirror or patch the edge.
  layout.paintForeground = function paintForeground(ctx, foreground) {
    const w = layout.referenceSize.width;
    const h = layout.referenceSize.height;
    const dx = layout.foregroundOffset.x;
    const dy = layout.foregroundOffset.y;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(foreground, dx, dy, w, h);
  };

  // Preview 49 depth/collision fix.
  // The foreground is a single authored plate, but only a small subset of its
  // pillars/flower fronts used to participate in actor occlusion. That allowed
  // Shion and Shiopon to appear on top of banners and crystal pedestals in some
  // places, while disappearing too early at the edge of a blocked area in
  // others. Keep collision and visual depth separate: collision stops the foot
  // point, while a narrow rear strip decides whether the foreground should sit
  // in front of the actor.
  const dx = layout.foregroundOffset?.x || 0;
  const dy = layout.foregroundOffset?.y || 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function hasNearbySolid(shape) {
    if (shape.type !== "ellipse") return false;
    return layout.solidBases.some((item) =>
      item.type === "ellipse" &&
      Math.abs(item.cx - shape.cx) < 3 &&
      Math.abs(item.cy - shape.cy) < 3,
    );
  }

  // Every foreground post/pillar with a crystal or cap gets a small physical
  // foot base. Previously only four of them were solid, so the player could
  // stand directly on several crystals/pedestals.
  for (const area of layout.occluders) {
    if (!/(post|pillar)$/.test(area.id)) continue;
    const [x, , w] = area.bounds;
    const solid = {
      type: "ellipse",
      cx: x + w / 2,
      cy: area.baseline - 4,
      rx: clamp(w * 0.24, 12, 20),
      ry: 10,
      depthFix: area.id,
    };
    if (!hasNearbySolid(solid)) layout.solidBases.push(solid);
  }

  // These zones follow the latest user-authored blocked geometry around the
  // left/right garden structures and the upper gate approach. They do not turn
  // the whole foreground into one giant front layer. Instead they create a
  // short walkable strip BEHIND each structure; only there can foreground alpha
  // erase the actor. This makes banners, walls and crystal posts consistently
  // pass in front without hiding a character who merely touches a forbidden
  // edge from the front.
  const depthZones = [
    ["east-upper-structure", 867, 217, 1215, 470],
    ["east-mid-structure", 873, 508, 1214, 697],
    ["west-upper-structure", 502, 401, 727, 460],
    ["west-mid-structure", 471, 461, 729, 698],
    ["west-gate-side", 568, 388, 614, 461],
    ["west-gate-approach", 605, 214, 775, 451],
    ["east-gate-approach", 866, 211, 932, 412],
    ["east-gate-side", 988, 367, 1082, 461],
  ];

  const existingIds = new Set(layout.occluders.map((area) => area.id));
  for (const [id, minX, minY, maxX, maxY] of depthZones) {
    const fullId = `depth-${id}`;
    if (existingIds.has(fullId)) continue;

    const visualLeft = Math.max(0, minX + dx - 18);
    const visualTop = Math.max(0, minY + dy - 190);
    const visualRight = Math.min(layout.referenceSize.width, maxX + dx + 18);
    const visualBottom = Math.min(layout.referenceSize.height, maxY + dy + 12);
    const rearTop = Math.max(0, minY + dy - 48);
    const rearBottom = Math.min(layout.referenceSize.height, minY + dy + 12);
    const rearLeft = Math.max(0, minX + dx - 12);
    const rearRight = Math.min(layout.referenceSize.width, maxX + dx + 12);

    const bounds = [
      visualLeft,
      visualTop,
      Math.max(1, visualRight - visualLeft),
      Math.max(1, visualBottom - visualTop),
    ];
    const footArea = layout.rect(
      rearLeft,
      rearTop,
      Math.max(1, rearRight - rearLeft),
      Math.max(1, rearBottom - rearTop),
    );

    layout.occluders.push({
      id: fullId,
      bounds,
      baseline: minY + dy + 10,
      footArea,
      source: "foreground",
      points: layout.rect(...bounds).points,
      rearInset: 6,
      depthFix: true,
    });
  }

  // Do not flip an actor behind a foreground object the instant the foot point
  // grazes its baseline. A few pixels of rear clearance prevent the old
  // "blocked but suddenly disappears" symptom while preserving correct hiding
  // once the actor has actually moved behind the object.
  layout.activeOccluders = function activeOccluders(foot, areas = layout.occluders) {
    if (!foot || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return [];

    // Scripted motion/collision projection can briefly leave a foot on the
    // exact edge of a physical base. Keep the actor visible in that ambiguous
    // frame instead of erasing it into the foreground.
    if (layout.solidBases.some((shape) => layout.contains(foot, shape))) return [];

    return areas.filter((area) =>
      foot.y < area.baseline - (area.rearInset ?? 4) &&
      layout.contains(foot, area.footArea),
    );
  };

  layout.depthModelVersion = "preview-49";
  layout.artworkModelVersion = "preview-53";

  // The visible island artwork source is owned by index.html. Keeping one
  // source avoids runtime URL replacement races and makes the selected upload
  // explicit for each preview revision.
})(window);
