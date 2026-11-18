import type { Page } from "@playwright/test";
import { jwtDecode } from "jwt-decode";
import { getIdentityProviderButtonLabel } from "app/(public)/(main-image)/signin/utils";
import { PageURLs } from "page-objects/pages";
import { SigninPage } from "page-objects/signin-page";
import { expect, test } from "test-fixtures/har-test";
import { GlobalStateManager } from "test-utils/global-state-manager";
import { ProviderAPIClient } from "test-utils/provider-api-client";
import { getHubSpotScriptSrc } from "../../src/hubspotConfig";
import { IdentityProvider } from "src/types/identityProvider";

test.describe("Signin Page", () => {
  let signinPage: SigninPage;

  test.beforeEach(async ({ page }) => {
    signinPage = new SigninPage(page);
    await signinPage.navigate();
  });

  test("Email Field Validation", async ({ page }) => {
    const dataTestIds = signinPage.dataTestIds;
    await expect(page.getByTestId(dataTestIds.emailInput)).toBeVisible();
    await page.getByTestId(dataTestIds.emailInput).fill("invalid-email");
    await page.getByTestId(dataTestIds.nextButton).click();
    await expect(page.locator("#email-helper-text")).toContainText(signinPage.pageElements.invalidEmailText);
  });

  test("Login Option Elements", async ({ page }) => {
    await signinPage.goToLoginOptionsStep();

    //check that the other sign in options button is visible
    await expect(page.getByTestId(signinPage.dataTestIds.otherSignInOptionsButton)).toBeVisible();
    await page.getByTestId(signinPage.dataTestIds.otherSignInOptionsButton).click();
    if (process.env.DISABLE_PASSWORD_LOGIN !== "true") {
      //check that the password login button is visible
      await expect(page.getByTestId(signinPage.dataTestIds.passwordLoginButton)).toBeVisible();
      page.getByTestId(signinPage.dataTestIds.passwordLoginButton).click();

      // Check Forgot Password and Create Account Links
      if (process.env.ENVIRONMENT_TYPE === "PROD") {
        await expect(page.getByRole("link", { name: "Forgot Password" })).toHaveAttribute(
          "href",
          PageURLs.resetPassword
        );
        await expect(page.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", PageURLs.signup);
      } else {
        await expect(page.getByRole("link", { name: "Forgot Password" })).not.toBeVisible();
        await expect(page.getByRole("link", { name: "New to FalkorDB? Sign Up" })).not.toBeVisible();
      }

      //check that the email input is disabled
      await expect(page.getByTestId(signinPage.dataTestIds.emailInput)).toBeDisabled();
      //check that the password input is visible
      await expect(page.getByTestId(signinPage.dataTestIds.passwordInput)).toBeVisible();
      //test password required validation
      await page.getByTestId(signinPage.dataTestIds.passwordInput).fill("");
      await page.getByTestId(signinPage.dataTestIds.passwordInput).blur();

      await expect(page.locator("#password-helper-text")).toContainText(signinPage.pageElements.passwordRequiredText);
    } else {
      await expect(page.getByTestId(signinPage.dataTestIds.passwordLoginButton)).toBeHidden();
    }
  });

  test("Login", async ({ page }) => {
    await signinPage.signInWithPassword();

    // Wait for Instances Page to Load
    await page.waitForURL(PageURLs.instances);
  });

  test("Forgot Password Action", async ({ page }) => {
    const dataTestIds = signinPage.dataTestIds;
    await signinPage.goToPasswordLoginStep();
    // Check Forgot Password Link
    if (process.env.ENVIRONMENT_TYPE === "PROD") {
      await expect(page.getByRole("link", { name: "Forgot Password" })).toHaveAttribute("href", PageURLs.resetPassword);
      await page.getByRole("link", { name: "Forgot Password" }).click();
      //heading should be visible
      await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
      await page.getByTestId(dataTestIds.emailInput).fill(process.env.USER_EMAIL!);
      await page.getByTestId(dataTestIds.resetPasswordSubmitButton).click();
      // Check for success message
      await expect(page.getByRole("heading", { name: "Check Your Email for a Password Reset Link" })).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: "Forgot Password" })).not.toBeVisible();
    }
  });

  test("Cookie Settings Banner", async ({ page }) => {
    const dataTestIds = signinPage.dataTestIds,
      pageElements = signinPage.pageElements;

    await expect(page.getByTestId(dataTestIds.cookieConsentBanner)).toBeVisible();
    await expect(page.getByTestId(dataTestIds.cookieConsentBanner)).toContainText(pageElements.cookieConsentText);

    // Click on Accept All
    await expect(page.getByRole("link", { name: pageElements.cookiePolicyText })).toHaveAttribute(
      "href",
      PageURLs.cookiePolicy
    );
    await page.getByRole("button", { name: "Accept All" }).click();
    await expect(page.getByTestId(dataTestIds.cookieConsentBanner)).not.toBeVisible();

    // Click on Cookie Settings Text
    await page.getByText("Cookie Settings").click();
    await expect(page.getByTestId(dataTestIds.cookieConsentBanner)).toBeVisible();

    // Click on Reject All
    await page.getByRole("button", { name: "Reject All" }).click();
    await expect(page.getByTestId(dataTestIds.cookieConsentBanner)).not.toBeVisible();
  });

  for (const analyticsEnabled of [true, false]) {
    test(`Migrating version-1 consent (analytics ${analyticsEnabled ? "enabled" : "disabled"}) requires fresh analytics opt-in`, async ({
      page,
    }) => {
      const hubspotRequests: string[] = [];
      // The analytics category only exists when GA and/or HubSpot is configured (same rules as the app)
      const analyticsConfigured =
        Boolean(process.env.GOOGLE_ANALYTICS_TAG_ID) ||
        Boolean(getHubSpotScriptSrc(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID, process.env.NEXT_PUBLIC_HUBSPOT_REGION));

      page.on("request", (request) => {
        const hostname = new URL(request.url()).hostname;
        if (hostname === "js.hs-scripts.com" || /^js-[a-z0-9]+\.hs-scripts\.com$/i.test(hostname)) {
          hubspotRequests.push(request.url());
        }
      });
      await page.route(/^https:\/\/js(?:-[a-z0-9]+)?\.hs-scripts\.com\/\d+\.js(?:\?.*)?$/, (route) =>
        route.fulfill({ contentType: "application/javascript", body: "" })
      );
      await page.evaluate((enabled) => {
        localStorage.setItem(
          "cookieConsent",
          JSON.stringify({
            version: 1,
            consentGiven: true,
            categories: [
              { category: "necessary", services: [], hide: false, editable: false, enabled: true },
              {
                category: "analytics",
                services: [{ type: "script", name: "googletagmanager", cookies: [] }],
                hide: false,
                editable: true,
                enabled,
              },
            ],
          })
        );
      }, analyticsEnabled);

      for (let reload = 0; reload < 2; reload += 1) {
        await page.reload();
        await page.waitForFunction(() => {
          const consent = JSON.parse(localStorage.getItem("cookieConsent") ?? "null");
          return consent?.version === 2;
        });

        const migratedConsent = await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("cookieConsent") ?? "null") as {
              consentGiven: boolean;
              categories: Array<{
                category: string;
                enabled: boolean;
                services: Array<{ name: string }>;
              }>;
            }
        );
        const analyticsCategory = migratedConsent.categories.find((category) => category.category === "analytics");
        // The analytics category gained a new service (HubSpot), so an earlier opt-in must not carry over
        expect(migratedConsent.consentGiven).toBe(false);
        // The app decides from its build-time env, which may differ from this runner's env: only require the
        // category when this runner is configured, and validate its shape whenever the app produced it.
        if (analyticsConfigured) expect(analyticsCategory).toBeDefined();
        if (analyticsCategory) {
          expect(analyticsCategory.enabled).toBe(false);
          expect(analyticsCategory.services.map((service) => service.name)).toContain("hubspot");
        }

        // Nothing is tracked until the user opts in again
        await expect(page.locator("#hs-script-loader")).toHaveCount(0);
        expect(hubspotRequests).toHaveLength(0);
      }
    });
  }

  // check that the identity providers buttons are visible based on the email domain
  test("Identity Provider Buttons", async ({ page }) => {
    const apiClient = new ProviderAPIClient();

    const identityProviders = await apiClient.getIdentityProviders();
    const dataTestIds = signinPage.dataTestIds;

    await signinPage.goToLoginOptionsStep();

    // Check that the other sign in options button is visible
    //get the email input from the email field
    const emailInput = await page.getByTestId(dataTestIds.emailInput).inputValue();
    const emailDomain = emailInput.split("@")[1] || "";

    const domainFilteredIdps = identityProviders.filter((idp) => {
      if (idp.emailIdentifiers === undefined || idp.emailIdentifiers === "") return true;

      const emailIdentifiersList = idp.emailIdentifiers.split(",").map((identifier) => identifier.trim());

      return emailIdentifiersList.some((identifier) => {
        return identifier === emailDomain;
      });
    });

    if (domainFilteredIdps.length > 0) {
      //Check that the other sign in options button is visible
      await expect(page.getByTestId(signinPage.dataTestIds.otherSignInOptionsButton)).toBeVisible();
      await page.getByTestId(signinPage.dataTestIds.otherSignInOptionsButton).click();
      //check that a button for each identity provider is visible
      for (const idp of domainFilteredIdps) {
        const buttonLabel = getIdentityProviderButtonLabel(idp);
        await expect(page.getByRole("button", { name: buttonLabel })).toBeVisible();
      }
    }
  });

  test("Identity Provider Redirect", async ({ page }) => {
    const state = "idp-auth-state";
    const identityProviderName = "Test Identity Provider";

    const authState = {
      identityProvider: identityProviderName,
      nonce: state,
    };

    const encodedLocalAuthState = Buffer.from(JSON.stringify(authState), "utf8").toString("base64");

    await page.evaluate((encodedLocalAuthState) => {
      sessionStorage.setItem("authState", encodedLocalAuthState);
    }, encodedLocalAuthState);

    // Obtain a fresh session independently of user-setup, then let the callback
    // install all auth cookies, including the client-readable signed-in indicator.
    const signinResponse = await page.request.post("/api/signin", {
      data: { email: process.env.USER_EMAIL!, password: process.env.USER_PASSWORD! },
    });
    expect(signinResponse.status()).toBe(200);
    await page.context().clearCookies();

    await page.route("**/api/sign-in-with-idp", async (route) => {
      await route.fulfill({ response: signinResponse, body: JSON.stringify({}) });
    });

    await page.goto(`/idp-auth?state=${state}&code=test-code`);

    //expect page to have redirected to the instances page
    await expect(page).toHaveURL(PageURLs.instances, { timeout: 10000 });
  });
});

