import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDestination } from "./resolveDestination";

const INSTANCE = "/instances/svc/plan/res/inst/sub";

test("resolves known routes, decoding once more", () => {
  assert.equal(resolveDestination("/instances"), "/instances");
  assert.equal(resolveDestination("%2Finstances"), "/instances");
  assert.equal(resolveDestination(INSTANCE), INSTANCE);
  assert.equal(resolveDestination(encodeURIComponent(INSTANCE)), INSTANCE);
});

test("decodes a partially encoded dynamic route the same way for every caller", () => {
  // `searchParams.get()` value of `destination=%2Finstances%2F...%2Fsub%253Ftab%253Doverview`
  assert.equal(resolveDestination(`${INSTANCE}%3Ftab%3Doverview`), `${INSTANCE}?tab=overview`);
});

test("returns undefined for absent, malformed, unknown and open-redirect values", () => {
  assert.equal(resolveDestination(null), undefined);
  assert.equal(resolveDestination(""), undefined);
  assert.equal(resolveDestination("%E0"), undefined);
  assert.equal(resolveDestination("/not-a-page"), undefined);
  assert.equal(resolveDestination("//evil.example"), undefined);
  assert.equal(resolveDestination("%2F%2Fevil.example"), undefined);
  assert.equal(resolveDestination("https://evil.example/instances"), undefined);
});
