"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createClinicDocumentStorage, MAX_DOCUMENT_BYTES, validateDocumentBytes } = require("../clinicDocumentStorage.cjs");

function fakeDb() {
  const documents = new Map();
  return {
    documents,
    collection: (name) => ({
      add: async (value) => {
        const path = `${name}/orphan-${documents.size}`;
        documents.set(path, value);
        return { id: path.split("/").at(-1) };
      },
      doc: (id) => ({
        collection: (subcollection) => ({
          doc: (kind) => {
            const path = `${name}/${id}/${subcollection}/${kind}`;
            return {
              get: async () => ({ exists: documents.has(path), data: () => documents.get(path) }),
              set: async (value) => documents.set(path, value),
              delete: async () => documents.delete(path),
            };
          },
        }),
      }),
    }),
  };
}

function supabaseFixture({ isPublic = false, uploadError = null, removeUnavailable = false } = {}) {
  const objects = new Map();
  const calls = [];
  let deletionUnavailable = removeUnavailable;
  const bucketName = "clinic-documents";
  const objectStorage = {
    upload: async (path, bytes, options) => {
      calls.push({ action: "upload", path, options });
      if (uploadError) return { data: null, error: { message: uploadError } };
      objects.set(path, Buffer.from(bytes));
      return { data: { path }, error: null };
    },
    download: async (path) => {
      calls.push({ action: "download", path });
      const bytes = objects.get(path);
      return bytes
        ? { data: new Blob([bytes]), error: null }
        : { data: null, error: { message: "not found" } };
    },
    move: async (from, to) => {
      calls.push({ action: "move", from, to });
      const bytes = objects.get(from);
      if (!bytes) return { data: null, error: { message: "not found" } };
      objects.delete(from);
      objects.set(to, bytes);
      return { data: { path: to }, error: null };
    },
    remove: async (paths) => {
      calls.push({ action: "remove", paths });
      if (deletionUnavailable) return { data: null, error: { message: "provider detail" } };
      for (const path of paths) objects.delete(path);
      return { data: paths.map((name) => ({ name })), error: null };
    },
  };
  return {
    objects,
    calls,
    setDeletionUnavailable: (value) => { deletionUnavailable = value; },
    client: {
      storage: {
        getBucket: async (name) => ({
          data: { name, public: isPublic },
          error: null,
        }),
        from: (name) => {
          assert.equal(name, bucketName);
          return objectStorage;
        },
      },
    },
  };
}

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");

test("document validation requires supported signatures and enforces the 5 MB bound", () => {
  assert.equal(validateDocumentBytes(jpeg, "image/jpeg").mimeType, "image/jpeg");
  assert.equal(validateDocumentBytes(pdf, "application/pdf").mimeType, "application/pdf");
  assert.throws(() => validateDocumentBytes(Buffer.from("not a file"), "image/jpeg"), /valid PDF/);
  assert.throws(() => validateDocumentBytes(jpeg, "image/png"), /valid PDF/);
  assert.throws(() => validateDocumentBytes(Buffer.alloc(0), "image/jpeg"), /non-empty/);
  assert.throws(() => validateDocumentBytes(Buffer.alloc(MAX_DOCUMENT_BYTES + 1), "application/pdf"), /5 MB/);
});

test("clinic document uploads stay disabled without Supabase credentials", async () => {
  const storage = createClinicDocumentStorage({ db: fakeDb(), environment: "test" });
  assert.equal(storage.enabled, false);
  assert.equal(storage.mode, "disabled");
  assert.equal(await storage.verify(), false);
  await assert.rejects(() => storage.store("clinic-a", "clinic_license", {
    bytes: jpeg, mimeType: "image/jpeg",
  }), /not enabled/);
});

