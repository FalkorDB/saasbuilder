import type { IdentityProvider } from "src/types/identityProvider";

type FindAutoStartIdpParams = {
  identityProviders: IdentityProvider[];
  idpParam?: string | null;
  redirectReason?: string | null;
};

/**
 * Resolves the identity provider a `/signin?idp=<name>` link asks to start.
 *
 * Returns undefined (normal sign-in page) when the param is absent, does not
 * match a configured provider by name (case-insensitive), or the previous IdP
 * attempt failed (`redirect_reason=idp_auth_error`), so a failing IdP can't loop.
 */
export function findAutoStartIdp({
  identityProviders,
  idpParam,
  redirectReason,
}: FindAutoStartIdpParams): IdentityProvider | undefined {
  if (redirectReason === "idp_auth_error") return undefined;

  const requested = idpParam?.trim().toLowerCase();
  if (!requested) return undefined;

  return identityProviders.find((idp) => idp.name?.trim().toLowerCase() === requested);
}
