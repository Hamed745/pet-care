/** Explain which independent part failed: browser push, FCM, or admin API. */
export function explainAdminPushError(error, stage = "push registration") {
  const details = String(error?.message || error || "");
  const code = String(error?.code || "");
  if (/Registration failed - push service error|push service error|PushManager.*subscribe|push-service-not-available/i.test(details)) {
    return new Error("Browser push service rejected registration. This happens before the PetCare backend is contacted. Check Chrome notifications and browser connectivity to the push service, disable push-blocking extensions for this site, then try again. You can also test in a fresh browser profile. (" + stage + ")");
  }
  if (/failed-service-worker-registration|no active Service Worker|service worker.*(install|register|activat)/i.test(details + " " + code)) {
    return new Error("Firebase notification worker could not start. Reload the website and try enabling notifications again. (" + stage + ")");
  }
  if (/invalid.*vapid|applicationServerKey|invalid.*key/i.test(details + " " + code)) {
    return new Error("Firebase Web Push VAPID public key appears invalid. Check the frontend Firebase Cloud Messaging project settings. (" + stage + ")");
  }
  if (/permission|denied|blocked/i.test(details + " " + code)) {
    return new Error("Browser permission for notifications is blocked. Allow notifications for this website in browser settings. (" + stage + ")");
  }
  return new Error(stage + " failed: " + (details || code || "Unknown error") + (code ? " [" + code + "]" : ""));
}
