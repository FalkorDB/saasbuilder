import assert from "node:assert/strict";
import { test } from "node:test";

import { safeDecodeURIComponent } from "./safeDecodeURIComponent";

test("decodes valid percent-encoding", () => {
  assert.equal(safeDecodeURIComponent("Acme%20Inc"), "Acme Inc");
  assert.equal(safeDecodeURIComponent("a%40b.io"), "a@b.io");
  assert.equal(safeDecodeURIComponent("%25"), "%");
});

test("returns the raw value for malformed input instead of throwing", () => {
  assert.equal(safeDecodeURIComponent("%E0"), "%E0");
  assert.equal(safeDecodeURIComponent("a%b@x.io"), "a%b@x.io");
  assert.equal(safeDecodeURIComponent("%E0%A4%A"), "%E0%A4%A");
});