test("emulator fixtures stay separate and do not store document bytes in Firestore", async () => {
  const db = fakeDb();
  const storage = createClinicDocumentStorage({ db, emulatorMode: true });
  const metadata = await storage.store("clinic-a", "clinic_license", {
    bytes: pdf, mimeType: "application/pdf",
  });
  const documentRef = db.collection("clinicBranches").doc("clinic-a")
    .collection("verificationDocuments").doc("clinic_license");
  await documentRef.set(metadata);
  assert.equal(metadata.provider, "firestore-emulator");
  assert.equal(metadata.image, undefined);
  assert.equal((await storage.getMetadata("clinic-a", "clinic_license")).size, pdf.length);
  assert.deepEqual((await storage.read("clinic-a", "clinic_license")).bytes, pdf);
  await storage.remove("clinic-a", "clinic_license", metadata);
  await documentRef.delete();
  assert.equal(await storage.read("clinic-a", "clinic_license"), null);
});

test("Supabase storage verifies a private bucket, uses generated paths, and supports retrieval and deletion", async () => {
  const db = fakeDb();
  const supabase = supabaseFixture();
  const storage = createClinicDocumentStorage({
    db,
    supabaseClient: supabase.client,
    bucketName: "clinic-documents",
    testOnlySyntheticUploads: true,
    environment: "test",
  });
  const metadata = await storage.store("clinic-a", "manager_id", {
    bytes: jpeg, mimeType: "image/jpeg",
  });
  assert.equal(storage.mode, "supabase");
  assert.match(metadata.path, /^clinic-verification\/clinic-a\/manager_id\/[0-9a-f-]{36}\.jpg$/);
  assert.equal(supabase.objects.has(metadata.path), true);
  assert.deepEqual((await supabase.client.storage.from("clinic-documents").download(metadata.path)).data instanceof Blob, true);
  await db.collection("clinicBranches").doc("clinic-a")
    .collection("verificationDocuments").doc("manager_id").set(metadata);
  assert.deepEqual((await storage.read("clinic-a", "manager_id")).bytes, jpeg);
  const safeMetadata = await storage.getMetadata("clinic-a", "manager_id");
  assert.equal(safeMetadata.path, undefined);
  assert.equal(safeMetadata.size, jpeg.length);
  await storage.remove("clinic-a", "manager_id", metadata);
  assert.equal(supabase.objects.has(metadata.path), false);
  assert.equal(supabase.calls.some((call) => call.action === "upload" && call.options.upsert === false), true);
});

test("Supabase adapter rejects public buckets and sanitizes provider errors", async () => {
  const publicStorage = createClinicDocumentStorage({
    db: fakeDb(),
    supabaseClient: supabaseFixture({ isPublic: true }).client,
    bucketName: "clinic-documents",
    testOnlySyntheticUploads: true,
    environment: "test",
  });
  await assert.rejects(() => publicStorage.verify(), /not private/);

  const failedUpload = createClinicDocumentStorage({
    db: fakeDb(),
    supabaseClient: supabaseFixture({ uploadError: "SUPABASE_SECRET_KEY=private-value" }).client,
    bucketName: "clinic-documents",
    testOnlySyntheticUploads: true,
    environment: "test",
  });
  await assert.rejects(
    () => failedUpload.store("clinic-a", "clinic_license", { bytes: jpeg, mimeType: "image/jpeg" }),
    (error) => {
      assert.match(error.message, /upload failed/);
      assert.doesNotMatch(error.message, /private-value|SECRET_KEY/);
      return true;
    },
  );
});

test("synthetic Supabase uploads require explicit test-only mode", async () => {
  for (const environment of ["development", "production", ""]) {
    const storage = createClinicDocumentStorage({
      db: fakeDb(),
      supabaseClient: supabaseFixture().client,
      bucketName: "clinic-documents",
      testOnlySyntheticUploads: true,
      environment,
    });
    assert.equal(await storage.verify(), false);
    await assert.rejects(() => storage.store("clinic-a", "clinic_license", {
      bytes: jpeg, mimeType: "image/jpeg",
    }), /not enabled/);
  }

  const withoutOptIn = createClinicDocumentStorage({
    db: fakeDb(),
    supabaseClient: supabaseFixture().client,
    bucketName: "clinic-documents",
    environment: "test",
  });
  assert.equal(await withoutOptIn.verify(), false);
});

