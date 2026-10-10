import { getToken } from "firebase/app-check";

export function enableFirebaseAppCheckDebugMode() {
  if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }
}

export async function acquireFirebaseAppCheckToken(appCheck) {
  const originalLog = console.log;
  console.log = function (...args) {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith("Firebase App Check debug token:")
    ) {
      return;
    }
    originalLog.apply(console, args);
  };

  try {
    return await getToken(appCheck);
  } finally {
    console.log = originalLog;
  }
}
