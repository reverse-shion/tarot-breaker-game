(() => {
  "use strict";

  if (window.TarotDialogueUI) return;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function buildChars(textEl, text) {
    textEl.replaceChildren();
    const fragment = document.createDocumentFragment();
    const nodes = [];

    for (const ch of [...text]) {
      const span = document.createElement("span");
      span.className = "tb-dialogue-char";
      span.textContent = ch === " " ? "\u00a0" : ch;
      fragment.appendChild(span);
      nodes.push(span);
    }

    textEl.appendChild(fragment);
    return nodes;
  }

  function pauseFor(ch) {
    if (/[。！？!?]/.test(ch)) return 120;
    if (/[、，,…]/.test(ch)) return 72;
    return 34;
  }

  function createElements(mount, ids = {}) {
    const layer = document.createElement("section");
    layer.id = ids.layer || "dialogue-layer";
    layer.className = "tb-dialogue-layer";
    layer.hidden = true;
    layer.dataset.state = "idle";
    layer.setAttribute("aria-live", "polite");

    const button = document.createElement("button");
    button.id = ids.advance || "dialogue-advance";
    button.className = "tb-dialogue-window";
    button.type = "button";
    button.setAttribute("aria-label", "会話を進める");

    const speaker = document.createElement("span");
    speaker.id = ids.speaker || "dialogue-speaker";
    speaker.className = "tb-dialogue-speaker";

    const text = document.createElement("span");
    text.id = ids.text || "dialogue-text";
    text.className = "tb-dialogue-text";

    const next = document.createElement("span");
    next.className = "tb-dialogue-next";
    next.setAttribute("aria-hidden", "true");
    next.textContent = "▼";

    button.append(speaker, text, next);
    layer.appendChild(button);
    mount.appendChild(layer);

    return { layer, button, speaker, text, next };
  }

  function bindElements({ layer, button, speaker, text, next }) {
    if (!layer || !button || !speaker || !text || !next) {
      throw new Error("TarotDialogueUI: required dialogue elements are missing");
    }

    layer.classList.add("tb-dialogue-layer");
    button.classList.add("tb-dialogue-window");
    speaker.classList.add("tb-dialogue-speaker");
    text.classList.add("tb-dialogue-text");
    next.classList.add("tb-dialogue-next");

    return { layer, button, speaker, text, next };
  }

  function makeController(elements, options = {}) {
    const { layer, button, speaker, text, next } = elements;
    let chars = [];
    let token = 0;
    let complete = false;
    let active = false;
    let destroyed = false;
    let advanceHandler =
      typeof options.onAdvance === "function" ? options.onAdvance : null;

    function revealAll() {
      token += 1;
      for (const node of chars) node.classList.add("revealed");
      complete = true;
      next.classList.add("visible");
      layer.dataset.state = "dialogue";
      return true;
    }

    async function typeLine(fullText, currentToken) {
      const source = [...fullText];
      const instant =
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      if (instant) {
        revealAll();
        return;
      }

      for (let i = 0; i < source.length; i += 1) {
        if (destroyed || !active || currentToken !== token || complete) return;
        chars[i]?.classList.add("revealed");
        await sleep(pauseFor(source[i]));
      }

      if (destroyed || !active || currentToken !== token) return;
      for (const node of chars) node.classList.add("revealed");
      complete = true;
      next.classList.add("visible");
      layer.dataset.state = "dialogue";
    }

    function show({ speaker: speakerName = "", text: fullText = "", actor = "" } = {}) {
      token += 1;
      active = true;
      complete = false;
      speaker.textContent = speakerName;
      chars = buildChars(text, String(fullText));
      next.classList.remove("visible");
      layer.dataset.state = "dialogue";
      layer.dataset.speaker = speakerName;
      layer.dataset.actor = actor || "";
      layer.hidden = false;

      const currentToken = token;
      requestAnimationFrame(() => {
        if (!active || destroyed || currentToken !== token) return;
        layer.classList.add("visible");
        button.classList.add("visible");
      });

      typeLine(String(fullText), currentToken);
      return currentToken;
    }

    function hide() {
      token += 1;
      active = false;
      complete = false;
      chars = [];
      next.classList.remove("visible");
      layer.classList.remove("visible");
      button.classList.remove("visible");
      layer.dataset.state = "idle";
      layer.hidden = true;
    }

    function setState(state = "dialogue") {
      layer.dataset.state = state;
      button.setAttribute("aria-label", state === "acting" ? "会話演出を早送りする" : "会話を進める");
      if (state === "acting") next.classList.remove("visible");
    }

    function setAdvanceHandler(handler) {
      advanceHandler = typeof handler === "function" ? handler : null;
    }

    function handleAdvance(event) {
      if (!active) return false;
      if (event) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }

      if (!complete) {
        revealAll();
        return true;
      }

      next.classList.remove("visible");
      advanceHandler?.();
      return true;
    }

    function onPointer(event) {
      handleAdvance(event);
    }

    function onKey(event) {
      if (!active) return;
      if (!["Enter", " ", "Spacebar"].includes(event.key)) return;
      handleAdvance(event);
    }

    button.addEventListener("click", onPointer);
    window.addEventListener("keydown", onKey, { passive: false });

    return Object.freeze({
      show,
      hide,
      revealAll,
      handleAdvance,
      setState,
      setAdvanceHandler,
      isActive: () => active,
      isComplete: () => complete,
      isTyping: () => active && !complete,
      elements: Object.freeze({ layer, button, speaker, text, next }),
      destroy() {
        destroyed = true;
        token += 1;
        button.removeEventListener("click", onPointer);
        window.removeEventListener("keydown", onKey);
      },
    });
  }

  function create(options = {}) {
    const mount = options.mount || document.body;
    const elements = createElements(mount, options.ids || {});
    return makeController(elements, options);
  }

  function bind(options = {}) {
    const elements = bindElements({
      layer: options.layer,
      button: options.button || options.layer,
      speaker: options.speaker,
      text: options.text,
      next: options.next,
    });
    return makeController(elements, options);
  }

  window.TarotDialogueUI = Object.freeze({
    version: "1.1.0",
    create,
    bind,
  });
})();
