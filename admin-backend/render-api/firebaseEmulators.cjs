"use strict";

const net = require("node:net");

const DEMO_PROJECT_ID = "demo-petcare";

function parseLoopbackEndpoint(value, label) {
  const match = /^(localhost|127\.0\.0\.1|\[::1\]):(\d{1,5})$/.exec(value || "");
  const port = Number(match?.[2]);
  if (!match || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be a loopback host and valid port.`);
  }
  return { host: match[1].replace(/^\[|\]$/g, ""), port };
}

function resolveFirebaseEmulatorConfig(env) {
  const explicitlyEnabled = env.PETCARE_USE_FIREBASE_EMULATORS === "true";
  const hasEmulatorHost = Boolean(env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST);
  if (!explicitlyEnabled && hasEmulatorHost) {
    throw new Error("Firebase emulator hosts require PETCARE_USE_FIREBASE_EMULATORS=true.");
  }
  if (!explicitlyEnabled) return { enabled: false };

  if (env.FIREBASE_PROJECT_ID !== DEMO_PROJECT_ID) {
    throw new Error(`Firebase emulator mode requires FIREBASE_PROJECT_ID=${DEMO_PROJECT_ID}.`);
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Do not provide production Firebase credentials in emulator mode.");
  }

  return {
    enabled: true,
    projectId: DEMO_PROJECT_ID,
    firestore: parseLoopbackEndpoint(env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST"),
    auth: parseLoopbackEndpoint(env.FIREBASE_AUTH_EMULATOR_HOST, "FIREBASE_AUTH_EMULATOR_HOST"),
  };
}

function assertEmulatorServicesReachable(config, timeoutMs = 1500) {
  if (!config.enabled) return Promise.resolve();
  const services = [
    ["Firestore Emulator", config.firestore],
    ["Firebase Auth Emulator", config.auth],
  ];
  return Promise.all(services.map(([name, endpoint]) => new Promise((resolve, reject) => {
    const socket = net.createConnection(endpoint);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`${name} is unavailable at ${endpoint.host}:${endpoint.port}.`));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve();
    });
    socket.once("error", () => {
      clearTimeout(timer);
      reject(new Error(`${name} is unavailable at ${endpoint.host}:${endpoint.port}.`));
    });
  }))).then(() => undefined);
}

module.exports = {
  DEMO_PROJECT_ID,
  parseLoopbackEndpoint,
  resolveFirebaseEmulatorConfig,
  assertEmulatorServicesReachable,
};
