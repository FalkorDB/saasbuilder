import assert from "node:assert/strict";
import { test } from "node:test";
import type ReCAPTCHA from "react-google-recaptcha";

import { getReCaptchaToken } from "./getReCaptchaToken";

function fakeReCaptcha(executeAsync: () => Promise<string | null>) {
  let resetCount = 0;
  const reCaptcha = {
    executeAsync,
    reset: () => {
      resetCount++;
    },
  } as unknown as ReCAPTCHA;
  return { reCaptcha, getResetCount: () => resetCount };
}

test("returns null when there is no reCAPTCHA instance", async () => {
  assert.equal(await getReCaptchaToken(null), null);
});

test("returns the token and resets the widget", async () => {
  const { reCaptcha, getResetCount } = fakeReCaptcha(async () => "token");
  assert.equal(await getReCaptchaToken(reCaptcha), "token");
  assert.equal(getResetCount(), 1);
});

test("returns null for an empty result and resets the widget", async () => {
  const { reCaptcha, getResetCount } = fakeReCaptcha(async () => null);
  assert.equal(await getReCaptchaToken(reCaptcha), null);
  assert.equal(getResetCount(), 1);
});

test("returns null instead of throwing when execution rejects, and still resets", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const { reCaptcha, getResetCount } = fakeReCaptcha(async () => {
      throw new Error("timeout");
    });
    assert.equal(await getReCaptchaToken(reCaptcha), null);
    assert.equal(getResetCount(), 1);
  } finally {
    console.error = originalConsoleError;
  }
});
