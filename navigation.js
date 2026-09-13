/* Shared foot-point collision and navigation, in the JSON's reference pixels. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TarotNavigation = factory();
})(typeof window === "object" ? window : this, function () {
  "use strict";
  const REF = { width: 1448, height: 1086 };
  const EPS = 1e-7;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const finitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;

  function validateCollision(data) {
    if (!data || data.map !== "star-country-gate-garden")
      throw new Error("当たり判定マップIDが一致しません");
    if (
      data.referenceSize?.width !== REF.width ||
      data.referenceSize?.height !== REF.height
    ) {
      throw new Error("当たり判定の基準サイズが一致しません");
    }
    if (!Array.isArray(data.walkAreas) || !data.walkAreas.length)
      throw new Error("歩行エリアがありません");
    for (const area of data.walkAreas) {
      const valid =
        area &&
        (area.type === "ellipse"
          ? [area.cx, area.cy, area.rx, area.ry].every(Number.isFinite) &&
            area.rx > 0 &&
            area.ry > 0
          : area.type === "poly" &&
            Array.isArray(area.points) &&
            area.points.length >= 3 &&
            area.points.every(
              (p) =>
                Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
            ));
      if (!valid) throw new Error("当たり判定に無効なエリアがあります");
    }
    return { version: Number(data.version) || 1, areas: data.walkAreas };
  }

  function nearestOnEdge(p, a, b) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2
      ? Math.max(
          0,
          Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / length2),
        )
      : 0;
    return { x: a[0] + dx * t, y: a[1] + dy * t };
  }

  function createCollision(data) {
    const { areas, version } = validateCollision(data);
    const shapes = areas.map((area) => {
      const points = area.points;
      const xs = points?.map((p) => p[0]),
        ys = points?.map((p) => p[1]);
      return {
        ...area,
        minX: points ? Math.min(...xs) : area.cx - area.rx,
        maxX: points ? Math.max(...xs) : area.cx + area.rx,
        minY: points ? Math.min(...ys) : area.cy - area.ry,
        maxY: points ? Math.max(...ys) : area.cy + area.ry,
      };
    });

    function inShape(x, y, s) {
      if (
        x < s.minX - EPS ||
        x > s.maxX + EPS ||
        y < s.minY - EPS ||
        y > s.maxY + EPS
      )
        return false;
      if (s.type === "ellipse")
        return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1 + EPS;
      let inside = false;
      for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
        const a = s.points[j],
          b = s.points[i];
        // The polygon boundary itself is walkable; no expansion of its area.
        if (distance({ x, y }, nearestOnEdge({ x, y }, a, b)) <= EPS)
          return true;
        if (
          a[1] > y !== b[1] > y &&
          x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
        )
          inside = !inside;
      }
      return inside;
    }

    function isWalkable(x, y) {
      return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        y >= 0 &&
        x <= REF.width &&
        y <= REF.height &&
        shapes.some((s) => inShape(x, y, s))
      );
    }

    function segmentClear(a, b) {
      if (
        !finitePoint(a) ||
        !finitePoint(b) ||
        !isWalkable(a.x, a.y) ||
        !isWalkable(b.x, b.y)
      )
        return false;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      if (Math.hypot(dx, dy) <= EPS) return true;
      const cuts = [0, 1];
      const add = (t) => {
        if (t > 0 && t < 1) cuts.push(t);
      };
      // Split at EVERY boundary intersection. Midpoint tests then cover each
      // interval exactly, including sub-pixel gaps and overlapping polygons.
      for (const s of shapes) {
        if (
          Math.max(a.x, b.x) < s.minX ||
          Math.min(a.x, b.x) > s.maxX ||
          Math.max(a.y, b.y) < s.minY ||
          Math.min(a.y, b.y) > s.maxY
        )
          continue;
        if (s.type === "ellipse") {
          const x = (a.x - s.cx) / s.rx,
            y = (a.y - s.cy) / s.ry;
          const vx = dx / s.rx,
            vy = dy / s.ry;
          const A = vx * vx + vy * vy,
            B = 2 * (x * vx + y * vy),
            C = x * x + y * y - 1;
          const d = B * B - 4 * A * C;
          if (d >= 0) {
            add((-B - Math.sqrt(d)) / (2 * A));
            add((-B + Math.sqrt(d)) / (2 * A));
          }
        } else {
          for (
            let i = 0, j = s.points.length - 1;
            i < s.points.length;
            j = i++
          ) {
            const p = s.points[j],
              q = s.points[i];
            const ex = q[0] - p[0],
              ey = q[1] - p[1];
            const px = p[0] - a.x,
              py = p[1] - a.y;
            const den = cross(dx, dy, ex, ey);
            if (Math.abs(den) > EPS) {
              const t = cross(px, py, ex, ey) / den,
                u = cross(px, py, dx, dy) / den;
              if (u >= -EPS && u <= 1 + EPS) add(t);
            } else if (Math.abs(cross(px, py, dx, dy)) <= EPS) {
              const length2 = dx * dx + dy * dy;
              add((px * dx + py * dy) / length2);
              add(((q[0] - a.x) * dx + (q[1] - a.y) * dy) / length2);
            }
          }
        }
      }
      cuts.sort((x, y) => x - y);
      for (let i = 1; i < cuts.length; i++) {
        const t = (cuts[i - 1] + cuts[i]) / 2;
        if (!isWalkable(a.x + dx * t, a.y + dy * t)) return false;
      }
      return true;
    }

    function nearestWalkable(p) {
      if (!finitePoint(p)) return null;
      if (isWalkable(p.x, p.y)) return { ...p };
      let best = null,
        bestDistance = Infinity;
      function consider(q) {
        const d = distance(p, q);
        if (d < bestDistance && isWalkable(q.x, q.y)) {
          best = q;
          bestDistance = d;
        }
      }
      for (const s of shapes) {
        if (s.type === "poly") {
          for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++)
            consider(nearestOnEdge(p, s.points[j], s.points[i]));
        } else {
          const at = (angle) => ({
            x: s.cx + s.rx * Math.cos(angle),
            y: s.cy + s.ry * Math.sin(angle),
          });
          const step = (Math.PI * 2) / 64;
          let angle = 0;
          for (let i = 1; i < 64; i++)
            if (distance(p, at(i * step)) < distance(p, at(angle)))
              angle = i * step;
          let lo = angle - step,
            hi = angle + step;
          for (let i = 0; i < 40; i++) {
            const l = lo + (hi - lo) / 3,
              r = hi - (hi - lo) / 3;
            if (distance(p, at(l)) < distance(p, at(r))) hi = r;
            else lo = l;
          }
          consider(at((lo + hi) / 2));
        }
      }
      return best;
    }
    return { areas, version, isWalkable, segmentClear, nearestWalkable };
  }

  class MinHeap {
    items = [];
    push(item) {
      const a = this.items;
      a.push(item);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p].f <= item.f) break;
        a[i] = a[p];
        i = p;
      }
      a[i] = item;
    }
    pop() {
      const a = this.items,
        first = a[0],
        last = a.pop();
      if (a.length) {
        let i = 0;
        while (i * 2 + 1 < a.length) {
          let c = i * 2 + 1;
          if (c + 1 < a.length && a[c + 1].f < a[c].f) c++;
          if (a[c].f >= last.f) break;
          a[i] = a[c];
          i = c;
        }
        a[i] = last;
      }
      return first;
    }
  }

  function createNavigator(collision, cellSize = 16) {
    const cols = Math.ceil(REF.width / cellSize),
      rows = Math.ceil(REF.height / cellSize);
    const nodes = [],
      cells = new Map();
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const p = {
          x: (x + 0.5) * cellSize,
          y: (y + 0.5) * cellSize,
          col: x,
          row: y,
          id: nodes.length,
        };
        if (collision.isWalkable(p.x, p.y)) {
          nodes.push(p);
          cells.set(y * cols + x, p.id);
        }
      }
    const edgeCache = new Map();
    function neighbors(id) {
      if (edgeCache.has(id)) return edgeCache.get(id);
      const a = nodes[id],
        result = [];
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++) {
          if (
            (!x && !y) ||
            a.col + x < 0 ||
            a.col + x >= cols ||
            a.row + y < 0 ||
            a.row + y >= rows
          )
            continue;
          const next = cells.get((a.row + y) * cols + a.col + x);
          if (next !== undefined && collision.segmentClear(a, nodes[next]))
            result.push(next);
        }
      edgeCache.set(id, result);
      return result;
    }
    function connectors(p) {
      const ordered = nodes
        .map((n) => ({ id: n.id, d: distance(p, n) }))
        .sort((a, b) => a.d - b.d);
      const result = [];
      for (const item of ordered) {
        if (collision.segmentClear(p, nodes[item.id])) result.push(item);
        if (result.length >= 8) break;
      }
      return result;
    }
    function smooth(path) {
      const result = [path[0]];
      for (let i = 0; i < path.length - 1; ) {
        let next = path.length - 1;
        while (next > i + 1 && !collision.segmentClear(path[i], path[next]))
          next--;
        result.push(path[next]);
        i = next;
      }
      return result.map((p) => ({ x: p.x, y: p.y }));
    }
    function findPath(start, requested) {
      if (!finitePoint(start) || !collision.isWalkable(start.x, start.y))
        return null;
      const target = collision.nearestWalkable(requested);
      if (!target) return null;
      if (collision.segmentClear(start, target))
        return { target, points: [{ ...start }, target], cellSize };
      const starts = connectors(start),
        goals = new Map(connectors(target).map((n) => [n.id, n.d]));
      if (!starts.length || !goals.size) return null;
      const scores = new Float64Array(nodes.length).fill(Infinity);
      const parent = new Int32Array(nodes.length).fill(-1);
      const closed = new Uint8Array(nodes.length),
        heap = new MinHeap();
      for (const { id, d } of starts) {
        scores[id] = d;
        heap.push({ id, f: d + distance(nodes[id], target) });
      }
      let bestGoal = -1,
        bestCost = Infinity;
      while (heap.items.length) {
        const { id, f } = heap.pop();
        if (f >= bestCost) break;
        if (closed[id]) continue;
        closed[id] = 1;
        if (goals.has(id) && scores[id] + goals.get(id) < bestCost) {
          bestGoal = id;
          bestCost = scores[id] + goals.get(id);
        }
        for (const next of neighbors(id)) {
          const g = scores[id] + distance(nodes[id], nodes[next]);
          if (g >= scores[next]) continue;
          scores[next] = g;
          parent[next] = id;
          heap.push({ id: next, f: g + distance(nodes[next], target) });
        }
      }
      if (bestGoal < 0) return null;
      const path = [target];
      for (let i = bestGoal; i >= 0; i = parent[i]) path.push(nodes[i]);
      path.push(start);
      path.reverse();
      return { target, points: smooth(path), cellSize };
    }
    return { cellSize, nodes, findPath };
  }
  return { REF, validateCollision, createCollision, createNavigator, distance };
});
