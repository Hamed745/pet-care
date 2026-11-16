import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// The old saved-email list was shared across every visitor of a browser profile.
try { localStorage.removeItem("petcare_saved_accounts"); } catch { /* Storage may be unavailable. */ }

async function startApp() {
  const root = createRoot(document.getElementById("root"));

  try {
    // Load Firebase-dependent code inside the try block. A missing .env.local
    // used to throw while evaluating static imports, leaving an empty page.
    const [
      { AppProvider },
      { LanguageProvider },
      { default: App },
      { initializeFirebaseAppCheck },
    ] = await Promise.all([
      import("./store.jsx"),
      import("./i18n/LanguageContext.jsx"),
      import("./App.jsx"),
      import("./firebaseAppCheck.js"),
    ]);

    try {
      const devAppCheck = import.meta.env.DEV
        ? await import("./firebaseAppCheck.dev.js")
        : null;
      devAppCheck?.enableFirebaseAppCheckDebugMode();
      const started = performance.now();
      const appCheck = initializeFirebaseAppCheck();
      console.info("[PetCare timing]", {
        appCheckInitializationMs: Math.round(performance.now() - started),
      });
      if (devAppCheck) {
        const tokenStarted = performance.now();
        await devAppCheck.acquireFirebaseAppCheckToken(appCheck);
        console.info("[PetCare timing]", {
          appCheckTokenAcquisitionMs: Math.round(performance.now() - tokenStarted),
        });
      }
    } catch (error) {
      console.error("Firebase App Check initialization or token acquisition failed.", error);
    }

    root.render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AppProvider><App /></AppProvider>
        </LanguageProvider>
      </BrowserRouter>
    );
  } catch (error) {
    console.error("PetCare failed to start.", error);
    root.render(
      <main className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-200 bg-white p-8 font-sans shadow-sm">
        <h1 className="text-2xl font-extrabold text-red-800">PetCare could not start</h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          Please check your local Firebase web configuration in .env.local and
          restart Vite. The file .env.example contains placeholders only.
        </p>
        <p className="mt-3 text-xs text-stone-600">
          Open the browser Console to see the precise error. Never share service
          account keys or private environment values.
        </p>
      </main>
    );
  }
}

startApp();
