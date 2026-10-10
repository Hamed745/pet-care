import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
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
