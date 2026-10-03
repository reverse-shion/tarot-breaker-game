const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");

test("Star Gate recovery is dev-bootstrap only and stops at first Future Shion",()=>{
  const index=fs.readFileSync("index.html","utf8");
  const boot=fs.readFileSync("garden-dev-bootstrap.js","utf8");
  const anomaly=fs.readFileSync("star-gate-anomaly.js","utf8");
  assert.doesNotMatch(index,/star-gate-(?:interaction|anomaly)\.js/);
  assert.match(boot,/id === "garden-resume-after-lumiere"/);
  assert.match(boot,/star-gate-interaction\.js/);
  assert.match(boot,/star-gate-anomaly\.js/);
  assert.match(anomaly,/setShion\(1\)/);
  assert.match(anomaly,/star-gate-future-shion-reached/);
  const endpoint=anomaly.indexOf('window.dispatchEvent(new Event("tarot-breaker:star-gate-future-shion-reached"))');
  const visionEnd=anomaly.indexOf("async function aftermath");
  const bounded=anomaly.slice(endpoint,visionEnd);
  assert.doesNotMatch(bounded,/setShion\([2-5]\)/);
  assert.doesNotMatch(bounded,/――選べ。/);
});

test("dev recovery does not complete durable Star Gate Progress at endpoint",()=>{
  const anomaly=fs.readFileSync("star-gate-anomaly.js","utf8");
  assert.match(anomaly,/DEV_HARNESS&&endpoint==="future-shion-reached"/);
  assert.match(anomaly,/return;\s*}\s*await aftermath\(\);complete\(\)/);
});
