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
  if (!landingTransit && !gardenResume) return;
  document.write('<script src="./dev-checkpoints.js?v=phase-2a-5c-1"><\/script>');
  document.write('<script src="./progress-resume.js?v=phase-2a-5c-1"><\/script>');
  document.write(gardenResume
    ? '<script src="./garden-resume.js?v=phase-2a-5c-1"><\/script>'
    : '<script src="./landing-resume.js?v=phase-2a-5c-2"><\/script>');
})();
