"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { registerClinicRoutes, validateApplication, validateDocumentUpload, validateServices } = require("../clinics.cjs");
const { createClinicDocumentStorage, MAX_DOCUMENT_BYTES } = require("../clinicDocumentStorage.cjs");
const { CLINIC_DOCUMENT_RETENTION } = require("../clinicRetention.cjs");

const clinic = {
  name: "Healthy Paws Veterinary", managerName: "Nour Samir",
  governorate: "Cairo", city: "Cairo", address: "10 Sample St",
  latitude: 30.0444, longitude: 31.2357,
  phone: "+201001234567", email: "clinic@example.com", description: "Pets first",
  clinicLicenseNumber: "DEMO-CLINIC-101", responsibleVetName: "Dr. Nour",
  responsibleVetLicenseNumber: "DEMO-VET-402",
};
const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const pdfBytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");
const documentKinds = ["clinic_license", "manager_id", "vet_license"];
const consent = { accepted: true, version: "clinic-document-consent-v1" };
const applicationBody = (data = clinic) => ({ clinic: data });

function fixture({ allowTestDocuments = true, documentStorageFactory } = {}) {
  const routes = new Map();
  const docs = new Map();
  const app = Object.fromEntries(["get", "post", "put", "delete", "patch"].map((method) => [method, (path, ...handlers) => routes.set(`${method.toUpperCase()} ${path}`, handlers)]));
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const snap = (path) => ({
    id: path.split("/").at(-1), path, ref: ref(path),
    exists: docs.has(path), data: () => docs.get(path),
  });
  const ref = (path) => ({
    path, id: path.split("/").at(-1), get: async () => snap(path),
    collection: (name) => collection(`${path}/${name}`),
    update: async (value) => docs.set(path, { ...docs.get(path), ...value }),
    set: async (value) => docs.set(path, value),
    delete: async () => docs.delete(path),
  });
  const normalizeField = (field) => typeof field === "string" ? field : field?.segments?.join(".");
  const query = (path, filters = [], max = Infinity, order = [], after = null) => ({
    __query: true,
    path,
    filters,
    limit: (limit) => query(path, filters, limit, order, after),
    orderBy: (field) => query(path, filters, max, [...order, normalizeField(field)], after),
    startAfter: (...values) => query(path, filters, max, order, values),
    get: async () => {
      let result = [...docs.keys()].filter((key) =>
        key.startsWith(`${path}/`) &&
        key.split("/").length === path.split("/").length + 1 &&
        filters.every(([name, operator, value]) => {
          const actual = docs.get(key)?.[name];
          if (operator === "==") return actual === value;
          if (operator === "<") {
            const actualDate = actual?.toDate?.() || actual;
            return actualDate instanceof Date && actualDate < value;
          }
          return false;
        })
      );
      if (order) {
        result.sort((left, right) => {
          for (const field of order) {
            const leftValue = field === "__name__"
              ? left
              : docs.get(left)?.[field]?.toDate?.()?.getTime?.() || 0;
            const rightValue = field === "__name__"
              ? right
              : docs.get(right)?.[field]?.toDate?.()?.getTime?.() || 0;
            if (leftValue !== rightValue) return leftValue < rightValue ? -1 : 1;
          }
          return 0;
        });
      }
      if (after?.length === 1 && after[0]?.path) result = result.filter((key) => key > after[0].path);
      if (after?.length === 2) {
        const [date, reference] = after;
        const cursorTime = date instanceof Date ? date.getTime() : 0;
        result = result.filter((key) => {
          const time = docs.get(key)?.createdAt?.toDate?.()?.getTime?.() || 0;
          return time > cursorTime || (time === cursorTime && key > reference.path);
        });
      }
      result = result.slice(0, max);
      return { docs: result.map(snap), size: result.length };
    },
  });
  const collection = (path) => ({
    doc: (id) => ref(`${path}/${id}`),
    add: async (value) => {
      const document = ref(`${path}/${randomUUID()}`);
      await document.set(value);
      return document;
    },
    where: (field, operator, value) => query(path, [[field, operator, value]]),
    orderBy: (field) => query(path, [], Infinity, [normalizeField(field)]),
    limit: (limit) => query(path, [], limit),
  });
  const db = {
    collection,
    runTransaction: async (callback) => {
      const writes = [];
      const tx = {
        get: async (doc) => doc.__query ? doc.get() : snap(doc.path),
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
  const signedInDocumentRoute = signedInRoute;
  let audits = 0;
  const recordAudit = async (actorUid, action, targetId, reason = "") => {
    audits++;
    docs.set(`adminAuditLogs/${audits}`, {
      actorUid, action, targetId, reason,
      createdAt: { toDate: () => new Date() },
    });
  };
  const documentStorage = documentStorageFactory?.(db);
  registerClinicRoutes({ app, db, signedInRoute, adminRoute, HttpError,
    signedInDocumentRoute,
    FieldValue: { serverTimestamp: () => ({ toDate: () => new Date("2026-11-11T12:00:00Z") }) },
    allowTestDocuments,
    documentStorage,
    audit: recordAudit });
  const run = async (method, path, user, body = {}, params = {}, file) => {
    const handlers = routes.get(`${method} ${path}`);
    assert.ok(handlers, `Missing route ${method} ${path}`);
    const result = { status: 200 };
    const res = {
      status(code) { result.status = code; return res; },
      set() { return res; },
      type(value) { result.type = value; return res; },
      send(data) { result.data = data; return res; },
      json(data) { result.data = data; return res; },
    };
    for (const handler of handlers) await handler({ authUser: user, body, params, file }, res, (err) => { throw err; });
    return result;
  };
  const acceptConsent = (user) => run("POST", "/api/clinics/mine/document-consent", user, consent);
  return { docs, run, audits: () => audits, acceptConsent };
}

async function uploadDocuments(f, user) {
  await f.acceptConsent(user);
  for (const kind of documentKinds) {
    await f.run("POST", "/api/clinics/mine/documents/:kind", user, {}, { kind }, {
      buffer: imageBytes, mimetype: "image/jpeg",
    });
  }
}

test("clinic document uploads stay disabled outside the emulator", async () => {
  const f = fixture({ allowTestDocuments: false });
  const config = await f.run("GET", "/api/clinics/verification-config", null);
  assert.equal(config.data.uploadEnabled, false);
  assert.equal(config.data.emulatorDocuments, false);
  await assert.rejects(() => f.run("POST", "/api/clinics/apply", { uid: "manager-a" }, { clinic }), { status: 503 });
});

test("clinic input rejects malformed applications, documents and duplicate services", () => {
  assert.deepEqual(validateApplication(clinic).name, clinic.name);
  assert.throws(() => validateApplication({ ...clinic, phone: "hello" }), /phone/);
  assert.throws(() => validateApplication({ ...clinic, latitude: 120 }), /coordinates/);
  assert.equal(validateDocumentUpload({ buffer: imageBytes, mimetype: "image/jpeg" }).mimeType, "image/jpeg");
  assert.equal(validateDocumentUpload({ buffer: pdfBytes, mimetype: "application/pdf" }).mimeType, "application/pdf");
  assert.throws(() => validateDocumentUpload({ buffer: Buffer.from("not a document"), mimetype: "image/jpeg" }), /valid PDF/);
  assert.throws(() => validateDocumentUpload({ buffer: imageBytes, mimetype: "image/png" }), /valid PDF/);
  assert.throws(() => validateDocumentUpload({ buffer: Buffer.alloc(MAX_DOCUMENT_BYTES + 1), mimetype: "application/pdf" }), /5 MB/);
  assert.throws(() => validateDocumentUpload(null), /Upload exactly one/);
  assert.throws(() => validateServices([{ id: "inactive", name: "Visit", price: 100, durationMinutes: 30, available: "false" }]), /availability/);
  assert.throws(() => validateServices([{ name: "Visit", price: 100, durationMinutes: 30 }, { name: "visit", price: 200, durationMinutes: 40 }]), /Duplicate/);
});

test("clinic document uploads and submissions require server-recorded privacy consent", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  await assert.rejects(() => f.run(
    "POST", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "manager_id" },
    { buffer: imageBytes, mimetype: "image/jpeg" },
  ), { status: 400 });
  await assert.rejects(() => f.run("POST", "/api/clinics/apply", manager, applicationBody()), { status: 400 });

  const accepted = await f.acceptConsent(manager);
  assert.equal(accepted.data.version, consent.version);
  assert.equal(f.docs.get("clinicBranches/manager-a").documentConsent.acceptedBy, manager.uid);
  assert.equal(f.docs.get("clinicBranches/manager-a").documentConsent.legalReviewStatus, "pending");
  assert.ok(f.audits() > 0);

  await uploadDocuments(f, manager);
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  const ownerView = await f.run("GET", "/api/clinics/mine", manager);
  assert.equal(ownerView.data.clinic.documentConsent.version, consent.version);
  assert.equal((await f.run("GET", "/api/clinics", null)).data.clinics.length, 0);
});

test("clinic managers can save incomplete drafts and approved profile edits cannot change legal identity", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const draft = await f.run("PUT", "/api/clinics/mine/draft", manager, { clinic: { name: "Healthy Paws" } });
  assert.equal(draft.data.clinic.status, "draft");
  assert.equal(draft.data.clinic.name, "Healthy Paws");
  await uploadDocuments(f, manager);
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  await f.run("POST", "/api/admin/clinics/:id/decision", { uid: "admin", petcareAdmin: true }, { status: "approved" }, { id: manager.uid });
  const updated = await f.run("PUT", "/api/clinics/mine/profile", manager, { profile: { name: "Healthy Paws Cairo", phone: "+201001234568" } });
  assert.equal(updated.data.clinic.name, "Healthy Paws Cairo");
  await assert.rejects(() => f.run("PUT", "/api/clinics/mine/profile", manager, { profile: { clinicLicenseNumber: "changed" } }), { status: 400 });
  const hours = await f.run("PUT", "/api/clinics/mine/availability", manager, {
    workingHours: { days: [0, 1, 2, 3, 4], open: "09:00", close: "17:00" },
  });
  assert.deepEqual(hours.data.clinic.workingHours.days, [0, 1, 2, 3, 4]);
  await assert.rejects(() => f.run("PUT", "/api/clinics/mine/availability", manager, {
    workingHours: { days: [1, 1], open: "09:00", close: "17:00" },
  }), { status: 400 });
});

