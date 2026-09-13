/* Input arbitration and route following. No DOM or frame-rate dependency. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TarotControls = factory();
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const DRAG_THRESHOLD = 12;
  const TAP_MS = 250;
  const STICK_RADIUS = 64;
  const DEADZONE = 0.15;
  const ARRIVAL = 8;
  const AUTO_SPEED = 0.95;
  const MOVE_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "w",
    "a",
    "s",
    "d",
  ]);
  const normalizeKey = (key) => (key.length === 1 ? key.toLowerCase() : key);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function stickVector(dx, dy) {
    const length = Math.hypot(dx, dy),
      magnitude = Math.min(1, length / STICK_RADIUS);
    const factor =
      magnitude <= DEADZONE
        ? 0
        : ((magnitude - DEADZONE) / (1 - DEADZONE)) ** 1.4;
    return {
      x: length ? (dx / length) * factor : 0,
      y: length ? (dy / length) * factor : 0,
      knobX: length ? (dx / length) * Math.min(length, STICK_RADIUS) : 0,
      knobY: length ? (dy / length) * Math.min(length, STICK_RADIUS) : 0,
    };
  }

  function createControls(collision, navigator) {
    const state = {
      keys: new Set(),
      gesture: null,
      stick: { active: false, x: 0, y: 0, knobX: 0, knobY: 0, ox: 0, oy: 0 },
      route: [],
      target: null,
      requested: null,
      suspended: false,
      cancelReason: null,
    };
    function cancel(reason = "cancel") {
      state.route = [];
      state.target = null;
      state.cancelReason = reason;
    }
    function clearInput(reason = "cancel") {
      cancel(reason);
      state.keys.clear();
      state.gesture = null;
      Object.assign(state.stick, {
        active: false,
        x: 0,
        y: 0,
        knobX: 0,
        knobY: 0,
      });
    }
    function suspend() {
      clearInput("event");
      state.suspended = true;
    }
    function resume() {
      state.suspended = false;
    }
    function tap(point, position) {
      cancel("new-tap");
      state.requested = { ...point };
      if (state.suspended || state.stick.active || state.keys.size) return null;
      const result = navigator.findPath(position, point);
      if (!result) return null;
      state.route = result.points.slice(1).map((p) => ({ ...p }));
      state.target = { ...result.target };
      state.cancelReason = null;
      return result;
    }
    function pointerDown({
      id,
      x,
      y,
      time,
      width,
      world,
      primary = true,
      button = 0,
    }) {
      if (state.suspended || state.gesture || !primary || button !== 0)
        return false;
      state.gesture = {
        id,
        x,
        y,
        time,
        world: { ...world },
        maxDistance: 0,
        canStick: x <= width * 0.68,
      };
      return true;
    }
    function pointerMove({ id, x, y }) {
      const g = state.gesture;
      if (!g || id !== g.id) return false;
      const dx = x - g.x,
        dy = y - g.y;
      g.maxDistance = Math.max(g.maxDistance, Math.hypot(dx, dy));
      if (g.maxDistance >= DRAG_THRESHOLD && g.canStick) {
        if (!state.stick.active) cancel("stick");
        Object.assign(
          state.stick,
          { active: true, ox: g.x, oy: g.y },
          stickVector(dx, dy),
        );
      }
      return true;
    }
    function pointerEnd({ id, x, y, time, cancelled = false }, position) {
      const g = state.gesture;
      if (!g || id !== g.id) return null;
      const wasStick = state.stick.active;
      const moved = Math.max(g.maxDistance, Math.hypot(x - g.x, y - g.y));
      state.gesture = null;
      Object.assign(state.stick, {
        active: false,
        x: 0,
        y: 0,
        knobX: 0,
        knobY: 0,
      });
      if (cancelled) {
        cancel("pointer-cancel");
        return null;
      }
      if (!wasStick && moved < DRAG_THRESHOLD && time - g.time < TAP_MS) {
        return { point: g.world, result: tap(g.world, position) };
      }
      return null;
    }
    function keyDown(key) {
      key = normalizeKey(key);
      if (!MOVE_KEYS.has(key) || state.suspended) return false;
      cancel("keyboard");
      state.keys.add(key);
      // A key pressed during a pending tap invalidates that tap.
      if (state.gesture && !state.stick.active)
        state.gesture.maxDistance = Infinity;
      return true;
    }
    function keyUp(key) {
      state.keys.delete(normalizeKey(key));
    }
    function manualVector() {
      if (state.stick.active) return { x: state.stick.x, y: state.stick.y };
      const has = (a, b) => (state.keys.has(a) || state.keys.has(b) ? 1 : 0);
      let x = has("ArrowRight", "d") - has("ArrowLeft", "a");
      let y = has("ArrowDown", "s") - has("ArrowUp", "w");
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      return { x, y };
    }
    function step(position, dt, speed = 155) {
      const from = { ...position },
        next = { ...position };
      const budget = Math.max(0, Math.min(0.05, dt)) * speed;
      if (!state.suspended && budget > 0) {
        if (state.stick.active || state.keys.size) {
          cancel(state.stick.active ? "stick" : "keyboard");
          const v = manualVector(),
            target = { x: next.x + v.x * budget, y: next.y + v.y * budget };
          if (collision.segmentClear(next, target)) Object.assign(next, target);
          else {
            // Preserve the existing wall-slide, using the same segment guard.
            const horizontal = { x: target.x, y: next.y };
            if (collision.segmentClear(next, horizontal)) next.x = horizontal.x;
            const vertical = { x: next.x, y: target.y };
            if (collision.segmentClear(next, vertical)) next.y = vertical.y;
          }
        } else {
          let remaining = budget * AUTO_SPEED;
          while (state.route.length && remaining > 0) {
            const waypoint = state.route[0],
              d = distance(next, waypoint);
            if (state.route.length === 1 && d <= ARRIVAL) {
              cancel("arrived");
              break;
            }
            if (d <= 1e-8) {
              state.route.shift();
              continue;
            }
            const amount = Math.min(d, remaining);
            const target = {
              x: next.x + ((waypoint.x - next.x) / d) * amount,
              y: next.y + ((waypoint.y - next.y) / d) * amount,
            };
            if (!collision.segmentClear(next, target)) {
              cancel("blocked");
              break;
            }
            Object.assign(next, target);
            remaining -= amount;
            if (amount >= d) state.route.shift();
          }
          if (!state.route.length && state.target) cancel("arrived");
        }
      }
      return {
        ...next,
        dx: next.x - from.x,
        dy: next.y - from.y,
        moving: distance(from, next) > 1e-5,
      };
    }
    return {
      state,
      cancel,
      clearInput,
      suspend,
      resume,
      tap,
      pointerDown,
      pointerMove,
      pointerEnd,
      keyDown,
      keyUp,
      step,
    };
  }
  return {
    createControls,
    stickVector,
    DRAG_THRESHOLD,
    TAP_MS,
    STICK_RADIUS,
    DEADZONE,
    ARRIVAL,
    AUTO_SPEED,
  };
});
