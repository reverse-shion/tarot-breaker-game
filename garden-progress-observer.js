/* Phase 2A-4c: observer-only Garden Progress bridge (CI contract revision 1).
 * It never starts, suppresses, restores, or mutates Garden story runtime.
 */
(function (root) {
  "use strict";

  const core = root.TarotProgressCore;
  if (!core) return;

  const progress = core.createProgress();
  const loaded = progress.load();
  if (loaded.status !== "valid") return;

  function note(message, error) {
    if (typeof console !== "undefined") console.warn("[Garden Progress]", message, error || "");
  }

  // Landing owns the existing transition. Garden only acknowledges that the
  // unchanged URL arrival actually reached this scene.
  if (new URLSearchParams(root.location.search).get("from") === "landing") {
    try {
      progress.commitArrival({
        sourceMapId: "star_country_landing",
        destinationMapId: "star_gate_garden",
        spawnId: "south_gate",
        reason: "gate_to_garden",
      });
    } catch (error) {
      note("arrival observation was not persisted", error);
    }
  }

  root.addEventListener("tarot-breaker:interaction-end", function () {
    const state = root.TarotGardenDialogue?.getState?.();
    if (!state) return;

    // Existing dialogue.js remains the sole authority for completion.
    if (state.shioponDone === true && !progress.isEventCompleted("garden_shiopon_meet")) {
      try {
        progress.completeEvent("garden_shiopon_meet", {
          mapId: "star_gate_garden",
          spawnId: "south_gate",
        });
      } catch (error) {
        note("Shiopon meeting observation was not persisted", error);
      }
    }

    if (state.lumiereDone === true && !progress.isEventCompleted("garden_lumiere_gate")) {
      try {
        progress.completeEvent("garden_lumiere_gate", {
          mapId: "star_gate_garden",
          spawnId: "south_gate",
        });
      } catch (error) {
        note("Lumiere gate observation was not persisted", error);
      }
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
