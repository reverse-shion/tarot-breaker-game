/* Observe the real Lumiere dialogue in the isolated Stage3 entry, without saving. */
(() => {
  'use strict';
  if(window.__TAROT_DEV_STAGE3__!==true||window.__TAROT_DEV_STAR_GATE_ROUTE__!==true||
     window.__TAROT_STAGE3_ENTRY_REJECTED__===true)return;
  const q=new URLSearchParams(location.search);
  if(q.get('dev')!=='star-gate-from-lumiere'||q.getAll('dev').length!==1||q.has('entry')||q.has('from'))return;
  function observe(){
    const story=window.TarotDialogue?.getState?.();
    if(!story||!window.TarotJourney?.set)return null;
    const facts={shioponDone:story.shioponDone===true,lumiereDone:story.lumiereDone===true,joined:story.joined===true};
    window.TarotJourney.set('gardenStory',facts);
    return {...facts,active:story.active===true};
  }
  window.addEventListener('tarot-breaker:interaction-end',observe);
  window.TarotStarGateRoute=Object.freeze({
    canInvestigate(){const story=observe();return !!(story&&!story.active&&story.shioponDone&&story.joined&&story.lumiereDone);},
    getState(){return observe();}
  });
})();
