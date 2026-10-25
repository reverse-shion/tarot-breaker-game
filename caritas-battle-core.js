/* TAROT BREAKER — isolated Caritas encounter, no Production persistence. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.CaritasBattleCore=api;
})(typeof window!=="undefined"?window:this,function(){
"use strict";
const CARDS=Object.freeze([
 {name:"月",role:"COMPASS",words:["不安","秘密","無意識"],mark:"☾"},
 {name:"力",role:"TRIGGER",words:["忍耐","自制","勇気"],mark:"∞"},
 {name:"星",role:"ROUTE",words:["希望","癒し","願い"],mark:"✦"}
]);
const STAGES=Object.freeze([
 {speech:"……まさか、私がアビスに呑まれるとは……",clue:"カリタスの耳が小さく震えている。爪は地面を強くつかんだままだ。",support:[["不安","秘密"],["忍耐","自制"],["希望","癒し","願い"]]},
 {speech:"……情けない。この弱さを……知られたくはない……",clue:"カリタスは目を伏せ、伸ばしかけた前脚をそっと引っ込める。",support:[["秘密","無意識"],["自制","勇気"],["癒し","願い"]]},
 {speech:"……それでも……まだ、ここで終わりたくはない……",clue:"カリタスは顔を上げ、消えかけた光を見つめている。",support:[["不安","無意識"],["忍耐","勇気"],["希望","願い"]]}
]);
const TACTICS=Object.freeze({
 "癒し":{name:"寄り添う",guard:.5,reduce:[12,12,12],speeches:["怖かったんだな。少し休んでもいいんじゃないか？","強がらなくていい。今の気持ちを否定する必要はない。","急がなくていい。まだ歩きたいなら、そばにいる。"],replies:["……恐れても……よいのだろうか。","……恐れを見せることが、怖かったのかもしれぬ。","……この静けさを、忘れていた。"]},
 "願い":{name:"見定める",guard:.25,reduce:[22,20,18],speeches:["アビスが怖いのか？ それとも、怖がる自分が許せないのか？","誰にも知られたくないほど、何を責めている？","何を失いたくないのか、まだ言葉にできそうか？"],replies:["……私は……何を恐れているのだろうな。","……そうか。私は、自分を縛っていたのか。","……それでも、まだ願ってよいのか。"]},
 "希望":{name:"踏み込む",guard:0,reduce:[34,30,26],speeches:["弱さを見せてもいい。俺たちも力を貸せる。","一人で立ち上がれなくてもいい。手を伸ばしてくれ。","まだ歩きたいなら、その一歩を一緒に選ばないか？"],replies:["……この私が、誰かを頼る……？","……そのようなことを、考えたこともなかった。","……一歩だけなら……進めるかもしれぬ。"]}
});
const MEANINGS={"不安":"不安を見つめ","秘密":"隠した心へ目を向け","無意識":"言葉にならない気持ちを見つめ","忍耐":"耐えてきた時間を認め","自制":"自分を縛る気持ちをほどき","勇気":"小さな勇気を信じ","希望":"一歩を共に選ぶ","癒し":"休める場所を探す","願い":"本当の願いを問いかける"};
const ENDING=Object.freeze([
 ["シオン","……少しは落ち着いたか？"],
 ["カリタス","……ああ。私は、自分の弱さを認めることが何より恐ろしかったのかもしれぬ。"],
 ["シオン","……これからどうする？"],
 ["カリタス","……まだ、答えは出ぬ。だが……もう一度歩いてみようと思う。"],
 ["カリタス","……世話になった。"],
 ["シオン","……さあ、俺たちも行こう。"]
]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const newGame=()=>({phase:"read",step:0,hp:100,resonance:0,dark:100,used:false,turn:0,words:["不安","忍耐","癒し"],endIndex:0,spoken:"",result:""});
const forecast=s=>s.turn%3===1?24:12;
const points=s=>STAGES[s.step].support.reduce((n,v,i)=>n+Number(v.includes(s.words[i])),0);
const preview=s=>s.words.map(w=>MEANINGS[w]).join("、")+"。";
function attack(s,guard){
 // Fixed mitigation: Defense 75%; reading route 0/25/50%.
 const damage=Math.ceil(forecast(s)*(1-guard));
 s.hp=clamp(s.hp-damage,0,100);s.turn++;
 if(s.hp===0)s.phase="defeat";
 return damage;
}
function select(state,index,word){
 if(state.phase!=="read"||!CARDS[index]?.words.includes(word))return state;
 const s={...state,words:[...state.words]};s.words[index]=word;return s;
}
function read(state){
 if(state.phase!=="read")return state;
 const s={...state,words:[...state.words]},t=TACTICS[s.words[2]],stage=s.step,p=points(s);
 s.spoken="シオン「"+t.speeches[stage]+"」";
 if(p>=2){
   s.resonance=clamp(s.resonance+[34,33,33][stage],0,100);
   const dark=t.reduce[stage]+(p===3?5:0);
   s.dark=clamp(s.dark-dark,0,100);
   s.result="カリタス「"+t.replies[stage]+"」　共鳴＋"+[34,33,33][stage]+"／闇−"+dark;
   s.step++;
   if(s.resonance===100){s.phase="ending";s.endIndex=0;return s;}
 }else{
   s.result="……まだ届かない。カリタスは目を伏せた。";
 }
 const damage=attack(s,t.guard);
 s.result+="　HP−"+damage;
 return s;
}
function defend(state){
 if(state.phase!=="read")return state;
 const s={...state,words:[...state.words],spoken:"シオリエルがシオンの前に立った。"};
 const damage=attack(s,.75);
 s.result="防御。HP−"+damage+"。";
 return s;
}
function skill(state){
 if(state.phase!=="read"||state.used||state.resonance<33||state.dark>67)return state;
 const s={...state,words:[...state.words],used:true,spoken:"シオリエル「……シオン、言葉は届いている。」"};
 s.resonance=clamp(s.resonance+33,0,100);s.dark=clamp(s.dark-25,0,100);
 s.result="星の光が闇の揺らぎを押し返す。共鳴＋33／闇−25。";
 if(s.resonance===100){s.phase="ending";s.endIndex=0;s.turn++;return s;}
 // A technique also triggers one announced counterattack unless it wins.
 const damage=attack(s,0);
 s.result+="　HP−"+damage;
 return s;
}
function next(state){
 if(state.phase!=="ending")return state;
 const s={...state,endIndex:state.endIndex+1};
 if(s.endIndex>=ENDING.length)s.phase="complete";
 return s;
}
return Object.freeze({CARDS,STAGES,TACTICS,ENDING,newGame,forecast,points,preview,select,read,defend,skill,next});
});
