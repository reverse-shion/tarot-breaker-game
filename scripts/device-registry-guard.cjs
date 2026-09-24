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
const ASSET_EXTENSIONS=/\.(?:avif|gif|jpe?g|png|svg|webp|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf)$/i;
const assetOnly=files.length>0 && files.every(f => f.startsWith("assets/") && ASSET_EXTENSIONS.test(f));
let unreferencedNewAssetOnly=false;
if (assetOnly) {
  unreferencedNewAssetOnly=files.every(f => {
    try {
      git(["cat-file","-e","refs/remotes/origin/"+base+":"+f]);
      return false; // Existing asset changed/replaced: keep the full Device Gate contract.
    } catch {
      const refs=git(["grep","-l","-F","--",f,"refs/remotes/origin/"+base,"--","."]);
      return !refs; // New asset is safe only while current base does not reference its path.
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
if (unreferencedNewAssetOnly) {
  console.log("DEVICE REGISTRY GUARD: PASS (unreferenced new asset-only PR)");
  console.log("Files are newly added under assets/, are not present on the base branch, and are not referenced by the current base.");
  process.exit(0);
}
function metadataValue(key) {
  const matches=body.split(/\r?\n/).filter(line => line.trim().toUpperCase().startsWith(key + ":"));
  if (matches.length !== 1) fail("PR metadata must declare exactly one "+key+" line.");
  return matches[0].slice(matches[0].indexOf(":")+1).trim().toUpperCase();
}
const deviceGate=metadataValue("DEVICE_GATE_REQUIRED");
if (!["YES","NO"].includes(deviceGate)) fail("DEVICE_GATE_REQUIRED must be YES or NO.");
const needsDevice=deviceGate==="YES";
const scope=metadataValue("SCOPE");
const foundation=scope==="FOUNDATION";

if (foundation && runtime.length) fail("FOUNDATION scope changes production/runtime files: "+runtime.join(", "));
if (needsDevice) {
  const sha=(process.env.GITHUB_SHA || "").toLowerCase();
  const reg=fs.readFileSync(registry,"utf8").toLowerCase();
  if (!sha || !reg.includes(sha)) {
    fail("DEVICE_GATE_REQUIRED: YES but the exact candidate SHA is not recorded in the Device Verification Registry.");
  }
  if (!/DEVICE_RESULT:\s*PASS/i.test(body)) {
    fail("Exact-SHA registry evidence exists, but PR body does not declare DEVICE_RESULT: PASS.");
  }
}
console.log("DEVICE REGISTRY GUARD: PASS");
console.log(needsDevice ? "Required exact-SHA device evidence found." : "No Device Gate requested by PR contract.");