test("manager submits documents, admin reviews, public sees only approved non-private data", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const admin = { uid: "admin", petcareAdmin: true };
  await uploadDocuments(f, manager);
  const submitted = await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.clinic.status, "pending");
  assert.equal((await f.run("GET", "/api/clinics", null)).data.clinics.length, 0);
  await assert.rejects(() => f.run("GET", "/api/admin/clinics", manager), { status: 403 });
  const metadata = await f.run("GET", "/api/admin/clinics/:id/documents", admin, {}, { id: manager.uid });
  assert.equal(metadata.data.documents.length, 3);
  assert.equal(metadata.data.documents[0].metadata.path, undefined);
  assert.equal((await f.run("GET", "/api/admin/clinics/:id/documents/:kind", admin, {}, { id: manager.uid, kind: "manager_id" })).data.toString("base64"), imageBytes.toString("base64"));
  await assert.rejects(() => f.run("GET", "/api/admin/clinics/:id/documents/:kind", manager, {}, { id: manager.uid, kind: "manager_id" }), { status: 403 });
  assert.deepEqual((await f.run("GET", "/api/clinics/mine/documents", { uid: "manager-b" })).data.documents.map((item) => item.metadata), [null, null, null]);
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  const clinicRecord = f.docs.get(`clinicBranches/${manager.uid}`);
  clinicRecord.reviewedAt = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
  f.docs.set(`clinicBranches/${manager.uid}`, clinicRecord);
  const dueClinic = (await f.run("GET", "/api/admin/clinics", admin)).data.clinics[0];
  assert.equal(dueClinic.documentNecessityReviewDue, true);
  const necessityReview = await f.run(
    "POST", "/api/admin/clinics/:id/document-necessity-review", admin,
    { reason: "Annual review confirms documents remain necessary." }, { id: manager.uid },
  );
  assert.equal(necessityReview.data.reviewDue, false);
  assert.ok(necessityReview.data.reviewDueAt);
  const publicRecord = (await f.run("GET", "/api/clinics", null)).data.clinics[0];
  assert.equal(publicRecord.name, clinic.name);
  assert.equal(publicRecord.latitude, clinic.latitude);
  assert.equal(publicRecord.services.length, 0);
  assert.ok(!Object.hasOwn(publicRecord, "clinicLicenseNumber"));
  assert.ok(!Object.hasOwn(publicRecord, "ownerUid"));
  assert.ok(!Object.hasOwn(publicRecord, "documentNecessityReviewDue"));
  assert.ok(!JSON.stringify(publicRecord).includes(imageBytes.toString("base64")));
  assert.ok(f.audits() >= 5);
  await assert.rejects(() => f.run("POST", "/api/clinics/apply", { uid: "manager-b" }, { ...applicationBody(), documents: { clinic_license: "secret" } }), { status: 400 });
  const history = await f.run("GET", "/api/admin/clinics/:id/history", admin, {}, { id: manager.uid });
  assert.deepEqual(history.data.history.map((item) => item.action).sort(), [
    "clinic.application_submitted", "clinic.approved", "clinic.document_consent_accepted", "clinic.document_metadata_viewed",
    "clinic.document_necessity_reviewed",
    "clinic.document_uploaded", "clinic.document_uploaded", "clinic.document_uploaded",
    "clinic.document_viewed",
  ]);
});

