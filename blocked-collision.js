/* Adds subtractive blockedAreas on top of the existing walk-area collision. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./navigation.js"));
  } else {
    root.TarotNavigation = factory(root.TarotNavigation);
  }
})(typeof window === "object" ? window : this, function (api) {
  "use strict";
  if (!api) throw new Error("TarotNavigation is required before blocked-collision.js");
  if (api.__blockedAreasPatched) return api;

  const EPS = 1e-7;
  const originalValidateCollision = api.validateCollision;
  const originalCreateCollision = api.createCollision;
  const finitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function validateArea(area) {
    return !!(
      area &&
      (area.type === "ellipse"
        ? [area.cx, area.cy, area.rx, area.ry].every(Number.isFinite) &&
          area.rx > 0 && area.ry > 0
        : area.type === "poly" && Array.isArray(area.points) &&
          area.points.length >= 3 &&
          area.points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)))
    );
  }

  function buildShape(area) {
    const points = area.points;
    const xs = points?.map((p) => p[0]);
    const ys = points?.map((p) => p[1]);
    return {
      ...area,
      minX: points ? Math.min(...xs) : area.cx - area.rx,
      maxX: points ? Math.max(...xs) : area.cx + area.rx,
      minY: points ? Math.min(...ys) : area.cy - area.ry,
      maxY: points ? Math.max(...ys) : area.cy + area.ry,
    };
  }

  function nearestOnEdge(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2
      ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / length2))
      : 0;
    return { x: a[0] + dx * t, y: a[1] + dy * t };
  }

  function inShape(x, y, shape) {
    if (x < shape.minX - EPS || x > shape.maxX + EPS || y < shape.minY - EPS || y > shape.maxY + EPS)
      return false;
    if (shape.type === "ellipse") {
      return ((x - shape.cx) / shape.rx) ** 2 + ((y - shape.cy) / shape.ry) ** 2 <= 1 + EPS;
    }
    let inside = false;
    for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
      const a = shape.points[j];
      const b = shape.points[i];
      if (distance({ x, y }, nearestOnEdge({ x, y }, a, b)) <= EPS) return true;
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside;
  }

  function orientation(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  function onSegment(a, b, p) {
    return Math.abs(orientation(a, b, p)) <= EPS &&
      p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS &&
      p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
  }

  function segmentsIntersect(a, b, c, d) {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (((o1 > EPS && o2 < -EPS) || (o1 < -EPS && o2 > EPS)) &&
        ((o3 > EPS && o4 < -EPS) || (o3 < -EPS && o4 > EPS))) return true;
    return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
  }

  function segmentHitsShape(a, b, shape) {
    if (inShape(a.x, a.y, shape) || inShape(b.x, b.y, shape)) return true;
    if (Math.max(a.x, b.x) < shape.minX || Math.min(a.x, b.x) > shape.maxX ||
        Math.max(a.y, b.y) < shape.minY || Math.min(a.y, b.y) > shape.maxY) return false;

    if (shape.type === "poly") {
      for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
        const c = { x: shape.points[j][0], y: shape.points[j][1] };
        const d = { x: shape.points[i][0], y: shape.points[i][1] };
        if (segmentsIntersect(a, b, c, d)) return true;
      }
      return false;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const x = (a.x - shape.cx) / shape.rx;
    const y = (a.y - shape.cy) / shape.ry;
    const vx = dx / shape.rx;
    const vy = dy / shape.ry;
    const A = vx * vx + vy * vy;
    if (A <= EPS) return false;
    const B = 2 * (x * vx + y * vy);
    const C = x * x + y * y - 1;
    const discriminant = B * B - 4 * A * C;
    if (discriminant < -EPS) return false;
    const root = Math.sqrt(Math.max(0, discriminant));
    const t1 = (-B - root) / (2 * A);
    const t2 = (-B + root) / (2 * A);
    return (t1 >= -EPS && t1 <= 1 + EPS) || (t2 >= -EPS && t2 <= 1 + EPS);
  }

  function validateCollision(data) {
    const result = originalValidateCollision(data);
    const blockedAreas = data.blockedAreas ?? [];
    if (!Array.isArray(blockedAreas)) throw new Error("侵入禁止エリアが配列ではありません");
    for (const area of blockedAreas) {
      if (!validateArea(area)) throw new Error("侵入禁止エリアに無効な範囲があります");
    }
    return { ...result, blockedAreas };
  }

  function createCollision(data) {
    validateCollision(data);
    const base = originalCreateCollision(data);
    const blockedAreas = data.blockedAreas ?? [];
    const blockedShapes = blockedAreas.map(buildShape);

    const insideBlocked = (x, y) => blockedShapes.some((shape) => inShape(x, y, shape));
    const isWalkable = (x, y) => base.isWalkable(x, y) && !insideBlocked(x, y);

    function segmentClear(a, b) {
      if (!finitePoint(a) || !finitePoint(b) || !isWalkable(a.x, a.y) || !isWalkable(b.x, b.y))
        return false;
      if (!base.segmentClear(a, b)) return false;
      return !blockedShapes.some((shape) => segmentHitsShape(a, b, shape));
    }

    function nearestWalkable(point) {
      if (!finitePoint(point)) return null;
      if (isWalkable(point.x, point.y)) return { ...point };

      const baseCandidate = base.nearestWalkable(point);
      if (baseCandidate && isWalkable(baseCandidate.x, baseCandidate.y)) return baseCandidate;

      const directions = 64;
      const maxRadius = Math.hypot(api.REF.width, api.REF.height);
      for (let radius = 2; radius <= maxRadius; radius += 3) {
        let best = null;
        let bestDistance = Infinity;
        for (let i = 0; i < directions; i++) {
          const angle = (i / directions) * Math.PI * 2;
          const candidate = {
            x: point.x + Math.cos(angle) * radius,
            y: point.y + Math.sin(angle) * radius,
          };
          if (!isWalkable(candidate.x, candidate.y)) continue;
          const d = distance(point, candidate);
          if (d < bestDistance) {
            best = candidate;
            bestDistance = d;
          }
        }
        if (best) return best;
      }
      return null;
    }

    return {
      ...base,
      version: Number(data.version) || base.version || 1,
      blockedAreas,
      isWalkable,
      segmentClear,
      nearestWalkable,
    };
  }

  api.validateCollision = validateCollision;
  api.createCollision = createCollision;
  api.__blockedAreasPatched = true;
  return api;
});
