/* Title-only UX. Reads durable Progress through Public Continue; never writes Progress itself. */
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  if (params.has("from") || params.has("dev") || params.has("entry") || params.get("titlePreview") === "first") return;

  const screen = document.getElementById("start-screen");
  const start = document.getElementById("start");
  const startJp = start?.querySelector(".title-screen__choice-jp");
  const startEn = start?.querySelector(".title-screen__choice-en");
  const button = document.getElementById("continue");
  const note = document.getElementById("continue-note");
  const retry = document.getElementById("title-retry");
  const confirm = document.getElementById("new-game-confirm");
  const confirmAccept = document.getElementById("new-game-confirm-accept");
  const confirmCancel = document.getElementById("new-game-confirm-cancel");

  if (!screen || !start || !startJp || !startEn || !button || !note || !retry ||
      !confirm || !confirmAccept || !confirmCancel || !window.TarotPublicContinue) return;

  let departing = false;
  let allowConfirmedStart = false;
  let transitionReadyStart = false;
  let previousStartDisabled = null;

  const labels = Object.freeze({
    invalid: "セーブデータを確認できませんでした",
    unsupported: "この保存形式には対応していません",
    preparing: "この保存地点の再開は準備中です",
    unavailable: "セーブデータを読み込めませんでした",
    "navigation-failed": "起動できませんでした。もう一度お試しください",
    busy: "起動中…",
  });

  const schedule = (fn, ms) => {
    if (typeof window.setTimeout === "function") return window.setTimeout(fn, ms);
    fn();
    return 0;
  };

  const navigateRuntime = url => {
    if (window.TarotRuntimeEntry?.navigate) {
      const result = window.TarotRuntimeEntry.navigate(url);
      if (!result?.ok) throw new Error(result?.reason || "runtime-entry-failed");
      return;
    }
    location.href = url;
  };

  let controller = window.TarotPublicContinue.createController({navigate: navigateRuntime});

  function setStartLabel(jp, en, action) {
    startJp.textContent = jp;
    startEn.textContent = en;
    start.dataset.titleAction = action;
    start.setAttribute("aria-label", jp);
  }

  function closeConfirm() {
    confirm.hidden = true;
    screen.classList.remove("title-screen--confirming");
    // Do not restore focus to the New Game choice after dismissing the modal.
    // iOS/WebKit can retain :focus-visible and draw a persistent pill outline.
  }

  function openConfirm() {
    confirm.hidden = false;
    screen.classList.add("title-screen--confirming");
    confirmCancel.focus?.({preventScroll: true});
  }

  function render(result) {
    const status = result?.status || "unavailable";
    note.textContent = "";

    if (result?.ok && status === "valid") {
      screen.dataset.titleMode = "continue";
      button.hidden = false;
      button.disabled = false;
      retry.hidden = true;
      retry.disabled = false;
      setStartLabel("はじめから", "NEW GAME", "new-game");
      return;
    }

    button.hidden = true;
    button.disabled = true;

    if (status === "none") {
      screen.dataset.titleMode = "new";
      retry.hidden = true;
      retry.disabled = false;
      setStartLabel("物語をはじめる", "BEGIN", "begin");
      return;
    }

    screen.dataset.titleMode = "error";
    retry.hidden = false;
    retry.disabled = false;
    note.textContent = labels[status] || labels.unavailable;
    setStartLabel("はじめから", "NEW GAME", "new-game");
  }

  function refresh() {
    controller = window.TarotPublicContinue.createController({navigate: navigateRuntime});
    function inspectTitleState() {
    if (titlePreview === "first") return {ok:false, status:"none"};
    return controller.inspect();
  }

  render(controller.inspect());
  }

  render(controller.inspect());

  start.addEventListener("click", event => {
    if (transitionReadyStart) {
      transitionReadyStart = false;
      allowConfirmedStart = false;
      departing = true;
      button.disabled = true;
      retry.disabled = true;
      closeConfirm();
      return;
    }

    if (departing) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (start.dataset.titleAction === "new-game" && !allowConfirmedStart) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openConfirm();
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    allowConfirmedStart = false;
    departing = true;
    button.disabled = true;
    retry.disabled = true;
    closeConfirm();
    screen.classList.add("title-screen--departing");
    start.classList.add("is-departing");

    schedule(() => {
      transitionReadyStart = true;
      departing = false;
      start.disabled = false;
      start.click();
    }, 240);
  }, true);

  button.addEventListener("click", event => {
    event.stopPropagation();
    if (departing) return;

    departing = true;
    button.disabled = true;
    retry.disabled = true;
    previousStartDisabled = start.disabled;
    start.disabled = true;
    screen.classList.add("title-screen--departing");
    button.classList.add("is-departing");

    schedule(() => {
      const result = controller.launch();
      if (!result.ok) {
        departing = false;
        screen.classList.remove("title-screen--departing");
        button.classList.remove("is-departing");
        if (previousStartDisabled !== null) {
          start.disabled = previousStartDisabled;
          previousStartDisabled = null;
        }
        retry.disabled = false;
        render(result);
        return;
      }
      window.dispatchEvent(new CustomEvent("tarot-breaker:public-continue-request"));
    }, 260);
  });

  retry.addEventListener("click", event => {
    event.stopPropagation();
    if (departing) return;
    note.textContent = "セーブデータを確認しています…";
    refresh();
  });

  confirmAccept.addEventListener("click", event => {
    event.stopPropagation();
    if (departing) return;
    allowConfirmedStart = true;
    closeConfirm();
    start.click();
  });

  confirmCancel.addEventListener("click", event => {
    event.stopPropagation();
    allowConfirmedStart = false;
    closeConfirm();
  });

  confirm.addEventListener("click", event => {
    if (event.target !== confirm) return;
    allowConfirmedStart = false;
    closeConfirm();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !confirm.hidden) {
      event.preventDefault();
      allowConfirmedStart = false;
      closeConfirm();
    }
  });

  window.addEventListener("pageshow", () => {
    departing = false;
    allowConfirmedStart = false;
    transitionReadyStart = false;
    closeConfirm();
    screen.classList.remove("title-screen--departing");
    button.classList.remove("is-departing");
    start.classList.remove("is-departing");
    if (previousStartDisabled !== null) {
      start.disabled = previousStartDisabled;
      previousStartDisabled = null;
    }
    refresh();
  });

  window.addEventListener("storage", () => {
    if (!departing && confirm.hidden) refresh();
  });
})();