test("clinic managers can replace or delete only their own documents while the application is editable", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const otherManager = { uid: "manager-b" };
  const admin = { uid: "admin", petcareAdmin: true };

  await assert.rejects(() => f.run(
    "POST", "/api/clinics/mine/documents/:kind", null, {}, { kind: "manager_id" },
    { buffer: imageBytes, mimetype: "image/jpeg" },
  ), { status: 401 });
  await uploadDocuments(f, manager);
  const otherManagerDocuments = await f.run("GET", "/api/clinics/mine/documents", otherManager);
  assert.ok(otherManagerDocuments.data.documents.every((item) => item.metadata === null));
  await assert.rejects(() => f.run(
    "GET", "/api/admin/clinics/:id/documents", otherManager, {}, { id: manager.uid },
  ), { status: 403 });

  const replacement = await f.run(
    "POST", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "clinic_license" },
    { buffer: pdfBytes, mimetype: "application/pdf" },
  );
  assert.equal(replacement.status, 200);
  assert.equal(replacement.data.document.mimeType, "application/pdf");
  await f.run("DELETE", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "vet_license" });
  await assert.rejects(() => f.run("POST", "/api/clinics/apply", manager, applicationBody()), { status: 400 });
  await f.run(
    "POST", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "vet_license" },
    { buffer: imageBytes, mimetype: "image/jpeg" },
  );
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  await assert.rejects(() => f.run(
    "POST", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "manager_id" },
    { buffer: imageBytes, mimetype: "image/jpeg" },
  ), { status: 409 });

  await f.run("POST", "/api/admin/clinics/:id/decision", admin, {
    status: "changes_requested", reason: "Replace a document.",
  }, { id: manager.uid });
  const deleted = await f.run("DELETE", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "vet_license" });
  assert.equal(deleted.data.deleted, true);
});

