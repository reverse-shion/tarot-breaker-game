(() => {
'use strict';
if(!window.__TAROT_DEV_STAGE3__||new URLSearchParams(location.search).get('dev')!=='star-gate-full')return;
const TRACKS=Object.freeze({ruins:{source:'./assets/audio/bgm/future_ruins.mp3',trim:10**(-6.48/20),start:1.8,mix:.70},fix:{source:'./assets/audio/bgm/future_fix.mp3',trim:10**(-5.23/20),start:20,mix:.50}});
let context=null;
function create({clock,signal,failures,id}){
 let alive=true,suspended=false,level=1,phase='PREPARED',frame=0;
 const events=[],tracks={};
 const fail=(name,error)=>{failures.push('future-'+name+': '+String(error));events.push({type:'failure',name,error:String(error),time:clock.now()});};
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('AudioContext unavailable');context ||=new C();}
 catch(e){fail('context',e);}
 const enabled=()=>window.TarotAudio?.enabled!==false;
 const resumeContext=()=>{if(!context)return;Promise.resolve(context.resume()).then(()=>{if(alive&&!signal.aborted&&context.state!=='running'){for(const t of Object.values(tracks)){t.failed=true;stop(t);}fail('context-state',context.state);}},e=>{if(alive&&!signal.aborted){for(const t of Object.values(tracks)){t.failed=true;stop(t);}fail('context-resume',e);}});};
 for(const [name,config] of Object.entries(TRACKS)){
  // Hosted MP3 requests can redirect across origins. Set CORS before src so
  // MediaElementAudioSourceNode receives usable samples rather than silence.
  const media=new Audio();media.crossOrigin='anonymous';media.src=config.source;media.preload='auto';media.loop=false;
  const track=tracks[name]={media,config,gain:null,sourceNode:null,weight:0,mix:config.mix,token:0,desired:false,failed:false};
  try{if(!context)throw new Error('No gain graph');const source=context.createMediaElementSource(media);track.sourceNode=source;track.gain=context.createGain();track.gain.gain.value=0;source.connect(track.gain);track.gain.connect(context.destination);}
  catch(e){track.failed=true;fail(name,e);}
  media.addEventListener('error',()=>{if(!alive||signal.aborted)return;track.failed=true;stop(track);fail(name,'media load failed');});
 }
 function stop(t){t.token++;t.desired=false;t.pendingSince=null;t.weight=0;t.media.pause();if(t.gain){t.gain.gain.cancelScheduledValues(context.currentTime);t.gain.gain.value=0;}}
 function apply(){for(const t of Object.values(tracks)){const remaining=t.media.duration-t.media.currentTime;const tail=Number.isFinite(remaining)?Math.max(0,Math.min(1,remaining/1.5)):1;const value=alive&&!suspended&&!signal.aborted&&!document.hidden&&enabled()&&!t.failed&&t.ready?t.config.trim*t.mix*t.weight*level*tail:0;if(t.gain){t.gain.gain.cancelScheduledValues(context.currentTime);t.gain.gain.value=value;}if(suspended||!enabled()||document.hidden||signal.aborted)t.media.pause();}}
 function record(type,name){events.push({type,name,phase,time:clock.now(),source:name?tracks[name].config.source:undefined});}
 function play(name,start,mix,preservePosition=false){const t=tracks[name];if(!alive||signal.aborted||t.failed)return;t.token++;const token=t.token;t.desired=true;t.mix=mix;t.weight=0;t.pendingSince=enabled()?clock.now():null;t.start=start;t.started=preservePosition;t.ready=false;record('request',name);
  const begin=()=>{if(!alive||signal.aborted||token!==t.token||suspended||document.hidden)return;try{if(!preservePosition)t.media.currentTime=start;}catch(e){t.failed=true;stop(t);fail(name+'-seek',e);return;}
   const ready=()=>{if(!alive||signal.aborted||token!==t.token||suspended||document.hidden)return;t.ready=true;
   if(!enabled()){t.pendingSince=null;return;}
   let pending;try{pending=t.media.play();}catch(e){t.failed=true;stop(t);fail(name+'-play',e);return;}Promise.resolve(pending).then(()=>{if(!alive||signal.aborted||suspended||document.hidden||!enabled()||!t.desired)t.media.pause();else if(token===t.token){t.pendingSince=null;t.started=true;record('playing',name);}},e=>{if(alive&&token===t.token){t.failed=true;stop(t);fail(name+'-play',e);}});
   };
   if(!preservePosition&&(t.media.seeking||Math.abs(t.media.currentTime-start)>.15)){const seeked=()=>{t.media.removeEventListener('seeked',seeked);if(!alive||signal.aborted||token!==t.token)return;if(t.media.seeking||Math.abs(t.media.currentTime-start)>.15){t.failed=true;stop(t);fail(name+'-seek','completed seek did not reach start');return;}ready();};t.media.addEventListener('seeked',seeked,{once:true});}else ready();
  };
  if(t.media.readyState>=1)begin();else{const loaded=()=>{t.media.removeEventListener('loadedmetadata',loaded);begin();};t.media.addEventListener('loadedmetadata',loaded,{once:true});}
 }
 // Called synchronously from the existing investigate gesture, before any await.
 function unlock(){if(!enabled())return;resumeContext();for(const t of Object.values(tracks)){if(t.failed)continue;const token=++t.token;try{Promise.resolve(t.media.play()).then(()=>{if(token===t.token||!alive||signal.aborted||suspended||document.hidden||!enabled()||!t.desired)t.media.pause();},e=>{if(alive&&token===t.token)fail('gesture',e);});}catch(e){fail('gesture',e);}}}
 function monitor(){if(!alive)return;apply();for(const [name,t] of Object.entries(tracks)){if(t.pendingSince!=null&&clock.now()-t.pendingSince>10000){t.pendingSince=null;t.failed=true;stop(t);fail(name+'-timeout','load/seek/play deadline');}}frame=requestAnimationFrame(monitor);}
 const forcePause=()=>{suspended=true;for(const t of Object.values(tracks)){t.token++;t.pendingSince=null;t.media.pause();if(t.gain){t.gain.gain.cancelScheduledValues(context.currentTime);t.gain.gain.value=0;}}};
 const hidden=()=>{if(document.hidden)forcePause();else restoreVisible();};
 const restoreVisible=()=>{if(!alive||signal.aborted||document.hidden)return;suspended=false;resumeContext();for(const [name,t] of Object.entries(tracks))if(t.desired&&!t.failed&&t.media.paused&&!t.media.ended){const weight=t.weight;play(name,t.started?t.media.currentTime:t.start,t.mix,t.started);t.weight=weight;}apply();};
 const gesture=()=>{queueMicrotask(()=>{if(!alive||signal.aborted||!enabled()||document.hidden)return;resumeContext();for(const [name,t] of Object.entries(tracks))if(t.desired&&!t.failed&&t.media.paused&&!t.media.ended){const weight=t.weight;play(name,t.started?t.media.currentTime:t.start,t.mix,t.started);t.weight=weight;apply();}});};
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',forcePause);window.addEventListener('pageshow',restoreVisible);document.addEventListener('click',gesture);
 const abort=()=>pause('ABORT');signal.addEventListener('abort',abort,{once:true});
 function pause(reason){phase=reason;for(const t of Object.values(tracks))stop(t);record('pause');}
 const api={unlock,
  ruinsVisible(){phase='RUINS';play('ruins',1.8,.70);const start=clock.now();const ramp=()=>{if(!alive||signal.aborted||phase!=='RUINS')return;tracks.ruins.weight=Math.min(1,(clock.now()-start)/250);apply();if(tracks.ruins.weight<1)requestAnimationFrame(ramp);};ramp();},
  arcanaAnomalyStart(){
   phase='ARCANA_MICRO';
   // Remove a little of the existing world sound; do not announce a transformation.
   tracks.ruins.weight=Math.min(tracks.ruins.weight||1,.94);apply();
  },
  arcanaInfection(p){
   phase='ARCANA_INFECTION';
   const progress=Math.max(0,Math.min(1,p));
   // The normal sound is being taken away. The replacement track does not enter yet.
   tracks.ruins.weight=.94-.44*progress;apply();
  },
  arcanaBreak(){
   phase='ARCANA_BREAK';
   // 100–200ms semantic gap: almost silence, but no hard global audio stop.
   tracks.ruins.weight=.06;apply();
  },
  arcanaRewrite(){
   // Atomic visual rewrite owns the musical answer too: no ruins/fix crossfade.
   stop(tracks.ruins);phase='FIX';play('fix',20,.50);tracks.fix.weight=1;apply();
  },
  setLevel(k){level=Math.max(0,Math.min(1,k));apply();},
  pause,
  resumeWhite(){phase='POST_WHITE';level=0;play('ruins',1.8,.25);tracks.ruins.weight=1;apply();},
  dispose(){if(!alive)return;pause('DISPOSED');alive=false;for(const t of Object.values(tracks)){t.sourceNode?.disconnect?.();t.gain?.disconnect?.();}cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',forcePause);window.removeEventListener('pageshow',restoreVisible);document.removeEventListener('click',gesture);signal.removeEventListener('abort',abort);},
  getState(){return {id,phase,level,suspended,contextState:context?.state,events,tracks:Object.fromEntries(Object.entries(tracks).map(([name,t])=>[name,{source:t.config.source,time:t.media.currentTime,paused:t.media.paused,gain:t.gain?.gain.value||0,trim:t.config.trim,mix:t.mix,weight:t.weight,failed:t.failed}]))};}
 };
 unlock();monitor();return api;
}
window.TarotFutureVisionAudio=Object.freeze({create,TRACKS});
})();
