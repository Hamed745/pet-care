"use strict";

const { randomUUID } = require("node:crypto");

const CLINICS = "clinicBranches";
const APPOINTMENTS = "clinicAppointments";
const DOCUMENT_TYPES = ["clinic_license", "manager_id", "vet_license"];
const ALLOWED_DECISIONS = new Set(["approved", "rejected", "changes_requested", "suspended"]);
const MAX_DOCUMENT_BYTES = 190000;
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
  const email = field(input.email, "email", 180);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address.");
  const phone = field(input.phone, "telephone", 32);
  if (!/^[+\d\s()-]{7,32}$/.test(phone)) throw new Error("Invalid phone number.");
  const governorate = field(input.governorate, "governorate", 100);
  if (!EGYPT_GOVERNORATES.has(governorate)) throw new Error("Please select an Egyptian governorate.");
  return {
    name: field(input.name, "clinic name", 120),
    governorate,
    city: field(input.city, "city", 100),
    address: field(input.address, "address", 250),
    phone, email,
    description: field(input.description || "", "description", 700, false),
    clinicLicenseNumber: field(input.clinicLicenseNumber, "clinic license number", 100),
    responsibleVetName: field(input.responsibleVetName, "responsible veterinarian", 120),
    responsibleVetLicenseNumber: field(input.responsibleVetLicenseNumber, "veterinarian license number", 100),
  };
}

function validateDocuments(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Three verification images are required.");
  return DOCUMENT_TYPES.map((kind) => {
    const dataUrl = value[kind];
    if (typeof dataUrl !== "string") throw new Error(`Missing ${kind} document.`);
    const match = /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) throw new Error(`Invalid ${kind} image format.`);
    const image = Buffer.from(match[2], "base64");
    if (!image.length || image.length > MAX_DOCUMENT_BYTES || image.toString("base64") !== match[2]) {
      throw new Error(`${kind} must be a valid image smaller than 190 KB.`);
    }
    return { kind, image: dataUrl };
  });
}

function publicClinic(snapshot) {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id, name: data.name || "", city: data.city || "",
    governorate: data.governorate || "", address: data.address || "",
    phone: data.phone || "", description: data.description || "",
    services: Array.isArray(data.services) ? data.services : [],
    verified: data.status === "approved",
  };
}

function managerClinic(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    ...publicClinic(snapshot), status: data.status, ownerUid: data.ownerUid,
    email: data.email, clinicLicenseNumber: data.clinicLicenseNumber,
    responsibleVetName: data.responsibleVetName,
    responsibleVetLicenseNumber: data.responsibleVetLicenseNumber,
    reviewReason: data.reviewReason || "", submittedAt: data.submittedAt?.toDate?.()?.toISOString() || null,
  };
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
    return { id: field(service.id || randomUUID(), "service ID", 80), name, price, durationMinutes };
  });
}

function appointmentData(snapshot) {
  const data = snapshot.data() || {};
  return { id: snapshot.id, clinicId: data.clinicId, clinicName: data.clinicName,
    ownerUid: data.ownerUid, petId: data.petId, petName: data.petName,
    serviceId: data.serviceId, serviceName: data.serviceName, price: data.price,
    date: data.date, time: data.time, notes: data.notes || "", status: data.status,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null };
}

