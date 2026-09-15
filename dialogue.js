(() => {
  "use strict";

  const SHIOPON_HOME = { x: 810, y: 800 };
  const LUMIERE_HOME = { x: 810, y: 212 };
  const TRIGGERS = { shiopon: 62, lumiere: 70 };
  const ACTOR_NAMES = Object.freeze({
    shion: "シオン",
    shiopon: "しおぽん",
    lumiere: "リュミエール",
  });

  const say = (actor, text) => ({ type: "dialogue", actor, text });
  const face = (actor, target) => ({ type: "face", actor, target });
  const wait = (duration) => ({ type: "wait", duration });
  const bounce = (height = 7, duration = 320) => ({
    type: "bounce",
    actor: "shiopon",
    height,
    duration,
  });
  const signal = (name, detail) => ({ type: "signal", name, detail });

  // Dialogue and blocking are authored together. Adding a look, step or pause no
  // longer requires a line-number condition in the runtime.
  const events = {
    shioponMeet: [
      face("shiopon", "flower"),
      { type: "approach", actor: "shion", target: "shiopon", distance: 48, duration: 260 },
      say("shion", "しおぽん、何してるんだ？"),
      wait(220),
      face("shiopon", "shion"),
      say("shiopon", "しーっ！"),
      wait(180),
      face("shiopon", "flower"),
      say(
        "shiopon",
        "今ね、この子の声を聞いてるところなの。\n今日はいつもより、よくおしゃべりしてるの！",
      ),
      face("shion", "flower"),
      wait(200),
      say("shion", "この子って……花？"),
      face("shiopon", "shion"),
      bounce(6, 300),
      say("shiopon", "そうなの！"),
      face("shiopon", "flower"),
      say(
        "shiopon",
        "“今日は光がきれい”って。\nそれからね、“風がやさしい”って言ってるの。",
      ),
      face("shion", "flower"),
      wait(420),
      say("shion", "……お前には、そんなふうに聞こえるんだな。"),
      wait(480),
      face("shiopon", "shion"),
      say("shiopon", "うん。でもね……"),
      wait(560),
      face("shiopon", "gate"),
      say("shiopon", "今日は、ちょっとだけ変なの。"),
      face("shion", "shiopon"),
      say("shion", "変？"),
      face("shiopon", "gate"),
      wait(380),
      say(
        "shiopon",
        "星の声がね、いつもより遠いの。\nいつもなら、もっと近くで聞こえるのに。",
      ),
      face("shion", "gate"),
      wait(440),
      say("shion", "遠い、か……。"),
      face("shion", "shiopon"),
      say("shion", "ほら、行こう。\nリュミエールにも聞いてみよう。"),
      face("shiopon", "shion"),
      bounce(7, 330),
      say("shiopon", "あっ、星門？\nじゃあ、しおぽんも行く！"),
      say("shion", "やっぱり。\nオレを待ってたんじゃないの？"),
      wait(420),
      face("shiopon", "flower"),
      say("shiopon", "べ、別に待ってないの！"),
      say("shion", "はいはい。"),
      face("shiopon", "shion"),
      bounce(5, 280),
      say("shiopon", "その言い方、ずるいの〜！"),
      wait(220),
      say("shiopon", "よーし！\nリュミエールのところまで競争なの！"),
      say("shion", "え？"),
      face("shiopon", "gate"),
      signal("tarot-breaker:shiopon-race-start"),
      wait(180),
      say("shiopon", "早い者勝ちなの〜！"),
      say("shion", "ちょ、待って。\n急に始めるの、ずるいぞ？"),
      say("shion", "転ぶなよー！"),
      say("shiopon", "転ばないの〜！"),
      signal("tarot-breaker:shiopon-trip"),
      wait(240),
      say("shiopon", "ぴゃっ！"),
      say("shion", "ほら。"),
      signal("tarot-breaker:shiopon-recover"),
      face("shiopon", "shion"),
      say("shiopon", "今のは転んでないの！"),
      say("shion", "はいはい。"),
    ],
    lumiereGate: [
      face("shiopon", "lumiere"),
      bounce(7, 330),
      say("shiopon", "リュミエール〜！"),
      wait(260),
      face("lumiere", "shiopon"),
      say("lumiere", "……あ。\nしおぽん様。シオン様も。"),
      face("shion", "lumiere"),
      say("shion", "待たせた？"),
      face("lumiere", "shion"),
      say(
        "lumiere",
        "いいえ。\n私も、少し考えごとをしていました。",
      ),
      face("shiopon", "lumiere"),
      say("shiopon", "また考えごとなの？\nちゃんと戻ってきた？"),
      wait(300),
      face("lumiere", "shiopon"),
      say("lumiere", "はい。\n今、戻りました。"),
      say("shion", "ならよかった。"),
      face("shiopon", "gate"),
      say("shiopon", "ねえ、リュミエール。\n今日の星門、何か違う？"),
      wait(520),
      face("lumiere", "gate"),
      say(
        "lumiere",
        "……。\n私も、少し気になっていました。",
      ),
      face("shion", "gate"),
      say("shion", "何かあった？"),
      say(
        "lumiere",
        "何かあった、と言えるほどではないのですが……。\n光が、いつもより……。",
      ),
      wait(620),
      face("lumiere", "shion"),
      say(
        "lumiere",
        "……いえ。弱い、とは少し違います。\n揺れているように見えるんです。",
      ),
      face("shion", "gate"),
      wait(320),
      say("shion", "揺れてる……。"),
      face("shiopon", "gate"),
      say("shiopon", "やっぱり、ちょっと変なの。"),
      face("shion", "shiopon"),
      say("shion", "しおぽんも感じた？"),
      say(
        "shiopon",
        "うん。さっきからね、星の声が遠いの。\nいつもなら、もっと近いのに。",
      ),
      face("lumiere", "shiopon"),
      wait(420),
      say("lumiere", "遠い……。\nでしたら、すぐに――"),
      wait(560),
      face("lumiere", "shion"),
      say(
        "lumiere",
        "……すみません。今のは、少し先を言いすぎました。\nまだ、何も分かっていませんから。",
      ),
      face("shion", "lumiere"),
      say("shion", "うん。今は、決めなくていい。\nまず確かめよう。"),
      wait(260),
      face("lumiere", "gate"),
      say("lumiere", "……そうですね。"),
      face("shiopon", "gate"),
      say("shiopon", "しおぽん、もうちょっと近くで聞いてみたいの。"),
      say("shion", "そっか。\nじゃあ、まずは見てみよう。"),
      face("shiopon", "lumiere"),
      bounce(6, 300),
      say("shiopon", "リュミエールも行くの！"),
      face("lumiere", "shiopon"),
      say("lumiere", "私も……。"),
      say("shiopon", "置いてっちゃうよ〜？"),
      wait(280),
      say(
        "lumiere",
        "それは困ります。\n……また、考えすぎるところでした。",
      ),
      face("shion", "gate"),
      say("shion", "じゃ、行こう。"),
      face("shiopon", "gate"),
      face("lumiere", "gate"),
      { type: "step", actor: "shion", direction: "up", distance: 10, duration: 180 },
      { type: "step", actor: "shiopon", direction: "up", distance: 14, duration: 220 },
      say("lumiere", "はい。"),
      bounce(6, 300),
      say("shiopon", "キラキラ〜☆を探しに行くの！"),
      say("shion", "何を探すのか、まだ分かってないだろ。"),
      say("shiopon", "まだ分かってないの！"),
      wait(260),
      face("lumiere", "shiopon"),
      say("lumiere", "……ふふ。"),
      face("lumiere", "gate"),
    ],
  };

  // Kept as a read-only dialogue-only view for tooling that still inspects the
  // approved lines. Runtime playback uses events above.
  const scripts = Object.fromEntries(
    Object.entries(events).map(([eventId, sequence]) => [
      eventId,
      sequence
        .filter((command) => command.type === "dialogue")
        .map((command) => [ACTOR_NAMES[command.actor], command.text]),
    ]),
  );

  const story = {
    active: false,
    eventId: null,
    stepIndex: 0,
    lineIndex: -1,
    mode: "idle",
    actionType: null,
    shioponDone: false,
    lumiereDone: false,
    joined: false,
    player: { x: 724, y: 1015 },
    objective: "",
  };

  let playbackToken = 0;
  let currentAction = null;

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function makeUi() {
    const shell = document.getElementById("game-shell");
    if (!shell || document.getElementById("dialogue-layer")) return;

    const dialogue = document.createElement("section");
    dialogue.id = "dialogue-layer";
    dialogue.className = "dialogue-layer";
    dialogue.hidden = true;
    dialogue.dataset.state = "idle";
    dialogue.setAttribute("aria-live", "polite");
    dialogue.innerHTML = `
      <button id="dialogue-advance" class="dialogue-box" type="button" aria-label="会話を進める">
        <span id="dialogue-speaker" class="dialogue-speaker"></span>
        <span id="dialogue-text" class="dialogue-text"></span>
        <span class="dialogue-next" aria-hidden="true">▼</span>
      </button>`;
    shell.appendChild(dialogue);

    const objective = document.createElement("aside");
    objective.id = "story-objective";
    objective.className = "story-objective";
    objective.hidden = true;
    shell.appendChild(objective);

    document.getElementById("dialogue-advance").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      advance();
    });
  }

  function setUiState(next) {
    const layer = document.getElementById("dialogue-layer");
    const button = document.getElementById("dialogue-advance");
    if (layer) layer.dataset.state = next;
    if (button) {
      button.setAttribute(
        "aria-label",
        next === "acting" ? "会話演出を早送りする" : "会話を進める",
      );
    }
  }

  function showObjective(text) {
    story.objective = text;
    const el = document.getElementById("story-objective");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  function makeTimerAction(duration) {
    let settled = false;
    let timer = null;
    let resolveAction;
    const promise = new Promise((resolve) => {
      resolveAction = resolve;
      timer = setTimeout(() => settle(false), Math.max(0, duration || 0));
    });
    function settle(skipped) {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      resolveAction({ skipped });
    }
    return {
      promise,
      finish: () => settle(true),
      cancel: () => settle(true),
    };
  }

  function immediateAction() {
    return {
      promise: Promise.resolve({ skipped: false }),
      finish() {},
      cancel() {},
    };
  }

  function executeCommand(command) {
    if (command.type === "wait") return makeTimerAction(command.duration);

    if (command.type === "signal") {
      window.dispatchEvent(
        new CustomEvent(command.name, { detail: command.detail }),
      );
      return immediateAction();
    }

    const stageAction = window.TarotStage?.perform?.(command);
    if (stageAction?.promise) return stageAction;
    return immediateAction();
  }

  function renderDialogue(command) {
    const speaker = ACTOR_NAMES[command.actor] || command.actor;
    const layer = document.getElementById("dialogue-layer");
    const speakerEl = document.getElementById("dialogue-speaker");
    const textEl = document.getElementById("dialogue-text");
    if (!layer || !speakerEl || !textEl) return;

    speakerEl.textContent = speaker;
    textEl.textContent = command.text;
    layer.dataset.speaker = speaker;
    layer.dataset.actor = command.actor;
    layer.hidden = false;
    story.mode = "dialogue";
    story.actionType = null;
    story.lineIndex += 1;
    setUiState("dialogue");
  }

  async function playUntilDialogue(token) {
    const sequence = events[story.eventId];
    if (!sequence) return;

    while (story.active && token === playbackToken) {
      if (story.stepIndex >= sequence.length) {
        finishEvent(token);
        return;
      }

      const command = sequence[story.stepIndex++];
      if (command.type === "dialogue") {
        renderDialogue(command);
        return;
      }

      story.mode = "action";
      story.actionType = command.type;
      setUiState("acting");
      const action = executeCommand(command);
      currentAction = action;
      await action.promise;
      if (!story.active || token !== playbackToken) return;
      if (currentAction === action) currentAction = null;
    }
  }

  function startEvent(eventId) {
    if (story.active || !events[eventId]) return;
    makeUi();
    story.active = true;
    story.eventId = eventId;
    story.stepIndex = 0;
    story.lineIndex = -1;
    story.mode = "opening";
    story.actionType = null;
    playbackToken += 1;
    document.getElementById("guide")?.setAttribute("hidden", "");
    window.dispatchEvent(new Event("tarot-breaker:interaction-start"));
    playUntilDialogue(playbackToken);
    queueMicrotask(() =>
      document.getElementById("dialogue-advance")?.focus({ preventScroll: true }),
    );
  }

  function finishEvent(token = playbackToken) {
    if (!story.active || token !== playbackToken) return;
    const completed = story.eventId;
    story.active = false;
    story.eventId = null;
    story.stepIndex = 0;
    story.lineIndex = -1;
    story.mode = "idle";
    story.actionType = null;
    currentAction = null;
    const layer = document.getElementById("dialogue-layer");
    if (layer) {
      layer.hidden = true;
      layer.dataset.state = "idle";
    }

    if (completed === "shioponMeet") {
      window.dispatchEvent(new Event("tarot-breaker:shiopon-recover"));
      story.shioponDone = true;
      story.joined = true;
      showObjective("星門へ向かう");
      window.dispatchEvent(new Event("tarot-breaker:shiopon-follow-start"));
    } else if (completed === "lumiereGate") {
      story.lumiereDone = true;
      showObjective("星門の様子を確かめる");
    }

    window.dispatchEvent(new Event("tarot-breaker:interaction-end"));
    document.getElementById("game")?.focus?.({ preventScroll: true });
  }

  function advance() {
    if (!story.active) return;
    if (story.mode === "action") {
      currentAction?.finish?.();
      return;
    }
    if (story.mode !== "dialogue") return;
    story.mode = "transition";
    setUiState("acting");
    playUntilDialogue(playbackToken);
  }

  function observePlayer(next) {
    story.player.x = next.x;
    story.player.y = next.y;
    if (story.active) return;

    if (!story.shioponDone && distance(story.player, SHIOPON_HOME) <= TRIGGERS.shiopon) {
      startEvent("shioponMeet");
      return;
    }
    if (
      story.joined &&
      !story.lumiereDone &&
      distance(story.player, LUMIERE_HOME) <= TRIGGERS.lumiere
    ) {
      startEvent("lumiereGate");
    }
  }

  function installControlsObserver() {
    const api = window.TarotControls;
    if (!api?.createControls || api.__dialogueWrapped) return;
    const originalCreateControls = api.createControls;
    api.createControls = function (...args) {
      const controls = originalCreateControls.apply(this, args);
      const originalStep = controls.step;
      controls.step = function (position, dt, speed) {
        const next = originalStep.call(this, position, dt, speed);
        observePlayer(next);
        return next;
      };
      return controls;
    };
    api.__dialogueWrapped = true;
  }

  function resetStory() {
    playbackToken += 1;
    currentAction?.cancel?.();
    currentAction = null;
    if (story.active) window.dispatchEvent(new Event("tarot-breaker:interaction-end"));
    window.dispatchEvent(new Event("tarot-breaker:shiopon-follow-stop"));
    window.dispatchEvent(new Event("tarot-breaker:shiopon-recover"));
    story.active = false;
    story.eventId = null;
    story.stepIndex = 0;
    story.lineIndex = -1;
    story.mode = "idle";
    story.actionType = null;
    story.shioponDone = false;
    story.lumiereDone = false;
    story.joined = false;
    story.player = { x: 724, y: 1015 };
    story.objective = "";
    const layer = document.getElementById("dialogue-layer");
    const objective = document.getElementById("story-objective");
    if (layer) {
      layer.hidden = true;
      layer.dataset.state = "idle";
    }
    if (objective) objective.hidden = true;
  }

  window.addEventListener("keydown", (event) => {
    if (!story.active || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    advance();
  });

  installControlsObserver();
  makeUi();
  document.getElementById("reset")?.addEventListener("click", resetStory);

  window.TarotDialogue = {
    start: startEvent,
    advance,
    reset: resetStory,
    getState: () => JSON.parse(JSON.stringify(story)),
    events,
    scripts,
  };
})();
