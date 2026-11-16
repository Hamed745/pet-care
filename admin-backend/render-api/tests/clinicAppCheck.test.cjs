"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createClinicAppCheckMiddleware } = require("../clinicAppCheck.cjs");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function execute(middleware, token) {
  const req = {
    headers: token ? { "x-firebase-appcheck": token } : {},
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  };
  let nextError;
  let nextCalled = false;
  return middleware(req, {}, (error) => {
    nextCalled = true;
    nextError = error;
  }).then(() => ({ nextCalled, nextError }));
}

test("clinic App Check requires a valid token outside explicit emulator mode", async () => {
  const middleware = createClinicAppCheckMiddleware({
    verifyToken: async (token) => {
      if (token !== "valid-test-token") throw new Error("provider details");
    },
    HttpError,
  });

  const missing = await execute(middleware);
  assert.equal(missing.nextError.status, 401);
  const invalid = await execute(middleware, "invalid-test-token");
  assert.equal(invalid.nextError.status, 401);
  assert.doesNotMatch(invalid.nextError.message, /provider details/);
  const valid = await execute(middleware, "valid-test-token");
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.nextError, undefined);
});

test("clinic App Check bypass is limited to explicit emulator mode", async () => {
  let verificationCalls = 0;
  const middleware = createClinicAppCheckMiddleware({
    emulatorMode: true,
    verifyToken: async () => { verificationCalls += 1; },
    HttpError,
  });
  const result = await execute(middleware);
  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, undefined);
  assert.equal(verificationCalls, 0);
});
