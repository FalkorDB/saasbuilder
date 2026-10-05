export function checkReCaptchaSetup(): boolean {
  const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY?.trim();
  const siteKey = (
    process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY ?? process.env.GOOGLE_RECAPTCHA_SITE_KEY
  )?.trim();

  const isSetup = Boolean(
    secretKey && siteKey && secretKey.toUpperCase() !== "DISABLED" && siteKey.toUpperCase() !== "DISABLED"
  );

  return isSetup;
}
