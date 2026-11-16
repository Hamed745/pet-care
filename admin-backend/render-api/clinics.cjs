"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { FieldPath } = require("firebase-admin/firestore");
const { validateMapUrl, validateClinicTimeZone, inferRussianTimeZone, clinicTimeZone, clinicCurrency, clinicRegion, safeMapUrl } = require("./clinicLocation.cjs");
const {
  createClinicDocumentStorage,
  MAX_DOCUMENT_BYTES,
  validateDocumentBytes,
} = require("./clinicDocumentStorage.cjs");
const {
  CLINIC_DOCUMENT_RETENTION,
  clinicDocumentNecessityReview,
  clinicDocumentRetention,
} = require("./clinicRetention.cjs");

const CLINICS = "clinicBranches";
const APPOINTMENTS = "clinicAppointments";
const DOCUMENT_TYPES = ["clinic_license", "manager_id", "vet_license"];
const ALLOWED_DECISIONS = new Set(["approved", "rejected", "changes_requested", "suspended", "closed"]);
const DOCUMENT_CONSENT_VERSION = "clinic-document-consent-v1";
const EGYPT_GOVERNORATES = new Set([
  "Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia",
  "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh",
  "Luxor", "Matrouh", "Minya", "Monufia", "New Valley", "North Sinai",
  "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez",
]);

function field(value, label, max = 150, required = true) {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new Error(`Invalid ${label}.`);
  return result;
}

function validateApplication(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid clinic registration.");
  const allowedFields = new Set([
    "name", "managerName", "governorate", "city", "address", "latitude", "longitude",
    "phone", "email", "description", "clinicLicenseNumber", "responsibleVetName",
    "region", "mapUrl", "timeZone",
    "responsibleVetLicenseNumber",
  ]);
  if (Object.keys(input).some((key) => !allowedFields.has(key))) throw new Error("Invalid clinic registration.");
  const email = field(input.email, "email", 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address.");
  const phone = field(input.phone, "telephone", 32);
  if (!/^[+\d\s()-]{7,32}$/.test(phone)) throw new Error("Invalid phone number.");
  // New Russian clinic registrations use a map share URL instead of manual coordinates.
  // Keep the legacy Egyptian payload valid for old records/tests; it is no longer
  // offered by the web registration form.
  const isRussian = input.region !== undefined || input.mapUrl !== undefined || input.timeZone !== undefined;
  let location;
  if (isRussian) {
    location = {
      country: "RU",
      region: field(input.region, "region", 120),
      mapUrl: validateMapUrl(input.mapUrl),
      timeZone: input.timeZone === undefined ? inferRussianTimeZone(input.region, input.city) : validateClinicTimeZone(input.timeZone),
      currency: "RUB",
    };
  } else {
    const governorate = field(input.governorate, "governorate", 100);
    if (!EGYPT_GOVERNORATES.has(governorate)) throw new Error("Please select an Egyptian governorate.");
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (input.latitude === "" || input.latitude == null || !Number.isFinite(latitude) ||
        latitude < -90 || latitude > 90 || input.longitude === "" || input.longitude == null ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Enter valid clinic location coordinates.");
    }
    location = {
      governorate, latitude: Math.round(latitude * 1e6) / 1e6,
      longitude: Math.round(longitude * 1e6) / 1e6,
      timeZone: "Africa/Cairo", currency: "EGP",
    };
  }
  return {
    name: field(input.name, "clinic name", 120),
    managerName: field(input.managerName, "manager name", 120),
    ...location,
    city: field(input.city, "city", 100),
    address: field(input.address, "address", 250),
    phone, email,
    description: field(input.description || "", "description", 700, false),
    clinicLicenseNumber: field(input.clinicLicenseNumber, "clinic license number", 100),
    responsibleVetName: field(input.responsibleVetName, "responsible veterinarian", 120),
    responsibleVetLicenseNumber: field(input.responsibleVetLicenseNumber, "veterinarian license number", 100),
  };
}

function validateDocumentUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error("Upload exactly one verification document.");
  }
  return validateDocumentBytes(file.buffer, file.mimetype);
}

function validateClinicDraft(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid clinic draft.");
  const textFields = {
    name: 120, managerName: 120, city: 100, address: 250, phone: 32, email: 180,
    description: 700, clinicLicenseNumber: 100, responsibleVetName: 120,
    responsibleVetLicenseNumber: 100, governorate: 100, region: 120,
  };
  const result = {};
  const allowedFields = new Set([...Object.keys(textFields), "latitude", "longitude", "mapUrl", "timeZone"]);
  if (Object.keys(input).some((key) => !allowedFields.has(key))) throw new Error("Invalid clinic draft.");
  for (const [key, max] of Object.entries(textFields)) {
    if (input[key] === undefined) continue;
    result[key] = field(input[key], key, max, false);
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
    throw new Error("Invalid email address.");
  }
  if (result.phone && !/^[+\d\s()-]{7,32}$/.test(result.phone)) throw new Error("Invalid phone number.");
  if (result.governorate && !EGYPT_GOVERNORATES.has(result.governorate)) {
    throw new Error("Please select an Egyptian governorate.");
  }
  if (input.mapUrl !== undefined) result.mapUrl = validateMapUrl(input.mapUrl, false);
  if (input.timeZone !== undefined) result.timeZone = input.timeZone ? validateClinicTimeZone(input.timeZone) : "";
  if (result.region) {
    result.country = "RU";
    result.currency = "RUB";
    if (input.timeZone === undefined) result.timeZone = inferRussianTimeZone(result.region, result.city);
  }
  for (const [key, min, max] of [["latitude", -90, 90], ["longitude", -180, 180]]) {
    if (input[key] === undefined || input[key] === "") continue;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error("Enter valid clinic location coordinates.");
    result[key] = Math.round(value * 1e6) / 1e6;
  }
  if ((result.latitude === undefined) !== (result.longitude === undefined)) {
    throw new Error("Update both clinic location coordinates together.");
  }
  return result;
}

