"use strict";

const { createHash, randomUUID } = require("node:crypto");

const DOCUMENT_TYPES = new Set(["clinic_license", "manager_id", "vet_license"]);
const DOCUMENT_MIME_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const PNG_END = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

function assertKey(uid, kind) {
  if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !DOCUMENT_TYPES.has(kind)) {
    throw new Error("Invalid clinic document reference.");
  }
}

function validateDocumentBytes(bytes, claimedMimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error("Document must be non-empty and no larger than 5 MB.");
  }

  let mimeType = "";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 5) === "%PDF-") {
    const tail = bytes.toString("latin1", Math.max(0, bytes.length - 2048));
    if (tail.includes("%%EOF")) mimeType = "application/pdf";
  } else if (bytes.length >= 4 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
      bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    mimeType = "image/jpeg";
  } else if (bytes.length >= 33 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
      bytes.subarray(-PNG_END.length).equals(PNG_END)) {
    mimeType = "image/png";
  }

  if (!mimeType || (claimedMimeType && claimedMimeType !== mimeType)) {
    throw new Error("Document must be a valid PDF, JPEG or PNG file.");
  }
  return { bytes, mimeType, size: bytes.length, extension: DOCUMENT_MIME_TYPES.get(mimeType) };
}

function createClinicDocumentStorage({
  db,
  supabaseClient = null,
  bucketName = "",
  objectPrefix = "clinic-verification",
  emulatorMode = false,
  testOnlySyntheticUploads = false,
  productionUploadsEnabled = false,
  // Deliberate graduation-project mode: accepts DEMO fixtures into private Storage.
  // Does not certify documents as malware-free or verify identity/license validity.
  demoUploadsEnabled = false,
  scanner = null,
  environment = process.env.NODE_ENV,
  FieldValue,
}) {
  if (!/^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/.test(objectPrefix)) {
    throw new Error("Invalid clinic document storage prefix.");
  }
  const mode = emulatorMode ? "emulator" : supabaseClient && bucketName ? "supabase" : "disabled";
  const syntheticTestMode = testOnlySyntheticUploads === true && environment === "test";
  const demoMode = demoUploadsEnabled === true && mode === "supabase";
  const enabled = mode !== "disabled";
  const emulatorDocuments = new Map();
  let privateBucketCheck;

  function documentRef(uid, kind) {
    assertKey(uid, kind);
    return db.collection("clinicBranches").doc(uid).collection("verificationDocuments").doc(kind);
  }

  function validObjectPath(uid, kind, path, allowQuarantine = false) {
    if (typeof path !== "string" || path.includes("..") || path.includes("\\")) return false;
    const finalPath = new RegExp(`^${objectPrefix}/${uid}/${kind}/[0-9a-f-]{36}\\.(?:pdf|jpg|png)$`);
    const quarantinePath = new RegExp(`^quarantine/${objectPrefix}/${uid}/${kind}/[0-9a-f-]{36}\\.(?:pdf|jpg|png)$`);
    return finalPath.test(path) || allowQuarantine && quarantinePath.test(path);
  }

  async function assertPrivateBucket() {
    if (mode !== "supabase") return;
    if (!privateBucketCheck) {
      privateBucketCheck = Promise.resolve()
        .then(() => supabaseClient.storage.getBucket(bucketName))
        .then(({ data, error }) => {
          if (error || !data || data.name !== bucketName || data.public !== false) {
            throw new Error("Supabase verification bucket is unavailable or not private.");
          }
        })
        .catch(() => {
          privateBucketCheck = null;
          throw new Error("Supabase verification bucket is unavailable or not private.");
        });
    }
    await privateBucketCheck;
  }

  function uploadAllowed() {
    if (mode === "emulator") return true;
    if (mode !== "supabase") return false;
    if (syntheticTestMode || demoMode) return true;
    return productionUploadsEnabled && typeof scanner?.scan === "function";
  }

  async function verify() {
    if (!enabled) return false;
    await assertPrivateBucket();
    return uploadAllowed();
  }

  async function getRecord(uid, kind) {
    assertKey(uid, kind);
    const snapshot = await documentRef(uid, kind).get();
    return snapshot.exists ? snapshot.data() || {} : null;
  }

  function validRecord(uid, kind, metadata) {
    if (!metadata || !DOCUMENT_MIME_TYPES.has(metadata.mimeType) ||
        !Number.isInteger(metadata.size) || metadata.size < 1 || metadata.size > MAX_DOCUMENT_BYTES) return false;
    if (metadata.provider === "firestore-emulator" && emulatorMode) {
      return validObjectPath(uid, kind, metadata.path) && emulatorDocuments.has(metadata.path);
    }
    if (metadata.provider !== "supabase" || mode !== "supabase" ||
        !validObjectPath(uid, kind, metadata.path)) return false;
    if (syntheticTestMode) return true;
    if (demoMode && metadata.demo === true && metadata.scanStatus === "demo_unscanned") return true;
    return metadata.scanStatus === "clean" &&
      typeof metadata.scannedAt === "string" &&
      Number.isFinite(Date.parse(metadata.scannedAt));
  }

  function validOrphanRecord(uid, kind, metadata) {
    return metadata?.provider === "supabase" && mode === "supabase" &&
      DOCUMENT_MIME_TYPES.has(metadata.mimeType) &&
      Number.isInteger(metadata.size) && metadata.size > 0 && metadata.size <= MAX_DOCUMENT_BYTES &&
      validObjectPath(uid, kind, metadata.path, true);
  }

  async function removeOrTrack(uid, kind, metadata, reason) {
    try {
      const { error } = await supabaseClient.storage.from(bucketName).remove([metadata.path]);
      if (error) throw new Error("remove failed");
    } catch {
      try {
        await db.collection("clinicDocumentOrphans").add({
          clinicUid: uid,
          documentType: kind,
          metadata,
          reason,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      } catch {
        console.error("[clinic document cleanup] storage orphan record failed");
      }
    }
  }

  async function getMetadata(uid, kind) {
    const metadata = await getRecord(uid, kind);
    if (!metadata) return null;
    if (!validRecord(uid, kind, metadata)) throw new Error("Stored clinic document reference is invalid.");
    return {
      kind,
      mimeType: metadata.mimeType,
      size: metadata.size,
      scanStatus: metadata.scanStatus || "not_scanned",
      updatedAt: metadata.updatedAt?.toDate?.()?.toISOString?.() ||
        (typeof metadata.updatedAt === "string" ? metadata.updatedAt : null),
    };
  }

  async function store(uid, kind, { bytes, mimeType }) {
    assertKey(uid, kind);
    const file = validateDocumentBytes(bytes, mimeType);
    if (!(await verify())) throw new Error("Private clinic document uploads are not enabled.");

    const digest = createHash("sha256").update(file.bytes).digest("hex");
    const fileName = `${randomUUID()}.${file.extension}`;
    if (mode === "emulator") {
      const path = `${objectPrefix}/${uid}/${kind}/${fileName}`;
      emulatorDocuments.set(path, Buffer.from(file.bytes));
      return {
        provider: "firestore-emulator",
        path,
        mimeType: file.mimeType,
        size: file.size,
        sha256: digest,
        scanStatus: "synthetic_emulator_fixture",
      };
    }

    const storage = supabaseClient.storage.from(bucketName);
    const objectPath = `${objectPrefix}/${uid}/${kind}/${fileName}`;
    let uploadPath = objectPath;
    let scanStatus = demoMode ? "demo_unscanned" : "synthetic_test_unscanned";
    const syntheticLocalUpload = syntheticTestMode || demoMode;
    if (!syntheticLocalUpload) {
      if (!productionUploadsEnabled || typeof scanner?.scan !== "function") {
        throw new Error("Production clinic document uploads are disabled.");
      }
      uploadPath = `quarantine/${objectPath}`;
      scanStatus = "clean";
    }

    const uploadResult = await storage.upload(uploadPath, file.bytes, {
      contentType: file.mimeType,
      cacheControl: "0",
      upsert: false,
    });
    if (uploadResult?.error) {
      await removeOrTrack(uid, kind, {
        provider: "supabase", path: uploadPath, mimeType: file.mimeType,
        size: file.size, sha256: digest, scanStatus: "upload_uncertain",
      }, "upload_rollback");
      throw new Error("Private clinic document upload failed.");
    }

    if (uploadPath !== objectPath) {
      let scanResult;
      try {
        scanResult = await scanner.scan(file.bytes, { mimeType: file.mimeType, sha256: digest });
      } catch {
        await removeOrTrack(uid, kind, {
          provider: "supabase", path: uploadPath, mimeType: file.mimeType,
          size: file.size, sha256: digest, scanStatus: "quarantined",
        }, "scanner_unavailable");
        throw new Error("Clinic document security screening is unavailable.");
      }
      if (scanResult?.clean !== true) {
        await removeOrTrack(uid, kind, {
          provider: "supabase", path: uploadPath, mimeType: file.mimeType,
          size: file.size, sha256: digest, scanStatus: "quarantined",
        }, "scanner_rejected");
        throw new Error("Clinic document did not pass security screening.");
      }
      const moveResult = await storage.move(uploadPath, objectPath);
      if (moveResult?.error) {
        await removeOrTrack(uid, kind, {
          provider: "supabase", path: uploadPath, mimeType: file.mimeType,
          size: file.size, sha256: digest, scanStatus: "quarantined",
        }, "quarantine_promotion_failed");
        throw new Error("Private clinic document upload failed.");
      }
    }

    return {
      provider: "supabase",
      path: objectPath,
      mimeType: file.mimeType,
      size: file.size,
      sha256: digest,
      scanStatus,
      ...(demoMode ? { demo: true } : {}),
      ...(scanStatus === "clean" ? { scannedAt: new Date().toISOString() } : {}),
    };
  }

  async function read(uid, kind) {
    const metadata = await getRecord(uid, kind);
    if (!metadata) return null;
    if (!validRecord(uid, kind, metadata)) throw new Error("Stored clinic document reference is invalid.");

    if (metadata.provider === "firestore-emulator") {
      const bytes = emulatorDocuments.get(metadata.path);
      const file = validateDocumentBytes(bytes, metadata.mimeType);
      return { bytes, mimeType: file.mimeType, size: file.size };
    }

    await assertPrivateBucket();
    const { data, error } = await supabaseClient.storage.from(bucketName).download(metadata.path);
    if (error || !data || typeof data.arrayBuffer !== "function") {
      throw new Error("Private clinic document retrieval failed.");
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    const file = validateDocumentBytes(bytes, metadata.mimeType);
    if (file.size !== metadata.size) throw new Error("Stored clinic document is invalid.");
    return { bytes, mimeType: file.mimeType, size: file.size };
  }

  async function remove(uid, kind, metadata) {
    assertKey(uid, kind);
    if (metadata?.provider === "firestore-emulator" && emulatorMode &&
        validObjectPath(uid, kind, metadata.path)) {
      emulatorDocuments.delete(metadata.path);
      return;
    }
    if (metadata?.provider !== "supabase" || mode !== "supabase" ||
        !validObjectPath(uid, kind, metadata.path, true)) {
      throw new Error("Stored clinic document reference is invalid.");
    }
    await assertPrivateBucket();
    const { error } = await supabaseClient.storage.from(bucketName).remove([metadata.path]);
    if (error) throw new Error("Private clinic document deletion failed.");
  }

  return {
    enabled,
    mode,
    demoMode,
    verify,
    store,
    read,
    remove,
    getMetadata,
    validRecord,
    validOrphanRecord,
  };
}

module.exports = {
  createClinicDocumentStorage,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  validateDocumentBytes,
};