test("failed replacement cleanup is tracked privately and retried by an authorized Admin", async () => {
  const objects = new Map();
  let deletionUnavailable = true;
  const fakeSupabase = {
    storage: {
      getBucket: async (name) => ({ data: { name, public: false }, error: null }),
      from: () => ({
        upload: async (path, bytes) => {
          objects.set(path, Buffer.from(bytes));
          return { data: { path }, error: null };
        },
        remove: async (paths) => {
          if (deletionUnavailable) return { data: null, error: { message: "provider detail" } };
          for (const path of paths) objects.delete(path);
          return { data: paths.map((name) => ({ name })), error: null };
        },
        download: async (path) => ({ data: new Blob([objects.get(path)]), error: null }),
      }),
    },
  };
  let storage;
  const f = fixture({
    allowTestDocuments: false,
    documentStorageFactory: (db) => {
      storage = createClinicDocumentStorage({
        db, supabaseClient: fakeSupabase, bucketName: "clinic-documents",
        testOnlySyntheticUploads: true, environment: "test",
      });
      return storage;
    },
  });
  const manager = { uid: "manager-a" };
  const admin = { uid: "admin", petcareAdmin: true };
  await uploadDocuments(f, manager);
  const submitted = await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  assert.equal(submitted.data.clinic.status, "pending");
  const changes = await f.run("POST", "/api/admin/clinics/:id/decision", admin, {
    status: "changes_requested", reason: "Replace one test document.",
  }, { id: manager.uid });
  assert.equal(changes.data.clinic.status, "changes_requested");

  await assert.rejects(() => f.run(
    "POST", "/api/clinics/mine/documents/:kind", manager, {}, { kind: "clinic_license" },
    { buffer: pdfBytes, mimetype: "application/pdf" },
  ), { status: 503 });
  const orphans = await f.run("GET", "/api/admin/clinic-document-orphans", admin);
  assert.equal(orphans.data.orphans.length, 1);
  assert.equal(orphans.data.orphans[0].documentType, "clinic_license");
  assert.equal(orphans.data.orphans[0].metadata, undefined);
  assert.equal(objects.size, 4);

  deletionUnavailable = false;
  const cleaned = await f.run("POST", "/api/admin/clinic-document-orphans/:id/retry", admin, {}, {
    id: orphans.data.orphans[0].id,
  });
  assert.equal(cleaned.data.deleted, true);
  assert.equal(objects.size, 3);
  assert.equal((await storage.getMetadata(manager.uid, "clinic_license")).mimeType, "application/pdf");
});

test("admin decisions reject self-review and invalid status transitions", async () => {
  const f = fixture();
  const adminApplicant = { uid: "manager-a", petcareAdmin: true };
  const admin = { uid: "admin", petcareAdmin: true };
  await uploadDocuments(f, adminApplicant);
  await f.run("POST", "/api/clinics/apply", adminApplicant, applicationBody());
  await assert.rejects(() => f.run("POST", "/api/admin/clinics/:id/decision", adminApplicant, { status: "approved" }, { id: adminApplicant.uid }), { status: 403 });
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: adminApplicant.uid });
  await assert.rejects(() => f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "rejected", reason: "Not suitable" }, { id: adminApplicant.uid }), { status: 409 });
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "suspended", reason: "Review concern" }, { id: adminApplicant.uid });
  const restored = await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: adminApplicant.uid });
  assert.equal(restored.data.clinic.status, "approved");
  await assert.rejects(() => f.run(
    "POST", "/api/admin/clinics/:id/document-necessity-review", admin, { reason: "   " }, { id: adminApplicant.uid },
  ), { status: 400 });
  const necessityReview = await f.run(
    "POST", "/api/admin/clinics/:id/document-necessity-review", admin,
    { reason: "Synthetic policy review." }, { id: adminApplicant.uid },
  );
  assert.equal(necessityReview.data.reviewedBy, admin.uid);
  assert.ok(f.docs.get(`clinicBranches/${adminApplicant.uid}`).documentNecessityReviewedAt);
  await assert.rejects(() => f.run(
    "POST", "/api/admin/clinics/:id/document-necessity-review", { uid: "manager-b" },
    { reason: "Unauthorized review attempt." }, { id: adminApplicant.uid },
  ), { status: 403 });
});

