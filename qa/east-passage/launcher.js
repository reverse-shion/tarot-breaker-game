/* Only the disposable QA launcher uses this. No I/O until an explicit click. */
(function(){
"use strict";
const safety=window.TarotEastPassageQASafety;
const origin=location.origin,approved=window.TarotEastPassageQAApprovedOrigin;
const gate=safety?.approve(origin,approved)||{ok:false,reason:"guard-missing"};
const status=document.getElementById("status"),addr=document.getElementById("origin");
const consent=document.getElementById("consent"),button=document.getElementById("start");
const fixture=document.getElementById("fixture"),message=document.getElementById("message");
addr.textContent="現在のオリジン: "+origin;
status.textContent=gate.ok?"隔離オリジン確認済み（まだ保存はしていません）":
 "安全ロック: "+gate.reason+"。新規セーブは作成できません。";
function controls(){button.disabled=!gate.ok||!consent.checked;}
consent.addEventListener("change",controls);controls();
button.addEventListener("click",function(){
 if(!gate.ok||!consent.checked)return;
 const result=safety.seed({actualOrigin:location.origin,approvedOrigin:approved,
  storage:window.localStorage,core:window.TarotProgressCore,kind:fixture.value});
 if(!result.ok){message.textContent="停止: "+result.reason;return;}
 message.textContent="隔離QA用の状態を保存しました。ゲームへ移動します。";
 location.assign("../../index.html?entry=continue");
});
})();