function validateClinicProfile(input) {
  const allowedFields = ["name", "description", "phone", "city", "address", "latitude", "longitude", "region", "mapUrl", "timeZone"];
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !allowedFields.includes(key))) {
    throw new Error("Invalid clinic profile.");
  }
  if (!Object.keys(input).length) throw new Error("Update at least one clinic profile field.");
  const result = {};
  for (const [key, max] of Object.entries({ name: 120, description: 700, phone: 32, city: 100, address: 250, region: 120 })) {
    if (input[key] === undefined) continue;
    const required = key !== "description";
    result[key] = field(input[key], key, max, required);
  }
  if (result.phone && !/^[+\d\s()-]{7,32}$/.test(result.phone)) throw new Error("Invalid phone number.");
  if (input.mapUrl !== undefined) result.mapUrl = validateMapUrl(input.mapUrl);
  if (input.timeZone !== undefined) result.timeZone = validateClinicTimeZone(input.timeZone);
  if (result.region) {
    result.country = "RU";
    result.currency = "RUB";
    if (input.timeZone === undefined) result.timeZone = inferRussianTimeZone(result.region, result.city);
  }
  for (const [key, min, max] of [["latitude", -90, 90], ["longitude", -180, 180]]) {
    if (input[key] === undefined) continue;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error("Enter valid clinic location coordinates.");
    result[key] = Math.round(value * 1e6) / 1e6;
  }
  if ((result.latitude === undefined) !== (result.longitude === undefined)) {
    throw new Error("Update both clinic location coordinates together.");
  }
  return result;
}

function validateWorkingHours(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !["days", "open", "close"].includes(key)) ||
      !Array.isArray(input.days) || input.days.length < 1 || input.days.length > 7 ||
      input.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(input.days).size !== input.days.length ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.open || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.close || "")) {
    throw new Error("Choose working days and valid opening and closing times.");
  }
  const open = Number(input.open.slice(0, 2)) * 60 + Number(input.open.slice(3));
  const close = Number(input.close.slice(0, 2)) * 60 + Number(input.close.slice(3));
  if (open >= close) throw new Error("Closing time must be after opening time.");
  return { days: [...input.days].sort((a, b) => a - b), open: input.open, close: input.close };
}

function publicClinic(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id, name: data.name || "", city: data.city || "",
    governorate: data.governorate || "", region: clinicRegion(data),
    country: data.country || (data.region ? "RU" : ""),
    mapUrl: safeMapUrl(data.mapUrl), timeZone: clinicTimeZone(data),
    currency: clinicCurrency(data), address: data.address || "",
    phone: data.phone || "", description: data.description || "",
    latitude: Number.isFinite(data.latitude) ? data.latitude : null,
    longitude: Number.isFinite(data.longitude) ? data.longitude : null,
    workingHours: data.workingHours || null,
    services: Array.isArray(data.services) ? data.services.filter((service) => service.available !== false) : [],
    verified: data.status === "approved",
  };
}

function managerClinic(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    ...publicClinic(snapshot),
    services: Array.isArray(data.services) ? data.services : [],
    status: data.status, ownerUid: data.ownerUid,
    managerName: data.managerName || "",
    email: data.email, clinicLicenseNumber: data.clinicLicenseNumber,
    responsibleVetName: data.responsibleVetName,
    responsibleVetLicenseNumber: data.responsibleVetLicenseNumber,
    reviewReason: data.reviewReason || "", submittedAt: data.submittedAt?.toDate?.()?.toISOString() || null,
    documentConsent: data.documentConsent ? {
      version: data.documentConsent.version || "",
      acceptedAt: data.documentConsent.acceptedAt?.toDate?.()?.toISOString() || null,
    } : null,
  };
}

function adminClinic(snapshot) {
  const clinic = managerClinic(snapshot);
  if (!clinic) return null;
  const data = snapshot.data() || {};
  clinic.retentionHold = data.retentionHold?.active === true ? {
      active: true, type: data.retentionHold.type || "",
      reason: data.retentionHold.reason || "",
      updatedAt: data.retentionHold.updatedAt?.toDate?.()?.toISOString() || null,
    } : { active: false };
  clinic.documentNecessityReviewedAt =
    data.documentNecessityReviewedAt?.toDate?.()?.toISOString() || null;
  const necessityReview = clinicDocumentNecessityReview(data);
  clinic.documentNecessityReviewDue = necessityReview.due;
  clinic.documentNecessityReviewDueAt = necessityReview.dueAt || null;
  return clinic;
}

function validateServices(services) {
  if (!Array.isArray(services) || services.length > 15) throw new Error("Provide up to 15 clinic services.");
  const names = new Set();
  return services.map((service) => {
    const name = field(service?.name, "service name", 100);
    const price = Number(service?.price);
    const durationMinutes = Number(service?.durationMinutes);
    if (!Number.isInteger(price) || price < 0 || price > 100000 ||
        !Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 480) {
      throw new Error("Invalid service price or duration.");
    }
    if (names.has(name.toLowerCase())) throw new Error("Duplicate service names.");
    names.add(name.toLowerCase());
    if (service.available !== undefined && typeof service.available !== "boolean") {
      throw new Error("Invalid service availability.");
    }
    return {
      id: field(service.id || randomUUID(), "service ID", 80),
      name, price, durationMinutes, available: service.available !== false,
    };
  });
}

