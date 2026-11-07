"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_SETTINGS, validateSettings, readAdminSettings, publicSettings, registerAdminSettingsRoutes,
} = require("../adminSettings.cjs");

const sample = () => ({
  general: { displayName: "PetCare", supportEmail: "help@petcare.example", supportPhone: "+7 999 123 45 67", heroImageUrl: "", heroImageKitFileId: "", heroImageKitFilePath: "" },
  checkout: { deliveryFee: 55, freeDeliveryThreshold: 2000 },
  notifications: { newOrderPush: false },
});

function setup() {
  const routes = new Map();
  const docs = new Map();
  const app = {
    get: (p, ...handlers) => routes.set("GET " + p, handlers),
    put: (p, ...handlers) => routes.set("PUT " + p, handlers),
  };
  let audits = 0;
  const db = {
    collection: (name) => ({
      doc: (id = "generated-audit-id") => {
        const key = name + "/" + id;
        return {
          key,
          get: async () => ({ exists: docs.has(key), data: () => docs.get(key) }),
        };
      },
    }),
    runTransaction: async (callback) => {
      const changes = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, value) => changes.push({ op: "set", key: ref.key, value }),
        create: (ref, value) => changes.push({ op: "create", key: ref.key, value }),
      };
      const result = await callback(tx);
      for (const change of changes) {
        if (change.op === "create") audits++;
        docs.set(change.key, change.value);
      }
      return result;
    },
  };
  class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }
  const adminRoute = (fn) => [async (req, res) => {
    if (!req.authUser || req.authUser.petcareAdmin !== true) throw new HttpError(403, "No admin access");
    await fn(req, res);
  }];
  registerAdminSettingsRoutes({
    app, db, adminRoute, asyncRoute: (fn) => fn, HttpError,
    FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" },
  });
  const run = async (method, path, user, body) => {
    const handlers = routes.get(method + " " + path);
    assert.ok(handlers, "route must exist");
    const result = { code: 200 };
    const res = {
      status(code) { result.code = code; return res; },
      set() { return res; },
      json(payload) { result.body = payload; return res; },
    };
    for (const h of handlers) await h({ authUser: user, body }, res);
    return result;
  };
  return { run, db, docs, countAudits: () => audits };
}

test("default settings and public checkout policy never leak contact or credentials", async () => {
  const f = setup();
  const d = await readAdminSettings(f.db);
  assert.deepEqual(d.settings, DEFAULT_SETTINGS);
  assert.equal(d.version, 0);
  const response = await f.run("GET", "/api/store/policy");
  assert.deepEqual(response.body.policy, {
    deliveryFee: 35, freeDeliveryThreshold: 1200,
    paymentMethods: ["Cash on delivery"], visaDemoOnly: true,
  });
  assert.ok(!("general" in response.body.policy));
});

test("only authorized Firebase admins can read, change or inspect settings", async () => {
  const f = setup();
  for (const route of ["GET /api/admin/settings", "PUT /api/admin/settings", "GET /api/admin/system-status"]) {
    const [method, path] = route.split(" ");
    await assert.rejects(() => f.run(method, path, { uid: "user-a", petcareAdmin: false },
      { settings: sample(), version: 0 }), { status: 403 });
  }
  assert.equal((await f.run("GET", "/api/admin/settings", { uid: "super-a", petcareAdmin: true })).body.version, 0);
});

test("admin saves are versioned, audited and reflected in public policy", async () => {
  const f = setup();
  const admin = { uid: "super-a", petcareAdmin: true };
  const saved = await f.run("PUT", "/api/admin/settings", admin, { settings: sample(), version: 0 });
  assert.equal(saved.body.version, 1);
  assert.equal(saved.body.settings.checkout.deliveryFee, 55);
  assert.equal(f.countAudits(), 1);
  const read = await f.run("GET", "/api/admin/settings", admin);
  assert.equal(read.body.updatedBy, "super-a");
  assert.equal(read.body.settings.notifications.newOrderPush, false);
  assert.equal((await f.run("GET", "/api/store/policy")).body.policy.deliveryFee, 55);
  await assert.rejects(
    () => f.run("PUT", "/api/admin/settings", admin, { settings: sample(), version: 0 }),
    { status: 409 }
  );
  assert.equal(f.countAudits(), 1);
});

