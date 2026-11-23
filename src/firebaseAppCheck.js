import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
} from "firebase/app-check";
import app from "./firebase.js";

let appCheck;

export function initializeFirebaseAppCheck() {
  if (appCheck) return appCheck;

  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey) {
    throw new Error("Missing Firebase App Check configuration: VITE_RECAPTCHA_ENTERPRISE_SITE_KEY.");
  }

  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
}

// Firebase AI Logic enforces App Check. Explicitly confirm a valid token before
// making a model request instead of silently continuing after initialization fails.
export async function verifyFirebaseAiAppCheck() {
  let instance;
  try {
    instance = initializeFirebaseAppCheck();
    const result = await getToken(instance);
    if (!result?.token) throw new Error("Firebase App Check did not issue a token.");
    return true;
  } catch (cause) {
    const error = new Error(
      "The secure AI connection is not ready. Check the reCAPTCHA Enterprise site key and allowed domain in Firebase App Check, then reload and retry.",
      { cause },
    );
    error.code = "petcare/ai-app-check";
    throw error;
  }
}
