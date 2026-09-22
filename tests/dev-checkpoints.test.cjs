const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
test("checkpoint registry cannot write production progress",()=>{const src=fs.readFileSync("dev-checkpoints.js","utf8");assert.doesNotMatch(src,/localStorage\s*\./);assert.doesNotMatch(src,/TarotProgressCore/);});
test("unreleased Star Gate has no fake healthy checkpoint",()=>{const api=require("../dev-checkpoints.js");for(const id of ["star-gate-choice","star-gate-camera","star-gate-normal-resonance","star-gate-reverse-flow","star-gate-aftermath"])assert.equal(api.get(id),null);});
test("normal route does not load checkpoint registry",()=>{const html=fs.readFileSync("index.html","utf8");assert.doesNotMatch(html,/dev-checkpoints\.js/);});