test("production uploads fail closed without a scanner and quarantine clean files before promotion", async () => {
  const db = fakeDb();
  const privateBucket = supabaseFixture();
  const disabled = createClinicDocumentStorage({
    db,
    supabaseClient: privateBucket.client,
    bucketName: "clinic-documents",
    environment: "production",
  });
  assert.equal(await disabled.verify(), false);
  await assert.rejects(() => disabled.store("clinic-a", "clinic_license", {
    bytes: jpeg, mimeType: "image/jpeg",
  }), /not enabled/);

  const scanned = supabaseFixture();
  const enabled = createClinicDocumentStorage({
    db,
    supabaseClient: scanned.client,
    bucketName: "clinic-documents",
    productionUploadsEnabled: true,
    environment: "production",
    scanner: { scan: async () => ({ clean: true }) },
  });
  const metadata = await enabled.store("clinic-a", "clinic_license", {
    bytes: jpeg, mimeType: "image/jpeg",
  });
  assert.equal(metadata.scanStatus, "clean");
  assert.ok(metadata.scannedAt);
  assert.equal(scanned.calls.some((call) => call.action === "move" &&
    call.from.startsWith("quarantine/") && call.to === metadata.path), true);
  assert.equal([...scanned.objects.keys()].some((path) => path.startsWith("quarantine/")), false);
  const documentRef = db.collection("clinicBranches").doc("clinic-a")
    .collection("verificationDocuments").doc("clinic_license");
  await documentRef.set(metadata);
  assert.deepEqual((await enabled.read("clinic-a", "clinic_license")).bytes, jpeg);
  await documentRef.set({ ...metadata, scanStatus: "quarantined" });
  await assert.rejects(() => enabled.read("clinic-a", "clinic_license"), /reference is invalid/);
});

test("failed security screening removes the quarantined object", async () => {
  const supabase = supabaseFixture();
  const storage = createClinicDocumentStorage({
    db: fakeDb(),
    supabaseClient: supabase.client,
    bucketName: "clinic-documents",
    productionUploadsEnabled: true,
    environment: "production",
    scanner: { scan: async () => ({ clean: false }) },
  });
  await assert.rejects(() => storage.store("clinic-a", "clinic_license", {
    bytes: jpeg, mimeType: "image/jpeg",
  }), /security screening/);
  assert.equal(supabase.objects.size, 0);
});

test("failed quarantine cleanup records a private retryable orphan without logging object contents", async () => {
  const db = fakeDb();
  const supabase = supabaseFixture({ removeUnavailable: true });
  const storage = createClinicDocumentStorage({
    db,
    supabaseClient: supabase.client,
    bucketName: "clinic-documents",
    productionUploadsEnabled: true,
    environment: "production",
    scanner: { scan: async () => ({ clean: false }) },
  });
  await assert.rejects(() => storage.store("clinic-a", "clinic_license", {
    bytes: jpeg, mimeType: "image/jpeg",
  }), /security screening/);
  const [orphanPath, orphan] = [...db.documents.entries()].find(([path]) =>
    path.startsWith("clinicDocumentOrphans/"));
  assert.ok(orphanPath);
  assert.equal(storage.validOrphanRecord(orphan.clinicUid, orphan.documentType, orphan.metadata), true);
  assert.match(orphan.metadata.path, /^quarantine\/clinic-verification\//);
  supabase.setDeletionUnavailable(false);
  await storage.remove(orphan.clinicUid, orphan.documentType, orphan.metadata);
  assert.equal(supabase.objects.size, 0);
});
