import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const emulatorEnabled = import.meta.env.VITE_FIREBASE_EMULATOR_ENABLED === "true";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

function emulatorEndpoint(host, port, label) {
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)) {
    throw new Error(`${label} must use a loopback host in Firebase emulator mode.`);
  }
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`${label} must use a valid local port in Firebase emulator mode.`);
  }
  return { host, port: parsedPort };
}

if (emulatorEnabled && (!import.meta.env.DEV || projectId !== "demo-petcare")) {
  throw new Error("Firebase emulator mode is allowed only in local development with project demo-petcare.");
}
if (!emulatorEnabled && projectId === "demo-petcare") {
  throw new Error("The demo-petcare project requires explicit Firebase emulator mode.");
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(`Missing Firebase environment variables: ${missingConfig.join(", ")}`);
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const usingFirebaseEmulators = emulatorEnabled;

if (emulatorEnabled) {
  const authEndpoint = emulatorEndpoint(
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST,
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT,
    "Firebase Auth Emulator"
  );
  const firestoreEndpoint = emulatorEndpoint(
    import.meta.env.VITE_FIRESTORE_EMULATOR_HOST,
    import.meta.env.VITE_FIRESTORE_EMULATOR_PORT,
    "Firestore Emulator"
  );
  connectAuthEmulator(auth, `http://${authEndpoint.host}:${authEndpoint.port}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, firestoreEndpoint.host, firestoreEndpoint.port);
}

export default app;
