(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.has("mapEditor") || params.has("collisionEditor") || params.has("depthEditor")) return;

  const dialogue = window.TarotDialogue;
  const controlsApi = window.TarotControls;
  if (!dialogue || !controlsApi || controlsApi.__mandatoryStoryWrapped) return;

  const SHIOPON_HOME = Object.freeze({ x: 810, y: 800 });
  const LUMIERE_HOME = Object.freeze({ x: 810, y: 212 });
  const GATES = Object.freeze({
    shioponRadius: 220,
    shioponMandatoryY: 930,
    lumiereRadius: 150,
    lumiereMandatoryY: 360,
  });

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function canStart(eventId, state = dialogue.getState()) {
    if (state.active) return false;
    if (eventId === "shioponMeet") return !state.shioponDone;
    if (eventId === "lumiereGate") {
      return state.shioponDone && state.joined && !state.lumiereDone;
    }
    return true;
  }

  const originalStart = dialogue.start.bind(dialogue);
  dialogue.start = function guardedStoryStart(eventId) {
    if (!canStart(eventId)) return false;
    originalStart(eventId);
    return true;
  };

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
  window.TarotStoryGuard = Object.freeze({ version: "mandatory-story-v1", gates: GATES });
})();
