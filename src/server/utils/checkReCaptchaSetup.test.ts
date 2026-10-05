import { test } from "node:test";
import assert from "node:assert/strict";

import { checkReCaptchaSetup } from "./checkReCaptchaSetup";

test("checkReCaptchaSetup accepts NEXT_PUBLIC site key", () => {
  const previousEnv = { ...process.env };

  try {
    process.env.GOOGLE_RECAPTCHA_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY = "public-site-key";
    delete process.env.GOOGLE_RECAPTCHA_SITE_KEY;

    assert.equal(checkReCaptchaSetup(), true);
  } finally {
    process.env = previousEnv;
  }
});

test("checkReCaptchaSetup rejects empty or disabled values", () => {
  const previousEnv = { ...process.env };

  try {
    process.env.GOOGLE_RECAPTCHA_SECRET_KEY = "DISABLED";
    process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY = "disabled";

    assert.equal(checkReCaptchaSetup(), false);
  } finally {
    process.env = previousEnv;
  }
});