function appointmentOverlaps(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

function minutesOfDay(value) {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

function appointmentData(snapshot) {
  const data = snapshot.data() || {};
  return { id: snapshot.id, clinicId: data.clinicId, clinicName: data.clinicName,
    ownerUid: data.ownerUid, petId: data.petId, petName: data.petName,
    serviceId: data.serviceId, serviceName: data.serviceName, price: data.price,
    durationMinutes: data.durationMinutes || 30,
    date: data.date, time: data.time, notes: data.notes || "", status: data.status,
    statusReason: data.statusReason || "",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null };
}

function registerClinicRoutes({
  app, db, signedInRoute, signedInDocumentRoute = signedInRoute,
  adminRoute, clinicAdminRoute = adminRoute, HttpError, FieldValue, audit,
  documentStorage, allowTestDocuments = false,
}) {
  const clinics = db.collection(CLINICS);
  const appointments = db.collection(APPOINTMENTS);
  const documentsStorage = documentStorage || createClinicDocumentStorage({
    db, emulatorMode: allowTestDocuments, FieldValue,
  });
  const documentOrphans = db.collection("clinicDocumentOrphans");
  const failInput = (validator, value) => {
    try { return validator(value); }
    catch (error) { throw new HttpError(400, error.message); }
  };
  const docId = (id) => {
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new HttpError(400, "Invalid clinic ID.");
    return id;
  };
  const own = (req) => clinics.doc(req.authUser.uid); // One manager account per independent clinic branch.
  const requireApproved = async (req) => {
    const snapshot = await own(req).get();
    if (!snapshot.exists || snapshot.data()?.status !== "approved") throw new HttpError(403, "An approved clinic manager account is required.");
    return snapshot;
  };
  const requireDocumentEditable = (snapshot, uid) => {
    const status = snapshot.data()?.status;
    if (snapshot.exists && (snapshot.data()?.ownerUid !== uid ||
        !["draft", "changes_requested", "rejected"].includes(status))) {
      throw new HttpError(409, "Clinic documents can only be changed on a draft or returned application.");
    }
  };
  const requireAdminReviewable = async (id) => {
    const snapshot = await clinics.doc(id).get();
    if (!snapshot.exists) throw new HttpError(404, "Clinic not found.");
    if (!["pending", "changes_requested", "approved", "rejected", "suspended", "closed", "terminated"].includes(snapshot.data()?.status)) {
      throw new HttpError(409, "Clinic documents are not available for review in this status.");
    }
    return snapshot;
  };
  const cleanupObject = async (uid, kind, metadata, reason) => {
    try {
      await documentsStorage.remove(uid, kind, metadata);
      return true;
    } catch {
      try {
        await documentOrphans.add({
          clinicUid: uid,
          documentType: kind,
          metadata,
          reason,
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {
        console.error("[clinic document cleanup] orphan record could not be saved");
      }
      return false;
    }
  };

  app.post("/api/clinics/mine/document-consent", ...signedInRoute(async (req, res) => {
    if (req.body?.accepted !== true || req.body?.version !== DOCUMENT_CONSENT_VERSION) {
      throw new HttpError(400, "Accept the current clinic document privacy notice.");
    }
    const ref = own(req);
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      requireDocumentEditable(previous, req.authUser.uid);
      tx.set(ref, {
        ...(previous.exists ? {} : {
          ownerUid: req.authUser.uid,
          status: "draft",
          services: [],
        }),
        documentConsent: {
          version: DOCUMENT_CONSENT_VERSION,
          acceptedBy: req.authUser.uid,
          acceptedAt: FieldValue.serverTimestamp(),
          legalReviewStatus: "pending",
        },
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await audit(req.authUser.uid, "clinic.document_consent_accepted", req.authUser.uid, DOCUMENT_CONSENT_VERSION);
    res.set("Cache-Control", "no-store, private");
    res.json({ accepted: true, version: DOCUMENT_CONSENT_VERSION, legalReviewStatus: "pending" });
  }));

  app.get("/api/clinics/verification-config", (_req, res, next) => {
    documentsStorage.verify().then((uploadEnabled) => {
      res.set("Cache-Control", "no-store");
      res.json({
        uploadEnabled,
        emulatorDocuments: documentsStorage.mode === "emulator",
        storageProvider: documentsStorage.mode,
        maxDocumentBytes: MAX_DOCUMENT_BYTES,
        acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      });
    }).catch((error) => {
      console.error("[clinic document storage readiness]", error?.code || "verification failed");
      next(new HttpError(503, "Private clinic document storage is not ready."));
    });
  });

  app.get("/api/clinics/mine", ...signedInRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ clinic: managerClinic(await own(req).get()) });
  }));

  app.get("/api/clinics/mine/documents", ...signedInRoute(async (req, res) => {
    const documents = await Promise.all(DOCUMENT_TYPES.map(async (kind) => ({
      kind,
      metadata: await documentsStorage.getMetadata(req.authUser.uid, kind),
    })));
    res.set("Cache-Control", "no-store, private");
    res.json({ documents });
  }));

  app.post("/api/clinics/mine/documents/:kind", ...signedInDocumentRoute(async (req, res) => {
    const kind = req.params.kind;
    if (!DOCUMENT_TYPES.includes(kind)) throw new HttpError(400, "Unknown verification document.");
    if (!documentsStorage.enabled || !(await documentsStorage.verify())) {
      throw new HttpError(503, "Private clinic document uploads are not enabled.");
    }
    const clinicSnapshot = await own(req).get();
    const consent = clinicSnapshot.data()?.documentConsent;
    if (!consent || consent.version !== DOCUMENT_CONSENT_VERSION || consent.acceptedBy !== req.authUser.uid) {
      throw new HttpError(400, "Accept the clinic document privacy notice before uploading documents.");
    }
    const document = failInput(validateDocumentUpload, req.file);
    const clinicRef = own(req);
    const documentRef = clinicRef.collection("verificationDocuments").doc(kind);
    let metadata;
    try {
      metadata = await documentsStorage.store(req.authUser.uid, kind, document);
    } catch {
      throw new HttpError(503, "Private clinic document upload failed.");
    }

    let previousMetadata;
    try {
      await db.runTransaction(async (tx) => {
        const clinicSnapshot = await tx.get(clinicRef);
        requireDocumentEditable(clinicSnapshot, req.authUser.uid);
        const previous = await tx.get(documentRef);
        previousMetadata = previous.exists ? previous.data() : null;
        if (!clinicSnapshot.exists) {
          tx.set(clinicRef, {
            ownerUid: req.authUser.uid, status: "draft", services: [],
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(clinicRef, {
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
          });
        }
        tx.set(documentRef, { ...metadata, updatedAt: FieldValue.serverTimestamp() });
      });
    } catch (error) {
      const cleanupComplete = await cleanupObject(req.authUser.uid, kind, metadata, "upload_rollback");
      if (!cleanupComplete) {
        throw new HttpError(503, "Upload failed and private object cleanup is pending. Contact support.");
      }
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, "Private clinic document upload could not be completed.");
    }

    await audit(
      req.authUser.uid,
      previousMetadata ? "clinic.document_replaced" : "clinic.document_uploaded",
      req.authUser.uid,
      kind,
    );
    if (previousMetadata) {
      const cleanupComplete = await cleanupObject(req.authUser.uid, kind, previousMetadata, "document_replaced");
      if (!cleanupComplete) {
        throw new HttpError(503, "Document was saved, but cleanup of the prior private copy is pending. Do not retry; contact support.");
      }
    }
    res.set("Cache-Control", "no-store, private");
    res.status(previousMetadata ? 200 : 201).json({
      document: await documentsStorage.getMetadata(req.authUser.uid, kind),
    });
  }));

  app.delete("/api/clinics/mine/documents/:kind", ...signedInRoute(async (req, res) => {
    const kind = req.params.kind;
    if (!DOCUMENT_TYPES.includes(kind)) throw new HttpError(400, "Unknown verification document.");
    const clinicRef = own(req);
    const documentRef = clinicRef.collection("verificationDocuments").doc(kind);
    let metadata;
    await db.runTransaction(async (tx) => {
      const clinicSnapshot = await tx.get(clinicRef);
      requireDocumentEditable(clinicSnapshot, req.authUser.uid);
      const previous = await tx.get(documentRef);
      if (!previous.exists) throw new HttpError(404, "Document not found.");
      metadata = previous.data();
      tx.delete(documentRef);
      if (clinicSnapshot.exists) {
        tx.update(clinicRef, {
          updatedAt: FieldValue.serverTimestamp(),
          lastActivityAt: FieldValue.serverTimestamp(),
        });
      }
    });
    const cleanupComplete = await cleanupObject(req.authUser.uid, kind, metadata, "manager_deleted");
    if (!cleanupComplete) {
      throw new HttpError(503, "The document reference was removed, but private object deletion is pending.");
    }
    await audit(req.authUser.uid, "clinic.document_deleted", req.authUser.uid, kind);
    res.set("Cache-Control", "no-store, private").json({ deleted: true });
  }));

  app.put("/api/clinics/mine/draft", ...signedInRoute(async (req, res) => {
    const draft = failInput(validateClinicDraft, req.body?.clinic);
    const ref = own(req);
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      const status = previous.data()?.status;
      if (previous.exists && !["draft", "changes_requested", "rejected"].includes(status)) {
        throw new HttpError(409, "This clinic application cannot be saved as a draft in its current state.");
      }
      tx.set(ref, {
        ...draft,
        ownerUid: req.authUser.uid,
        status: "draft",
        services: previous.data()?.services || [],
        reviewReason: previous.data()?.reviewReason || "",
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    res.set("Cache-Control", "no-store");
    res.json({ clinic: managerClinic(await ref.get()) });
  }));

  app.post("/api/clinics/apply", ...signedInRoute(async (req, res) => {
    if (!documentsStorage.enabled || !(await documentsStorage.verify())) {
      throw new HttpError(503, "Clinic applications are paused until private verification-document storage is configured. Test documents are accepted only in the Firebase emulator.");
    }
    if (req.body?.documents !== undefined) {
      throw new HttpError(400, "Upload verification documents through the secure document endpoint before submitting.");
    }
    const application = failInput(validateApplication, req.body?.clinic);
    const ref = own(req);
    await Promise.all(DOCUMENT_TYPES.map(async (kind) => {
      const metadata = await documentsStorage.getMetadata(req.authUser.uid, kind);
      if (!metadata) throw new HttpError(400, "Upload all three verification documents before submitting.");
    }));
    let existed;
    existed = await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      const previousStatus = previous.data()?.status;
      if (previous.exists && !["draft", "rejected", "changes_requested"].includes(previousStatus)) {
        throw new HttpError(409, "A clinic application already exists. Check its current status.");
      }
      const consent = previous.data()?.documentConsent;
      if (!consent || consent.version !== DOCUMENT_CONSENT_VERSION || consent.acceptedBy !== req.authUser.uid) {
        throw new HttpError(400, "Accept the clinic document privacy notice before submitting.");
      }
      const documents = await Promise.all(DOCUMENT_TYPES.map((kind) =>
        tx.get(ref.collection("verificationDocuments").doc(kind))
      ));
      if (documents.some((snapshot) => !snapshot.exists)) {
        throw new HttpError(400, "Upload all three verification documents before submitting.");
      }
      tx.set(ref, {
        ...application, ownerUid: req.authUser.uid, status: "pending",
        services: previous.exists ? previous.data()?.services || [] : [],
        reviewReason: "", submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
        documentConsent: {
          version: DOCUMENT_CONSENT_VERSION,
          acceptedBy: req.authUser.uid,
          acceptedAt: FieldValue.serverTimestamp(),
          legalReviewStatus: "pending",
        },
      }, { merge: true });
      return previous.exists;
    });
    await audit(req.authUser.uid, "clinic.application_submitted", req.authUser.uid);
    res.status(existed ? 200 : 201).json({ clinic: managerClinic(await ref.get()) });
  }));

  app.put("/api/clinics/mine/profile", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const profile = failInput(validateClinicProfile, req.body?.profile);
    await own(req).update({ ...profile, updatedAt: FieldValue.serverTimestamp() });
    res.json({ clinic: managerClinic(await own(req).get()) });
  }));

  app.put("/api/clinics/mine/availability", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const workingHours = failInput(validateWorkingHours, req.body?.workingHours);
    await own(req).update({ workingHours, updatedAt: FieldValue.serverTimestamp() });
    res.json({ clinic: managerClinic(await own(req).get()) });
  }));

  app.get("/api/clinics", async (req, res, next) => {
    try {
      const snapshot = await clinics.where("status", "==", "approved").limit(100).get();
      res.set("Cache-Control", "no-store");
      res.json({ clinics: snapshot.docs.map(publicClinic), limited: snapshot.size === 100 });
    } catch (error) { next(error); }
  });

  app.put("/api/clinics/mine/services", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const services = failInput(validateServices, req.body?.services);
    await own(req).update({ services, updatedAt: FieldValue.serverTimestamp() });
    res.json({ clinic: managerClinic(await own(req).get()) });
  }));

  app.get("/api/admin/clinics", ...clinicAdminRoute(async (_req, res) => {
    const snapshot = await clinics.limit(250).get();
    res.set("Cache-Control", "no-store");
    res.json({ clinics: snapshot.docs.map(adminClinic).sort((a, b) =>
      String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))), limited: snapshot.size === 250 });
  }));

  app.post("/api/admin/clinics/:id/retention-hold", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    const active = req.body?.active;
    const type = req.body?.type;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (typeof active !== "boolean" ||
        (active && !["legal", "appeal", "active_review"].includes(type)) ||
        reason.length < 5) {
      throw new HttpError(400, "Provide a valid retention hold action and reason.");
    }
    const ref = clinics.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpError(404, "Clinic not found.");
    const retentionHold = active ? {
      active: true, type, reason, updatedBy: req.authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
    } : {
      active: false, updatedBy: req.authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.update({ retentionHold, updatedAt: FieldValue.serverTimestamp() });
    await audit(req.authUser.uid, active ? "clinic.retention_hold_enabled" : "clinic.retention_hold_released", id, active ? `${type}: ${reason}` : reason);
    res.set("Cache-Control", "no-store, private");
    res.json({ retentionHold: active ? { active, type, reason } : { active } });
  }));

  app.post("/api/admin/clinics/:id/document-necessity-review", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (reason.length < 5) throw new HttpError(400, "Explain the document necessity review in at least 5 characters.");
    const ref = clinics.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || !["approved", "suspended"].includes(snapshot.data()?.status)) {
      throw new HttpError(409, "Document necessity reviews are available for established clinic relationships.");
    }
    await ref.update({
      documentNecessityReviewedAt: FieldValue.serverTimestamp(),
      documentNecessityReviewedBy: req.authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await audit(req.authUser.uid, "clinic.document_necessity_reviewed", id, reason);
    const updated = (await ref.get()).data() || {};
    const necessityReview = clinicDocumentNecessityReview(updated);
    res.set("Cache-Control", "no-store, private");
    res.json({
      reviewedAt: updated.documentNecessityReviewedAt?.toDate?.()?.toISOString() || null,
      reviewedBy: req.authUser.uid,
      reviewDue: necessityReview.due,
      reviewDueAt: necessityReview.dueAt || null,
    });
  }));

  app.post("/api/admin/clinic-retention/cleanup", ...clinicAdminRoute(async (req, res) => {
    const now = new Date();
    const applicationBatchSize = 50;
    const auditBatchSize = 100;
    const statuses = ["draft", "changes_requested", "rejected", "closed", "terminated"];
    const cursors = req.body?.cursors || {};
    if (!cursors || typeof cursors !== "object" || Array.isArray(cursors) ||
        Object.keys(cursors).some((status) => !statuses.includes(status))) {
      throw new HttpError(400, "Invalid clinic retention cursor.");
    }
    const auditCursor = req.body?.auditCursor || null;
    if (auditCursor && (
      typeof auditCursor !== "object" || Array.isArray(auditCursor) ||
      typeof auditCursor.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(auditCursor.id) ||
      typeof auditCursor.createdAt !== "string" || !Number.isFinite(Date.parse(auditCursor.createdAt))
    )) {
      throw new HttpError(400, "Invalid audit retention cursor.");
    }
    let scannedApplications = 0;
    let documentsDeleted = 0;
    let failedOperations = 0;
    let auditEventsDeleted = 0;
    const nextCursors = {};

    for (const status of statuses) {
      let query = clinics.where("status", "==", status).orderBy(FieldPath.documentId());
      const cursorId = cursors[status];
      if (cursorId != null) {
        const cursorSnapshot = await clinics.doc(docId(cursorId)).get();
        if (!cursorSnapshot.exists || cursorSnapshot.data()?.status !== status) {
          throw new HttpError(400, "Clinic retention cursor is no longer valid.");
        }
        query = query.startAfter(cursorSnapshot);
      }
      const page = await query.limit(applicationBatchSize + 1).get();
      const batch = page.docs.slice(0, applicationBatchSize);
      for (const clinicSnapshot of batch) {
        scannedApplications++;
        const data = clinicSnapshot.data() || {};
        if (!clinicDocumentRetention(data, now.getTime()).eligible) continue;
        for (const kind of DOCUMENT_TYPES) {
          const documentRef = clinicSnapshot.ref.collection("verificationDocuments").doc(kind);
          const documentSnapshot = await documentRef.get();
          if (!documentSnapshot.exists) continue;
          const metadata = documentSnapshot.data();
          try {
            await audit(req.authUser.uid, "clinic.document_retention_purge_started", clinicSnapshot.id, kind);
            await documentsStorage.remove(clinicSnapshot.id, kind, metadata);
            await documentRef.delete();
            await audit(req.authUser.uid, "clinic.document_retention_purged", clinicSnapshot.id, kind);
            documentsDeleted++;
          } catch (error) {
            failedOperations++;
            console.error("[clinic document retention cleanup]", error?.code || "document cleanup failed");
          }
        }
      }
      nextCursors[status] = page.size > applicationBatchSize
        ? batch[batch.length - 1].id
        : null;
    }

    const auditCutoff = new Date(now.getTime() - CLINIC_DOCUMENT_RETENTION.auditLogDays * 24 * 60 * 60 * 1000);
    const auditLogs = db.collection("adminAuditLogs");
    let auditQuery = auditLogs.where("createdAt", "<", auditCutoff)
      .orderBy("createdAt").orderBy(FieldPath.documentId());
    if (auditCursor) {
      auditQuery = auditQuery.startAfter(
        new Date(auditCursor.createdAt), auditLogs.doc(docId(auditCursor.id)),
      );
    }
    const auditPage = await auditQuery.limit(auditBatchSize + 1).get();
    const auditBatch = auditPage.docs.slice(0, auditBatchSize);
    const lastAuditEvent = auditBatch[auditBatch.length - 1];
    const lastAuditEventData = lastAuditEvent?.data() || {};
    for (const event of auditBatch) {
      const eventData = event.data() || {};
      if (!String(eventData.action || "").startsWith("clinic.")) continue;
      const clinicId = eventData.targetId;
      if (typeof clinicId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(clinicId)) {
        const clinicSnapshot = await clinics.doc(clinicId).get();
        const clinicData = clinicSnapshot.data() || {};
        if (clinicData.retentionHold?.active === true || clinicData.legalRetentionHold === true ||
            clinicData.activeReview === true || clinicData.activeAppeal === true ||
            clinicData.appeal?.status === "pending") continue;
      }
      await event.ref.delete();
      auditEventsDeleted++;
    }
    const nextAuditCursor = auditPage.size > auditBatchSize && lastAuditEvent ? {
      id: lastAuditEvent.id,
      createdAt: lastAuditEventData.createdAt?.toDate?.()?.toISOString() || "",
    } : null;
    if (nextAuditCursor && !nextAuditCursor.createdAt) {
      throw new HttpError(503, "Audit retention cursor could not be created.");
    }

    await audit(req.authUser.uid, "clinic.retention_cleanup_run", "clinic-retention", JSON.stringify({
      scannedApplications, documentsDeleted, failedOperations, auditEventsDeleted,
    }));
    res.set("Cache-Control", "no-store, private");
    res.json({
      policy: CLINIC_DOCUMENT_RETENTION,
      scannedApplications, documentsDeleted, failedOperations, auditEventsDeleted,
      nextCursors, nextAuditCursor,
      hasMore: Object.values(nextCursors).some(Boolean) || nextAuditCursor !== null,
    });
  }));

  app.get("/api/admin/clinics/:id/history", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    const snapshot = await db.collection("adminAuditLogs")
      .where("targetId", "==", id)
      .limit(100)
      .get();
    res.set("Cache-Control", "no-store, private");
    res.json({
      history: snapshot.docs.map((doc) => ({
        id: doc.id,
        action: doc.data()?.action || "",
        actorUid: doc.data()?.actorUid || "",
        reason: doc.data()?.reason || "",
        createdAt: doc.data()?.createdAt?.toDate?.()?.toISOString() || null,
      })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
      limited: snapshot.size === 100,
    });
  }));

  app.get("/api/admin/clinic-document-orphans", ...clinicAdminRoute(async (_req, res) => {
    const snapshot = await documentOrphans.where("status", "==", "pending").limit(100).get();
    res.set("Cache-Control", "no-store, private");
    res.json({
      orphans: snapshot.docs.map((doc) => ({
        id: doc.id,
        clinicUid: doc.data()?.clinicUid || "",
        documentType: doc.data()?.documentType || "",
        reason: doc.data()?.reason || "",
        createdAt: doc.data()?.createdAt?.toDate?.()?.toISOString() || null,
      })),
      limited: snapshot.size === 100,
    });
  }));

  app.post("/api/admin/clinic-document-orphans/:id/retry", ...clinicAdminRoute(async (req, res) => {
    const orphanId = docId(req.params.id);
    const orphanRef = documentOrphans.doc(orphanId);
    const snapshot = await orphanRef.get();
    if (!snapshot.exists || snapshot.data()?.status !== "pending") {
      throw new HttpError(404, "Pending document cleanup was not found.");
    }
    const orphan = snapshot.data();
    if (!documentsStorage.validOrphanRecord(orphan.clinicUid, orphan.documentType, orphan.metadata)) {
      throw new HttpError(409, "Pending document cleanup reference is invalid.");
    }
    try {
      await documentsStorage.remove(orphan.clinicUid, orphan.documentType, orphan.metadata);
    } catch {
      throw new HttpError(503, "Private document cleanup is still unavailable.");
    }
    await orphanRef.delete();
    await audit(req.authUser.uid, "clinic.document_orphan_cleaned", orphan.clinicUid, orphan.documentType);
    res.set("Cache-Control", "no-store, private").json({ deleted: true });
  }));

  app.get("/api/admin/clinics/:id/documents", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    await requireAdminReviewable(id);
    const documents = await Promise.all(DOCUMENT_TYPES.map(async (kind) => ({
      kind,
      metadata: await documentsStorage.getMetadata(id, kind),
    })));
    await audit(req.authUser.uid, "clinic.document_metadata_viewed", id);
    res.set("Cache-Control", "no-store, private");
    res.json({ documents });
  }));

  app.get("/api/admin/clinics/:id/documents/:kind", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    if (!DOCUMENT_TYPES.includes(req.params.kind)) throw new HttpError(400, "Unknown verification document.");
    await requireAdminReviewable(id);
    const document = await documentsStorage.read(id, req.params.kind);
    if (!document) throw new HttpError(404, "Document not found.");
    const extension = document.mimeType === "application/pdf" ? "pdf" :
      document.mimeType === "image/png" ? "png" : "jpg";
    await audit(req.authUser.uid, "clinic.document_viewed", id, req.params.kind);
    res.set("Cache-Control", "no-store, private");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Disposition", `inline; filename="verification-document.${extension}"`);
    res.type(document.mimeType).send(document.bytes);
  }));

  app.post("/api/admin/clinics/:id/decision", ...clinicAdminRoute(async (req, res) => {
    const id = docId(req.params.id);
    const status = req.body?.status;
    if (!ALLOWED_DECISIONS.has(status)) throw new HttpError(400, "Invalid review decision.");
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (status !== "approved" && reason.length < 5) throw new HttpError(400, "Explain the decision in at least 5 characters.");
    const ref = clinics.doc(id);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new HttpError(404, "Clinic not found.");
      const current = snapshot.data()?.status;
      if (id === req.authUser.uid) throw new HttpError(403, "An applicant cannot review their own clinic.");
      const validTransition =
        current === "pending" && ["approved", "rejected", "changes_requested"].includes(status) ||
        current === "approved" && status === "suspended" ||
        current === "suspended" && status === "approved" ||
        ["approved", "suspended"].includes(current) && status === "closed";
      if (!validTransition) {
        throw new HttpError(409, "This clinic is not in a reviewable state.");
      }
      const updates = {
        status, reviewReason: reason, reviewedBy: req.authUser.uid,
        reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      if (status === "rejected") updates.rejectedAt = FieldValue.serverTimestamp();
      if (status === "closed") updates.closedAt = FieldValue.serverTimestamp();
      if (status === "changes_requested") updates.lastActivityAt = FieldValue.serverTimestamp();
      tx.update(ref, updates);
    });
    await audit(req.authUser.uid, `clinic.${status}`, id, reason);
    res.json({ clinic: managerClinic(await ref.get()) });
  }));

  app.get("/api/clinics/mine/appointments", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const snapshot = await appointments.where("clinicId", "==", req.authUser.uid).limit(150).get();
    res.set("Cache-Control", "no-store");
    res.json({ appointments: snapshot.docs.map(appointmentData).sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)), limited: snapshot.size === 150 });
  }));

  app.get("/api/clinics/my-appointments", ...signedInRoute(async (req, res) => {
    const snapshot = await appointments.where("ownerUid", "==", req.authUser.uid).limit(150).get();
    res.set("Cache-Control", "no-store");
    res.json({ appointments: snapshot.docs.map(appointmentData).sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)), limited: snapshot.size === 150 });
  }));

  app.post("/api/clinics/:id/appointments", ...signedInRoute(async (req, res) => {
    const clinicId = docId(req.params.id);
    const clinicSnap = await clinics.doc(clinicId).get();
    if (!clinicSnap.exists || clinicSnap.data()?.status !== "approved") throw new HttpError(404, "Clinic is not available for booking.");
    const clinic = clinicSnap.data();
    const serviceId = typeof req.body?.serviceId === "string" ? req.body.serviceId : "";
    const service = (clinic.services || []).find((item) => item.id === serviceId);
    if (!service || service.available === false) throw new HttpError(400, "Choose an available clinic service.");
    const workingHours = failInput(validateWorkingHours, clinic.workingHours);
    const petId = failInput((value) => field(String(value ?? ""), "pet ID", 80), req.body?.petId);
    if (!/^[A-Za-z0-9_-]+$/.test(petId)) throw new HttpError(400, "Invalid pet ID.");
    // Support both newer per-user pet documents and the legacy, authenticated pet-sync
    // collection in Samar's PetCare snapshot. In both formats, verify the owner UID.
    const userPet = await db.collection("users").doc(req.authUser.uid).collection("pets").doc(petId).get();
    const petSnap = userPet.exists && userPet.data()?.ownerUid === req.authUser.uid
      ? userPet
      : await db.collection("adminPetSummaries").doc(`${req.authUser.uid}_${petId}`).get();
    if (!petSnap.exists || petSnap.data()?.ownerUid !== req.authUser.uid) throw new HttpError(403, "You can only book an appointment for your own pet.");
    const date = String(req.body?.date || "");
    const time = String(req.body?.time || "");
    const requestId = typeof req.body?.requestId === "string" ? req.body.requestId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      throw new HttpError(400, "A valid booking request ID is required.");
    }
    // Compare local wall-clock values using this clinic's configured time zone,
    // not the Vercel runtime time zone. Legacy Egyptian clinics retain Cairo time.
    const clinicNow = new Intl.DateTimeFormat("en-GB", {
      timeZone: clinicTimeZone(clinic), year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
    const clinicStamp = `${clinicNow.year}-${clinicNow.month}-${clinicNow.day}T${clinicNow.hour}:${clinicNow.minute}:00Z`;
    const targetStamp = `${date}T${time}:00Z`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
        Number.isNaN(Date.parse(targetStamp)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
        Date.parse(targetStamp) < Date.parse(clinicStamp) + 30 * 60000 ||
        Date.parse(targetStamp) > Date.parse(clinicStamp) + 180 * 86400000) {
      throw new HttpError(400, "Choose a valid future date and time (within 180 days). Times are entered in the clinic's configured local time zone.");
    }
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const startMinutes = minutesOfDay(time);
    const openingMinutes = minutesOfDay(workingHours.open);
    const closingMinutes = minutesOfDay(workingHours.close);
    if (!workingHours.days.includes(dayOfWeek) ||
        startMinutes < openingMinutes ||
        startMinutes + Number(service.durationMinutes) > closingMinutes) {
      throw new HttpError(400, "Choose a time within this clinic's working hours.");
    }
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 500) : "";
    const requestHash = createHash("sha256").update(JSON.stringify({
      clinicId, petId, serviceId, date, time, notes,
    })).digest("hex");
    const bookingId = createHash("sha256")
      .update(`${req.authUser.uid}:${requestId}`)
      .digest("hex");
    const ref = appointments.doc(bookingId);
    const created = await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (previous.exists) {
        if (previous.data()?.ownerUid !== req.authUser.uid || previous.data()?.requestHash !== requestHash) {
          throw new HttpError(409, "This booking request ID has already been used.");
        }
        return false;
      }
      tx.set(ref, {
        clinicId, clinicName: clinic.name, ownerUid: req.authUser.uid,
        petId, petName: String(petSnap.data()?.name || "Pet").slice(0, 100),
        serviceId, serviceName: service.name, price: service.price,
        durationMinutes: service.durationMinutes, date, time, notes,
        requestHash, status: "pending",
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    res.status(created ? 201 : 200).json({ appointment: appointmentData(await ref.get()) });
  }));

  app.post("/api/clinics/mine/appointments/:id/status", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const id = docId(req.params.id);
    const status = req.body?.status;
    if (!["confirmed", "rejected", "completed", "cancelled"].includes(status)) throw new HttpError(400, "Invalid appointment status.");
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";
    if (status === "rejected" && reason.length < 5) throw new HttpError(400, "Explain the rejection in at least 5 characters.");
    const ref = appointments.doc(id);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.clinicId !== req.authUser.uid) throw new HttpError(404, "Appointment not found for your clinic.");
      const current = snapshot.data();
      if (!((current.status === "pending" && ["confirmed", "rejected"].includes(status)) ||
        (current.status === "confirmed" && ["completed", "cancelled"].includes(status)))) {
        throw new HttpError(409, "This appointment cannot move to that status.");
      }
      const slotRef = own(req).collection("reservedSlots").doc(`${current.date}_${current.time}`);
      if (status === "confirmed") {
        const sameDaySlots = await tx.get(
          own(req).collection("reservedSlots").where("date", "==", current.date)
        );
        const start = minutesOfDay(current.time);
        for (const slot of sameDaySlots.docs) {
          const reserved = slot.data() || {};
          if (reserved.appointmentId === id || typeof reserved.time !== "string") continue;
          if (appointmentOverlaps(
            start,
            current.durationMinutes || 30,
            minutesOfDay(reserved.time),
            reserved.durationMinutes || 30
          )) {
            throw new HttpError(409, "Another booking already overlaps this time. Please reject or reschedule.");
          }
        }
        const reserved = await tx.get(slotRef);
        if (reserved.exists) throw new HttpError(409, "Another booking already occupies this time. Please reject or reschedule.");
        tx.create(slotRef, {
          appointmentId: id,
          date: current.date,
          time: current.time,
          durationMinutes: current.durationMinutes || 30,
        });
      }
      if (status === "cancelled") tx.delete(slotRef);
      tx.update(ref, {
        status,
        statusReason: status === "rejected" ? reason : "",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    res.json({ appointment: appointmentData(await ref.get()) });
  }));

  app.post("/api/clinics/my-appointments/:id/cancel", ...signedInRoute(async (req, res) => {
    const ref = appointments.doc(docId(req.params.id));
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.ownerUid !== req.authUser.uid) throw new HttpError(404, "Appointment not found.");
      const current = snapshot.data();
      if (!["pending", "confirmed"].includes(current.status)) throw new HttpError(409, "Appointment can no longer be cancelled.");
      if (current.status === "confirmed") {
        tx.delete(clinics.doc(current.clinicId).collection("reservedSlots").doc(`${current.date}_${current.time}`));
      }
      tx.update(ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
    });
    res.json({ appointment: appointmentData(await ref.get()) });
  }));

  return { clinics, appointments, requireApproved, docId, failInput };
}

module.exports = {
  registerClinicRoutes,
  validateApplication,
  validateDocumentUpload,
  validateClinicDraft,
  validateClinicProfile,
  validateWorkingHours,
  validateServices,
  appointmentOverlaps,
  publicClinic,
};
