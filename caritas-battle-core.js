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
function canSkill(s){return s.phase==="finisher"&&s.cards.some(c=>c.major);}
function finish(s,mode){
 if(s.phase!=="finisher"||!["dialogue","skill"].includes(mode)||(mode==="skill"&&!canSkill(s)))return s;
 return {...s,phase:"ending",dark:0,used:mode==="skill",finisherType:mode};
}
function next(s){return s.phase==="ending"?{...s,phase:"complete"}:s;}
return Object.freeze({CARDS,TYPE,TABLE,STATES,STAGES,TACTICS,ENDING,MEANINGS,newGame,forecast,stateFor,bucket,valid,points,preview,predict,select,read,canSkill,finish,next});
});
