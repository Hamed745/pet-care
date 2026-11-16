"use strict";

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { createClinicDocumentStorage } = require("../clinicDocumentStorage.cjs");

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_BUCKET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.log(`SKIP Supabase integration; missing configuration: ${missing.join(", ")}`);
  process.exitCode = 0;
} else if (process.env.SUPABASE_BUCKET !== "clinic-documents") {
  console.error("Supabase integration requires SUPABASE_BUCKET=clinic-documents.");
  process.exitCode = 1;
} else {
  function fakeDb() {
    const records = new Map();
    return {
      collection: (name) => ({
        doc: (id) => ({
          collection: (subcollection) => ({
            doc: (kind) => {
              const path = `${name}/${id}/${subcollection}/${kind}`;
              return {
                get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
                set: async (value) => records.set(path, value),
                delete: async () => records.delete(path),
              };
            },
          }),
        }),
      }),
    };
  }

  (async () => {
    const bucket = process.env.SUPABASE_BUCKET;
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const db = fakeDb();
    const storage = createClinicDocumentStorage({
      db,
      supabaseClient: client,
      bucketName: bucket,
      objectPrefix: "integration-tests",
      testOnlySyntheticUploads: true,
      environment: "test",
    });
    const uid = `supabase-test-${randomUUID()}`;
    const kind = "clinic_license";
    const bytes = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");
    const replacementBytes = Buffer.from("%PDF-1.7\n2 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");
    const doc = db.collection("clinicBranches").doc(uid).collection("verificationDocuments").doc(kind);
    let metadata;
    try {
      assert.equal(await storage.verify(), true, "bucket must exist and be private");
      metadata = await storage.store(uid, kind, { bytes, mimeType: "application/pdf" });
      assert.match(metadata.path, /^integration-tests\/supabase-test-/);
      await doc.set(metadata);
      const previous = metadata;
      metadata = await storage.store(uid, kind, { bytes: replacementBytes, mimeType: "application/pdf" });
      await doc.set(metadata);
      await storage.remove(uid, kind, previous);
      assert.deepEqual((await storage.read(uid, kind)).bytes, replacementBytes);
      assert.equal((await storage.getMetadata(uid, kind)).path, undefined);
      console.log("PASS private Supabase bucket verification, synthetic upload, replacement, retrieval and deletion");
    } catch (error) {
      console.error("[Supabase integration]", error?.code || "storage check failed");
      process.exitCode = 1;
    } finally {
      if (metadata) {
        try { await storage.remove(uid, kind, metadata); }
        catch {
          console.error("[Supabase integration cleanup] test object cleanup failed");
          process.exitCode = 1;
        }
      }
      await doc.delete();
    }
  })();
}