// `/signin?idp=<name>` starts that identity provider's sign-in without a click (#213).
// The IdP itself is never contacted: its origin is stubbed and requests to it are recorded.

const REMEMBERED_EMAIL = "remembered.user@example.com";

async function getHttpIdentityProvider(): Promise<{ idp: IdentityProvider; origin: string } | null> {
  const identityProviders = await new ProviderAPIClient().getIdentityProviders();
  for (const idp of identityProviders) {
    try {
      const url = new URL(idp.renderedAuthorizationEndpoint);
      if (url.protocol === "https:" || url.protocol === "http:") return { idp, origin: url.origin };
    } catch {
      // not a usable endpoint; try the next provider
    }
  }
  return null;
}

/** Stubs the IdP origin and returns the URLs the page requested from it. */
async function stubIdentityProvider(page: Page, origin: string): Promise<string[]> {
  const requested: string[] = [];
  await page.route(
    (url) => url.origin === origin,
    async (route) => {
      requested.push(route.request().url());
      await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>IdP</body></html>" });
    }
  );
  return requested;
}

function isLiveJwt(token?: string): boolean {
  if (!token) return false;
  try {
    const exp = jwtDecode<{ exp?: number }>(token)?.exp;
    return typeof exp === "number" && exp > Date.now() / 1000 + 60;
  } catch {
    return false;
  }
}

