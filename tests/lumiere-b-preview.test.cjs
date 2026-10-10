const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const cp = require("node:child_process");

const root = path.resolve(__dirname, "..");
const relativePage = "docs/lumiere-hover-evidence/lumiere-sway-454f85e.html";
const runtime = "454f85e8dc7adc98cbe3b905bffa3f911d62af58";

test("Option B fixed iPhone preview sources match pinned Git history and inline scripts parse", () => {
  const html = fs.readFileSync(path.join(root, relativePage), "utf8");
  const match = html.match(/<script type="application\\/json" id="lumiere-preview-source">([\\s\\S]*?)<\\/script>/);
  assert(match, "source metadata must exist");
  const meta = JSON.parse(match[1]);
  assert.equal(meta.source_sha, runtime);
  assert.equal(Object.keys(meta.files).length, 40);
  for (const [file, digest] of Object.entries(meta.files)) {
    const commit = meta.source_commits[file];
    assert.match(commit, /^[0-9a-f]{40}$/);
    const content = cp.execFileSync("git", ["show", commit + ":" + file], {cwd: root});
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), digest,
      file + " must match its exact git source");
  }
  const scripts = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/g)];
  const js = scripts.filter(([,attrs]) => !/type="application\\/json"/.test(attrs));
  assert.equal(js.length, 32, "all 32 embedded scripts must be present");
  for (const [, , code] of js) new vm.Script(code);
  assert(html.includes("const verticalRatio = kind ==="));
  assert(html.includes("lumiere-check-sway"));
  assert(html.includes("確認パネルを開く"));
  assert(html.includes(runtime));
});
