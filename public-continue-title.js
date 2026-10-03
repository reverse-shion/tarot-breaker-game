/* Title-only UI. No Progress writes and no fallback to normal start. */
(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.has("from") || params.has("dev")) return;
  const button = document.getElementById("continue");
  const note = document.getElementById("continue-note");
  const start = document.getElementById("start");
  let departing = false;
  let previousStartDisabled = null;
  if (!button || !note) return;
  const navigateRuntime = url => {
    if (window.TarotRuntimeEntry?.navigate) {
      const result = window.TarotRuntimeEntry.navigate(url);
      if (!result?.ok) throw new Error(result?.reason || "runtime-entry-failed");
      return;
    }
    location.href = url;
  };
  let controller = window.TarotPublicContinue.createController({navigate:navigateRuntime});
  const labels = {valid:"最後に保存された地点から再開します", none:"保存データがありません", invalid:"保存データを確認できません", unsupported:"この保存形式には対応していません", preparing:"この保存地点の再開は準備中です", unavailable:"保存データを読み込めません", "navigation-failed":"起動できませんでした。再試行してください", busy:"起動中…"};
  function render(result) { button.disabled = !result.ok && result.status !== "navigation-failed"; note.textContent = labels[result.status] || labels.unavailable; }
  render(controller.inspect());
  start?.addEventListener("click", () => { departing = true; button.disabled = true; });
  button.addEventListener("click", event => {
    event.stopPropagation();
    if (departing) return;
    const result = controller.launch();
    render(result);
    if (result.ok) { window.dispatchEvent(new CustomEvent("tarot-breaker:public-continue-request")); departing = true; button.disabled = true; if (start) { previousStartDisabled = start.disabled; start.disabled = true; } }
  });
  window.addEventListener("pageshow", () => {
    departing = false;
    if (start && previousStartDisabled !== null) { start.disabled = previousStartDisabled; previousStartDisabled = null; }
    controller = window.TarotPublicContinue.createController({navigate:navigateRuntime});
    render(controller.inspect());
  });
  window.addEventListener("storage", () => { if (!departing) render(controller.inspect()); });
})();
