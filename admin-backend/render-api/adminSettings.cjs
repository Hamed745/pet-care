"use strict";

// Server-owned settings. Never expose service account JSON, API keys or secrets.
// Only fields consumed by running business logic are adjustable operationally.
const DEFAULT_SETTINGS = Object.freeze({
  general: Object.freeze({
    displayName: "PetCare",
    supportEmail: "",
    supportPhone: "",
  }),
  checkout: Object.freeze({
    deliveryFee: 35,
    freeDeliveryThreshold: 1200,
  }),
  notifications: Object.freeze({
    newOrderPush: true,
  }),
});
const REF_PATH = ["platformSettings", "global"];

function settingsRef(db) {
  return db.collection(REF_PATH[0]).doc(REF_PATH[1]);
}

function publicSettings(settings) {
  return {
    deliveryFee: settings.checkout.deliveryFee,
    freeDeliveryThreshold: settings.checkout.freeDeliveryThreshold,
    paymentMethods: ["Cash on delivery"],
    visaDemoOnly: true,
  };
}

function fallbackSettings(raw) {
  return {
    general: { ...DEFAULT_SETTINGS.general, ...(raw?.general || {}) },
    checkout: { ...DEFAULT_SETTINGS.checkout, ...(raw?.checkout || {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(raw?.notifications || {}) },
  };
}

function cleanString(value, name, maxLength, pattern) {
  if (typeof value !== "string" || value.length > maxLength || value !== value.trim() ||
    (pattern && value && !pattern.test(value))) {
    throw new Error(`Invalid ${name}.`);
  }
  return value;
}

function cleanInteger(value, name, max) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new Error(`Invalid ${name}. Use a whole number between 0 and ${max}.`);
  }
  return value;
}

function validateSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).some((key) => !["general", "checkout", "notifications"].includes(key))) {
    throw new Error("Invalid settings payload.");
  }
  const general = value.general;
  const checkout = value.checkout;
  const notifications = value.notifications;
  if (!general || !checkout || !notifications ||
    typeof general !== "object" || Array.isArray(general) ||
    typeof checkout !== "object" || Array.isArray(checkout) ||
    typeof notifications !== "object" || Array.isArray(notifications)) {
    throw new Error("All settings sections are required.");
  }
  const permitted = [
    [general, ["displayName", "supportEmail", "supportPhone"]],
    [checkout, ["deliveryFee", "freeDeliveryThreshold"]],
    [notifications, ["newOrderPush"]],
  ];
  if (permitted.some(([section, keys]) => Object.keys(section).some((key) => !keys.includes(key)))) {
    throw new Error("Unknown or non-editable settings field.");
  }
  const email = cleanString(general.supportEmail, "support email", 160,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const phone = cleanString(general.supportPhone, "support phone", 40,
    /^[+()\d\s-]{7,40}$/);
  if (typeof notifications.newOrderPush !== "boolean") {
    throw new Error("Notification setting must be true or false.");
  }
  return {
    general: {
      displayName: cleanString(general.displayName, "display name", 80, /^.{2,80}$/),
      supportEmail: email,
      supportPhone: phone,
    },
    checkout: {
      deliveryFee: cleanInteger(checkout.deliveryFee, "delivery fee", 100000),
      freeDeliveryThreshold: cleanInteger(checkout.freeDeliveryThreshold, "free delivery threshold", 10000000),
    },
    notifications: {
      newOrderPush: notifications.newOrderPush,
    },
  };
}

async function readAdminSettings(db) {
  const snapshot = await settingsRef(db).get();
  const data = snapshot.data() || {};
  const raw = fallbackSettings(data.settings);
  // Keep defaults for legacy/incomplete records and sanitize saved config
  // before applying settings in checkout and notification delivery.
  let settings;
  try { settings = validateSettings(raw); }
  catch { settings = fallbackSettings(DEFAULT_SETTINGS); }
  return {
    settings,
    version: Number.isSafeInteger(data.version) && data.version >= 0 ? data.version : 0,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() || null,
  };
}

function registerAdminSettingsRoutes({ app, db, adminRoute, asyncRoute, HttpError, FieldValue }) {
  app.get("/api/store/policy", asyncRoute(async (_req, res) => {
    const { settings } = await readAdminSettings(db);
    res.set("Cache-Control", "no-store");
    res.json({ policy: publicSettings(settings) });
  }));

  app.get("/api/admin/settings", ...adminRoute(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await readAdminSettings(db));
  }));

  app.put("/api/admin/settings", ...adminRoute(async (req, res) => {
    const supplied = req.body || {};
    const version = supplied.version;
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new HttpError(400, "A valid settings version is required.");
    }
    let settings;
    try { settings = validateSettings(supplied.settings); }
    catch (error) { throw new HttpError(400, error.message); }
    if (JSON.stringify(supplied.settings) !== JSON.stringify(settings)) {
      // Reject malformed, missing and extra fields, not just silently trim.
      throw new HttpError(400, "Settings contain unsupported or incomplete fields.");
    }

    const ref = settingsRef(db);
    const nextVersion = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const currentVersion = snapshot.exists && Number.isSafeInteger(snapshot.data()?.version)
        ? snapshot.data().version : 0;
      if (version !== currentVersion) {
        throw new HttpError(409, "Settings changed in another admin session. Refresh before saving.");
      }
      const updatedVersion = currentVersion + 1;
      transaction.set(ref, {
        version: updatedVersion, settings,
        updatedBy: req.authUser.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Same transaction makes each configuration change traceable in Activity Log.
      const auditRef = db.collection("adminAuditLogs").doc();
      transaction.create(auditRef, {
        actorUid: req.authUser.uid, action: "settings.update",
        targetId: "platformSettings/global",
        reason: "Platform settings updated",
        createdAt: FieldValue.serverTimestamp(),
      });
      return updatedVersion;
    });
    res.json({ settings, version: nextVersion, updatedBy: req.authUser.uid, updatedAt: new Date().toISOString() });
  }));

  app.get("/api/admin/system-status", ...adminRoute(async (_req, res) => {
    // Firestore reachability is validated by an actual read. Never report
    // external API health based solely on a key existing in environment.
    await settingsRef(db).get();
    res.set("Cache-Control", "no-store");
    res.json({
      backend: { reachable: true },
      firestore: { reachable: true },
      imagekit: { configured:
        Boolean(process.env.IMAGEKIT_PUBLIC_KEY?.startsWith("public_") &&
          process.env.IMAGEKIT_PRIVATE_KEY?.startsWith("private_") &&
          /^https:\/\//.test(process.env.IMAGEKIT_URL_ENDPOINT || "")) },
      externalMaps: { status: "not-checked", note: "2GIS runs via a separate frontend API." },
    });
  }));
}

module.exports = { DEFAULT_SETTINGS, publicSettings, validateSettings, readAdminSettings, registerAdminSettingsRoutes };
