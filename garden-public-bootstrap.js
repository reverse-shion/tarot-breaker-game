/* Synchronous browser bridge for ?entry=continue on Garden only. */
(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.getAll("entry").length !== 1 || params.get("entry") !== "continue" ||
      params.has("from") || params.has("dev")) return;
  try {
    const session = window.TarotGardenPublicContinue?.receive({
      search: location.search,
      storage: window.localStorage,
    });
    if (!session?.ok) {
      window.TarotGardenContinueTransit = Object.freeze({ok:false, reason:session?.reason || "garden-public-receive-failed"});
      return;
    }
    const projected = window.TarotGardenPublicContinue.projectJourney(session, {
      journey: window.TarotJourney,
      storage: window.sessionStorage,
    });
    if (!projected?.ok) {
      window.TarotGardenContinueTransit = Object.freeze({ok:false, reason:projected?.reason || "garden-public-project-failed"});
      return;
    }
    window.TarotGardenContinueTransit = session;
  } catch (error) {
    window.TarotGardenContinueTransit = Object.freeze({ok:false, reason:error?.code || error?.message || "garden-public-bootstrap-failed"});
  }
})();
