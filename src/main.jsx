
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./store.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import App from "./App.jsx";
import { initializeFirebaseAppCheck } from "./firebaseAppCheck.js";
import "./index.css";

// Older versions stored remembered passwords in localStorage. Remove them
// immediately on page load, keeping only non-sensitive account email hints.
try {
  const oldAccounts = localStorage.getItem("petcare_saved_accounts");
  if (oldAccounts !== null) {
    const parsed = JSON.parse(oldAccounts);
    const safeAccounts = Array.isArray(parsed)
      ? [...new Set(parsed.map((account) => account?.email).filter((email) => typeof email === "string" && email.includes("@")))].map((email) => ({ email }))
      : [];
    localStorage.setItem("petcare_saved_accounts", JSON.stringify(safeAccounts));
  }
} catch {
  try { localStorage.removeItem("petcare_saved_accounts"); } catch { /* Storage unavailable. */ }
}

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
    console.error(
      "Firebase App Check initialization or token acquisition failed.",
      error,
    );
  }

  createRoot(document.getElementById("root")).render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <LanguageProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </LanguageProvider>
    </BrowserRouter>,
  );
}

startApp();
