const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const relativePage = "docs/lumiere-hover-evidence/lumiere-sway-28aed68-inspector.html";
const runtime = "28aed680aec11cc547cc59a831c2ec5581217da2";

test("Hair/hem inspector fixed iPhone preview sources match pinned source digests and inline scripts parse", () => {
  const html = fs.readFileSync(path.join(root, relativePage), "utf8");
  const match = html.match(/<script type="application\/json" id="lumiere-preview-source">([\s\S]*?)<\/script>/);
  assert(match, "source metadata must exist");
  const meta = JSON.parse(match[1]);
  assert.equal(meta.source_sha, runtime);
  assert.equal(Object.keys(meta.files).length, 40);
  for (const [file, digest] of Object.entries(meta.files)) {
    const commit = meta.source_commits[file];
    assert.match(commit, /^[0-9a-f]{40}$/);
    // CI checkout can omit historical git trees; current tree must still
    // match the 40 exact source digests embedded in the pinned preview.
    const content = fs.readFileSync(path.join(root, file));
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), digest,
      file + " must match its exact git source");
  }
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const js = scripts.filter(([,attrs]) => !/type="application\/json"/.test(attrs));
  assert.equal(js.length, 32, "all 32 embedded scripts must be present");
  for (const [, , code] of js) new vm.Script(code);
  assert(html.includes("const verticalRatio = kind ==="));
  assert(html.includes('candidate: "C"'));
  assert(html.includes('id="lumiere-check-spec"'));
  assert(html.includes('id="lumiere-check-diagnostics"'));
  assert(html.includes('id="lumiere-region-inspector"'));
  assert(html.includes('id="lumiere-region-crops"'));
  assert(html.includes("getDebugFrame"));
  assert(html.includes("確認位置へ"));
  assert(html.includes("髪・裾を拡大診断"));
  assert(!html.includes("毛先0.4px・裾先0.25px"));
  assert(html.includes("lumiere-check-sway"));
  assert(html.includes("確認パネルを開く"));
  assert(html.includes(runtime));
});
