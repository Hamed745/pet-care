"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { registerClinicRoutes, validateApplication, validateDocuments, validateServices } = require("../clinics.cjs");

const clinic = {
  name: "Healthy Paws Veterinary", governorate: "Cairo", city: "Cairo", address: "10 Sample St",
  phone: "+201001234567", email: "clinic@example.com", description: "Pets first",
  clinicLicenseNumber: "DEMO-CLINIC-101", responsibleVetName: "Dr. Nour",
  responsibleVetLicenseNumber: "DEMO-VET-402",
};
const image = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
const documents = { clinic_license: image, manager_id: image, vet_license: image };

function fixture() {
  const routes = new Map();
  const docs = new Map();
  const app = Object.fromEntries(["get", "post", "put", "delete", "patch"].map((method) => [method, (path, ...handlers) => routes.set(`${method.toUpperCase()} ${path}`, handlers)]));
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const snap = (path) => ({ id: path.split("/").at(-1), exists: docs.has(path), data: () => docs.get(path) });
  const ref = (path) => ({
    path, id: path.split("/").at(-1), get: async () => snap(path),
    collection: (name) => collection(`${path}/${name}`),
    update: async (value) => docs.set(path, { ...docs.get(path), ...value }),
    set: async (value) => docs.set(path, value),
  });
  const collection = (path) => ({
    doc: (id) => ref(`${path}/${id}`),
    where: (field, operator, value) => {
      assert.equal(operator, "==");
      return { limit: (limit) => ({ get: async () => {
        const result = [...docs.keys()].filter((key) => key.startsWith(`${path}/`) &&
          key.split("/").length === path.split("/").length + 1 && docs.get(key)[field] === value).slice(0,limit);
        return { docs: result.map(snap), size: result.length };
      } }) };
    },
    limit: (limit) => ({ get: async () => {
      const result = [...docs.keys()].filter((key) => key.startsWith(`${path}/`) &&
        key.split("/").length === path.split("/").length + 1).slice(0,limit);
      return { docs: result.map(snap), size: result.length };
    } }),
  });
  const db = {
    collection,
    runTransaction: async (callback) => {
      const writes = [];
      const tx = {
        get: async (doc) => snap(doc.path),
        set: (doc, data, options) => writes.push({ op: "set", doc, data, options }),
        update: (doc, data) => writes.push({ op: "update", doc, data }),
        create: (doc, data) => writes.push({ op: "create", doc, data }),
        delete: (doc) => writes.push({ op: "delete", doc }),
      };
      const result = await callback(tx);
      for (const { op, doc, data, options } of writes) {
        if (op === "create" && docs.has(doc.path)) throw new HttpError(409,"Already exists");
        if (op === "delete") docs.delete(doc.path);
        else docs.set(doc.path, op === "update" || options?.merge ? { ...docs.get(doc.path), ...data } : data);
      }
      return result;
    },
  };
  const signedInRoute = (fn) => [async (req, res) => {
    if (!req.authUser?.uid) throw new HttpError(401,"Sign in first");
    return fn(req, res);
  }];
  const adminRoute = (fn) => [async (req, res) => {
    if (req.authUser?.petcareAdmin !== true) throw new HttpError(403,"Admin only");
    return fn(req, res);
  }];
  let audits = 0;
  registerClinicRoutes({ app, db, signedInRoute, adminRoute, HttpError,
    FieldValue: { serverTimestamp: () => ({ toDate: () => new Date("2026-11-11T12:00:00Z") }) },
    audit: async () => { audits++; } });
  const run = async (method, path, user, body = {}, params = {}) => {
    const handlers = routes.get(`${method} ${path}`);
    assert.ok(handlers, `Missing route ${method} ${path}`);
    const result = { status: 200 };
    const res = {
      status(code) { result.status = code; return res; },
      set() { return res; },
      json(data) { result.data = data; return res; },
    };
    for (const handler of handlers) await handler({ authUser: user, body, params }, res, (err) => { throw err; });
    return result;
  };
  return { docs, run, audits: () => audits };
}

