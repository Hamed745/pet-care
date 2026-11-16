"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const {
  parseLoopbackEndpoint,
  resolveFirebaseEmulatorConfig,
  assertEmulatorServicesReachable,
} = require("../firebaseEmulators.cjs");

const config = {
  PETCARE_USE_FIREBASE_EMULATORS: "true",
  FIREBASE_PROJECT_ID: "demo-petcare",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
};

test("emulator mode requires explicit opt-in and never accepts a production project", () => {
  assert.throws(() => resolveFirebaseEmulatorConfig({
    FIREBASE_PROJECT_ID: "production-project",
    FIRESTORE_EMULATOR_HOST: config.FIRESTORE_EMULATOR_HOST,
  }), /PETCARE_USE_FIREBASE_EMULATORS/);
  assert.throws(() => resolveFirebaseEmulatorConfig({
    ...config,
    FIREBASE_PROJECT_ID: "production-project",
  }), /demo-petcare/);
  assert.throws(() => resolveFirebaseEmulatorConfig({
    ...config,
    FIREBASE_SERVICE_ACCOUNT_JSON: "{\"private_key\":\"not-a-real-key\"}",
  }), /Do not provide production Firebase credentials/);
});

test("emulator endpoints must be loopback-only", () => {
  assert.deepEqual(parseLoopbackEndpoint("localhost:8080", "endpoint"), {
    host: "localhost",
    port: 8080,
  });
  assert.throws(() => parseLoopbackEndpoint("192.0.2.1:8080", "endpoint"), /loopback/);
  assert.throws(() => resolveFirebaseEmulatorConfig({
    ...config,
    FIRESTORE_EMULATOR_HOST: "example.com:8080",
  }), /loopback/);
});

test("backend emulator readiness fails closed when an emulator is unavailable", async () => {
  const resolved = resolveFirebaseEmulatorConfig({
    ...config,
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:1",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:2",
  });
  await assert.rejects(() => assertEmulatorServicesReachable(resolved, 100), /unavailable/);
});

test("backend emulator readiness passes only when both local emulator ports are listening", async (t) => {
  const servers = [];
  const endpoints = [];
  for (let index = 0; index < 2; index++) {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    servers.push(server);
    endpoints.push(`127.0.0.1:${server.address().port}`);
  }
  t.after(() => Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve)))));

  const resolved = resolveFirebaseEmulatorConfig({
    ...config,
    FIRESTORE_EMULATOR_HOST: endpoints[0],
    FIREBASE_AUTH_EMULATOR_HOST: endpoints[1],
  });
  await assert.doesNotReject(() => assertEmulatorServicesReachable(resolved));
});