test("invalid and secret-looking settings are never accepted", async () => {
  const f = setup();
  const admin = { uid: "super-a", petcareAdmin: true };
  for (const invalid of [
    { ...sample(), secretKey: "value" },
    { ...sample(), checkout: { deliveryFee: -1, freeDeliveryThreshold: 100 } },
    { ...sample(), checkout: { deliveryFee: 0.5, freeDeliveryThreshold: 100 } },
    { ...sample(), checkout: { deliveryFee: 20, freeDeliveryThreshold: Infinity } },
    { ...sample(), notifications: { newOrderPush: "false" } },
    { ...sample(), general: { displayName: "", supportEmail: "", supportPhone: "" } },
    { ...sample(), general: { displayName: "PetCare", supportEmail: "bad email", supportPhone: "" } },
  ]) {
    assert.throws(() => validateSettings(invalid));
    await assert.rejects(() => f.run("PUT", "/api/admin/settings", admin,
      { settings: invalid, version: 0 }), { status: 400 });
  }
  assert.equal(f.countAudits(), 0);
});

test("public homepage endpoint only exposes image URL, with default fallback", async () => {
  const f = setup();
  const before = await f.run("GET", "/api/public/homepage");
  assert.deepEqual(before.body, { heroImageUrl: "" });
  assert.ok(!("heroImageKitFileId" in before.body));

  const image = "https://ik.imagekit.io/petcare/petcare/branding/holiday-dog.webp";
  const envBefore = process.env.IMAGEKIT_URL_ENDPOINT;
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/petcare";
  try {
    const draft = sample();
    draft.general.heroImageUrl = image;
    draft.general.heroImageKitFileId = "abc-123-file";
    draft.general.heroImageKitFilePath = "/petcare/branding/holiday-dog.webp";
    const saved = await f.run("PUT", "/api/admin/settings",
      { uid: "admin-1", petcareAdmin: true }, { settings: draft, version: 0 });
    assert.equal(saved.body.version, 1);
    assert.equal((await f.run("GET", "/api/public/homepage")).body.heroImageUrl, image);
    assert.equal(f.countAudits(), 1);

    const restored = { ...draft, general: { ...draft.general,
      heroImageUrl: "", heroImageKitFileId: "", heroImageKitFilePath: "" } };
    await f.run("PUT", "/api/admin/settings",
      { uid: "admin-1", petcareAdmin: true }, { settings: restored, version: 1 });
    assert.equal((await f.run("GET", "/api/public/homepage")).body.heroImageUrl, "");
    assert.equal(f.countAudits(), 2);
  } finally {
    if (envBefore === undefined) delete process.env.IMAGEKIT_URL_ENDPOINT;
    else process.env.IMAGEKIT_URL_ENDPOINT = envBefore;
  }
});

test("ImageKit hero validation rejects other domains, folders and incomplete metadata", () => {
  const imageUrl = "https://ik.imagekit.io/petcare/petcare/branding/pet-photo.webp";
  const filePath = "/petcare/branding/pet-photo.webp";
  const envBefore = process.env.IMAGEKIT_URL_ENDPOINT;
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/petcare";
  try {
    const valid = sample();
    Object.assign(valid.general, {
      heroImageUrl: imageUrl, heroImageKitFileId: "f-123", heroImageKitFilePath: filePath,
    });
    assert.equal(validateSettings(valid).general.heroImageUrl, imageUrl);
    for (const mutation of [
      { heroImageUrl: "https://evil.example/hero.webp" },
      { heroImageUrl: "javascript:alert(1)" },
      { heroImageUrl: imageUrl + "?download=1" },
      { heroImageKitFileId: "" },
      { heroImageKitFilePath: "/petcare/products/pet-photo.webp" },
      { heroImageKitFilePath: "/petcare/branding/../../secrets.webp" },
      { heroImageKitFilePath: "" },
      { heroImageUrl: "" },
    ]) {
      const invalid = sample();
      Object.assign(invalid.general, valid.general, mutation);
      assert.throws(() => validateSettings(invalid));
    }
  } finally {
    if (envBefore === undefined) delete process.env.IMAGEKIT_URL_ENDPOINT;
    else process.env.IMAGEKIT_URL_ENDPOINT = envBefore;
  }
});

test("cached legacy admin forms cannot accidentally erase hero image settings", async () => {
  const f = setup();
  const stale = sample();
  delete stale.general.heroImageUrl;
  delete stale.general.heroImageKitFileId;
  delete stale.general.heroImageKitFilePath;
  await assert.rejects(
    () => f.run("PUT", "/api/admin/settings", { uid: "admin-1", petcareAdmin: true },
      { settings: stale, version: 0 }),
    { status: 409 }
  );
  assert.equal(f.countAudits(), 0);
});
