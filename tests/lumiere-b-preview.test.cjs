const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const relativePage = "docs/lumiere-hover-evidence/lumiere-clean-b99f3d4.html";
const runtime = "b99f3d443dc6969af48850776ad2ee9b89eafd43";

test("Clean candidate preview pins game source and contains no visible editor scripts", () => {
  const html = fs.readFileSync(path.join(root, relativePage), "utf8");
  const match = html.match(/<script type="application\/json" id="lumiere-preview-source">([\s\S]*?)<\/script>/);
  assert(match, "source metadata must exist");
  const meta = JSON.parse(match[1]);
  assert.equal(meta.source_sha, runtime);
  assert.equal(Object.keys(meta.files).length, 39);
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
  assert.equal(js.length, 28, "all 28 game scripts must parse after debug-only editor removal");
  for (const [, , code] of js) new vm.Script(code);
  assert(html.includes("const verticalRatio = kind ==="));
  assert(html.includes('candidate: "C"'));
  assert(!html.includes('id="lumiere-check-spec"'));
  assert(!html.includes('id="lumiere-check-diagnostics"'));
  assert(!html.includes('id="lumiere-region-inspector"'));
  assert(!html.includes('id="lumiere-region-crops"'));
  assert(!html.includes('id="lumiere-fixed-check"'));
  assert(!html.includes("確認パネルを開く"));
  assert(!html.includes("髪・裾を拡大診断"));
  assert(!html.includes("毛先0.4px・裾先0.25px"));
  assert(!html.includes("lumiere-check-sway"));
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const editor of ["fountain-position-editor.js", "title-layout-editor.js", "waterfall-position-editor.js"]) {
    assert(!index.includes('src="./'+editor), editor+" may not load on the gameplay route");
    assert(!html.includes("window.Tarot"+({ "fountain-position-editor.js":"Fountain","title-layout-editor.js":"Title","waterfall-position-editor.js":"Waterfall" }[editor])+"Editor"));
  }
  assert(index.includes('src="./lumiere-sway.js'));
  assert(index.includes('src="./game.js'));

  assert(html.includes(runtime));
});
