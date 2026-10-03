/* Phase 2A-4c observer + Phase 2A-5c isolated Landing Continue transit.
 * Production remains observer-only. Dev transit writes only to its checkpoint session.
 */
(function (root) {
  "use strict";

  const core = root.TarotProgressCore;
  if (!core) return;

  const params = new URLSearchParams(root.location.search);
  const landingResumeDev = params.get("from") === "landing" &&
    /^landing-resume-(arrival|memory-complete|waiting)$/.test(params.get("dev") || "");
  const gardenResumeDev = !params.has("from") &&
    /^garden-resume-(before-shiopon|after-shiopon|after-lumiere)$/.test(params.get("dev") || "");
  const gardenResumePublic = params.getAll("entry").length === 1 && params.get("entry") === "continue" &&
    !params.has("from") && !params.has("dev");

  let progress;
  if (gardenResumePublic) {
    const transit = root.TarotGardenContinueTransit;
    if (!transit?.ok || !transit.progress) {
      root.TarotGardenContinueTransit = Object.freeze({ok:false, reason:transit?.reason || "garden-public-transit-unavailable"});
      return;
    }
    progress = transit.progress;
  } else if (landingResumeDev || gardenResumeDev) {
    const transit = gardenResumeDev ? root.TarotGardenResume?.createSession({
      search: root.location.search,
      storage: root.sessionStorage,
    }) : root.TarotLandingResume?.createGardenTransitSession({
      search: root.location.search,
      storage: root.sessionStorage,
    });
    if (!transit?.ok) {
      root.TarotGardenDevTransit = Object.freeze({ok:false, reason:transit?.reason || "garden-transit-unavailable"});
      return;
    }
    root.TarotGardenDevTransit = transit;
    progress = transit.progress;
  } else {
    progress = core.createProgress();
    const loaded = progress.load();
    if (loaded.status !== "valid") return;
  }

  function note(message, error) {
    if (typeof console !== "undefined") console.warn("[Garden Progress]", message, error || "");
  }

  // Garden only acknowledges that the unchanged URL arrival actually reached this scene.
  if (!landingResumeDev && params.get("from") === "landing") {
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
    const state = root.TarotGardenDialogue?.getState?.() || root.TarotDialogue?.getState?.();
    if (!state) return;

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
