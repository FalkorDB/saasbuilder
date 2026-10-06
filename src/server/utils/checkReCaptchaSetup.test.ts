import { test } from "node:test";
import assert from "node:assert/strict";

import { checkReCaptchaSetup, getReCaptchaSiteKey } from "./checkReCaptchaSetup";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const previousEnv = { ...process.env };
  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    process.env = previousEnv;
  }
}

test("uses GOOGLE_RECAPTCHA_SITE_KEY when NEXT_PUBLIC key is missing", () => {
  withEnv(
    { GOOGLE_RECAPTCHA_SECRET_KEY: "secret", GOOGLE_RECAPTCHA_SITE_KEY: "site-key", NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY: undefined },
    () => {
      assert.equal(getReCaptchaSiteKey(), "site-key");
      assert.equal(checkReCaptchaSetup(), true);
    }
  );
});

test("falls back to NEXT_PUBLIC site key", () => {
  withEnv(
    { GOOGLE_RECAPTCHA_SECRET_KEY: "secret", GOOGLE_RECAPTCHA_SITE_KEY: undefined, NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY: "public-site-key" },
    () => {
      assert.equal(getReCaptchaSiteKey(), "public-site-key");
      assert.equal(checkReCaptchaSetup(), true);
    }
  );
});

test("is not set up when the site key is empty", () => {
  withEnv(
    { GOOGLE_RECAPTCHA_SECRET_KEY: "secret", GOOGLE_RECAPTCHA_SITE_KEY: "", NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY: "" },
    () => {
      assert.equal(getReCaptchaSiteKey(), null);
      assert.equal(checkReCaptchaSetup(), false);
    }
  );
});

test("rejects disabled values", () => {
  withEnv({ GOOGLE_RECAPTCHA_SECRET_KEY: "DISABLED", GOOGLE_RECAPTCHA_SITE_KEY: "disabled" }, () => {
    assert.equal(checkReCaptchaSetup(), false);
  });
});
