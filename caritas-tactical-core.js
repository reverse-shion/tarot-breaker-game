/* Opt-in battle rules. Legacy arithmetic and special transactions stay intact. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else if(location.pathname.endsWith('/hoshisuna-main.html')&&new URLSearchParams(location.search).get('dev')==='hoshisuna'&&new URLSearchParams(location.search).get('battle')==='tactical')root.CaritasBattleCore=factory(root.CaritasBattleCore);
})(typeof window!=='undefined'?window:this,function(Base){
 'use strict';
 const RULES='tactical-v1';
 const OPTIONS=Object.freeze({...Base.READING_OPTIONS,
  '不安':{title:'安心できる間合いを探る',text:'相手が安心していられる距離を探る。怖さを決めつけず、どこまで近づけるかを見極める。',shion:'近づかれるのが、今はつらいんだな。お前が立っていられる距離から、俺は話す。'},
  '秘密':{title:'消えかけた声に耳を澄ます',text:'言葉を急かさず、声が届かない理由を探る。話したくないのか、闇に遮られているのかを見分ける。',shion:'言いかけた声が聞こえた。言えないことを迫りたいんじゃない。その声を、闇に消させたくない。'},
  '無意識':{title:'残っている意志を探る',text:'沈黙のなかに残る意志を探る。次の一歩を代わりに決めず、相手の選択を待つ。',shion:'お前は、まだここに踏みとどまっている。その一歩をどうするか、俺はお前の言葉を聞きたい。'},
  '忍耐':{title:'静かに支える',text:'距離を保って声を届ける。拒絶が強い時は安全に闇を解ける。アビスが声を遮っている時は、支えるだけでは闇は解けない。',shion:'急がなくていい。俺はここにいる。今、応じられる言葉からでいい。'},
  '勇気':{title:'一歩踏み込む',text:'声が届く場所へ踏み込む。助けを求める声には大きく応えられる。明確な拒絶を押すと維持力を50失う。',shion:'その声を、確かに聞いた。俺も一歩踏み込む。届くところまで、この言葉を届ける！'},
  '希望':{title:'願いを目印に届ける',text:'侵蝕をさらに5解く。その分、維持力を5多く使う。相手の未来は決めつけない。',shion:'先の道を俺が決めることはしない。それでも、今ここに小さな希望を置こう。'},
  '癒し':{title:'傍らから届ける',text:'維持力の消耗を3抑える。拒絶を押して踏み込む時の50消耗は軽減できない。',shion:'お前を変えようとするより、まず俺の言葉を差し出す。受け取るかは、お前が選んでいい。'},
  '願い':{title:'応答の余白を残す',text:'侵蝕を解けた時、共鳴がさらに5深まる。届かなかった同じ言葉を繰り返しても、共鳴は増えない。',shion:'今すぐ答えを決めなくていい。お前が応じられる場所に、この言葉を置く。'}
 });
 const OBSERVATIONS=Object.freeze({
  closed:{speech:'……近づくでない。今は……答えられぬ。',clue:'星獣は身を引き、爪を立てて距離を保とうとしている。強く迫れば危険だ。',focus:['身を引くたび、闇が輪郭に張りつく。','拒絶の言葉は、まだ本人の声で聞こえる。','足が後ろへ退く。距離を保とうとしている。']},
  storm:{speech:'……助け……声が……闇に……！',clue:'こちらへ顔を向けた。助けを求める声をアビスが遮る。支えて待つだけでは闇を解けない。',focus:['逃げる動きは止まった。こちらを見ている。','助けを求める声を、闇が遮っている。','足は止まり、前へ出ようともがいている。']},
  wavering:{speech:'……まだ……歩きたい。だが、怖いのだ。',clue:'星獣は逃げずにこちらを見ている。支えても踏み込んでも届く。残りの維持力を見て選ぼう。',focus:['身を引かず、こちらを見ている。','恐れと願いが、同じ声で聞こえる。','自分の意志で踏みとどまっている。']}
 });
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
  const n={...s,turn:s.turn+1,step:Math.min(2,s.step+1),lastReading:[...s.words],lastEffect:p,hp:s.hp-p.damage,dark:s.dark-p.dark,resonance:s.resonance+p.resonance};
  n.phase=n.hp===0?'defeat':n.resonance===100&&n.dark<=25?'finisher':'read';
  return n;
 }
 function reaction(s,p){
  if(p.misread)return '……近づくなと言った！ まだ、答えられぬのだ……！';
  if(p.blocked)return '……聞こえて……いる。だが、この闇が……声を……！';
  if(p.state==='closed')return '……その距離なら……お前の声が、聞こえる。';
  if(p.state==='storm')return '……届いた。闇の向こうから、お前の声が……。';
  return s.words[2]==='願い'?'……私が選んでよいのだな。……まだ、歩きたい。':'……怖さは残る。だが、もう一度、歩いてみたい。';
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
 function readingPages(s){return valid(s)?s.words.map(w=>OPTIONS[w].shion):[];}
 function newGame(){return {...Base.newGame(),rules:RULES};}
 function canSkill(s){return s.hp>0&&s.dark<=25&&Base.canSkill(s);}
 return Object.freeze({...Base,RULES,READING_OPTIONS:OPTIONS,optionsFor,valid,predict,read,reaction,readingPages,newGame,canSkill,observation,fromText});
});