test("retention cleanup is Admin-only, honors holds, deletes expired documents and prunes only clinic audit events", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const admin = { uid: "admin", petcareAdmin: true };
  await uploadDocuments(f, manager);
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());

  const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  const expiredAudit = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  f.docs.set("clinicBranches/manager-a", {
    ...f.docs.get("clinicBranches/manager-a"),
    status: "rejected", rejectedAt: old,
  });
  f.docs.set("adminAuditLogs/old-clinic-event", {
    action: "clinic.document_viewed",
    targetId: manager.uid,
    createdAt: { toDate: () => expiredAudit },
  });
  f.docs.set("adminAuditLogs/old-non-clinic-event", {
    action: "store.order_updated",
    createdAt: { toDate: () => expiredAudit },
  });

  await assert.rejects(() => f.run("POST", "/api/admin/clinic-retention/cleanup", manager), { status: 403 });
  await f.run("POST", "/api/admin/clinics/:id/retention-hold", admin, {
    active: true, type: "appeal", reason: "Appeal review is pending.",
  }, { id: manager.uid });
  const heldCleanup = await f.run("POST", "/api/admin/clinic-retention/cleanup", admin);
  assert.equal(heldCleanup.data.documentsDeleted, 0);
  assert.ok(f.docs.has("clinicBranches/manager-a/verificationDocuments/clinic_license"));

  await assert.rejects(() => f.run("POST", "/api/admin/clinics/:id/retention-hold", admin, {
    active: false,
  }, { id: manager.uid }), { status: 400 });
  await f.run("POST", "/api/admin/clinics/:id/retention-hold", admin, {
    active: false, reason: "Synthetic appeal hold resolved.",
  }, { id: manager.uid });
  const cleanup = await f.run("POST", "/api/admin/clinic-retention/cleanup", admin);
  assert.equal(cleanup.data.documentsDeleted, 3);
  assert.equal(cleanup.data.auditEventsDeleted, 1);
  assert.equal(cleanup.data.policy.auditLogDays, 365);
  assert.ok(!f.docs.has("clinicBranches/manager-a/verificationDocuments/clinic_license"));
  assert.ok(!f.docs.has("adminAuditLogs/old-clinic-event"));
  assert.ok(f.docs.has("adminAuditLogs/old-non-clinic-event"));
});

test("retention cleanup uses resumable bounded application and audit batches", async () => {
  const f = fixture();
  const admin = { uid: "admin", petcareAdmin: true };
  const recent = new Date();
  const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  for (let index = 0; index < 51; index++) {
    const id = `draft-${String(index).padStart(3, "0")}`;
    f.docs.set(`clinicBranches/${id}`, {
      status: "draft", lastActivityAt: recent,
    });
  }
  for (let index = 0; index < 101; index++) {
    const id = `old-event-${String(index).padStart(3, "0")}`;
    f.docs.set(`adminAuditLogs/${id}`, {
      action: "clinic.document_viewed",
      targetId: "missing-clinic",
      createdAt: { toDate: () => old },
    });
  }

  const first = await f.run("POST", "/api/admin/clinic-retention/cleanup", admin);
  assert.equal(first.data.scannedApplications, 50);
  assert.equal(first.data.auditEventsDeleted, 100);
  assert.equal(first.data.hasMore, true);
  const second = await f.run("POST", "/api/admin/clinic-retention/cleanup", admin, {
    cursors: first.data.nextCursors,
    auditCursor: first.data.nextAuditCursor,
  });
  assert.equal(second.data.scannedApplications, 1);
  assert.equal(second.data.auditEventsDeleted, 1);
  assert.equal(second.data.hasMore, false);
  assert.equal(f.docs.has("adminAuditLogs/old-event-100"), false);
});

