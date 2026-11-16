import assert from "node:assert/strict";
import { test } from "node:test";

import type { IdentityProvider } from "src/types/identityProvider";

import { buildInvitationInfo } from "../shared/idp-utils";

import { findAutoStartIdp, getValidDestination } from "./findAutoStartIdp";

const idp = (name: string) =>
  ({ name, identityProviderName: "OIDC", renderedAuthorizationEndpoint: "https://idp" }) as IdentityProvider;

const identityProviders = [idp("Google"), idp("FalkorDB Cloud")];

test("returns the provider whose name matches, case-insensitively", () => {
  assert.equal(findAutoStartIdp({ identityProviders, idpParam: "falkordb cloud" })?.name, "FalkorDB Cloud");
  assert.equal(findAutoStartIdp({ identityProviders, idpParam: " GOOGLE " })?.name, "Google");
});

test("returns undefined when the param is absent or empty", () => {
  assert.equal(findAutoStartIdp({ identityProviders, idpParam: null }), undefined);
  assert.equal(findAutoStartIdp({ identityProviders, idpParam: "  " }), undefined);
});

test("returns undefined for an unknown provider", () => {
  assert.equal(findAutoStartIdp({ identityProviders, idpParam: "Okta" }), undefined);
});

test("never auto-starts after an IdP error", () => {
  assert.equal(
    findAutoStartIdp({ identityProviders, idpParam: "Google", redirectReason: "idp_auth_error" }),
    undefined
  );
});

test("getValidDestination keeps a known route, still encoded", () => {
  assert.equal(getValidDestination("%2Finstances"), "%2Finstances");
  assert.equal(getValidDestination("/instances"), "/instances");
});

test("getValidDestination drops absent, malformed, unknown and open-redirect values", () => {
  assert.equal(getValidDestination(null), undefined);
  assert.equal(getValidDestination(""), undefined);
  assert.equal(getValidDestination("%25"), undefined);
  assert.equal(getValidDestination("%E0%A4%A"), undefined);
  assert.equal(getValidDestination("/not-a-page"), undefined);
  assert.equal(getValidDestination("//evil.example"), undefined);
});

test("buildInvitationInfo tolerates malformed encoding instead of throwing", () => {
  assert.deepEqual(buildInvitationInfo({ email: "a%b@x.io", org: "Acme%20Inc", orgUrl: "%E0%A4%A" }), {
    invitedEmail: "a%b@x.io",
    legalCompanyName: "Acme Inc",
    companyUrl: "%E0%A4%A",
  });
});
