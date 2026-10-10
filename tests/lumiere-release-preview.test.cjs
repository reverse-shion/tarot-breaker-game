const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const root = path.resolve(__dirname,"..");
const runtime = "9e8a85dff39e33e0eb802369228fcab4d512e035";
const page = "docs/lumiere-hover-evidence/lumiere-release-9e8a85d.html";

test("final Lumiere preview is an exact source snapshot with main's opt-in editors preserved", () => {
  const html = fs.readFileSync(path.join(root,page),"utf8");
  const match = html.match(/<script type="application\/json" id="lumiere-preview-source">([\s\S]*?)<\/script>/);
  assert(match, "pinned source manifest");
  const source = JSON.parse(match[1]);
  assert.equal(source.source_sha,runtime);
  assert.equal(Object.keys(source.files).length,39);
  for(const [file,sha] of Object.entries(source.files)){
    assert.match(source.source_commits[file],/^[0-9a-f]{40}$/);
    // Keep the immutable 9e8a85d preview's exact manifest evidence after the
    // authorized live sprite update; every other current-source check remains.
    const sourceFile = file === "assets/sprites/lumiere/lumiere_sprite_manifest.json"
      ? "tests/fixtures/lumiere-preview-manifest-9e8a85d.json" : file;
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,sourceFile))).digest("hex"),sha,file);
  }
  const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length,32);
  const js=inline.filter(([,attrs])=>!attrs.includes('type="application/json"'));
  assert.equal(js.length,31);
  for(const [, ,body] of js)new vm.Script(body);
  const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
  for(const name of ["fountain-position-editor","title-layout-editor","waterfall-position-editor"]) {
    assert(index.includes('src="./'+name+'.js'),"untouched main editor loader "+name);
    assert(html.includes('params.get("'+(
      name==="fountain-position-editor"?"fountainEditor":name==="title-layout-editor"?"titleEditor":"waterfallEditor"
    )+'")'), "editor stays opt-in");
  }
  assert(!html.includes('id="lumiere-fixed-check"'));
  assert(!html.includes('id="lumiere-region-inspector"'));
  assert(!html.includes("確認パネルを開く"));
  assert(html.includes(runtime));
  assert(html.includes('src="data:')===false,"scripts are inline, not remote data URIs");
});
