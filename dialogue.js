(() => {
  "use strict";

  const SHIOPON_HOME = { x: 810, y: 800 };
  const LUMIERE_HOME = { x: 810, y: 212 };
  const REF = { w: 1448, h: 1086 };
  const TRIGGERS = { shiopon: 62, lumiere: 70 };
  const FOLLOW_HIDE_RADIUS = 96;
  const FOLLOW_DISTANCE = 42;
  const FOLLOW_SPEED = 170;

  const scripts = {
    shioponMeet: [
      ["シオン", "しおぽん、何してるんだ？"],
      ["しおぽん", "しーっ！"],
      ["シオン", "え？"],
      ["しおぽん", "今ね、この子の声を聞いてるところなの。"],
      ["シオン", "この子って……花？"],
      ["しおぽん", "そうなの！"],
      ["しおぽん", "…………。"],
      ["シオン", "…………。"],
      ["しおぽん", "シオンさんまで聞かなくていいの！"],
      ["シオン", "いや、ちょっと気になって。"],
      ["しおぽん", "もう！　集中できないの〜！"],
      ["シオン", "ごめんごめん。"],
      ["しおぽん", "……よし！"],
      ["シオン", "で、何て言ってた？"],
      ["しおぽん", "今日も元気にキラキラ〜☆って！"],
      ["シオン", "ほんとに？"],
      ["しおぽん", "……たぶん！"],
      ["シオン", "たぶんなんだ。"],
      ["しおぽん", "お花の言葉は難しいの！"],
      ["シオン", "星の声はあんなに分かるのに。"],
      ["しおぽん", "星とお花は全然違うの！"],
      ["シオン", "へえ。"],
      ["しおぽん", "信じてない顔なの！"],
      ["シオン", "いや、信じてるよ。"],
      ["しおぽん", "ほんとに〜？"],
      ["シオン", "半分くらい。"],
      ["しおぽん", "半分なの！？"],
      ["しおぽん", "むぅ〜……。"],
      ["シオン", "ほら、行こう。リュミエールが待ってる。"],
      ["しおぽん", "あっ、星門？"],
      ["シオン", "そう。"],
      ["しおぽん", "じゃあ、しおぽんも行く！"],
      ["シオン", "やっぱり。"],
      ["しおぽん", "やっぱり？"],
      ["シオン", "オレを待ってたんじゃないの？"],
      ["しおぽん", "…………。"],
      ["シオン", "その顔は当たりだね。"],
      ["しおぽん", "べ、別に待ってないの！"],
      ["シオン", "はいはい。"],
      ["しおぽん", "その言い方ずるいの〜！"],
      ["しおぽん", "……シオンさん。"],
      ["シオン", "ん？"],
      ["しおぽん", "今日ね、星の声がちょっと変なの。"],
      ["シオン", "変？"],
      ["しおぽん", "うん……。"],
      ["しおぽん", "なんていうか……遠いの。"],
      ["シオン", "遠い、か……。"],
      ["しおぽん", "いつもなら、もっと近くで聞こえるのに。"],
      ["シオン", "そっか。"],
      ["シオン", "じゃあ、リュミエールにも聞いてみよう。"],
      ["しおぽん", "うん！"],
      ["しおぽん", "よーし！　じゃあ競争なの！"],
      ["シオン", "え？"],
      ["しおぽん", "リュミエールのところまで！"],
      ["シオン", "ちょ、待って。急に始めるのずるいぞ？"],
      ["しおぽん", "早い者勝ちなの〜！"],
      ["シオン", "はぁ……。"],
      ["シオン", "転ぶなよー！"],
      ["しおぽん", "転ばないの〜！"],
      ["しおぽん", "ぴゃっ！"],
      ["シオン", "ほら。"],
      ["しおぽん", "今のは転んでないの！"],
      ["シオン", "はいはい。"],
    ],
    lumiereGate: [
      ["しおぽん", "リュミエール〜！"],
      ["リュミエール", "……あ。"],
      ["リュミエール", "しおぽん様。"],
      ["リュミエール", "シオン様も。"],
      ["シオン", "待たせた？"],
      ["リュミエール", "いえ。"],
      ["リュミエール", "私も、少し考えごとをしていました。"],
      ["しおぽん", "また考えごとなの？"],
      ["リュミエール", "……また、ですね。"],
      ["しおぽん", "ちゃんと戻ってきた？"],
      ["リュミエール", "はい。"],
      ["リュミエール", "今、戻りました。"],
      ["シオン", "ならよかった。"],
      ["しおぽん", "ねえ、リュミエール。"],
      ["リュミエール", "はい、しおぽん様。"],
      ["しおぽん", "今日の星門、何か違う？"],
      ["リュミエール", "……。"],
      ["リュミエール", "私も、少し気になっていました。"],
      ["シオン", "何かあった？"],
      ["リュミエール", "何かあった、と言えるほどではないのですが……。"],
      ["リュミエール", "光が、いつもより……。"],
      ["リュミエール", "……いえ。"],
      ["シオン", "？"],
      ["リュミエール", "弱い、というのは少し違いますね。"],
      ["リュミエール", "揺れているように見えるんです。"],
      ["シオン", "揺れてる……。"],
      ["しおぽん", "やっぱり、ちょっと変なの。"],
      ["シオン", "しおぽんも感じた？"],
      ["しおぽん", "うん。"],
      ["しおぽん", "さっきからね。"],
      ["しおぽん", "星の声が、遠いの。"],
      ["リュミエール", "遠い……。"],
      ["しおぽん", "いつもなら、もっと近いの。"],
      ["しおぽん", "でも今日は……。"],
      ["しおぽん", "……やっぱり遠いの。"],
      ["リュミエール", "……そうですか。"],
      ["リュミエール", "でしたら、すぐに――"],
      ["リュミエール", "……すみません。"],
      ["シオン", "どうした？"],
      ["リュミエール", "今のは、少し先を言いすぎました。"],
      ["リュミエール", "まだ、何も分かっていませんから。"],
      ["シオン", "うん。"],
      ["シオン", "今は、決めなくていい。"],
      ["リュミエール", "……そうですね。"],
      ["しおぽん", "しおぽん、もうちょっと近くで聞いてみたいの。"],
      ["シオン", "そっか。"],
      ["シオン", "じゃあ、まずは見てみよう。"],
      ["しおぽん", "うん！"],
      ["しおぽん", "リュミエールも行くの！"],
      ["リュミエール", "私も……。"],
      ["しおぽん", "置いてっちゃうよ〜？"],
      ["リュミエール", "それは困ります。"],
      ["リュミエール", "……また、考えすぎるところでした。"],
      ["シオン", "じゃ、行こう。"],
      ["リュミエール", "はい。"],
      ["しおぽん", "キラキラ〜☆を探しに行くの！"],
      ["シオン", "何を探すのか分かってないだろ。"],
      ["しおぽん", "まだ分かってないの！"],
      ["シオン", "やっぱり。"],
      ["リュミエール", "……ふふ。"],
    ],
  };

  const story = {
    active: false,
    eventId: null,
    lineIndex: 0,
    shioponDone: false,
    lumiereDone: false,
    joined: false,
    player: { x: 724, y: 1015 },
    playerDir: "up",
    follower: { x: 810, y: 800, dir: "up", frame: 0, anim: 0 },
    objective: "",
  };

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function makeUi() {
    const shell = document.getElementById("game-shell");
    if (!shell || document.getElementById("dialogue-layer")) return;

    const dialogue = document.createElement("section");
    dialogue.id = "dialogue-layer";
    dialogue.className = "dialogue-layer";
    dialogue.hidden = true;
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

    const follower = document.createElement("div");
    follower.id = "party-shiopon";
    follower.className = "party-shiopon";
    follower.hidden = true;
    follower.setAttribute("aria-hidden", "true");
    shell.appendChild(follower);

    document.getElementById("dialogue-advance").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      advance();
    });
  }

  function showObjective(text) {
    story.objective = text;
    const el = document.getElementById("story-objective");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  function renderLine() {
    const line = scripts[story.eventId]?.[story.lineIndex];
    if (!line) return finishEvent();
    const [speaker, text] = line;
    const speakerEl = document.getElementById("dialogue-speaker");
    const textEl = document.getElementById("dialogue-text");
    if (!speakerEl || !textEl) return;
    speakerEl.textContent = speaker;
    textEl.textContent = text;
    document.getElementById("dialogue-layer").dataset.speaker = speaker;
  }

  function startEvent(eventId) {
    if (story.active || !scripts[eventId]) return;
    makeUi();
    story.active = true;
    story.eventId = eventId;
    story.lineIndex = 0;
    document.getElementById("guide")?.setAttribute("hidden", "");
    const layer = document.getElementById("dialogue-layer");
    layer.hidden = false;
    window.dispatchEvent(new Event("tarot-breaker:interaction-start"));
    renderLine();
    queueMicrotask(() => document.getElementById("dialogue-advance")?.focus({ preventScroll: true }));
  }

  function finishEvent() {
    const completed = story.eventId;
    story.active = false;
    story.eventId = null;
    story.lineIndex = 0;
    const layer = document.getElementById("dialogue-layer");
    if (layer) layer.hidden = true;

    if (completed === "shioponMeet") {
      story.shioponDone = true;
      story.joined = true;
      story.follower.x = SHIOPON_HOME.x;
      story.follower.y = SHIOPON_HOME.y;
      showObjective("星門へ向かう");
    } else if (completed === "lumiereGate") {
      story.lumiereDone = true;
      showObjective("星門の様子を確かめる");
    }

    window.dispatchEvent(new Event("tarot-breaker:interaction-end"));
    document.getElementById("game")?.focus?.({ preventScroll: true });
  }

  function advance() {
    if (!story.active) return;
    story.lineIndex += 1;
    renderLine();
  }

  function observePlayer(next, dt) {
    story.player.x = next.x;
    story.player.y = next.y;
    if (Math.abs(next.dx) > Math.abs(next.dy) && Math.abs(next.dx) > 1e-5)
      story.playerDir = next.dx < 0 ? "left" : "right";
    else if (Math.abs(next.dy) > 1e-5)
      story.playerDir = next.dy < 0 ? "up" : "down";

    updateFollower(dt);
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

  function followerTarget() {
    const target = { ...story.player };
    if (story.playerDir === "up") target.y += FOLLOW_DISTANCE;
    else if (story.playerDir === "down") target.y -= FOLLOW_DISTANCE;
    else if (story.playerDir === "left") target.x += FOLLOW_DISTANCE;
    else target.x -= FOLLOW_DISTANCE;
    return target;
  }

  function updateFollower(dt) {
    if (!story.joined) return;
    const target = followerTarget();
    const dx = target.x - story.follower.x;
    const dy = target.y - story.follower.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const step = Math.min(d, FOLLOW_SPEED * Math.max(0, Math.min(0.05, dt || 0)));
      story.follower.x += (dx / d) * step;
      story.follower.y += (dy / d) * step;
      story.follower.dir = Math.abs(dx) > Math.abs(dy)
        ? dx < 0 ? "left" : "right"
        : dy < 0 ? "up" : "down";
      story.follower.anim += dt || 0;
      while (story.follower.anim >= 0.16) {
        story.follower.anim -= 0.16;
        story.follower.frame = (story.follower.frame + 1) % 4;
      }
    } else {
      story.follower.frame = 0;
      story.follower.anim = 0;
    }
    renderFollower(d > 0.5);
  }

  function mapTransform() {
    const map = document.getElementById("map-layer");
    if (!map) return null;
    const value = map.style.transform || "";
    const match = value.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*0(?:px)?\)\s*scale\(([-\d.]+)\)/);
    if (!match) return null;
    const worldW = parseFloat(map.style.width) || map.naturalWidth || REF.w;
    const worldH = parseFloat(map.style.height) || map.naturalHeight || REF.h;
    return {
      tx: Number(match[1]),
      ty: Number(match[2]),
      zoom: Number(match[3]),
      sx: worldW / REF.w,
      sy: worldH / REF.h,
    };
  }

  function renderFollower(moving) {
    const el = document.getElementById("party-shiopon");
    if (!el) return;
    const farEnough = distance(story.player, SHIOPON_HOME) > FOLLOW_HIDE_RADIUS;
    el.hidden = !story.joined || !farEnough;
    if (el.hidden) return;
    const t = mapTransform();
    if (!t) return;

    const x = story.follower.x * t.sx * t.zoom + t.tx;
    const y = story.follower.y * t.sy * t.zoom + t.ty;
    const height = 76 * t.zoom;
    const width = height * 0.75;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = `${x - width / 2}px`;
    el.style.top = `${y - height * 0.94}px`;

    const dir = story.follower.dir;
    if (moving) {
      el.style.backgroundImage = `url("./assets/sprites/shiopon/shiopon_walk_${dir}.png")`;
      el.style.backgroundPosition = `${[0, 33.333, 66.667, 100][story.follower.frame]}% 0`;
    } else {
      const idleIndex = { down: 0, up: 1, left: 2, right: 3 }[dir] ?? 0;
      el.style.backgroundImage = 'url("./assets/sprites/shiopon/shiopon_idle.png")';
      el.style.backgroundPosition = `${[0, 33.333, 66.667, 100][idleIndex]}% 0`;
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
        observePlayer(next, dt);
        return next;
      };
      return controls;
    };
    api.__dialogueWrapped = true;
  }

  function resetStory() {
    if (story.active) window.dispatchEvent(new Event("tarot-breaker:interaction-end"));
    story.active = false;
    story.eventId = null;
    story.lineIndex = 0;
    story.shioponDone = false;
    story.lumiereDone = false;
    story.joined = false;
    story.player = { x: 724, y: 1015 };
    story.playerDir = "up";
    story.follower = { x: 810, y: 800, dir: "up", frame: 0, anim: 0 };
    story.objective = "";
    const layer = document.getElementById("dialogue-layer");
    const objective = document.getElementById("story-objective");
    const follower = document.getElementById("party-shiopon");
    if (layer) layer.hidden = true;
    if (objective) objective.hidden = true;
    if (follower) follower.hidden = true;
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
    scripts,
  };
})();
