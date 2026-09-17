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
    shioponRadius: 220,
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

  function addDiscoveryBeat() {
    const sequence = dialogue.events?.shioponMeet;
    if (!Array.isArray(sequence)) return;
    if (sequence.some((command) => command?.storyGuard === "discover-shiopon")) return;
    const approachIndex = sequence.findIndex(
      (command) =>
        command?.type === "approach" &&
        command.actor === "shion" &&
        command.target === "shiopon",
    );
    if (approachIndex < 0) return;
    sequence.splice(
      approachIndex,
      0,
      { type: "face", actor: "shion", target: "shiopon", storyGuard: "discover-shiopon" },
      { type: "wait", duration: 180, storyGuard: "discover-shiopon" },
    );
  }

  addDiscoveryBeat();

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
      duration: 320,
    });
  }

  function installNormalApproachSpeed() {
    const stage = window.TarotStage;
    if (!stage?.perform || !stage?.getState || stage.normalApproachSpeed === NORMAL_SHION_SPEED) return;

    const wrapped = {
      ...stage,
      perform(command = {}) {
        if (command.type !== "approach" || command.actor !== "shion") {
          return stage.perform(command);
        }

        const stageState = stage.getState();
        const current = stageState?.actors?.shion;
        const target = typeof command.target === "string" ? stageState?.actors?.[command.target] : command.target;
        if (!current || !target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
          return stage.perform(command);
        }

        const gap = clamp(Number(command.distance) || 46, 32, 90);
        const travel = Math.max(0, distance(current, target) - gap);
        const duration = clamp((travel / NORMAL_SHION_SPEED) * 1000, 80, 1400);
        return stage.perform({ ...command, duration });
      },
      normalApproachSpeed: NORMAL_SHION_SPEED,
    };
    window.TarotStage = Object.freeze(wrapped);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", installNormalApproachSpeed, { once: true });
  } else {
    queueMicrotask(installNormalApproachSpeed);
  }

  const originalStart = dialogue.start.bind(dialogue);
  dialogue.start = function guardedStoryStart(eventId) {
    if (!canStart(eventId)) return false;
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
    version: "mandatory-story-v2",
    gates: GATES,
    normalShionSpeed: NORMAL_SHION_SPEED,
  });
})();
