/* Garden Progress completion bridge.
 * Contract:
 * 1) authored story runtime owns when an event is complete;
 * 2) it emits tarot-breaker:story-event-complete only after legacy state is saved;
 * 3) Progress v1 is the durable authority for completed semantic event IDs;
 * 4) on load, durable completion facts may only restore legacy true flags;
 * 5) this bridge never starts, suppresses, or clears an authored event.
 */
(function (root) {
  "use strict";

  if (root.__TAROT_DEV_STAR_GATE_ANOMALY__ === true) return;

  const core = root.TarotProgressCore;
  if (!core) return;

  const progress = core.createProgress();
  const loaded = progress.load();
  if (loaded.status !== "valid") return;

  function note(message, error) {
    if (typeof console !== "undefined") console.warn("[Garden Progress]", message, error || "");
  }

  // Progress -> legacy compatibility restore. This runs before deferred dialogue.js,
  // so dialogue reads the restored facts during its normal initialization.
  try {
    const saved = root.TarotJourney?.get("gardenStory") || {};
    const restored = {
      ...saved,
      shioponDone: saved.shioponDone === true || progress.isEventCompleted("garden_shiopon_meet"),
      lumiereDone: saved.lumiereDone === true || progress.isEventCompleted("garden_lumiere_gate"),
      joined: saved.joined === true || progress.isEventCompleted("garden_shiopon_meet"),
    };
    if (restored.shioponDone !== saved.shioponDone ||
        restored.lumiereDone !== saved.lumiereDone ||
        restored.joined !== saved.joined) {
      root.TarotJourney?.set("gardenStory", restored);
    }
  } catch (error) {
    note("durable completion restore failed", error);
  }

  // Landing owns the transition. Garden only acknowledges successful arrival.
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

  const ALLOWED = Object.freeze({
    garden_shiopon_meet: Object.freeze({ mapId: "star_gate_garden", spawnId: "south_gate" }),
    garden_lumiere_gate: Object.freeze({ mapId: "star_gate_garden", spawnId: "south_gate" }),
  });

  // Authored completion -> durable Progress. Explicit completion signal avoids
  // guessing completion from interaction-end and gives every future event one contract.
  root.addEventListener("tarot-breaker:story-event-complete", function (event) {
    const eventId = event?.detail?.eventId;
    const checkpoint = ALLOWED[eventId];
    if (!checkpoint) return;
    if (event.detail.mapId !== checkpoint.mapId || event.detail.spawnId !== checkpoint.spawnId) {
      note("completion signal rejected: checkpoint mismatch");
      return;
    }
    try {
      if (!progress.isEventCompleted(eventId)) progress.completeEvent(eventId, checkpoint);
    } catch (error) {
      note(eventId + " completion was not persisted", error);
    }
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
