#!/usr/bin/env node
const { execFileSync } = require("node:child_process");

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function fail(message) {
  console.error("MAIN LINEAGE GUARD: FAIL");
  console.error(message);
  process.exit(1);
}

const event = process.env.GITHUB_EVENT_NAME || "";
if (event !== "pull_request") {
  console.log("MAIN LINEAGE GUARD: PASS (non-PR run; Ruleset protects main)");
  process.exit(0);
}

const baseRef = process.env.GITHUB_BASE_REF || "main";
const headRef = process.env.GITHUB_HEAD_REF;
if (!headRef) fail("GITHUB_HEAD_REF is missing.");

try {
  git(["fetch", "--no-tags", "--prune", "origin",
    "+refs/heads/" + baseRef + ":refs/remotes/origin/" + baseRef,
    "+refs/heads/" + headRef + ":refs/remotes/origin/" + headRef]);
} catch (error) {
  fail("Could not fetch the PR base/head refs.");
}

const base = "refs/remotes/origin/" + baseRef;
const head = "refs/remotes/origin/" + headRef;

try {
  git(["merge-base", "--is-ancestor", base, head]);
} catch (error) {
  const mergeBase = git(["merge-base", base, head]);
  fail(
    "PR head does not contain the current " + baseRef + " tip. " +
    "merge-base=" + mergeBase + ". Update the branch from current " +
    baseRef + " and rerun the gate."
  );
}

console.log("MAIN LINEAGE GUARD: PASS");
console.log("Current " + baseRef + " is an ancestor of PR head.");