/** Cookies of a session the middleware lets through to /signin: no access token, a refresh token and the indicator. */
async function addRefreshableSessionCookies(page: Page, baseURL: string) {
  await page.context().addCookies([
    { name: "omnistrate_refresh_token", value: "test-refresh-token", url: baseURL },
    { name: "omnistrate_logged_in", value: "true", url: baseURL },
  ]);
}

test.describe("Signin ?idp= auto-start", () => {
  let provider: { idp: IdentityProvider; origin: string } | null;

  test.beforeAll(async () => {
    provider = await getHttpIdentityProvider();
  });

  test.beforeEach(async ({ baseURL }) => {
    test.skip(!provider, "No identity provider with an http(s) authorization endpoint is configured");
    test.skip(provider?.origin === new URL(baseURL!).origin, "Identity provider is served from the portal origin");
  });

  test("starts the identity provider with the remembered email as login_hint", async ({ page }) => {
    const { idp, origin } = provider!;

    // localStorage is per origin, so load the portal once before seeding the remembered email
    await new SigninPage(page).navigate();
    await page.evaluate((email) => localStorage.setItem("lastLoginEmail", email), REMEMBERED_EMAIL);

    const requested = await stubIdentityProvider(page, origin);
    await page.goto(`${PageURLs.signin}?idp=${encodeURIComponent(idp.name)}`);

    await page.waitForURL((url) => url.origin === origin, { timeout: 10000 });
    expect(requested.length).toBeGreaterThan(0);
    expect(new URL(page.url()).searchParams.get("login_hint")).toBe(REMEMBERED_EMAIL);
  });

  test("skips the identity provider when the session can be refreshed", async ({ page, baseURL }) => {
    const { idp, origin } = provider!;
    const userToken = GlobalStateManager.getToken("user");
    // Without a live token (e.g. a replay-mode fixture) the middleware would let /instances through on
    // the dummy refresh cookie alone, so the URL check below would prove nothing. With a live token it
    // validates the session against /user and sends an invalid one back to /signin.
    test.skip(!isLiveJwt(userToken), "No unexpired user token available to stand in for the refreshed session");

    await addRefreshableSessionCookies(page, baseURL!);
    // Mock must set the httpOnly cookie (like the real server does)
    await page.route("**/api/refresh-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Set-Cookie": `omnistrate_token=${userToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` },
        body: JSON.stringify({}),
      })
    );
    const requested = await stubIdentityProvider(page, origin);

    await page.goto(
      `${PageURLs.signin}?idp=${encodeURIComponent(idp.name)}&destination=${encodeURIComponent(PageURLs.instances)}`
    );

    await expect(page).toHaveURL(PageURLs.instances, { timeout: 10000 });
    expect(requested).toEqual([]);
  });

  test("starts the identity provider when the session cannot be refreshed", async ({ page, baseURL }) => {
    const { idp, origin } = provider!;

    await addRefreshableSessionCookies(page, baseURL!);
    await page.route("**/api/refresh-token", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({}) })
    );
    const requested = await stubIdentityProvider(page, origin);

    await page.goto(`${PageURLs.signin}?idp=${encodeURIComponent(idp.name)}`);

    await page.waitForURL((url) => url.origin === origin, { timeout: 10000 });
    expect(requested.length).toBeGreaterThan(0);
  });

  test("starts the identity provider when the session refresh never responds", async ({ page, baseURL }) => {
    const { idp, origin } = provider!;

    await addRefreshableSessionCookies(page, baseURL!);
    // Leave the refresh pending (never fulfilled) so only the auto-start timeout can move on
    let refreshRequests = 0;
    await page.route("**/api/refresh-token", () => {
      refreshRequests++;
      return new Promise<void>(() => {});
    });
    const requested = await stubIdentityProvider(page, origin);

    await page.goto(`${PageURLs.signin}?idp=${encodeURIComponent(idp.name)}`);

    await page.waitForURL((url) => url.origin === origin, { timeout: 15000 });
    expect(refreshRequests).toBeGreaterThan(0);
    expect(requested.length).toBeGreaterThan(0);
  });

  test("prefers an invitation's email over the remembered one as login_hint", async ({ page }) => {
    const { idp, origin } = provider!;
    const invitedEmail = "invited.user@example.com";

    await new SigninPage(page).navigate();
    await page.evaluate((email) => localStorage.setItem("lastLoginEmail", email), REMEMBERED_EMAIL);

    const requested = await stubIdentityProvider(page, origin);
    await page.goto(
      `${PageURLs.signin}?idp=${encodeURIComponent(idp.name)}&email=${encodeURIComponent(invitedEmail)}&org=${encodeURIComponent("Acme Inc")}`
    );

    await page.waitForURL((url) => url.origin === origin, { timeout: 10000 });
    expect(requested.length).toBeGreaterThan(0);
    expect(new URL(page.url()).searchParams.get("login_hint")).toBe(invitedEmail);
  });

  test("shows the sign-in form for an unknown identity provider", async ({ page }) => {
    const signinPage = new SigninPage(page);
    const requested = await stubIdentityProvider(page, provider!.origin);

    await page.goto(`${PageURLs.signin}?idp=${encodeURIComponent("not-a-configured-provider")}`);

    await expect(page.getByTestId(signinPage.dataTestIds.emailInput)).toBeVisible();
    expect(requested).toEqual([]);
  });

  test("shows the sign-in form after an identity provider error", async ({ page }) => {
    const signinPage = new SigninPage(page);
    const requested = await stubIdentityProvider(page, provider!.origin);

    await page.goto(`${PageURLs.signin}?idp=${encodeURIComponent(provider!.idp.name)}&redirect_reason=idp_auth_error`);

    await expect(page.getByTestId(signinPage.dataTestIds.emailInput)).toBeVisible();
    expect(requested).toEqual([]);
  });
});

