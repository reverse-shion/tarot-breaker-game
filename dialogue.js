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
      { type: "approach", actor: "shion", target: "shiopon", distance: 50, duration: 260 },
      face("shion", "gate"),
      wait(180),
      say("shion", "……やっぱり、ここもおかしい。"),

      face("shiopon", "shion"),
      say("shiopon", "シオンさま？"),

      face("shion", "gate"),
      say("shion", "アレノンだけじゃない。ここの共鳴も、いつもと違う。"),

      face("shiopon", "gate"),
      wait(220),
      say("shiopon", "……うん。"),

      face("shion", "shiopon"),
      say("shion", "しおぽんも感じてた？"),

      face("shiopon", "gate"),
      say("shiopon", "星の声がね、遠いの。"),

      face("shion", "shiopon"),
      say("shion", "遠い……？"),

      face("shiopon", "gate"),
      wait(180),
      say("shiopon", "いつもなら、もっと近くで聞こえるの。でも今日は、呼んでも向こうにいるみたいで……。"),

      face("shion", "gate"),
      wait(300),
      say("shion", "……アレノンでは、パメラの共鳴まで乱れてた。"),

      face("shiopon", "shion"),
      say("shiopon", "パメラが？"),

      face("shion", "shiopon"),
      say("shion", "まだ原因は分からない。でも、別々の異変だとは思わない方がいい。"),

      face("shiopon", "flower"),
      wait(180),
      say("shiopon", "この子もね、さっきから変なの。"),

      face("shion", "flower"),
      say("shion", "花が？"),

      face("shiopon", "flower"),
      say("shiopon", "うん。いつもはいっぱいおしゃべりするのに……今日は何も話さないの。"),

      face("shion", "shiopon"),
      say("shion", "話さない？"),

      face("shiopon", "flower"),
      wait(220),
      say("shiopon", "うん。怖がってるみたいなの。"),

      face("shion", "flower"),
      wait(420),
      say("shion", "……。"),

      face("shiopon", "shion"),
      say("shiopon", "シオンさま？"),

      face("shion", "gate"),
      say("shion", "リュミエールは？"),

      face("shiopon", "gate"),
      say("shiopon", "星門のところにいるの。"),

      face("shion", "gate"),
      { type: "step", actor: "shion", direction: "up", distance: 8, duration: 150 },
      say("shion", "急ごう。"),

      face("shiopon", "shion"),
      bounce(5, 250),
      say("shiopon", "うん！"),

      wait(220),
      say("shiopon", "……でもシオンさま。"),

      face("shion", "shiopon"),
      say("shion", "なに？"),

      bounce(7, 300),
      say("shiopon", "走ったら、しおぽんの方が速いの！"),

      say("shion", "今それ競うところ？"),

      face("shiopon", "gate"),
      say("shiopon", "だって急ぐんでしょ？"),

      face("shion", "gate"),
      say("shion", "そうだけど……転ぶなよ。"),

      signal("tarot-breaker:shiopon-race-start"),
      wait(180),
      say("shiopon", "転ばないの〜！"),

      wait(260),
      signal("tarot-breaker:shiopon-trip"),
      wait(220),
      say("shiopon", "ぴゃっ！"),

      face("shion", "shiopon"),
      wait(180),
      say("shion", "……ほら。"),

      signal("tarot-breaker:shiopon-recover"),
      face("shiopon", "shion"),
      say("shiopon", "今のは転んでないの！"),

      face("shion", "gate"),
      say("shion", "はいはい。先行くぞ。"),

      face("shiopon", "gate"),
      bounce(5, 260),
      say("shiopon", "待ってなの〜！"),
    ],

    lumiereGate: [
      { type: "approach", actor: "shion", target: "lumiere", distance: 54, duration: 700 },
      face("shiopon", "lumiere"),
      bounce(7, 320),
      say("shiopon", "リュミエール〜！"),

      wait(240),
      face("lumiere", "shiopon"),
      say("lumiere", "……しおぽん様。シオン様も。"),

      face("shion", "lumiere"),
      say("shion", "リュミエール、星門を見てた？"),

      face("lumiere", "shion"),
      say("lumiere", "はい。"),

      face("shion", "lumiere"),
      say("shion", "何か変化は？"),

      face("lumiere", "gate"),
      wait(360),
      say("lumiere", "……あります。"),

      face("shiopon", "lumiere"),
      say("shiopon", "やっぱりなの？"),

      face("lumiere", "gate"),
      say("lumiere", "光が弱い、というのとは少し違います。"),

      face("shion", "lumiere"),
      say("shion", "じゃあ？"),

      face("lumiere", "gate"),
      wait(260),
      say("lumiere", "揺れています。一定だった共鳴が、僅かにずれているように。"),

      face("shion", "gate"),
      wait(300),
      say("shion", "……アレノンと同じだ。"),

      face("lumiere", "shion"),
      say("lumiere", "アレノンでも？"),

      face("shion", "lumiere"),
      say("shion", "パメラの共鳴が乱れた。今までに見たことのない挙動だった。"),

      face("lumiere", "gate"),
      wait(420),
      say("lumiere", "……。"),

      face("shiopon", "lumiere"),
      say("shiopon", "それでね、星の声も遠いの。"),

      face("lumiere", "shiopon"),
      say("lumiere", "星の声まで……。"),

      face("shion", "gate"),
      wait(220),
      say("shion", "ここまで重なるなら、偶然とは考えにくい。"),

      face("lumiere", "gate"),
      say("lumiere", "では、星門に何か――"),

      face("shion", "lumiere"),
      say("shion", "まだ決めつけない方がいい。"),

      face("lumiere", "shion"),
      wait(180),
      say("lumiere", "……はい。"),

      face("shion", "gate"),
      say("shion", "異変がある。それは確かだ。"),
      wait(150),
      say("shion", "でも、何が起きてるのかはまだ分からない。"),
      wait(150),
      say("shion", "だから、これから確かめる。"),

      face("shiopon", "gate"),
      say("shiopon", "星門に触るの？"),

      face("shion", "gate"),
      say("shion", "触れてみる。何か反応があるかもしれない。"),

      face("lumiere", "shion"),
      say("lumiere", "危険かもしれません。"),

      face("shion", "lumiere"),
      say("shion", "分かってる。"),

      face("shion", "gate"),
      wait(180),
      say("shion", "だからこそ、このままにはしておけない。"),

      face("shiopon", "shion"),
      say("shiopon", "しおぽんも行くの。"),

      face("shion", "shiopon"),
      say("shion", "離れるなよ。"),

      bounce(5, 250),
      say("shiopon", "うん！"),

      face("lumiere", "shion"),
      say("lumiere", "私も、ご一緒します。"),

      face("shion", "gate"),
      say("shion", "……行こう。"),

      face("lumiere", "gate"),
      say("lumiere", "はい。"),

      face("shiopon", "gate"),
      bounce(5, 240),
      say("shiopon", "星門さん、ちゃんと返事するの〜！"),

      face("shion", "shiopon"),
      say("shion", "返事されたら、それはそれで怖いけどな。"),

      face("shiopon", "shion"),
      bounce(8, 280),
      say("shiopon", "ぴょん？！"),

      face("lumiere", "gate"),
      wait(220),
      say("lumiere", "……私も、少し怖いです。"),

      face("shion", "lumiere"),
      say("shion", "リュミエールまで？"),

      face("lumiere", "gate"),
      say("lumiere", "星門が言葉を返したら、それはもう“いつもの星門”ではありませんから。"),

      face("shion", "gate"),
      wait(200),
      say("shion", "……そうだね。"),

      face("shiopon", "shion"),
      say("shiopon", "じゃあ、返事しないでほしいの？"),

      face("shion", "gate"),
      say("shion", "分からない。今は、何が起きてるのか確かめる。"),
      wait(160),
      say("shion", "きっと、そこから何か分かるはずさ。"),

      face("shiopon", "shion"),
      say("shiopon", "怖くないの？"),

      face("shion", "shiopon"),
      say("shion", "怖いさ。"),

      face("shion", "gate"),
      wait(180),
      say("shion", "でも、感情と事実は混ぜない方がいいのさ。"),

      face("lumiere", "shion"),
      wait(260),
      say("lumiere", "……怖いから危険だと決めつけるのではなく、まず確かめる。"),

      wait(260),
      face("lumiere", "shion"),
      say("lumiere", "……すみません。少し、出すぎたことを言いました。"),

      face("shion", "lumiere"),
      say("shion", "気にしなくていい。今の整理で合ってる。"),

      face("shion", "gate"),
      face("lumiere", "gate"),
      face("shiopon", "gate"),
      wait(220),
      say("shion", "……行こう。"),

      { type: "step", actor: "shion", direction: "up", distance: 10, duration: 180 },
      { type: "step", actor: "lumiere", direction: "up", distance: 8, duration: 180 },
      say("lumiere", "はい。"),

      bounce(6, 280),
      { type: "step", actor: "shiopon", direction: "up", distance: 12, duration: 200 },
      say("shiopon", "行くの！"),
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
  };

  let playbackToken = 0;
  let currentAction = null;
  let dialogueUi = null;

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function makeUi() {
    const shell = document.getElementById("game-shell");
    if (!shell) return;

    if (!dialogueUi) {
      if (!window.TarotDialogueUI?.create) {
        throw new Error("Shared dialogue runtime is not loaded");
      }
      dialogueUi = window.TarotDialogueUI.create({
        mount: shell,
        ids: {
          layer: "dialogue-layer",
          advance: "dialogue-advance",
          speaker: "dialogue-speaker",
          text: "dialogue-text",
        },
        onAdvance: () => advance(),
      });
    }

  }

  function setUiState(next) {
    dialogueUi?.setState(next);
    const button = document.getElementById("dialogue-advance");
    if (button) {
      button.setAttribute(
        "aria-label",
        next === "acting" ? "会話演出を早送りする" : "会話を進める",
      );
    }
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
    makeUi();
    dialogueUi?.show({
      speaker,
      text: command.text,
      actor: command.actor,
    });
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
    dialogueUi?.hide();

    if (completed === "shioponMeet") {
      window.dispatchEvent(new Event("tarot-breaker:shiopon-recover"));
      story.shioponDone = true;
      story.joined = true;
      window.dispatchEvent(new Event("tarot-breaker:shiopon-follow-start"));
    } else if (completed === "lumiereGate") {
      story.lumiereDone = true;
    }

    window.dispatchEvent(new Event("tarot-breaker:interaction-end"));
    document.getElementById("game")?.focus?.({ preventScroll: true });
  }

  function advance() {
    if (!story.active) return;

    // Same rule as the prologue: first input while characters are appearing
    // reveals the whole line; the next input advances.
    if (story.mode === "dialogue" && dialogueUi?.isTyping()) {
      dialogueUi.revealAll();
      return;
    }

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
    const layer = document.getElementById("dialogue-layer");
    if (layer) {
      layer.hidden = true;
      layer.dataset.state = "idle";
    }
  }

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
