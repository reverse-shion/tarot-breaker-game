/* Loads Phase 2A-5c dev-only dependencies during HTML parsing.
 * Normal Garden routes do not load checkpoint/resume modules.
 */
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const id = params.get("dev") || "";
  const from = params.get("from");
  const landingTransit = from === "landing" && /^landing-resume-(arrival|memory-complete|waiting)$/.test(id);
  const gardenResume = !params.has("from") && /^garden-resume-(before-shiopon|after-shiopon|after-lumiere)$/.test(id);
  const publicGardenResume = params.getAll("entry").length === 1 && params.get("entry") === "continue" &&
    !params.has("from") && !params.has("dev");
  if (!landingTransit && !gardenResume && !publicGardenResume) return;
  if (landingTransit || gardenResume)
    document.write('<script src="./dev-checkpoints.js?v=phase-2a-5c-1"><\/script>');
  if (id === "garden-resume-after-lumiere" && gardenResume) {
    window.__TAROT_DEV_STAR_GATE_ANOMALY__ = true;
    document.write('<link rel="stylesheet" href="./star-gate-interaction.css?v=recovery-v4">');
    document.write('<link rel="stylesheet" href="./star-gate-anomaly.css?v=recovery-v4">');
    document.write('<script src="./star-gate-recovery-adapter.js?v=4" defer><\/script>');
    document.write('<script src="./star-gate-interaction.js?v=recovery-v4" defer><\/script>');
    document.write('<script src="./star-gate-anomaly.js?v=recovery-v4" defer><\/script>');
  }
  document.write('<script src="./progress-resume.js?v=phase-2a-6c-garden"><\/script>');
  if (publicGardenResume) {
    document.write('<script src="./garden-resume.js?v=phase-2a-6c-garden"><\/script>');
    document.write('<script src="./garden-public-continue.js?v=phase-2a-6c-garden"><\/script>');
    document.write('<script src="./garden-public-bootstrap.js?v=phase-2a-6c-garden"><\/script>');
  } else {
    document.write(gardenResume
      ? '<script src="./garden-resume.js?v=phase-2a-5c-1"><\/script>'
      : '<script src="./landing-resume.js?v=phase-2a-5c-2"><\/script>');
  }
})();