test.describe("Provider API authentication", () => {
  const invalidSignatureToken = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) - 60,
        userID: "user-auth-regression",
        organizationID: "org-auth-regression",
        serviceProviderID: "org-auth-regression",
      })
    ).toString("base64url"),
    Buffer.alloc(32).toString("base64url"),
  ].join(".");

  const invalidSessions = [
    { name: "missing", cookie: "omnistrate_refresh_token=invalid-refresh" },
    { name: "malformed", cookie: "omnistrate_refresh_token=invalid-refresh; omnistrate_token=malformed-jwt" },
    {
      name: "invalid-signature",
      cookie: `omnistrate_refresh_token=invalid-refresh; omnistrate_token=${invalidSignatureToken}`,
    },
    {
      name: "newline-containing",
      cookie: "omnistrate_refresh_token=invalid-refresh; omnistrate_token=invalid%0Acredential",
    },
    {
      name: "carriage-return-containing",
      cookie: "omnistrate_refresh_token=invalid-refresh; omnistrate_token=invalid%0Dcredential",
    },
    {
      name: "unicode-containing",
      cookie: "omnistrate_refresh_token=invalid-refresh; omnistrate_token=%E2%82%AC",
    },
  ];

  for (const endpoint of ["resources", "version-sets", "cloud-providers", "product-tier-custom-metrics"]) {
    for (const session of invalidSessions) {
      test(`${endpoint} rejects ${session.name} tokens with 401`, async ({ request }) => {
        const response = await request.get(`/api/${endpoint}`, {
          params: { serviceId: "s-auth-regression", productTierId: "pt-auth-regression" },
          // A refresh hint lets the page proxy defer auth to the API route.
          // Neither cookie is a real credential; the route must reject this session.
          headers: { Cookie: session.cookie },
          maxRedirects: 0,
        });

        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ message: "Not authenticated" });
      });
    }
  }
});