test("only the approved manager can configure services; other accounts cannot approve or edit", async () => {
  const f = fixture();
  const manager = { uid: "manager-a" };
  const outsider = { uid: "manager-b" };
  const admin = { uid: "admin", petcareAdmin: true };
  await uploadDocuments(f, manager);
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());
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
  f.docs.set("adminPetSummaries/owner-a_pet-legacy", { ownerUid: "owner-a", name: "Bella" });
  await uploadDocuments(f, manager);
  await f.run("POST", "/api/clinics/apply", manager, applicationBody());
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  await f.run("PUT", "/api/clinics/mine/services", manager, { services: [{ id: "basic", name: "Consultation", price: 250, durationMinutes: 30 }] });
  await f.run("PUT", "/api/clinics/mine/availability", manager, {
    workingHours: { days: [0, 1, 2, 3, 4, 5, 6], open: "00:00", close: "23:59" },
  });
  const future = new Date(Date.now() + 7 * 86400000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(future);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const details = {
    petId: "pet-a", serviceId: "basic", date: `${values.year}-${values.month}-${values.day}`,
    time: "14:30", requestId: randomUUID(),
  };
  await assert.rejects(() => f.run("POST", "/api/clinics/:id/appointments", owner, {
    ...details, time: "23:50", requestId: randomUUID(),
  }, { id: manager.uid }), { status: 400 });
  await assert.rejects(() => f.run("POST", "/api/clinics/:id/appointments", outsider, details, { id: manager.uid }), { status: 403 });
  await assert.rejects(() => f.run("POST", "/api/clinics/:id/appointments", outsider, { ...details, petId: "pet-legacy" }, { id: manager.uid }), { status: 403 });
  const legacyBooking = (await f.run("POST", "/api/clinics/:id/appointments", owner, {
    ...details, petId: "pet-legacy", time: "15:30", requestId: randomUUID(),
  }, { id: manager.uid })).data.appointment;
  assert.equal(legacyBooking.petName, "Bella");
  const a = (await f.run("POST", "/api/clinics/:id/appointments", owner, details, { id: manager.uid })).data.appointment;
  const repeated = await f.run("POST", "/api/clinics/:id/appointments", owner, details, { id: manager.uid });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.appointment.id, a.id);
  await assert.rejects(() => f.run("POST", "/api/clinics/:id/appointments", owner, {
    ...details, time: "14:40",
  }, { id: manager.uid }), { status: 409 });
  const b = (await f.run("POST", "/api/clinics/:id/appointments", owner, {
    ...details, requestId: randomUUID(),
  }, { id: manager.uid })).data.appointment;
  const c = (await f.run("POST", "/api/clinics/:id/appointments", owner, {
    ...details, time: "14:45", requestId: randomUUID(),
  }, { id: manager.uid })).data.appointment;
  assert.equal(a.status, "pending");
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", outsider, { status: "confirmed" }, { id: a.id }), { status: 403 });
  await f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: a.id });
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: b.id }), { status: 409 });
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: c.id }), { status: 409 });
  await f.run("POST", "/api/clinics/my-appointments/:id/cancel", owner, {}, { id: a.id });
  const confirmedB = await f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "confirmed" }, { id: b.id });
  assert.equal(confirmedB.data.appointment.status, "confirmed");
  await assert.rejects(() => f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, { status: "rejected" }, { id: c.id }), { status: 400 });
  const rejectedC = await f.run("POST", "/api/clinics/mine/appointments/:id/status", manager, {
    status: "rejected", reason: "No available slot",
  }, { id: c.id });
  assert.equal(rejectedC.data.appointment.statusReason, "No available slot");
});

test("Russian clinic draft, approval and public map-share link work without coordinates", async () => {
  const f = fixture();
  const manager = { uid: "manager-ru" };
  const admin = { uid: "admin", petcareAdmin: true };
  const russian = {
  "name": "Severnaya Vet Clinic",
  "managerName": "Anna Ivanova",
  "region": "Московская область",
  "city": "Химки",
  "address": "Ленинский проспект, 10",
  "mapUrl": "https://2gis.ru/moscow/firm/1234567890",
  "timeZone": "Europe/Moscow",
  "phone": "+79991234567",
  "email": "clinic-example@example.com",
  "description": "Russian veterinary clinic",
  "clinicLicenseNumber": "RU-TEST-100",
  "responsibleVetName": "Dr Ivanov",
  "responsibleVetLicenseNumber": "RU-TEST-VET-200"
};
  const draft = await f.run("PUT", "/api/clinics/mine/draft", manager, {
    clinic: { name: russian.name, region: russian.region, mapUrl: russian.mapUrl, timeZone: russian.timeZone },
  });
  assert.equal(draft.data.clinic.region, russian.region);
  assert.equal(draft.data.clinic.mapUrl, russian.mapUrl);
  assert.equal(draft.data.clinic.currency, "RUB");
  await uploadDocuments(f, manager);
  const submission = await f.run("POST", "/api/clinics/apply", manager, { clinic: russian });
  assert.equal(submission.data.clinic.status, "pending");
  assert.equal((await f.run("GET", "/api/clinics", null)).data.clinics.length, 0);
  const review = await f.run("GET", "/api/admin/clinics", admin);
  assert.equal(review.data.clinics[0].mapUrl, russian.mapUrl);
  await f.run("POST", "/api/admin/clinics/:id/decision", admin, { status: "approved" }, { id: manager.uid });
  const listed = (await f.run("GET", "/api/clinics", null)).data.clinics[0];
  assert.equal(listed.mapUrl, russian.mapUrl);
  assert.equal(listed.region, russian.region);
  assert.equal(listed.currency, "RUB");
  assert.equal(listed.timeZone, "Europe/Moscow");
  assert.equal(listed.latitude, null);
  assert.equal(listed.longitude, null);
  assert.equal(Object.hasOwn(listed, "managerName"), false);
  assert.equal(Object.hasOwn(listed, "clinicLicenseNumber"), false);
  const changed = await f.run("PUT", "/api/clinics/mine/profile", manager, {
    profile: { region: "Москва", mapUrl: "https://yandex.ru/maps/213/moscow/", timeZone: "Europe/Moscow" },
  });
  assert.equal(changed.data.clinic.region, "Москва");
  assert.equal(changed.data.clinic.mapUrl, "https://yandex.ru/maps/213/moscow/");
});


