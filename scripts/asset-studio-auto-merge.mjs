#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const REQUIRED_WORKFLOWS = [
  "Validate TAROT BREAKER 2D",
  "Event Safety / Main Merge Gate",
];

export function metadataValue(body, key) {
  const prefix = key.toUpperCase() + ":";
  const matches = String(body || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().toUpperCase().startsWith(prefix));
  if (matches.length !== 1) return null;
  return matches[0].slice(matches[0].indexOf(":") + 1).trim().toUpperCase();
}

export function isEligiblePr(pr, owner) {
  if (!pr || pr.state !== "open" || pr.draft) return false;
  if (pr.base?.ref !== "main") return false;
  if (!String(pr.head?.ref || "").startsWith("asset-studio/")) return false;
  if (pr.user?.login !== owner) return false;
  if (!String(pr.title || "").startsWith("Asset Studio:")) return false;

  const body = String(pr.body || "");
  if (!body.includes("Asset Studioから自動生成されたPRです。")) return false;
  if (metadataValue(body, "DEVICE_GATE_REQUIRED") !== "NO") return false;
  if (metadataValue(body, "SCOPE") !== "RUNTIME") return false;
  return true;
}

export function areFilesSafe(files) {
  return Array.isArray(files) &&
    files.length > 0 &&
    files.every((file) => {
      const name = String(file.filename || "");
      return name.startsWith("assets/") &&
        !name.includes("..") &&
        file.status !== "removed" &&
        (name.endsWith(".webp") || name.endsWith(".json"));
    });
}

export function requiredRunsPassed(runs) {
  return REQUIRED_WORKFLOWS.every((name) => {
    const candidates = (runs || [])
      .filter((run) => run.name === name)
      .sort((a, b) =>
        new Date(b.updated_at || b.created_at || 0) -
        new Date(a.updated_at || a.created_at || 0)
      );
    const latest = candidates[0];
    return latest?.status === "completed" && latest?.conclusion === "success";
  });
}

function apiHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...apiHeaders(token), ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { message: text }; }
  }
  if (!response.ok) {
    const error = new Error(data.message || ("GitHub API error " + response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function paginate(url, token) {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const join = url.includes("?") ? "&" : "?";
    const data = await request(url + join + "per_page=100&page=" + page, token);
    if (!Array.isArray(data)) throw new Error("Expected a paginated GitHub array response.");
    items.push(...data);
    if (data.length < 100) break;
  }
  return items;
}

async function mergePr({ apiBase, repo, token, pr, sha }) {
  const url = apiBase + "/repos/" + repo + "/pulls/" + pr.number + "/merge";
  try {
    const result = await request(url, token, {
      method: "PUT",
      body: JSON.stringify({ sha, merge_method: "merge" }),
    });
    if (!result.merged) throw new Error(result.message || "GitHub did not merge the pull request.");
    console.log("ASSET STUDIO AUTO MERGE: merged PR #" + pr.number);
    return true;
  } catch (error) {
    const fresh = await request(
      apiBase + "/repos/" + repo + "/pulls/" + pr.number,
      token
    ).catch(() => null);
    if (fresh?.merged || fresh?.state === "closed") {
      console.log("ASSET STUDIO AUTO MERGE: PR #" + pr.number + " was already closed/merged.");
      return true;
    }
    throw error;
  }
}

export async function main(env = process.env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.REPOSITORY;
  const owner = env.REPOSITORY_OWNER;
  const sha = env.HEAD_SHA;
  const apiBase = "https://api.github.com";

  if (!token || !repo || !owner || !sha) {
    throw new Error("Missing GITHUB_TOKEN, REPOSITORY, REPOSITORY_OWNER, or HEAD_SHA.");
  }

  const prs = await request(
    apiBase + "/repos/" + repo + "/commits/" + sha + "/pulls",
    token
  );
  const candidates = (Array.isArray(prs) ? prs : []).filter((pr) =>
    isEligiblePr(pr, owner)
  );

  if (!candidates.length) {
    console.log("ASSET STUDIO AUTO MERGE: no eligible open PR for this workflow run.");
    return;
  }

  for (const pr of candidates) {
    if (pr.head?.sha !== sha) {
      console.log("ASSET STUDIO AUTO MERGE: skip PR #" + pr.number + "; head SHA moved.");
      continue;
    }

    const files = await paginate(
      apiBase + "/repos/" + repo + "/pulls/" + pr.number + "/files",
      token
    );
    if (!areFilesSafe(files)) {
      console.log("ASSET STUDIO AUTO MERGE: skip PR #" + pr.number + "; changes are not Asset Studio-only.");
      continue;
    }

    const runResponse = await request(
      apiBase + "/repos/" + repo + "/actions/runs?head_sha=" +
        encodeURIComponent(sha) + "&event=pull_request&per_page=100",
      token
    );
    if (!requiredRunsPassed(runResponse.workflow_runs || [])) {
      console.log("ASSET STUDIO AUTO MERGE: skip PR #" + pr.number + "; both required workflows are not PASS yet.");
      continue;
    }

    const comparison = await request(
      apiBase + "/repos/" + repo + "/compare/main..." + sha,
      token
    );
    if (comparison.status !== "ahead" || comparison.behind_by !== 0) {
      console.log("ASSET STUDIO AUTO MERGE: skip PR #" + pr.number + "; branch is not based on current main.");
      continue;
    }

    await mergePr({ apiBase, repo, token, pr, sha });
  }
}

const isDirect =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirect) {
  main().catch((error) => {
    console.error("ASSET STUDIO AUTO MERGE: FAIL");
    console.error(error?.stack || error);
    process.exit(1);
  });
}
