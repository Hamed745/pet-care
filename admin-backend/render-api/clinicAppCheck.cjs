"use strict";

function createClinicAppCheckMiddleware({ verifyToken, emulatorMode = false, HttpError }) {
  if (typeof verifyToken !== "function" || typeof HttpError !== "function") {
    throw new TypeError("Clinic App Check middleware requires token verification and an HTTP error type.");
  }

  return async function requireClinicAppCheck(req, _res, next) {
    if (emulatorMode) return next();
    const token = req.get?.("X-Firebase-AppCheck") ||
      req.headers?.["x-firebase-appcheck"];
    if (!token) return next(new HttpError(401, "A valid Firebase App Check token is required."));
    try {
      await verifyToken(token);
      return next();
    } catch {
      return next(new HttpError(401, "A valid Firebase App Check token is required."));
    }
  };
}

module.exports = { createClinicAppCheckMiddleware };
