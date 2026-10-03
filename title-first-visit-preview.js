(() => {
  "use strict";
  if (window.__TAROT_BREAKER_FIRST_VISIT_PREVIEW__ !== true) return;
  // Mark this visual-only page so the production title controller keeps its exact contract untouched.
  history.replaceState(null, "", location.pathname + "?dev=title-first-visit-preview");

  const screen = document.getElementById("start-screen");
  const continueButton = document.getElementById("continue");
  const startButton = document.getElementById("start");
  if (!screen || !continueButton || !startButton) return;

  // Visual-only developer preview. Never reads, writes, clears, or migrates save data.
  screen.dataset.titleMode = "new";
  continueButton.hidden = true;
  continueButton.disabled = true;
  startButton.disabled = true;
  startButton.setAttribute("aria-label", "物語をはじめる");

  const jp = startButton.querySelector(".title-screen__choice-jp");
  const en = startButton.querySelector(".title-screen__choice-en");
  if (jp) jp.textContent = "物語をはじめる";
  if (en) en.textContent = "BEGIN";
})();
