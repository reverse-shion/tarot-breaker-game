#!/usr/bin/env node
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const registry = "docs/DEVICE_VERIFICATION_REGISTRY.md";
function git(args){ return execFileSync("git", args, {encoding:"utf8"}).trim(); }
function fail(m){ console.error("DEVICE REGISTRY GUARD: FAIL"); console.error(m); process.exit(1); }

if ((process.env.GITHUB_EVENT_NAME || "") !== "pull_request") {
  console.log("DEVICE REGISTRY GUARD: PASS (non-PR run)");
  process.exit(0);
}

const base = process.env.GITHUB_BASE_REF || "main";
try { git(["fetch","--no-tags","origin","+refs/heads/"+base+":refs/remotes/origin/"+base]); }
catch { fail("Could not fetch current base."); }

let changed="";
try { changed=git(["diff","--name-only","refs/remotes/origin/"+base+"...HEAD"]); }
catch { fail("Could not determine PR changed files."); }
const files=changed.split("\n").filter(Boolean);
if (files.length === 0) {
  console.log("DEVICE REGISTRY GUARD: PASS (no-op PR)");
  console.log("Git diff against the current base is empty; there is no repository content change to verify.");
  process.exit(0);
}
const ASSET_EXTENSIONS=/\.(?:avif|gif|jpe?g|png|svg|webp|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf)$/i;
const assetOnly=files.length>0 && files.every(f => f.startsWith("assets/") && ASSET_EXTENSIONS.test(f));
const SAFE_ASSET_ONLY_DIRS=["assets/events/","assets/audio/","assets/tarot/","assets/ui/","assets/sprites/"];
const behaviorNeutralAssetOnly=assetOnly && files.every(f => SAFE_ASSET_ONLY_DIRS.some(dir => f.startsWith(dir)));
let unreferencedNewAssetOnly=false;
if (assetOnly) {
  unreferencedNewAssetOnly=files.every(f => {
    try {
      git(["cat-file","-e","refs/remotes/origin/"+base+":"+f]);
      return false;
    } catch {
      let refs="";
      try {
        refs=git(["grep","-l","-F","--",f,"refs/remotes/origin/"+base,"--","."]);
      } catch (err) {
        // git grep exits 1 when there are no matches. For a newly added asset,
        // that is the expected "unreferenced on base" result, not a guard error.
        if (err?.status !== 1) throw err;
      }
      return !refs;
    }
  });
}
const runtime=files.filter(f =>
  !f.startsWith("docs/") &&
  !f.startsWith("tests/") &&
  !f.startsWith(".github/") &&
  !f.startsWith("scripts/") &&
  f !== "AGENTS.md"
);

const body=process.env.PR_BODY || "";
if (behaviorNeutralAssetOnly) {
  console.log("DEVICE REGISTRY GUARD: PASS (behavior-neutral asset-only PR)");
  process.exit(0);
}
if (unreferencedNewAssetOnly) {
  console.log("DEVICE REGISTRY GUARD: PASS (unreferenced new asset-only PR)");
  process.exit(0);
}
function metadataValue(key) {
  const matches=body.split(/\r?\n/).filter(line => line.trim().toUpperCase().startsWith(key + ":"));
  if (matches.length !== 1) fail("PR metadata must declare exactly one "+key+" line.");
  return matches[0].slice(matches[0].indexOf(":")+1).trim();
}
const deviceGate=metadataValue("DEVICE_GATE_REQUIRED").toUpperCase();
if (!["YES","NO"].includes(deviceGate)) fail("DEVICE_GATE_REQUIRED must be YES or NO.");
const needsDevice=deviceGate==="YES";
const scope=metadataValue("SCOPE").toUpperCase();
const foundation=scope==="FOUNDATION";

if (foundation && runtime.length) fail("FOUNDATION scope changes production/runtime files: "+runtime.join(", "));
if (needsDevice) {
  const runtimeSha=metadataValue("DEVICE_RUNTIME_SHA").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(runtimeSha)) fail("DEVICE_RUNTIME_SHA must be one exact 40-character commit SHA.");
  try { git(["merge-base","--is-ancestor",runtimeSha,"HEAD"]); }
  catch { fail("DEVICE_RUNTIME_SHA is not an ancestor of the PR head."); }

  let runtimeChangedAfterEvidence="";
  try { runtimeChangedAfterEvidence=git(["diff","--name-only",runtimeSha+"..HEAD","--",":(exclude)docs/**",":(exclude)tests/**",":(exclude).github/**",":(exclude)scripts/**",":(exclude)AGENTS.md"]); }
  catch { fail("Could not verify runtime immutability after DEVICE_RUNTIME_SHA."); }
  if (runtimeChangedAfterEvidence) {
    fail("Production/runtime files changed after DEVICE_RUNTIME_SHA: "+runtimeChangedAfterEvidence.split("\n").filter(Boolean).join(", "));
  }

  const reg=fs.readFileSync(registry,"utf8").toLowerCase();
  if (!reg.includes(runtimeSha)) fail("DEVICE_RUNTIME_SHA is not recorded in the Device Verification Registry.");
  if (!/DEVICE_RESULT:\s*PASS/i.test(body)) fail("Runtime-SHA registry evidence exists, but PR body does not declare DEVICE_RESULT: PASS.");
}
console.log("DEVICE REGISTRY GUARD: PASS");
console.log(needsDevice ? "Required runtime-SHA device evidence found; later evidence-only changes are separated from the verified runtime." : "No Device Gate requested by PR contract.");
