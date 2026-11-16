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
  // URL query `destination=%2Finstances%2F...%2Fsub%253Ftab%253Doverview`; searchParams.get() returns
  // it decoded once (`/instances/.../sub%3Ftab%3Doverview`), which is what the helper receives
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

test("rejects paths the browser would normalize to another page (dot segments)", () => {
  assert.equal(resolveDestination("/instances/../../../api/provider-details"), undefined);
  assert.equal(resolveDestination("%2Finstances%2F..%2F..%2F..%2Fapi%2Fprovider-details"), undefined);
  assert.equal(resolveDestination("/instances/svc/plan/res/../sub"), undefined);
  assert.equal(resolveDestination("/instances/svc/plan/res/inst/.."), undefined);
  assert.equal(resolveDestination("/instances/./plan/res/inst/sub"), undefined);
  // the URL parser also treats `%2e` as a dot
  assert.equal(resolveDestination("/instances/%2e%2e/%2e%2e/%2e%2e/api/provider-details"), undefined);
  assert.equal(resolveDestination("/instances/.%2E/.%2e/x/y/z"), undefined);
});

test("keeps IDs the URL parser would percent-encode (spaces, Unicode)", () => {
  assert.equal(resolveDestination("/instances/svc/plan/res/inst a/sub"), "/instances/svc/plan/res/inst a/sub");
  assert.equal(resolveDestination("/instances/svc/plan/res/instå/sub"), "/instances/svc/plan/res/instå/sub");
  assert.equal(resolveDestination("/instances/svc/plan/res/inst.v2/sub"), "/instances/svc/plan/res/inst.v2/sub");
});
