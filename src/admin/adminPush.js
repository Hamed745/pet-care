import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app } from "../firebase.js";
import { adminApi } from "./adminApi.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

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

async function waitForActiveWorker(registration) {
  if (registration.active?.state === "activated") return;
  // navigator.serviceWorker.ready may point to an older registration; wait
  // for THIS Firebase worker rather than asking PushManager to subscribe early.
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error("Firebase notification service worker is missing.");
  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.removeEventListener("statechange", onChange);
      reject(new Error("Firebase notification service worker activation timed out."));
    }, 12000);
    function onChange() {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", onChange);
        window.clearTimeout(timeout);
        worker.state === "activated" ? resolve() : reject(new Error("Firebase service worker became redundant."));
      }
    }
    worker.addEventListener("statechange", onChange);
    onChange();
  });
}

const serviceWorkerUrl = () => {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
};

export async function isAdminPushSupported() {
  return Boolean(
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    vapidKey &&
    await isSupported().catch(() => false)
  );
}

export async function registerAdminPush() {
  if (!(await isAdminPushSupported())) {
    throw new Error("Push notifications are not supported in this browser or Firebase messaging is not configured.");
  }
  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked by this browser. Enable them in site settings, then try again.");
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  let registration;
  try {
    registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
      scope: "/",
      updateViaCache: "none",
    });
    await waitForActiveWorker(registration);
  } catch (error) {
    throw explainAdminPushError(error, "Service worker activation");
  }

  let token;
  try {
    const messaging = getMessaging(app);
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) throw new Error("Firebase did not return a browser push token.");
  } catch (error) {
    throw explainAdminPushError(error, "Browser/Firebase token subscription");
  }

  try {
    await adminApi.registerPushToken(token);
  } catch (error) {
    throw explainAdminPushError(error, "PetCare admin token registration");
  }
  return { token, registration };
}

export async function unregisterAdminPush() {
  if (!(await isAdminPushSupported())) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  }).catch(() => "");
  if (token) {
    await adminApi.unregisterPushToken(token);
    await (await import("firebase/messaging")).deleteToken(messaging).catch(() => false);
  }
}

export async function sendAdminPushTest() {
  return adminApi.testPushNotification();
}

export async function listenForAdminPush(onNotification) {
  if (!(await isAdminPushSupported())) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    const data = payload?.data || {};
    const title = data.title || "PetCare";
    const options = {
      body: data.body || "You have a new notification.",
      icon: "/favicon.ico",
      tag: data.tag || "petcare-admin-notification",
      data: { url: data.url || "/admin" },
    };
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        if (Notification.permission === "granted") new Notification(title, options);
      });
    onNotification?.(data);
  });
}
