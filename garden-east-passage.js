/* East passage B-line foundation. Not wired into production collision or Progress. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TarotGardenEastPassage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KNOWLEDGE_EVENT = 'garden_star_sand_route_known';
  const REF = Object.freeze({ width: 1448, height: 1086 });
  const EPS = 1e-8;
  const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function validPoint(p) {
    return finite(p) && p.x >= 0 && p.x <= REF.width && p.y >= 0 && p.y <= REF.height;
  }
  function validLine(line) {
    return line && validPoint(line.a) && validPoint(line.b) &&
      Math.hypot(line.b.x - line.a.x, line.b.y - line.a.y) > EPS;
  }
  function routeKnown(progress) {
    // An unknown, incomplete or unreadable record must never grant access.
    try {
      const snapshot = progress?.getCurrentState?.();
      const events = snapshot?.state?.completedEvents;
      return Array.isArray(events) && events.includes(KNOWLEDGE_EVENT);
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
  return Object.freeze({ KNOWLEDGE_EVENT, REF, validLine, routeKnown, wouldBlock, createFeedbackThrottle });
});
