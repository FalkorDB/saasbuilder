import type ReCAPTCHA from "react-google-recaptcha";

// Runs the invisible reCAPTCHA challenge and always resets the widget.
// Returns null if the challenge fails (executeAsync rejects on network errors or
// timeouts) so the form still submits and the server decides whether a token is required.
export async function getReCaptchaToken(reCaptcha: ReCAPTCHA | null): Promise<string | null> {
  if (!reCaptcha) return null;

  try {
    return await reCaptcha.executeAsync();
  } catch (error) {
    console.error("reCAPTCHA execution failed", error);
    return null;
  } finally {
    reCaptcha.reset();
  }
}
