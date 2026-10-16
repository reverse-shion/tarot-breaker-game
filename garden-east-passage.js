/* East passage B-line foundation. Not wired into production collision or Progress. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports
    ? require('./progress.js') : root.TarotProgressCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TarotGardenEastPassage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';
  const KNOWLEDGE_EVENT = 'garden_star_sand_route_known';
  const REF = Object.freeze({ width: 1448, height: 1086 });
  // Photo-based B candidate: eastern lower path, not the whole east courtyard.
  // iPhone foot-point calibration is still required before this can enter main.
  const B_LINE = Object.freeze({
    a: Object.freeze({ x: 1398, y: 740 }),
    b: Object.freeze({ x: 1398, y: 844 }),
  });
  const EPS = 1e-8;
  const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function validPoint(p) {
    return finite(p) && p.x >= 0 && p.x <= REF.width && p.y >= 0 && p.y <= REF.height;
  }
  function validLine(line) {
    return line && validPoint(line.a) && validPoint(line.b) &&
      Math.hypot(line.b.x - line.a.x, line.b.y - line.a.y) > EPS;
  }
  function routeKnown(storage) {
    // A fresh reader validates durable v1 bytes, never the writer's memory.
    // Do not cache permission: revoked, stale or unreadable saves close B immediately.
    try {
      const loaded = core.createProgress({ storage, diagnostic() {} }).load();
      const events = loaded?.state?.completedEvents;
      return loaded?.status === 'valid' && Array.isArray(events) &&
        events.includes('garden_star_gate_anomaly') && events.includes(KNOWLEDGE_EVENT);
    } catch (_) {
      return false;
    }
  }
  function cross(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }
  function onSegment(a, b, p) {
    return Math.abs(cross(a, b, p)) <= EPS &&
      p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS &&
      p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
  }
  function intersects(a, b, c, d) {
    const abC = cross(a, b, c), abD = cross(a, b, d);
    const cdA = cross(c, d, a), cdB = cross(c, d, b);
    if ((abC > EPS && abD < -EPS || abC < -EPS && abD > EPS) &&
        (cdA > EPS && cdB < -EPS || cdA < -EPS && cdB > EPS)) return true;
    return onSegment(a, b, c) || onSegment(a, b, d) ||
      onSegment(c, d, a) || onSegment(c, d, b);
  }
  function wouldBlock(from, to, line, known) {
    if (!validLine(line) || !validPoint(from) || !validPoint(to))
      throw new TypeError('East passage line and footpoints must use authored reference pixels');
    return !known && intersects(from, to, line.a, line.b);
  }
  function distanceToLine(point, line = B_LINE) {
    if (!validPoint(point) || !validLine(line)) throw new TypeError('Invalid passage geometry');
    const dx = line.b.x - line.a.x, dy = line.b.y - line.a.y;
    const t = Math.max(0, Math.min(1, ((point.x - line.a.x) * dx + (point.y - line.a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - line.a.x - t * dx, point.y - line.a.y - t * dy);
  }
  function createFeedbackThrottle(intervalMs = 1500) {
    if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new TypeError('Invalid feedback interval');
    let last = -Infinity;
    return Object.freeze({
      permit(nowMs) {
        if (!Number.isFinite(nowMs) || nowMs < last) return false;
        if (nowMs - last < intervalMs) return false;
        last = nowMs;
        return true;
      },
      reset() { last = -Infinity; },
    });
  }
  return Object.freeze({ KNOWLEDGE_EVENT, REF, B_LINE, validLine, routeKnown, wouldBlock, distanceToLine, createFeedbackThrottle });
});
