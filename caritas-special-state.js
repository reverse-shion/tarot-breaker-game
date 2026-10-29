/* Isolated Caritas v15 record and immutable resonance-special transitions. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./caritas-battle-core.js'):root.CaritasBattleCore);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CaritasSpecialState=api;
})(typeof window!=='undefined'?window:this,function(C){
 'use strict';
 const VERSION=15;
 const PHASES=['SHION_LINE','SHIORIEL_LINE','DUAL_INCANTATION','ART_PLAYBACK','PURIFICATION','CARITAS_REPLY','FAREWELL','RETURNING','DONE'];
 const ids=C.CARDS.map(c=>c.id);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const empty=()=>({cardId:null,phase:'NONE',commitId:null,committed:false,resolutionApplied:false,dialogueStep:0,playbackMode:'normal',completed:false});
 function create(battle,runId){return {version:VERSION,revision:0,battleRunId:runId,battle:copy(battle),special:empty(),seenTechniques:{},completedRunId:null,firstWrittenDelivered:false,aiCalls:0,aiConfirmedCalls:0,mapCompleted:false};}
 function validate(r){
  if(!r||!Object.prototype.hasOwnProperty.call(r,'battle')||r.version!==VERSION||!Number.isInteger(r.revision)||r.revision<0||typeof r.battleRunId!=='string'||!r.battleRunId||!r.special||!r.seenTechniques||typeof r.seenTechniques!=='object'||Array.isArray(r.seenTechniques)||typeof r.mapCompleted!=='boolean'||!Object.prototype.hasOwnProperty.call(r,'completedRunId')||typeof r.firstWrittenDelivered!=='boolean'||!Number.isInteger(r.aiCalls)||r.aiCalls<0||r.aiCalls>3)throw Error('invalid-record');
  const s=r.battle,p=r.special;
  if(s!==null&&(typeof s!=='object'||Array.isArray(s)))throw Error('invalid-battle-type');
  if(r.aiConfirmedCalls!==r.aiCalls||!Object.entries(r.seenTechniques).every(([id,value])=>ids.includes(id)&&typeof value==='boolean'))throw Error('invalid-receipts');
  if(s&&(!['read','finisher','ending','defeat','complete'].includes(s.phase)||!Number.isInteger(s.step)||s.step<0||s.step>2||!Number.isInteger(s.turn)||s.turn<0||s.turn>1000||!['hp','dark','resonance'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=100)||typeof s.used!=='boolean'||!Array.isArray(s.cards)||s.cards.length!==3||!s.cards.every((c,i)=>c&&c.id===ids[i]&&c.name===C.CARDS[i].name&&c.role===C.CARDS[i].role&&c.major===true&&Array.isArray(c.words)&&c.words.length===3&&c.words.every((w,j)=>w===C.CARDS[i].words[j]))||!Array.isArray(s.words)||s.words.length!==3||!s.words.every((w,i)=>w===null||C.CARDS[i].words.includes(w))))throw Error('invalid-battle');
  if(typeof p.committed!=='boolean'||typeof p.resolutionApplied!=='boolean'||typeof p.completed!=='boolean'||!Number.isInteger(p.dialogueStep)||!['normal','short'].includes(p.playbackMode))throw Error('invalid-special');
  if(!p.committed){if(s&&s.phase==='ending'&&s.dark!==0)throw Error('invalid-legacy-ending');if(s&&(s.phase==='complete'||((s.phase==='read'||s.phase==='finisher'||s.phase==='defeat')&&(s.used||s.dark===0))||(s.phase==='finisher'&&s.resonance!==100)))throw Error('inconsistent-legacy');if(p.dialogueStep!==0||p.phase!=='NONE'||p.resolutionApplied||p.completed||p.cardId!==null||p.commitId!==null||r.mapCompleted||r.completedRunId!==null)throw Error('inconsistent-empty');return r;}
  const i=PHASES.indexOf(p.phase);
  if(!s||i<0||!ids.includes(p.cardId)||p.commitId!==r.battleRunId+':special'||p.dialogueStep!==i||p.resolutionApplied!==(i>=5)||p.completed!==(i===8)||r.mapCompleted!==(i===8)||r.completedRunId!==(i===8?r.battleRunId:null))throw Error('inconsistent-special');
  if(i<5&&(s.phase!=='finisher'||s.resonance!==100||s.used||s.dark<=0))throw Error('premature-result');
  if(i>=5&&(s.phase!==(i===8?'complete':'ending')||s.dark!==0||!s.used||s.finisherType!=='skill'))throw Error('missing-result');
  return r;
 }
 function migrate(data,runId){
  if(data?.version===VERSION)return validate(copy(data));
  if(data?.version!==14||!Object.prototype.hasOwnProperty.call(data,'battle')||typeof data.firstWrittenDelivered!=='boolean')throw Error('unsupported-save');
  const r=create(data.battle,runId);r.firstWrittenDelivered=data.firstWrittenDelivered;
  r.aiCalls=r.aiConfirmedCalls=Number.isInteger(data.aiConfirmedCalls)?data.aiConfirmedCalls:0;
  // Legacy ending stays a legacy ending; no card or finish is invented.
  return validate(r);
 }
 function commit(r,cardId,mode='normal'){
  validate(r);const b=r.battle;
  if(r.special.committed||!ids.includes(cardId)||!b||b.phase!=='finisher'||b.resonance!==100||b.used||!C.canSkill(b))throw Error('selection-not-allowed');
  const n=copy(r);n.special={...empty(),cardId,phase:'SHION_LINE',commitId:r.battleRunId+':special',committed:true,playbackMode:mode==='short'&&r.seenTechniques[cardId]===true?'short':'normal'};
  return validate(n);
 }
 function transition(r,to,{imageDisplayed=false}={}){
  validate(r);const i=PHASES.indexOf(r.special.phase);
  if(!r.special.committed||i<0||PHASES[i+1]!==to)throw Error('invalid-transition');
  const n=copy(r);n.special.phase=to;n.special.dialogueStep=i+1;
  if(to==='PURIFICATION'&&imageDisplayed)n.seenTechniques[n.special.cardId]=true;
  if(to==='CARITAS_REPLY'){
   if(r.special.resolutionApplied)throw Error('duplicate-resolution');
   n.battle=C.finish(n.battle,'skill');n.special.resolutionApplied=true;
  }
  if(to==='DONE'){
   n.battle=C.next(n.battle);n.special.completed=true;n.completedRunId=n.battleRunId;n.mapCompleted=true;
  }
  return validate(n);
 }
 // Revision check is fail-closed, but localStorage is not a cross-tab CAS lock.
 function write(storage,key,expectedRaw,next){
  if(storage.getItem(key)!==expectedRaw)throw Error('revision-conflict');
  const n=copy(next);n.revision++;validate(n);
  const raw=JSON.stringify(n);storage.setItem(key,raw);
  if(storage.getItem(key)!==raw)throw Error('revision-conflict');
  return {record:n,raw};
 }
 return Object.freeze({VERSION,PHASES,create,validate,migrate,commit,transition,write});
});
