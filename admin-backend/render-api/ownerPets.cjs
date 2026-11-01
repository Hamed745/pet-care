"use strict";

const { randomUUID } = require("node:crypto");

const PET_TYPES = new Set(["Dog", "Cat", "Bird", "Other"]);
const GENDERS = new Set(["Male", "Female"]);
const STATUSES = new Set(["Healthy", "Monitoring", "Under treatment"]);
const COLLECTION = "pets";

function petId(value) {
  const id = String(value ?? "");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("Invalid pet ID.");
  return id;
}

function inputText(value, max, label, required = false) {
  if (value == null && !required) return "";
  if (typeof value !== "string") throw new Error(`Invalid ${label}.`);
  const cleaned = value.trim();
  if (cleaned.length > max || (required && !cleaned)) throw new Error(`Invalid ${label}.`);
  return cleaned;
}

function numeric(value, max, label, required = false) {
  if (value === "" || value == null) {
    if (required) throw new Error(`Invalid ${label}.`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`Invalid ${label}.`);
  return n;
}

function photoValue(value) {
  if (!value) return "";
  if (typeof value !== "string" || value.length > 240000) throw new Error("Photo is too large. Upload a smaller image.");
  if (/^https:\/\//i.test(value)) return value;
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  throw new Error("Invalid pet photo.");
}

function records(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) throw new Error(`Invalid ${label}.`);
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Invalid ${label}.`);
    const output = {};
    // Preserve medical record fields while excluding arbitrary nested objects,
    // identity claims, and oversized records.
    const keys = ["id", "petId", "name", "date", "next", "dose", "dosage", "frequency",
      "duration", "startDate", "endDate", "doctor", "clinic", "reason", "diagnosis",
      "treatment", "notes", "status", "type", "description", "title", "medicine"];
    for (const key of keys) {
      if (item[key] === undefined || item[key] === null) continue;
      const value = item[key];
      if ((typeof value !== "string" && typeof value !== "number") ||
          String(value).length > 2000) throw new Error(`Invalid ${label} field.`);
      output[key] = value;
    }
    return output;
  });
}

function validatePet(data, forcedId, uid) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid pet.");
  const id = petId(forcedId);
  const name = inputText(data.name, 100, "pet name", true);
  const type = inputText(data.type, 40, "pet type", true);
  if (!PET_TYPES.has(type)) throw new Error("Invalid pet type.");
  const gender = inputText(data.gender, 30, "pet gender");
  if (gender && !GENDERS.has(gender)) throw new Error("Invalid pet gender.");
  const healthStatus = inputText(data.healthStatus || "Healthy", 40, "health status");
  if (!STATUSES.has(healthStatus)) throw new Error("Invalid health status.");
  const doc = {
    id: /^\d+$/.test(id) ? Number(id) : id,
    ownerUid: uid,
    name, type,
    breed: inputText(data.breed || "", 100, "breed"),
    age: numeric(data.age, 120, "age", true),
    gender,
    weight: numeric(data.weight, 1000, "weight"),
    healthStatus,
    notes: inputText(data.notes || "", 4000, "notes"),
    photo: photoValue(data.photo),
    vaccines: records(data.vaccines, "vaccines"),
    meds: records(data.meds, "medications"),
    medicalVisits: records(data.medicalVisits, "medical visits"),
  };
  if (Buffer.byteLength(JSON.stringify(doc), "utf8") > 500000) {
    throw new Error("Pet record is too large.");
  }
  return doc;
}

function serialize(snap) {
  const data = snap.data() || {};
  const output = { ...data };
  delete output.createdAt;
  delete output.updatedAt;
  return output;
}

function registerOwnerPetRoutes({ app, db, signedInRoute, HttpError, FieldValue }) {
  const ownerCollection = (uid) => db.collection("users").doc(uid).collection(COLLECTION);
  const checkedId = (id) => {
    try { return petId(id); }
    catch (error) { throw new HttpError(400, error.message); }
  };
  const checkedPet = (data, id, uid) => {
    try { return validatePet(data, id, uid); }
    catch (error) { throw new HttpError(400, error.message); }
  };

  app.get("/api/me/pets", ...signedInRoute(async (req, res) => {
    const snaps = await ownerCollection(req.authUser.uid).limit(200).get();
    res.json({ pets: snaps.docs.map(serialize) });
  }));

  app.post("/api/me/pets", ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const supplied = req.body?.pet || {};
    const id = checkedId(supplied.id ?? randomUUID());
    const record = checkedPet(supplied, id, uid);
    const ref = ownerCollection(uid).doc(id);
    try {
      await ref.create({
        ...record,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(201).json({ pet: record });
    } catch (error) {
      if (error?.code !== 6 && error?.code !== "already-exists") throw error;
      // Repeated POST with the same ID is safe, but cannot overwrite a pet.
      const existing = await ref.get();
      if (!existing.exists) throw error;
      res.json({ pet: serialize(existing), existing: true });
    }
  }));

  app.put("/api/me/pets/:petId", ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const id = checkedId(req.params.petId);
    const ref = ownerCollection(uid).doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new HttpError(404, "Pet not found.");
    const next = checkedPet({ ...serialize(existing), ...(req.body?.pet || {}) }, id, uid);
    await ref.set({ ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ pet: next });
  }));

  app.delete("/api/me/pets/:petId", ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const id = checkedId(req.params.petId);
    const ref = ownerCollection(uid).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "Pet not found.");
    await ref.delete();
    res.json({ ok: true });
  }));
}

module.exports = { registerOwnerPetRoutes, validatePet, petId };
