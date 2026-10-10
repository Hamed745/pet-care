import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./store.jsx";
import App from "./App.jsx";
import { initializeFirebaseAppCheck } from "./firebaseAppCheck.js";
import "./index.css";

async function startApp() {
  try {
    const devAppCheck = import.meta.env.DEV
      ? await import("./firebaseAppCheck.dev.js")
      : null;

    devAppCheck?.enableFirebaseAppCheckDebugMode();
    const appCheckInitializationStartedAt = performance.now();
    const appCheck = initializeFirebaseAppCheck();
    console.info("[PetCare timing]", {
      appCheckInitializationMs: Math.round(
        performance.now() - appCheckInitializationStartedAt,
      ),
    });

    if (devAppCheck) {
      const appCheckTokenStartedAt = performance.now();
      await devAppCheck.acquireFirebaseAppCheckToken(appCheck);
      console.info("[PetCare timing]", {
        appCheckTokenAcquisitionMs: Math.round(
          performance.now() - appCheckTokenStartedAt,
        ),
      });
    }
  } catch (error) {
    console.error("Firebase App Check initialization or token acquisition failed.", error);
  }

  createRoot(document.getElementById("root")).render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppProvider><App /></AppProvider></BrowserRouter>
  );
}

startApp();
