/* Isolated invocation SFX. Own context only; never takes over shared BGM. */
(() => {
  "use strict";
  const params=new URLSearchParams(location.search);
  if(!location.pathname.endsWith("/hoshisuna-main.html")||params.get("dev")!=="hoshisuna")return;
  let session=null;
  const allowed=()=>window.TarotAudio?.enabled===true&&!document.hidden;
  function clear(){
    const old=session;session=null;
    if(!old)return;
    old.master.gain.value=0;
    for(const node of old.nodes){try{node.stop();}catch(_){}try{node.disconnect();}catch(_){}}
    try{old.context.close()?.catch?.(()=>{});}catch(_){}
  }
  function begin(){
    clear();
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context||!allowed())return false;
    let context;
    try{
      context=new Context();
      const master=context.createGain();master.gain.value=.09;master.connect(context.destination);
      const current={context,master,nodes:[],paused:false};session=current;
      const now=context.currentTime;
      function voice(hz,start,end,peak,type="sine",to=hz){
        const oscillator=context.createOscillator(),gain=context.createGain();
        current.nodes.push(oscillator,gain);
        oscillator.type=type;
        oscillator.frequency.setValueAtTime(hz,now+start);
        oscillator.frequency.linearRampToValueAtTime(to,now+end);
        gain.gain.setValueAtTime(0,now+start);
        const attack=start>=2?.018:Math.min(.28,(end-start)*.25);
        gain.gain.linearRampToValueAtTime(peak,now+start+attack);
        gain.gain.exponentialRampToValueAtTime(.0001,now+end);
        oscillator.connect(gain);gain.connect(master);
        oscillator.start(now+start);oscillator.stop(now+end+.02);
      }
      // A quiet harmonic gathering, then a real gap as the cocoon closes.
      voice(196,1,2.3,.32,"sine",246.94);
      voice(392,1.08,2.28,.13,"sine",493.88);
      // One bell-like chord when the face begins to emerge. No impact boom.
      voice(880,3,4.15,.38);
      voice(1320,3,3.92,.12);
      voice(1760,3,3.7,.055);
      Promise.resolve(context.resume()).then(()=>{
        if(session!==current)return;
        if(current.paused||!allowed())pause();
      }).catch(()=>{if(session===current)clear();});
      return true;
    }catch(_){
      clear();
      if(context&&context.state!=="closed")try{context.close()?.catch?.(()=>{});}catch(_){}
      return false; // An unavailable iOS audio context must never block the event.
    }
  }
  function pause(){
    if(!session)return;
    session.paused=true;
    try{session.context.suspend()?.catch?.(()=>{});}catch(_){}
  }
  function resume(){
    if(!session||!allowed())return;
    session.paused=false;
    try{session.context.resume()?.catch?.(()=>{});}catch(_){}
  }
  function syncMute(){
    if(session&&!window.TarotAudio?.enabled)clear();
  }
  window.TarotCaritasManifestationAudio=Object.freeze({begin,pause,resume,clear,syncMute});
})();
