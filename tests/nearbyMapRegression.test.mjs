import test from "node:test";
import assert from "node:assert/strict";
import { classifyMapIssue } from "../src/features/nearby/mapIssue.js";
import { NEARBY_CATEGORIES } from "../src/features/nearby/nearbyCategories.js";

test("2GIS map access, network, WebGL and styling errors have useful categories", () => {
  assert.equal(classifyMapIssue({ code: "invalidtilekey" }), "key");
  assert.equal(classifyMapIssue({ status: 403 }), "key");
  assert.equal(classifyMapIssue(new Error("Failed to fetch script")), "network");
  assert.equal(classifyMapIssue(new Error("2GIS script loading timed out")), "network");
  assert.equal(classifyMapIssue({ type: "webglcontextlost" }), "webgl");
  assert.equal(classifyMapIssue({ type: "styleloaderror" }), "style");
  assert.equal(classifyMapIssue(new Error("unexpected")), "unknown");
});

test("Russian category names distinguish public veterinary services from Our Services mode", () => {
  assert.equal(NEARBY_CATEGORIES.emergency.ruLabel, "Экстренная ветпомощь");
  assert.equal(NEARBY_CATEGORIES.veterinary.ruLabel, "Ветеринарные клиники");
  assert.ok(Object.hasOwn(NEARBY_CATEGORIES, "hotels"));
});