test("approved clinic manager can confirm a pet owner's request with a chosen clinic-local slot", async()=>{
  const f=fixture();
  const manager={uid:"manager-a"};
  const owner={uid:"pet-owner"};
  const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  f.docs.set("clinicBranches/manager-a",{
    status:"approved",region:"Москва",timeZone:"Europe/Moscow",
    workingHours:{days:[0,1,2,3,4,5,6],open:"08:00",close:"20:00"}
  });
  f.docs.set("clinicAppointments/request-one",{
    clinicId:"manager-a",ownerUid:owner.uid,status:"pending",
    date:day,time:"09:00",durationMinutes:30,petName:"Luna",serviceName:"Exam",price:1200
  });
  const confirmed=await f.run("POST","/api/clinics/mine/appointments/:id/status",manager,
    {status:"confirmed",date:day,time:"11:30"},{id:"request-one"});
  assert.equal(confirmed.data.appointment.status,"confirmed");
  assert.equal(confirmed.data.appointment.date,day);
  assert.equal(confirmed.data.appointment.time,"11:30");
  const ownerView=await f.run("GET","/api/clinics/my-appointments",owner);
  assert.equal(ownerView.data.appointments[0].time,"11:30");
  assert.equal(f.docs.get("clinicBranches/manager-a/reservedSlots/"+day+"_11:30").appointmentId,"request-one");
});
test("booking time changes reject past dates, invalid hours and half-complete requests",async()=>{
  const f=fixture(),manager={uid:"manager-a"},day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  f.docs.set("clinicBranches/manager-a",{
    status:"approved",region:"Москва",timeZone:"Europe/Moscow",
    workingHours:{days:[0,1,2,3,4,5,6],open:"08:00",close:"20:00"}
  });
  f.docs.set("clinicAppointments/request-a",{clinicId:"manager-a",status:"pending",date:day,time:"09:00",durationMinutes:30});
  const path="/api/clinics/mine/appointments/:id/status",params={id:"request-a"};
  await assert.rejects(()=>f.run("POST",path,manager,{status:"confirmed",date:day},params),{status:400});
  await assert.rejects(()=>f.run("POST",path,manager,{status:"confirmed",date:day,time:"06:00"},params),{status:400});
  await assert.rejects(()=>f.run("POST",path,manager,{status:"confirmed",date:"2000-01-01",time:"11:30"},params),{status:400});
  await assert.rejects(()=>f.run("POST",path,manager,{status:"confirmed",date:day,time:"19:45"},params),{status:400});
  assert.equal(f.docs.get("clinicAppointments/request-a").status,"pending");
});
test("overlapping slots and foreign clinic accounts cannot confirm a request",async()=>{
  const f=fixture(),manager={uid:"manager-a"},other={uid:"manager-b"};
  const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const base={status:"approved",region:"Москва",timeZone:"Europe/Moscow",workingHours:{days:[0,1,2,3,4,5,6],open:"08:00",close:"20:00"}};
  f.docs.set("clinicBranches/manager-a",base);
  f.docs.set("clinicBranches/manager-b",base);
  f.docs.set("clinicAppointments/request-a",{clinicId:"manager-a",status:"pending",date:day,time:"09:00",durationMinutes:30});
  f.docs.set("clinicBranches/manager-a/reservedSlots/"+day+"_11:00",{
    appointmentId:"other-booking",date:day,time:"11:00",durationMinutes:45
  });
  const path="/api/clinics/mine/appointments/:id/status",params={id:"request-a"},body={status:"confirmed",date:day,time:"11:30"};
  await assert.rejects(()=>f.run("POST",path,manager,body,params),{status:409});
  await assert.rejects(()=>f.run("POST",path,other,body,params),{status:404});
  assert.equal(f.docs.get("clinicAppointments/request-a").status,"pending");
});
test("legacy status-only confirmation still reserves the owner's requested slot",async()=>{
  const f=fixture(),manager={uid:"manager-a"},day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  f.docs.set("clinicBranches/manager-a",{status:"approved"});
  f.docs.set("clinicAppointments/request-a",{clinicId:"manager-a",status:"pending",date:day,time:"11:00",durationMinutes:30});
  const result=await f.run("POST","/api/clinics/mine/appointments/:id/status",manager,{status:"confirmed"},{id:"request-a"});
  assert.equal(result.data.appointment.status,"confirmed");
  assert.equal(result.data.appointment.time,"11:00");
  assert.equal(f.docs.get("clinicBranches/manager-a/reservedSlots/"+day+"_11:00").appointmentId,"request-a");
});


