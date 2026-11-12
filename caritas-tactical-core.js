/* Opt-in battle rules. Legacy arithmetic and special transactions stay intact. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else if(location.pathname.endsWith('/hoshisuna-main.html')&&new URLSearchParams(location.search).get('dev')==='hoshisuna'&&new URLSearchParams(location.search).get('battle')==='tactical')root.CaritasBattleCore=factory(root.CaritasBattleCore);
})(typeof window!=='undefined'?window:this,function(Base){
 'use strict';
 const RULES='tactical-v1';
 const OPTIONS=Object.freeze({...Base.READING_OPTIONS,
  '不安':{title:'近づくことへの怖さを受け止める',text:'身を引く星獣に気づき、今の距離で話せるかを確かめる。相手が何を恐れているかは、まだ決めつけない。',shion:'……ここからなら、ゆっくり話せるか？'},
  '秘密':{title:'途切れた声に耳を澄ます',text:'唸りや怒りの言葉に埋もれた声、アビスの侵蝕に遮られた言葉に耳を傾ける。',shion:'今、何か言おうとしただろ。途中までは聞こえた。'},
  '無意識':{title:'踏みとどまる意志を信じる',text:'苦しみながらも自分を保とうとする星獣に目を向ける。まだ言葉を届ける相手がそこにいると読み、シオン自身の想いを伝える。',shion:'まだ、踏みとどまってるんだな。君と話がしたいんだ、俺は。アビスに呑まれたまま、終わってほしくない。'},
  '忍耐':{title:'その場に留まる',text:'近づきたい気持ちを抑え、距離を保って待つ。拒絶が強いときに届きやすい。声をアビスに遮られているときは、待つだけでは闇を解けない。',shion:'……ここで待ってる。君の声を聞きながら、どうすればこの侵蝕を止められるか、考える。'},
  '勇気':{title:'一歩踏み込む',text:'怖さを抱えたまま、声が届く場所へ一歩出る。明確な拒絶を押して踏み込むと、共鳴維持力を50失う。',shion:'一歩だけ、そっちへ行くよ。……もう少し近くで、君に伝えたい。'},
  '希望':{title:'この道の先を思い描く',text:'今いる星砂の道を、闇が晴れたあとに一緒に歩きたいと伝える。届いたとき、闇侵蝕をさらに5解き、共鳴維持力を5多く使う。',shion:'闇が晴れたら、少し歩かないか。この道の先を、君と見てみたい。'},
  '癒し':{title:'自分の怖さも打ち明ける',text:'相手の前で強く振る舞い続けず、シオン自身も怖がっていることを話す。通常の共鳴維持力の消耗を3抑える。',shion:'俺も怖い。アビスがこんなふうに暴走して……どうすれば止められるのか、まだ分からないんだ。'},
  '願い':{title:'今してほしいことを尋ねる',text:'何が必要かを星獣に尋ねる。問いかけたあとは言葉を足さず、返事を待つ。闇を解けたとき共鳴がさらに5深まる。',shion:'俺に、どうしてほしい？'}
 });
 const OBSERVATIONS=Object.freeze({
  closed:{
   speech:'来るな。……グオオオ……お前たちの顔を見ているだけで、殺意が……。喰らってやる……。',
   voices:[
    '来るな。……グオオオ……お前たちの顔を見ているだけで、殺意が……。喰らってやる……。',
    'ガァルル……消え、うせろ……ウォォ……。'
   ],
   clue:'星獣は身を引き、爪を立てている。近づくたび、唸り声が強くなる。',
   focus:['身を引くたび、闇が輪郭に張りつく。','拒絶の言葉は、まだ本人の声で聞こえる。','足が後ろへ退く。距離を保とうとしている。']
  },
  storm:{
   speech:'お前たちが死のうが……どうでもいい。',
   voices:[
    'お前たちが死のうが……どうでもいい。',
    '……待て。今、私は……本当にそう思ったのか。この私が……？',
    'アビスが……どうして、ここまで……。止まらぬ。憎しみが、何もかも……っ！',
    '頼む。私の声が聞こえるなら……助けてくれ……！'
   ],
   clue:'星獣はこちらを向いている。何かを訴えようと口を開くが、そのたびに闇が喉元を覆う。',
   focus:['逃げる動きは止まった。こちらを見ている。','助けを求める声を、闇が遮っている。','足は止まり、前へ出ようともがいている。']
  },
  wavering:{
   speech:'お前たちの命も、自分の命さえ……惜しくなくなる。',
   voices:[
    'お前たちの命も、自分の命さえ……惜しくなくなる。このまま全部終われば、それでいいと……。',
    'アビスに呑まれて……生きたいとさえ、思えなくなっていく。',
    '怖いのだ。そんなことを、本気で思ってしまう。……私は、私でいられるのか。'
   ],
   clue:'星獣は目をそらさない。声を震わせながら、途切れそうになる言葉をつないでいる。',
   focus:['身を引かず、こちらを見ている。','恐れと願いが、同じ声で聞こえる。','自分の意志で踏みとどまっている。']
  }
 });
 // Endgame technique is not a random draw and not an extra card choice.
 // Every successful delivered reading contributes to three thematic affinities:
 // observing/supporting -> Moon, actively reaching -> Strength,
 // leaving hope/agency -> Star. The whole battle matters, not just the last turn.
 const FINISHER_IDS=Object.freeze(['18-the-moon','08-strength','17-the-star']);
 const emptyInfluence=()=>({'18-the-moon':0,'08-strength':0,'17-the-star':0});
 function cleanInfluence(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  if(!FINISHER_IDS.every(id=>Number.isSafeInteger(value[id])&&value[id]>=0&&value[id]<=10000))return null;
  return {...emptyInfluence(),...Object.fromEntries(FINISHER_IDS.map(id=>[id,value[id]]))};
 }
 function readingInfluence(words,effect){
  const scores=emptyInfluence();
  if(!Array.isArray(words)||words.length!==3||!effect||effect.misread||effect.blocked||
    !(effect.dark>0||effect.resonance>0))return scores;
  // Compass is always Moon's observing act, with a modest reward for fit.
  scores['18-the-moon']+=1+(effect.match===1?2:0);
  // A safe supporting action stabilizes Moon; a successful risk advances Strength.
  if(words[1]==='忍耐'){scores['18-the-moon']+=2;scores['17-the-star']+=1;}
  else if(words[1]==='勇気')scores['08-strength']+=7;
  // The player's chosen route determines how the meaning reaches the other.
  if(words[2]==='癒し')scores['18-the-moon']+=2;
  else if(words[2]==='希望'||words[2]==='願い')scores['17-the-star']+=4;
  // Real effects matter, but never override the meaning of the three choices.
  if(effect.dark>=20)scores['08-strength']+=1;
  if(effect.resonance>=30)scores['17-the-star']+=1;
  return scores;
 }
 function inheritedInfluence(s){
  // Old v15 checkpoints predate affinity scores: recover what can be proven
  // from their last completed reading, without inventing earlier turns.
  return cleanInfluence(s.finisherInfluence)||
    readingInfluence(s.lastReading,s.lastEffect);
 }
 function finisherTechnique(s){
  const score=inheritedInfluence(s);
  const last=readingInfluence(s.lastReading,s.lastEffect);
  // No confirmed reading in a legacy/QA finisher: keep the prior Star default.
  if(!FINISHER_IDS.some(id=>score[id]>0))
   return {cardId:'17-the-star',scores:score,reason:'過去の記録を引き継ぐ'};
  const ids=[...FINISHER_IDS].sort((a,b)=>score[b]-score[a]||
   last[b]-last[a]||
   FINISHER_IDS.indexOf(b)-FINISHER_IDS.indexOf(a));
  const id=ids[0];
  return {cardId:id,scores:score,reason:id==='18-the-moon'?'観察と支えの積み重ね':
   id==='08-strength'?'踏み出す意志の積み重ね':'希望を届けた積み重ね'};
 }
 function optionsFor(card){return card.role==='TRIGGER'?['忍耐','勇気']:card.words;}
 function valid(s){return Base.valid(s)&&s.words[1]!=='自制';}
 function observation(s){return OBSERVATIONS[Base.stateFor(s.dark)]||OBSERVATIONS.wavering;}
 function predict(s){
  if(s.phase!=='read'||!valid(s))return null;
  const state=Base.stateFor(s.dark),reach=s.words[1]==='勇気',misread=reach&&state==='closed',blocked=!reach&&state==='storm';
  let relief=state==='closed'?(reach?5:30):state==='storm'?(reach?30:0):(reach?25:15);
  let cost=misread?50:state==='closed'?5:state==='storm'?(reach?15:10):(reach?20:5);
  let gain=blocked||misread?0:state==='closed'?30:state==='storm'?35:(reach?35:25);
  // Compass observations have a visible affinity bonus, never a wrong-answer penalty.
  const focus=['不安','秘密','無意識'][state==='closed'?0:state==='storm'?1:2];
  if(!misread&&!blocked&&s.words[0]===focus)relief+=3;
  if(!misread&&!blocked&&s.words[2]==='希望'){relief+=5;cost+=5;}
  if(!misread&&s.words[2]==='癒し')cost=Math.max(2,cost-3);
  if(!misread&&!blocked&&s.words[2]==='願い')gain+=5;
  const dark=Math.min(Math.max(0,s.dark-1),relief),resonance=Math.min(100-s.resonance,gain),damage=Math.min(s.hp,cost);
  return {state,dark,resonance,damage,rawDamage:cost,hasCounter:cost>0,power:relief,force:1,penetration:0,hit:dark,match:s.words[0]===focus?1:0,darkBucket:Base.bucket(dark),resBucket:Base.bucket(resonance),approach:reach?'reach':'support',misread,blocked,
   explanation:misread?'拒絶を押してしまった。距離を取り、声が届く場所を探そう。':blocked?'声を遮るアビスが残る。本人はこちらを見ている。今は踏み込む余地がある。':reach?'助けを求める声へ踏み込み、闇を解いた。':'距離を保って支え、闇を解いた。'};
 }
 function read(s){
  const p=predict(s);if(!p)return s;
  const influence=inheritedInfluence(s),added=readingInfluence(s.words,p);
  const cumulative=emptyInfluence();
  for(const id of FINISHER_IDS)cumulative[id]=Math.min(10000,influence[id]+added[id]);
  const n={...s,turn:s.turn+1,step:Math.min(2,s.step+1),lastReading:[...s.words],lastEffect:p,
   finisherInfluence:cumulative,hp:s.hp-p.damage,dark:s.dark-p.dark,resonance:s.resonance+p.resonance};
  n.phase=n.hp===0?'defeat':n.resonance===100&&n.dark<=25?'finisher':'read';
  return n;
 }
 function reaction(s,p,{writtenShion=null}={}){
  if(p.state==='closed')
   return p.misread?'近づくなと言ったはずだ！　……その顔を、私に向けるな！'
    :'……そこで止まれ。その先へ来るな。……グルル……。';
  if(p.state==='storm')
   return p.blocked?'……聞こえて……いる。だが、アビスが……止まらぬ……グオオオ……っ！'
    :'……聞こえた。今、はっきりと……。頼む、もう少し……。';
  if(s.words[2]==='希望')
   return '……この道の先か。行きたい。だが……足が、まだ言うことを聞かぬ。';
  if(s.words[2]==='願い')
   return '……もう一度、お前の気持ちに触れたい。話してくれ……。';
  // Free writing is not guaranteed to contain the authored confession of fear.
  // Never make Caritas say "お前も怖いのか" unless Shion actually said so.
  if(writtenShion!==null&&!/(俺も怖い|私も怖い|自分も怖い|僕も怖い|俺も恐れ|自分も恐れ|俺だって怖い|怖いんだ|怖かった)/u.test(writtenShion))
   return '……少し、息がつける。だが……まだ、怖い。';
  return '……お前も怖いのか。……そうか。私も、怖い。';
 }
 // Conservative prototype recognition, not an AI score or a claim of full intent understanding.
 // Negation/ambiguous prose is support; only an explicit forward invitation is reach.
 function fromText(s,text){
  const value=String(text).normalize('NFKC');
  const negated=/(ない|なく|ません|ぬ|ず|いけな|やめ|なよ|なで|思うな|言うな|するな|だめ|駄目|禁止|控え|止め|な[。！？!?\s]*$)/u.test(value);
  const reach=!negated&&/(踏み込もう|踏み込みたい|踏み出そう|踏み出して|進もう|一緒に進む|手を伸ばして|手を取って)/u.test(value);
  const compass=/声|聞|聴/u.test(value)?'秘密':/足|歩|一歩/u.test(value)?'無意識':'不安';
  const route=/選ん|選ぶ|決め|待つ|待って/u.test(value)?'願い':/希望|願い|進もう/u.test(value)?'希望':'癒し';
  return {...s,words:[compass,reach?'勇気':'忍耐',route]};
 }
 function readingPages(s,{stormVoiceHeardThisTurn=false}={}){
  if(!valid(s))return [];
  const pages=s.words.map(w=>OPTIONS[w].shion);
  if(s.words[0]==='秘密'){
   const mood=Base.stateFor(s.dark);
   pages[0]=mood==='closed'?"聞いてる。『来るな』って声も、ちゃんと届いてる。"
    :mood==='storm'?(stormVoiceHeardThisTurn?"聞こえた。『頼む』って言ったよな。":"今、何か言おうとしただろ。途中までは聞こえた。")
    :"……怖いんだな。アビスに呑まれて、自分の気持ちまで分からなくなるのが。";
  }
  return pages;
 }
 function newGame(){return {...Base.newGame(),rules:RULES,finisherInfluence:emptyInfluence()};}
 function canSkill(s){return s.hp>0&&s.dark<=25&&Base.canSkill(s);}
 return Object.freeze({...Base,RULES,READING_OPTIONS:OPTIONS,optionsFor,valid,predict,read,reaction,readingPages,newGame,canSkill,observation,fromText,readingInfluence,finisherTechnique});
});
