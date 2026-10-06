// Read at runtime on the server. GOOGLE_RECAPTCHA_SITE_KEY takes precedence because
// NEXT_PUBLIC_* values are inlined at build time and may be missing from the build.
export function getReCaptchaSiteKey(): string | null {
  const siteKey = (process.env.GOOGLE_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY)?.trim();
  return siteKey || null;
}

export function checkReCaptchaSetup(): boolean {
  const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY?.trim();
  const siteKey = getReCaptchaSiteKey();

  const isSetup = Boolean(
    secretKey && siteKey && secretKey.toUpperCase() !== "DISABLED" && siteKey.toUpperCase() !== "DISABLED"
  );

  return isSetup;
}
