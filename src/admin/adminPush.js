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

  const registration = await navigator.serviceWorker.register(serviceWorkerUrl(), {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Firebase did not return a browser push token.");

  await adminApi.registerPushToken(token);
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
