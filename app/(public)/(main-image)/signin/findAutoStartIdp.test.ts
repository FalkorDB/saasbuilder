import assert from "node:assert/strict";
import { test } from "node:test";

import type { IdentityProvider } from "src/types/identityProvider";

import { findAutoStartIdp } from "./findAutoStartIdp";

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
