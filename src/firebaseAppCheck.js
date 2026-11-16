import {
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import app, { usingFirebaseEmulators } from "./firebase.js";

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

export async function getFirebaseAppCheckToken() {
  if (usingFirebaseEmulators) return null;
  const result = await getToken(initializeFirebaseAppCheck());
  if (!result.token) throw new Error("Firebase App Check did not return a token.");
  return result.token;
}