test("clinic input rejects malformed applications, documents and duplicate services", () => {
  assert.deepEqual(validateApplication(clinic).name, clinic.name);
  assert.throws(() => validateApplication({ ...clinic, phone: "hello" }), /phone/);
  assert.equal(validateDocuments(documents).length, 3);
  assert.throws(() => validateDocuments({ ...documents, manager_id: "https://public.example/id.png" }), /Invalid manager_id/);
  assert.throws(() => validateServices([{ name: "Visit", price: 100, durationMinutes: 30 }, { name: "visit", price: 200, durationMinutes: 40 }]), /Duplicate/);
});

test("manager submits documents, admin reviews, public sees only approved non-private data", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const admin = { uid: "admin", petcareAdmin: true };
  const submitted = await f.run("POST", "/api/clinics/apply", manager, { clinic, documents });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.data.clinic.status, "pending");
  assert.equal((await f.run("GET", "/api/clinics", null)).data.clinics.length, 0);
  await assert.rejects(() => f.run("GET", "/api/admin/clinics", manager), { status: 403 });
  assert.equal((await f.run("GET", "/api/admin/clinics/:id/documents/:kind", admin, {}, { id: manager.uid, kind: "manager_id" })).data.image, image);
  await assert.rejects(() => f.run("GET", "/api/admin/clinics/:id/documents/:kind", manager, {}, { id: manager.uid, kind: "manager_id" }), { status: 403 });
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  const publicRecord = (await f.run("GET", "/api/clinics", null)).data.clinics[0];
  assert.equal(publicRecord.name, clinic.name);
  assert.ok(!Object.hasOwn(publicRecord, "clinicLicenseNumber"));
  assert.ok(!Object.hasOwn(publicRecord, "ownerUid"));
  assert.ok(!JSON.stringify(publicRecord).includes(image));
  assert.equal(f.audits(), 1);
});

test("only the approved manager can configure services; other accounts cannot approve or edit", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const outsider = { uid: "manager-b" };
  const admin = { uid: "admin", petcareAdmin: true };
  await f.run("POST", "/api/clinics/apply", manager, { clinic, documents });
  await assert.rejects(() => f.run("PUT", "/api/clinics/mine/services", manager, { services: [] }), { status: 403 });
  await assert.rejects(() => f.run("POST", "/api/admin/clinics/:id/decision", outsider, { status: "approved" }, { id: manager.uid }), { status: 403 });
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  const services = [{ id: "basic", name: "Consultation", price: 250, durationMinutes: 30 }];
  await f.run("PUT", "/api/clinics/mine/services", manager, { services });
  assert.equal((await f.run("GET", "/api/clinics", null)).data.clinics[0].services[0].price, 250);
  await assert.rejects(() => f.run("PUT", "/api/clinics/mine/services", outsider, { services: [] }), { status: 403 });
});

test("appointment ownership, approval and exclusive time slot are enforced by the backend", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const owner = { uid: "owner-a" };
  const outsider = { uid: "owner-b" };
  const admin = { uid: "admin", petcareAdmin: true };
  f.docs.set("users/owner-a/pets/pet-a", { ownerUid: "owner-a", name: "Milo" });
  await f.run("POST", "/api/clinics/apply", manager, { clinic, documents });
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  await f.run("PUT", "/api/clinics/mine/services", manager, { services: [{ id: "basic", name: "Consultation", price: 250, durationMinutes: 30 }] });
  const future = new Date(Date.now() + 7 * 86400000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(future);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const details = { petId: "pet-a", serviceId: "basic", date: `${values.year}-${values.month}-${values.day}`, time: "14:30" };
  await assert.rejects(() => f.run("POST", "/api/clinics/:id/appointments", outsider, details, { id: manager.uid }), { status: 403 });
  const a = (await f.run("POST", "/api/clinics/:id/appointments", owner, details, { id: manager.uid })).data.appointment;
  const b = (await f.run("POST", "/api/clinics/:id/appointments", owner, details, { id: manager.uid })).data.appointment;
  assert.equal(a.status, "pending");
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", outsider, { status: "confirmed" }, { id: a.id }), { status: 403 });
  await f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: a.id });
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: b.id }), { status: 409 });
  await f.run("POST", "/api/clinics/my-appointments/:id/cancel", owner, {}, { id: a.id });
  const confirmedB = await f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: b.id });
  assert.equal(confirmedB.data.appointment.status, "confirmed");
});
