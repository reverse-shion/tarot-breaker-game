const test = require("node:test");
const assert = require("node:assert/strict");

const policyPromise = import("../scripts/asset-studio-auto-merge.mjs");

function pr(overrides = {}) {
  return {
    state: "open",
    draft: false,
    base: { ref: "main" },
    head: { ref: "asset-studio/20260924-test", sha: "abc" },
    user: { login: "reverse-shion" },
    title: "Asset Studio: assets/events/test.webp",
    body:
      "DEVICE_GATE_REQUIRED: NO\n" +
      "SCOPE: RUNTIME\n\n" +
      "Asset Studioから自動生成されたPRです。",
    ...overrides,
  };
}

test("Asset Studio policy accepts only tightly scoped generated PRs", async () => {
  const { isEligiblePr } = await policyPromise;
  assert.equal(isEligiblePr(pr(), "reverse-shion"), true);
  assert.equal(isEligiblePr(pr({ draft: true }), "reverse-shion"), false);
  assert.equal(isEligiblePr(pr({ base: { ref: "develop" } }), "reverse-shion"), false);
  assert.equal(isEligiblePr(pr({ head: { ref: "feature/x", sha: "abc" } }), "reverse-shion"), false);
  assert.equal(isEligiblePr(pr({ user: { login: "someone-else" } }), "reverse-shion"), false);
  assert.equal(isEligiblePr(pr({ title: "Manual asset update" }), "reverse-shion"), false);
  assert.equal(
    isEligiblePr(pr({ body: "DEVICE_GATE_REQUIRED: NO\nSCOPE: RUNTIME" }), "reverse-shion"),
    false
  );
});

test("Asset Studio policy requires exact CI metadata", async () => {
  const { isEligiblePr, metadataValue } = await policyPromise;
  assert.equal(metadataValue(pr().body, "DEVICE_GATE_REQUIRED"), "NO");
  assert.equal(metadataValue(pr().body, "SCOPE"), "RUNTIME");
  assert.equal(
    isEligiblePr(
      pr({ body: "DEVICE_GATE_REQUIRED: YES\nSCOPE: RUNTIME\n\nAsset Studioから自動生成されたPRです。" }),
      "reverse-shion"
    ),
    false
  );
  assert.equal(
    isEligiblePr(
      pr({ body: "DEVICE_GATE_REQUIRED: NO\nSCOPE: FOUNDATION\n\nAsset Studioから自動生成されたPRです。" }),
      "reverse-shion"
    ),
    false
  );
});

test("Asset Studio policy permits only WebP/JSON files below assets and never deletions", async () => {
  const { areFilesSafe } = await policyPromise;
  assert.equal(areFilesSafe([{ filename: "assets/events/a.webp", status: "added" }]), true);
  assert.equal(
    areFilesSafe([
      { filename: "assets/sprites/shion/a.webp", status: "modified" },
      { filename: "assets/sprites/shion/a_manifest.json", status: "added" },
    ]),
    true
  );
  assert.equal(areFilesSafe([{ filename: "game.js", status: "modified" }]), false);
  assert.equal(areFilesSafe([{ filename: "assets/events/a.js", status: "added" }]), false);
  assert.equal(areFilesSafe([{ filename: "assets/events/a.webp", status: "removed" }]), false);
  assert.equal(areFilesSafe([]), false);
});

test("Asset Studio policy requires both workflows to be completed successfully", async () => {
  const { requiredRunsPassed } = await policyPromise;
  const good = [
    {
      name: "Validate TAROT BREAKER 2D",
      status: "completed",
      conclusion: "success",
      updated_at: "2026-09-24T00:00:00Z",
    },
    {
      name: "Event Safety / Main Merge Gate",
      status: "completed",
      conclusion: "success",
      updated_at: "2026-09-24T00:00:01Z",
    },
  ];
  assert.equal(requiredRunsPassed(good), true);
  assert.equal(requiredRunsPassed(good.slice(0, 1)), false);
  assert.equal(
    requiredRunsPassed([
      good[0],
      { ...good[1], conclusion: "failure" },
    ]),
    false
  );
});
