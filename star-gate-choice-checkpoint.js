(() => {
  "use strict";
  const id = new URLSearchParams(location.search).get("dev");
  if (!["star-gate-choice","star-gate-camera","star-gate-full"].includes(id)) return;
  window.__TAROT_DEV_STAR_GATE_ANOMALY__ = true;
  window.__TAROT_DEV_STAR_GATE_CHOICE__ = true;
  document.documentElement.dataset.devHarness = id;
  document.body.dataset.enteringFromLanding = "true";
  document.body.dataset.devEntry = id;

  // Session-only prerequisites. Never write Progress/localStorage.
  window.TarotJourney?.set("gardenStory", { shioponDone: true, lumiereDone: true, joined: true });
  window.TarotJourney?.set("companion", { mode: "following" });

  const addCss = (href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = href; link.dataset.devOnly = id;
    document.head.appendChild(link);
  };
  const addScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src; script.dataset.devOnly = id;
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
  addCss("./star-gate-interaction.css?v=choice-sandbox-1");
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await addScript("./star-gate-interaction.js?v=choice-sandbox-1");
      if (id === "star-gate-camera") await addScript("./star-gate-camera-checkpoint.js?v=camera-sandbox-1");
      if (id === "star-gate-full") {
        addCss("./star-gate-anomaly.css?v=inner-light-unclipped-150-v2");
        await addScript("./star-gate-anomaly.js?v=full-sandbox-2");
      }
    } catch (error) {
      console.error("[Star Gate Choice Checkpoint] runtime load failed", error);
    }
  }, { once: true });
})();
