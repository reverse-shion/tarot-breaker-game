const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("main lineage guard enforces current base ancestry", () => {
  const s = fs.readFileSync("scripts/main-lineage-guard.cjs", "utf8");
  assert.match(s, /merge-base/);
  assert.match(s, /--is-ancestor/);
  assert.match(s, /GITHUB_BASE_REF/);
  assert.match(s, /GITHUB_HEAD_REF/);
  assert.match(s, /process\.exit\(1\)/);
});

test("main merge workflow executes lineage guard", () => {
  const y = fs.readFileSync(".github/workflows/verified-gameplay-contracts.yml", "utf8");
  assert.match(y, /Main lineage guard/);
  assert.match(y, /node scripts\/main-lineage-guard\.cjs/);
  assert.match(y, /fetch-depth:\s*0/);
});