function registerClinicRoutes({ app, db, signedInRoute, adminRoute, HttpError, FieldValue, audit }) {
  const clinics = db.collection(CLINICS);
  const appointments = db.collection(APPOINTMENTS);
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

  app.get("/api/clinics/mine", ...signedInRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ clinic: managerClinic(await own(req).get()) });
  }));

  app.post("/api/clinics/apply", ...signedInRoute(async (req, res) => {
    const application = failInput(validateApplication, req.body?.clinic);
    const documents = failInput(validateDocuments, req.body?.documents);
    const ref = own(req);
    const existed = await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (previous.exists && !["rejected", "changes_requested"].includes(previous.data()?.status)) {
        throw new HttpError(409, "A clinic application already exists. Check its current status.");
      }
      tx.set(ref, {
        ...application, ownerUid: req.authUser.uid, status: "pending",
        services: previous.exists ? previous.data()?.services || [] : [],
        reviewReason: "", submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      for (const { kind, image } of documents) {
        tx.set(ref.collection("verificationDocuments").doc(kind), { image, updatedAt: FieldValue.serverTimestamp() });
      }
      return previous.exists;
    });
    res.status(existed ? 200 : 201).json({ clinic: managerClinic(await ref.get()) });
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

  app.get("/api/admin/clinics", ...adminRoute(async (_req, res) => {
    const snapshot = await clinics.limit(250).get();
    res.set("Cache-Control", "no-store");
    res.json({ clinics: snapshot.docs.map(managerClinic).sort((a, b) =>
      String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))), limited: snapshot.size === 250 });
  }));

  app.get("/api/admin/clinics/:id/documents/:kind", ...adminRoute(async (req, res) => {
    const id = docId(req.params.id);
    if (!DOCUMENT_TYPES.includes(req.params.kind)) throw new HttpError(400, "Unknown verification document.");
    const image = await clinics.doc(id).collection("verificationDocuments").doc(req.params.kind).get();
    if (!image.exists) throw new HttpError(404, "Document not found.");
    res.set("Cache-Control", "no-store, private");
    res.json({ image: image.data().image });
  }));

  app.post("/api/admin/clinics/:id/decision", ...adminRoute(async (req, res) => {
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
      if (status === "suspended" ? current !== "approved" : !["pending", "approved", "suspended"].includes(current)) {
        throw new HttpError(409, "This clinic is not in a reviewable state.");
      }
      if (status === "approved" && !["pending", "suspended"].includes(current)) throw new HttpError(409, "Clinic is already approved.");
      tx.update(ref, { status, reviewReason: reason, reviewedBy: req.authUser.uid,
        reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
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
    if (!service) throw new HttpError(400, "Choose an available clinic service.");
    const petId = failInput((value) => field(String(value ?? ""), "pet ID", 80), req.body?.petId);
    if (!/^[A-Za-z0-9_-]+$/.test(petId)) throw new HttpError(400, "Invalid pet ID.");
    const petSnap = await db.collection("users").doc(req.authUser.uid).collection("pets").doc(petId).get();
    if (!petSnap.exists || petSnap.data()?.ownerUid !== req.authUser.uid) throw new HttpError(403, "You can only book an appointment for your own pet.");
    const date = String(req.body?.date || "");
    const time = String(req.body?.time || "");
    // Compare two *Egypt-local wall clock* times; server/browser time zones may differ.
    const cairoNow = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
    const cairoStamp = `${cairoNow.year}-${cairoNow.month}-${cairoNow.day}T${cairoNow.hour}:${cairoNow.minute}:00Z`;
    const targetStamp = `${date}T${time}:00Z`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
        Number.isNaN(Date.parse(targetStamp)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
        Date.parse(targetStamp) < Date.parse(cairoStamp) + 30 * 60000 ||
        Date.parse(targetStamp) > Date.parse(cairoStamp) + 180 * 86400000) {
      throw new HttpError(400, "Choose a valid future date and time (within 180 days). All times are entered in Egypt local time.");
    }
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 500) : "";
    const ref = appointments.doc(randomUUID());
    await ref.set({ clinicId, clinicName: clinic.name, ownerUid: req.authUser.uid,
      petId, petName: String(petSnap.data()?.name || "Pet").slice(0, 100),
      serviceId, serviceName: service.name, price: service.price, date, time,
      notes, status: "pending", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    res.status(201).json({ appointment: appointmentData(await ref.get()) });
  }));

  app.post("/api/clinics/mine/appointments/:id/status", ...signedInRoute(async (req, res) => {
    await requireApproved(req);
    const id = docId(req.params.id);
    const status = req.body?.status;
    if (!["confirmed", "rejected", "completed", "cancelled"].includes(status)) throw new HttpError(400, "Invalid appointment status.");
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
        const reserved = await tx.get(slotRef);
        if (reserved.exists) throw new HttpError(409, "Another booking already occupies this time. Please reject or reschedule.");
        tx.create(slotRef, { appointmentId: id });
      }
      if (status === "cancelled") tx.delete(slotRef);
      tx.update(ref, { status, updatedAt: FieldValue.serverTimestamp() });
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

module.exports = { registerClinicRoutes, validateApplication, validateDocuments, validateServices, publicClinic };