test("only active doctors from an approved clinic appear in the public selector without staff emails",async()=>{
 const f=fixture();
 f.docs.set("clinicBranches/manager-a",{status:"approved",name:"Test clinic"});
 f.docs.set("clinicBranches/manager-a/staff/vet-a",{
  role:"veterinarian",status:"active",name:"Dr. Sara",specialty:"Dermatology",email:"private@example.test",yearsExperience:10
 });
 f.docs.set("clinicBranches/manager-a/staff/vet-b",{role:"veterinarian",status:"inactive",name:"Dr. Off",email:"off@example.test"});
 f.docs.set("clinicBranches/manager-a/staff/assistant",{role:"receptionist",status:"active",name:"Reception",email:"front@example.test"});
 const r=await f.run("GET","/api/clinics/:id/doctors",null,{}, {id:"manager-a"});
 assert.deepEqual(r.data.doctors,[{id:"vet-a",name:"Dr. Sara",specialty:"Dermatology"}]);
 assert.equal(JSON.stringify(r.data).includes("private@example.test"),false);
 f.docs.set("clinicBranches/manager-a",{status:"pending",name:"Test clinic"});
 await assert.rejects(()=>f.run("GET","/api/clinics/:id/doctors",null,{}, {id:"manager-a"}),{status:404});
});
test("owner booking can choose a real doctor and contact phone; clinic sees the name",async()=>{
 const f=fixture(),owner={uid:"owner-a"},day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 f.docs.set("clinicBranches/manager-a",{status:"approved",name:"Demo Clinic",region:"Москва",city:"Moscow",timeZone:"Europe/Moscow",
  services:[{id:"service-a",name:"Checkup",durationMinutes:30,price:500,available:true}],
  workingHours:{days:[0,1,2,3,4,5,6],open:"00:00",close:"23:59"}});
 f.docs.set("users/owner-a/pets/pet-a",{ownerUid:"owner-a",name:"Milo"});
 f.docs.set("clinicBranches/manager-a/staff/doc-a",{status:"active",role:"veterinarian",name:"Dr. Sara",email:"private@example.test"});
 const form={petId:"pet-a",serviceId:"service-a",doctorId:"doc-a",contactPhone:"+79991234567",date:day,time:"12:30",notes:"Demo",
   requestId:randomUUID()};
 const result=await f.run("POST","/api/clinics/:id/appointments",owner,form,{id:"manager-a"});
 assert.equal(result.status,201);assert.equal(result.data.appointment.doctorName,"Dr. Sara");
 assert.equal(result.data.appointment.doctorId,"doc-a");
 assert.equal(result.data.appointment.contactPhone,"+79991234567");
 const saved=f.docs.get("clinicAppointments/"+result.data.appointment.id);
 assert.equal(saved.doctorId,"doc-a");assert.equal(saved.doctorName,"Dr. Sara");
 assert.equal(saved.ownerUid,owner.uid);
});
test("booking rejects an invented, inactive or other-clinic doctor",async()=>{
 const f=fixture(),owner={uid:"owner-a"},day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 f.docs.set("clinicBranches/manager-a",{status:"approved",name:"Demo Clinic",timeZone:"Europe/Moscow",region:"Москва",
  services:[{id:"service-a",name:"Exam",durationMinutes:30,price:500,available:true}],
  workingHours:{days:[0,1,2,3,4,5,6],open:"00:00",close:"23:59"}});
 f.docs.set("users/owner-a/pets/pet-a",{ownerUid:"owner-a",name:"Milo"});
 f.docs.set("clinicBranches/manager-a/staff/inactive",{status:"inactive",role:"veterinarian",name:"Dr. Off"});
 f.docs.set("clinicBranches/manager-b/staff/other",{status:"active",role:"veterinarian",name:"Dr. Else"});
 const base={petId:"pet-a",serviceId:"service-a",date:day,time:"12:30",notes:"",requestId:randomUUID()};
 const route="/api/clinics/:id/appointments",params={id:"manager-a"};
 for(const doctorId of ["inactive","other","not-a-doctor"]) {
   await assert.rejects(()=>f.run("POST",route,owner,{...base,doctorId},params),{status:400});
 }
 assert.equal([...f.docs.keys()].filter(k=>k.startsWith("clinicAppointments/")).length,0);
});
