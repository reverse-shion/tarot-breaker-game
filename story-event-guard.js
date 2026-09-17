(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.has("mapEditor") || params.has("collisionEditor") || params.has("depthEditor")) return;

  const dialogue = window.TarotDialogue;
  const controlsApi = window.TarotControls;
  if (!dialogue || !controlsApi || controlsApi.__mandatoryStoryWrapped) return;

  const SHIOPON_HOME = Object.freeze({ x: 810, y: 800 });
  const LUMIERE_HOME = Object.freeze({ x: 810, y: 212 });
  const NORMAL_SHION_SPEED = 155;
  const GATES = Object.freeze({
    shioponRadius: 160,
    shioponMandatoryY: 930,
    lumiereRadius: 150,
    lumiereMandatoryY: 360,
  });

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function canStart(eventId, state = dialogue.getState()) {
    if (state.active) return false;
    if (eventId === "shioponMeet") return !state.shioponDone;
    if (eventId === "lumiereGate") {
      return state.shioponDone && state.joined && !state.lumiereDone;
    }
    return true;
  }

  function installShioponOpening() {
    const sequence = dialogue.events?.shioponMeet;
    if (!Array.isArray(sequence) || sequence.some((command) => command?.storyGuard === "shiopon-opening-v4")) {
      return;
    }

    const shhIndex = sequence.findIndex(
      (command) =>
        command?.type === "dialogue" &&
        command.actor === "shiopon" &&
        command.text === "しーっ！",
    );
    if (shhIndex < 0) return;

    const untouchedRemainder = sequence.slice(shhIndex);
    sequence.splice(
      0,
      sequence.length,
      { type: "face", actor: "shiopon", target: "flower", storyGuard: "shiopon-opening-v4" },
      { type: "dialogue", actor: "shion", text: "しおぽん！", storyGuard: "shiopon-opening-v4" },
      { type: "face", actor: "shion", target: "shiopon", storyGuard: "shiopon-opening-v4" },
      { type: "face", actor: "shiopon", target: "shion", storyGuard: "shiopon-opening-v4" },
      { type: "wait", duration: 260, storyGuard: "shiopon-opening-v4" },
      {
        type: "approach",
        actor: "shion",
        target: "shiopon",
        distance: 48,
        duration: 900,
        storyGuard: "shiopon-opening-v4",
      },
      { type: "dialogue", actor: "shiopon", text: "シオンさん", storyGuard: "shiopon-opening-v4" },
      { type: "wait", duration: 140, storyGuard: "shiopon-opening-v4" },
      {
        type: "dialogue",
        actor: "shion",
        text: "ここで何してるんだ？",
        storyGuard: "shiopon-opening-v4",
      },
      { type: "wait", duration: 220, storyGuard: "shiopon-opening-v4" },
      { type: "face", actor: "shiopon", target: "shion", storyGuard: "shiopon-opening-v4" },
      ...untouchedRemainder,
    );
  }

  installShioponOpening();

  const lumiereSequence = dialogue.events?.lumiereGate;
  if (
    Array.isArray(lumiereSequence) &&
    !lumiereSequence.some(
      (command) =>
        command?.type === "approach" &&
        command.actor === "shion" &&
        command.target === "lumiere",
    )
  ) {
    lumiereSequence.unshift({
      type: "approach",
      actor: "shion",
      target: "lumiere",
      distance: 54,
      duration: 900,
      storyGuard: "lumiere-approach",
    });
  }

  function prepareApproachDuration(eventId) {
    const sequence = dialogue.events?.[eventId];
    const stageState = window.TarotStage?.getState?.();
    if (!Array.isArray(sequence) || !stageState?.actors?.shion) return;

    const approach = sequence.find(
      (command) =>
        command?.type === "approach" &&
        command.actor === "shion",
    );
    if (!approach) return;

    const current = stageState.actors.shion;
    const target =
      typeof approach.target === "string"
        ? stageState.actors?.[approach.target]
        : approach.target;
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;

    const gap = clamp(Number(approach.distance) || 46, 32, 90);
    const travel = Math.max(0, distance(current, target) - gap);
    const minimum = eventId === "shioponMeet" ? 500 : 450;
    approach.duration = Math.round(
      clamp((travel / NORMAL_SHION_SPEED) * 1000, minimum, 1400),
    );
  }

  const originalStart = dialogue.start.bind(dialogue);
  dialogue.start = function guardedStoryStart(eventId) {
    if (!canStart(eventId)) return false;
    prepareApproachDuration(eventId);
    originalStart(eventId);
    return true;
  };

  const originalCreateControls = controlsApi.createControls;
  controlsApi.createControls = function createControlsWithMandatoryStory(...args) {
    const controls = originalCreateControls.apply(this, args);
    if (controls.__mandatoryStoryGuard) return controls;

    const originalStep = controls.step;
    controls.step = function mandatoryStoryStep(position, dt, speed) {
      const next = originalStep.call(this, position, dt, speed);
      const state = dialogue.getState();
      if (state.active) return next;

      const player = { x: next.x, y: next.y };
      const mustMeetShiopon =
        !state.shioponDone &&
        (distance(player, SHIOPON_HOME) <= GATES.shioponRadius ||
          player.y <= GATES.shioponMandatoryY);

      if (mustMeetShiopon) {
        dialogue.start("shioponMeet");
        return next;
      }

      const canMeetLumiere =
        state.shioponDone &&
        state.joined &&
        !state.lumiereDone &&
        (distance(player, LUMIERE_HOME) <= GATES.lumiereRadius ||
          player.y <= GATES.lumiereMandatoryY);

      if (canMeetLumiere) dialogue.start("lumiereGate");
      return next;
    };

    controls.__mandatoryStoryGuard = true;
    return controls;
  };

  controlsApi.__mandatoryStoryWrapped = true;
  window.TarotStoryGuard = Object.freeze({
    version: "mandatory-story-v4",
    gates: GATES,
    normalShionSpeed: NORMAL_SHION_SPEED,
  });
})();
