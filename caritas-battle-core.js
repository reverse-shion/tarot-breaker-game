/* TAROT BREAKER — Caritas heart-resonance v1.3-C (isolated Starroad encounter).
 * All combat arithmetic is deterministic integers. No production save changes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.CaritasBattleCore=api;
})(typeof window!=="undefined"?window:this,function(){
"use strict";
const CARDS=Object.freeze([
 {id:"18-the-moon",name:"月",role:"COMPASS",major:true,words:["不安","秘密","無意識"],mark:"☾"},
 {id:"08-strength",name:"力",role:"TRIGGER",major:true,words:["忍耐","自制","勇気"],mark:"∞"},
 {id:"17-the-star",name:"星",role:"ROUTE",major:true,words:["希望","癒し","願い"],mark:"✦"}
]);
const TYPE=Object.freeze({
 "不安":"P","秘密":"F","無意識":"S",
 "忍耐":"P","自制":"S","勇気":"F",
 "希望":"F","癒し":"P","願い":"S"
});
const TABLE=Object.freeze({
 closed:Object.freeze({P:[12,15,6],F:[15,5,15],S:[10,16,10]}),
 storm:Object.freeze({P:[6,8,7],F:[20,10,13],S:[10,10,10]}),
 wavering:Object.freeze({P:[10,12,7],F:[14,8,13],S:[12,25,10]})
});
const STATES=Object.freeze({closed:"閉ざす",storm:"荒れる",wavering:"揺らぐ",freed:"解放"});
const MEANINGS=Object.freeze({"不安":"不安を見つめ","秘密":"隠した心へ目を向け","無意識":"言葉にならない気持ちを見つめ","忍耐":"耐えてきた時間を認め","自制":"自分を縛る気持ちをほどき","勇気":"小さな勇気を信じ","希望":"一歩を共に選ぶ","癒し":"休める場所を探す","願い":"本当の願いを問いかける"});
// Player-facing full interpretations. Internal word IDs retain the audited 27-outcome combat math.
const READING_OPTIONS=Object.freeze({
 "不安":Object.freeze({title:"恐れを見定める",text:"まだ輪郭のない恐れを消すより先に、その正体を見つめる。怖さは敵ではなく、失いたくないものを知らせる声かもしれない。",shion:"お前と向き合って、俺も気づいた。怖いものから目を逸らしてきた自分がいる。まず、その恐れを見定めたい。"}),
 "秘密":Object.freeze({title:"知らない自分を認める",text:"自分にも説明できない感情や、隠してきた弱さを、存在しないことにしない。分からなさを認めることで、はじめて今の自分が見えてくる。",shion:"お前と向き合って、俺の中にも逃げたい気持ちがあると知った。知らなかった俺自身を、もう否定したくない。"}),
 "無意識":Object.freeze({title:"答えのない場所に立つ",text:"正解を急がず、心の奥にまだ言葉にならないものがあると受け止める。迷いが消えないままでも、その場所に立っていられる。",shion:"すぐに答えが出ないこともある。俺にも、まだ名前のない迷いがある。今はそれを抱えたまま、ここに立っている。"}),
 "忍耐":Object.freeze({title:"怒りを意志に変える",text:"内側にある激しさをただ解き放つのではなく、守りたいものを選ぶ力へと変える。力は相手をねじ伏せるためだけにあるのではない。",shion:"だから、怒りを誰かにぶつけるより、守るための意志に変える。俺は、その力を選びたい。"}),
 "自制":Object.freeze({title:"恐れとともに踏み出す",text:"勇気は怖さが消えることではない。恐れを抱えた自分を見捨てず、一歩を踏み出すと自分の意志で決めることだ。",shion:"それでも俺は、怖さを抱えたまま一歩踏み出した。その一歩が、今の俺をここに立たせている。"}),
 "勇気":Object.freeze({title:"衝動に形を与える",text:"力任せにぶつかるのではなく、気持ちを行動としてどう使うかを選ぶ。強さとは、自分の力に責任を持つことでもある。",shion:"だから、ただ力任せに押し切ることはしない。衝動の先に、俺が選ぶ行動の形を与える。"}),
 "希望":Object.freeze({title:"願いを目印に届ける",text:"叶うと保証できない未来にも、小さな希望は置ける。相手の道を決めるのではなく、進む方角を一緒に照らす言葉を届ける。",shion:"俺がここに来たのは、未来を決めつけるためじゃない。小さな願いを目印に、この言葉をお前へ届ける！"}),
 "癒し":Object.freeze({title:"心を開いて届ける",text:"相手を変えようとせず、まず自分の弱さも含めて言葉を差し出す。受け取るかどうかを決めるのは、目の前の相手だ。",shion:"だから、お前にも偽らずに話す。俺も怖い。それでも、お前と向き合いたいんだ。この言葉を、閉ざされた心の奥へ届ける！"}),
 "願い":Object.freeze({title:"応えられる場所へ届ける",text:"言葉の強さだけで心は開かない。相手の選ぶ余白を残し、応えられる場所にそっと言葉を置いて待つ。",shion:"返事を強いるつもりはない。お前が応えられる場所まで、言葉を届ける。そこからどうするかは、お前が選んでいい！"})
});
function readingPages(s){
 if(!valid(s))return [];
 return s.words.map(w=>READING_OPTIONS[w].shion);
}
const ENDING=Object.freeze([
 ["シオン","……少しは落ち着いたか？"],
 ["カリタス","……ああ。私は、自分の弱さを認めることが何より恐ろしかったのかもしれぬ。"],
 ["シオン","……これからどうする？"],
 ["カリタス","……まだ、答えは出ぬ。だが……もう一度歩いてみようと思う。"],
 ["カリタス","……世話になった。"],
 ["シオン","……さあ、俺たちも行こう。"]
]);
const STAGES=Object.freeze([
 {speech:"……まさか、私がアビスに呑まれるとは……",clue:"カリタスは口を閉ざし、こちらを見ようとしない。"},
 {speech:"……情けない。この弱さを……知られたくはない……",clue:"カリタスは強く身をこわばらせ、爪が地面を引っかく。"},
 {speech:"……それでも……まだ、ここで終わりたくはない……",clue:"カリタスの視線が揺れ、言葉にならない本音が漏れる。"}
]);
const TACTICS=Object.freeze({
 "癒し":{name:"寄り添う",speeches:["怖かったんだな。少し休んでもいいんじゃないか？","強がらなくていい。今の気持ちを否定する必要はない。","急がなくていい。まだ歩きたいなら、そばにいる。"],replies:["……恐れても……よいのだろうか。","……恐れを見せることが、怖かったのかもしれぬ。","……この静けさを、忘れていた。"]},
 "願い":{name:"本心を探る",speeches:["アビスが怖いのか？ それとも、怖がる自分が許せないのか？","誰にも知られたくないほど、何を責めている？","何を失いたくないのか、まだ言葉にできそうか？"],replies:["……私は……何を恐れているのだろうな。","……そうか。私は、自分を縛っていたのか。","……それでも、まだ願ってよいのか。"]},
 "希望":{name:"踏み込む",speeches:["弱さを見せてもいい。俺たちも力を貸せる。","一人で立ち上がれなくてもいい。手を伸ばしてくれ。","まだ歩きたいなら、その一歩を一緒に選ばないか？"],replies:["……この私が、誰かを頼る……？","……そのようなことを、考えたこともなかった。","……一歩だけなら……進めるかもしれぬ。"]}
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const forecast=()=>15;
const stateFor=dark=>dark===0?"freed":dark>=71?"closed":dark>=36?"storm":"wavering";
const bucket=n=>n===0?"変化なし":n<=7?"わずかに":n<=14?"通常":"大きく";
const newGame=(cards=CARDS)=>({
 phase:"read",turn:0,step:0,hp:100,dark:100,resonance:0,
 cards:cards.map(c=>({id:c.id,name:c.name,role:c.role,major:!!c.major,words:[...c.words]})),
 words:[null,null,null],lastReading:null,lastEffect:null,used:false,finisherType:null
});
function valid(s){return Array.isArray(s.words)&&s.words.length===3&&s.words.every((w,i)=>s.cards?.[i]?.words?.includes(w)&&TYPE[w]);}
function preview(s){return s.words.map(w=>w?MEANINGS[w]:"まだ選んでいない").join("、")+"。";}
function points(){return 3;}
function predict(s){
 if(s.phase!=="read"||!valid(s))return null;
 const state=stateFor(s.dark),v=s.words.map(w=>TABLE[state][TYPE[w]]);
 const dark=Math.min(s.dark,Math.floor((v[0][0]+v[1][0]+v[2][0]+1)/3));
 const resonance=Math.min(100-s.resonance,Math.floor((v[0][1]+v[1][1]+v[2][1]+1)/3));
 const endDark=s.dark-dark===0,endRes=s.resonance+resonance===100;
 const rawDamage=Math.floor((v[0][2]+v[1][2]+v[2][2]+1)/2);
 const damage=endDark||endRes?0:Math.min(s.hp,rawDamage);
 return {state,dark,resonance,damage,rawDamage,hasCounter:!endDark&&!endRes,darkBucket:bucket(dark),resBucket:bucket(resonance)};
}
function select(s,i,word){
 if(s.phase!=="read"||!s.cards[i]?.words.includes(word)||!TYPE[word])return s;
 const words=[...s.words];words[i]=word;return {...s,words};
}
function read(s){
 const p=predict(s);if(!p)return s;
 const next={...s,turn:s.turn+1,step:Math.min(2,s.step+1),words:[...s.words],lastReading:[...s.words],lastEffect:p,
  dark:clamp(s.dark-p.dark,0,100),resonance:clamp(s.resonance+p.resonance,0,100),hp:clamp(s.hp-p.damage,0,100)};
 next.phase=next.dark===0?"ending":next.resonance===100?"finisher":next.hp===0?"defeat":"read";
 return next;
}
// AI adds a limited one-time, grounded understanding bonus. Cards remain the
// primary way to release darkness; AI alone cannot erase the last darkness point.
function applyAiInsight(s,ids){
 if(s.phase!=="read"||s.aiInsightTurn===s.turn||!Array.isArray(ids))return s;
 const allowed=["fear_of_weakness","self_blame","wish_to_continue","acknowledge_pain","offer_support","respect_choice"];
 const count=new Set(ids.filter(id=>allowed.includes(id))).size;
 if(!count)return s;
 const bonus=Math.min(12,4*count,100-s.resonance);
 const relief=Math.min(Math.max(0,s.dark-1),2*Math.min(3,count));
 if(!bonus&&!relief)return s;
 const resonance=s.resonance+bonus;
 return {...s,resonance,dark:s.dark-relief,aiInsightTurn:s.turn,
  phase:resonance===100?"finisher":"read"};
}
function canSkill(s){return s.phase==="finisher"&&s.cards.some(c=>c.major);}
function finish(s,mode){
 if(s.phase!=="finisher"||!["dialogue","skill"].includes(mode)||(mode==="skill"&&!canSkill(s)))return s;
 return {...s,phase:"ending",dark:0,used:mode==="skill",finisherType:mode};
}
function next(s){return s.phase==="ending"?{...s,phase:"complete"}:s;}
return Object.freeze({CARDS,TYPE,TABLE,STATES,STAGES,TACTICS,ENDING,MEANINGS,READING_OPTIONS,readingPages,newGame,forecast,stateFor,bucket,valid,points,preview,predict,select,read,applyAiInsight,canSkill,finish,next});
});
