/* Validate this isolated route before title previews, transit and editors run. */
(() => {
 'use strict';
 const q=new URLSearchParams(location.search);
 if(!q.getAll('dev').includes('star-gate-from-lumiere'))return;
 const safe=q.getAll('dev').length===1&&
   [...q.keys()].every(key=>key==='dev'||key==='returnDebug')&&
   (!q.has('returnDebug')||(q.getAll('returnDebug').length===1&&q.get('returnDebug')==='1'));
 if(safe)return;
 window.__TAROT_DEV_STAGE3__=true;
 window.__TAROT_STAGE3_ENTRY_REJECTED__=true;
 // Remove conflicting switches before later scripts inspect the URL.
 history.replaceState(null,'',location.pathname+'?dev=star-gate-entry-rejected'+location.hash);
})();
