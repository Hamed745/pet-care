"use strict";

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { initializeApp: initializeAdminApp } = require("firebase-admin/app");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const projectId = process.env.FIREBASE_PROJECT_ID;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
if (process.env.PETCARE_USE_FIREBASE_EMULATORS !== "true" || projectId !== "demo-petcare" ||
    !authHost || !firestoreHost) {
  throw new Error("E2E tests require explicit demo-petcare Firebase emulator configuration.");
}
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("E2E tests must not use production Firebase credentials.");
}

const backendUrl = "http://127.0.0.1:10000";
const authUrl = `http://${authHost}`;
const firestoreUrl = `http://${firestoreHost}`;
const testRun = randomUUID();
const emailFor = (role) => `petcare-${role}-${testRun}@example.test`;
const password = `LocalOnly-${randomUUID()}-Aa1!`;
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const requestUrl = typeof input === "string" || input instanceof URL ? input : input.url;
  const requestMethod = init?.method || input?.method || "GET";
  let endpoint = "unknown endpoint";
  try {
    const url = new URL(requestUrl);
    endpoint = `${url.origin}${url.pathname}`;
  } catch {
    // Keep diagnostics useful without ever echoing an unparseable request value.
  }
  try {
    return await nativeFetch(input, init);
  } catch (error) {
    const code = error?.cause?.code || error?.code || error?.name || "network error";
    console.error(`[emulator e2e request] ${requestMethod} ${endpoint} failed (${code})`);
    throw error;
  }
};
const adminApp = initializeAdminApp({ projectId });
const adminAuth = getAdminAuth(adminApp);
const db = getFirestore(adminApp);
const users = [];
const cleanups = [];
const auditTargets = new Set();
let clientAuth;
let clientApp;
let authSdk;
let firebaseAppSdk;

async function initializeClientAuth() {
  firebaseAppSdk = await import("firebase/app");
  authSdk = await import("firebase/auth");
  clientApp = firebaseAppSdk.initializeApp({
    apiKey: "demo-api-key",
    authDomain: "demo-petcare.firebaseapp.com",
    projectId,
    appId: "1:000000000000:web:demo",
  }, `petcare-emulator-e2e-${testRun}`);
  clientAuth = authSdk.getAuth(clientApp);
  authSdk.connectAuthEmulator(clientAuth, authUrl, { disableWarnings: true });
}

async function registerAndSignIn(role) {
  const credentials = await authSdk.createUserWithEmailAndPassword(
    clientAuth,
    emailFor(role),
    password
  );
  users.push(credentials.user.uid);
  const registeredUid = credentials.user.uid;
  await authSdk.signOut(clientAuth);
  assert.equal(clientAuth.currentUser, null, `${role} should be signed out`);
  const signedIn = await authSdk.signInWithEmailAndPassword(clientAuth, emailFor(role), password);
  assert.equal(signedIn.user.uid, registeredUid, `${role} should sign back into the same account`);
  return { uid: signedIn.user.uid, token: await signedIn.user.getIdToken() };
}

async function api(path, { token, method = "GET", body, expectedStatus = 200 } = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, `${method} ${path}: ${result.error || response.statusText}`);
  return result;
}

async function uploadDocument({
  token, kind, bytes, mimeType = "image/jpeg", filename = "synthetic-document.jpg",
  fileCount = 1, expectedStatus = 201,
}) {
  const form = new FormData();
  for (let index = 0; index < fileCount; index++) {
    form.append("document", new Blob([bytes], { type: mimeType }), filename);
  }
  const response = await fetch(`${backendUrl}/api/clinics/mine/documents/${encodeURIComponent(kind)}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, `POST clinic document: ${result.error || response.statusText}`);
  return result;
}

function futureCairoTime(hoursAhead) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).reduce((value, part) => ({
    ...value,
    [part.type]: part.value,
  }), {});
  const cairoWallTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute)
  );
  const target = new Date(cairoWallTime + hoursAhead * 60 * 60 * 1000);
  return {
    date: target.toISOString().slice(0, 10),
    time: target.toISOString().slice(11, 16),
  };
}

async function deleteSubcollection(ref, name) {
  const docs = await ref.collection(name).listDocuments();
  await Promise.all(docs.map((doc) => doc.delete()));
}

async function cleanup() {
  for (const targetId of auditTargets) {
    try {
      const auditDocs = await db.collection("adminAuditLogs").where("targetId", "==", targetId).get();
      await Promise.all(auditDocs.docs.map((doc) => doc.ref.delete()));
    } catch (error) {
      console.warn("[emulator e2e cleanup]", error?.code || "audit cleanup failed");
    }
  }
  for (const cleanup of cleanups.reverse()) {
    try { await cleanup(); } catch (error) {
      console.warn("[emulator e2e cleanup]", error?.code || error?.message || "failed");
    }
  }
  for (const uid of users) {
    try { await adminAuth.deleteUser(uid); } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.warn("[emulator e2e cleanup]", error?.code || "auth user cleanup failed");
      }
    }
  }
  if (clientAuth) await authSdk.signOut(clientAuth).catch(() => {});
  if (clientApp) await firebaseAppSdk.deleteApp(clientApp).catch(() => {});
  await adminApp.delete().catch(() => {});
}

async function run() {
  const emulatorHealth = await fetch("http://127.0.0.1:10000/health");
  assert.equal(emulatorHealth.ok, true, "backend health endpoint must be reachable");
  const health = await emulatorHealth.json();
  assert.deepEqual(health.firebase, { mode: "emulator", projectId });
  console.log("PASS backend health reports demo-petcare emulators");

  await initializeClientAuth();
  const owner = await registerAndSignIn("owner");
  console.log("PASS Pet Owner registers, logs out, and logs in through Auth Emulator");

  const manager = await registerAndSignIn("clinic-manager");
  console.log("PASS Clinic Manager registers and signs in through Auth Emulator");

  const adminUser = await registerAndSignIn("admin");
  await adminAuth.setCustomUserClaims(adminUser.uid, { petcareAdmin: true });
  const adminLogin = await authSdk.signInWithEmailAndPassword(clientAuth, emailFor("admin"), password);
  const adminToken = await adminLogin.user.getIdToken(true);

  const clinic = {
    name: `Emulator Clinic ${testRun.slice(0, 8)}`,
    managerName: "Emulator Clinic Manager",
    governorate: "Cairo",
    city: "Cairo",
    address: "100 Test Street",
    latitude: 30.0444,
    longitude: 31.2357,
    phone: "+201001234567",
    email: emailFor("clinic-manager"),
    description: "Synthetic emulator-only clinic.",
    clinicLicenseNumber: `TEST-${testRun.slice(0, 8)}`,
    responsibleVetName: "Dr. Test",
    responsibleVetLicenseNumber: `VET-${testRun.slice(0, 8)}`,
  };
  const testImage = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const draft = await api("/api/clinics/mine/draft", {
    token: manager.token,
    method: "PUT",
    body: { clinic: { name: clinic.name } },
  });
  assert.equal(draft.clinic.status, "draft");
  console.log("PASS Clinic Manager saves and resumes an incomplete draft");
  await uploadDocument({
    kind: "manager_id",
    bytes: testImage,
    expectedStatus: 401,
  });
  await uploadDocument({
    token: manager.token,
    kind: "manager_id",
    bytes: Buffer.from("not a JPEG"),
    expectedStatus: 400,
  });
  await uploadDocument({
    token: manager.token,
    kind: "manager_id",
    bytes: testImage,
    fileCount: 2,
    expectedStatus: 400,
  });
  await uploadDocument({
    token: manager.token,
    kind: "manager_id",
    bytes: Buffer.alloc(5 * 1024 * 1024 + 1),
    mimeType: "application/pdf",
    filename: "oversized.pdf",
    expectedStatus: 413,
  });
  await api("/api/clinics/apply", {
    token: manager.token,
    method: "POST",
    body: { clinic },
    expectedStatus: 400,
  });
  await api("/api/clinics/mine/document-consent", {
    token: manager.token,
    method: "POST",
    body: { accepted: true, version: "clinic-document-consent-v1" },
  });
  for (const kind of ["clinic_license", "manager_id", "vet_license"]) {
    await uploadDocument({
      token: manager.token,
      kind,
      bytes: testImage,
      filename: "../../client-name-is-ignored.jpg",
    });
  }
  console.log("PASS authenticated synthetic uploads enforce signatures, size limits and required documents");
  const applied = await api("/api/clinics/apply", {
    token: manager.token,
    method: "POST",
    body: { clinic },
    expectedStatus: 200,
  });
  assert.equal(applied.clinic.status, "pending");
  const managerClinicPath = db.collection("clinicBranches").doc(manager.uid);
  const consentRecord = (await managerClinicPath.get()).data().documentConsent;
  assert.equal(consentRecord.version, "clinic-document-consent-v1");
  assert.equal(consentRecord.acceptedBy, manager.uid);
  cleanups.push(async () => {
    await deleteSubcollection(managerClinicPath, "verificationDocuments");
    await deleteSubcollection(managerClinicPath, "reservedSlots");
    await managerClinicPath.delete();
  });
  console.log("PASS synthetic clinic application is saved as pending");

  await api("/api/clinics/mine/services", {
    token: manager.token,
    method: "PUT",
    body: { services: [] },
    expectedStatus: 403,
  });
  await api(`/api/admin/clinics/${manager.uid}/decision`, {
    token: owner.token,
    method: "POST",
    body: { status: "approved" },
    expectedStatus: 403,
  });
  await api(`/api/admin/clinics/${manager.uid}/documents`, {
    token: owner.token,
    expectedStatus: 403,
  });
  console.log("PASS pending clinic actions and unauthorized Admin approval are rejected");

  const adminClinics = await api("/api/admin/clinics", { token: adminToken });
  assert.ok(adminClinics.clinics.some((item) => item.id === manager.uid));
  auditTargets.add(manager.uid);
  const reviewDocuments = await api(`/api/admin/clinics/${manager.uid}/documents`, { token: adminToken });
  assert.equal(reviewDocuments.documents.length, 3);
  assert.ok(reviewDocuments.documents.every((item) => !item.metadata.path && item.metadata.mimeType === "image/jpeg"));
  const documentResponse = await fetch(`${backendUrl}/api/admin/clinics/${manager.uid}/documents/manager_id`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(documentResponse.status, 200);
  assert.match(documentResponse.headers.get("cache-control"), /no-store/);
  assert.equal(documentResponse.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await documentResponse.arrayBuffer()), testImage);
  console.log("PASS authorized Admin document metadata and private binary review");
  const changesRequested = await api(`/api/admin/clinics/${manager.uid}/decision`, {
    token: adminToken,
    method: "POST",
    body: { status: "changes_requested", reason: "Replace the synthetic test document." },
  });
  assert.equal(changesRequested.clinic.status, "changes_requested");
  const replacement = await uploadDocument({
    token: manager.token,
    kind: "clinic_license",
    bytes: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii"),
    mimeType: "application/pdf",
    filename: "replacement.pdf",
    expectedStatus: 200,
  });
  assert.equal(replacement.document.mimeType, "application/pdf");
  const resubmitted = await api("/api/clinics/apply", {
    token: manager.token,
    method: "POST",
    body: { clinic },
    expectedStatus: 200,
  });
  assert.equal(resubmitted.clinic.status, "pending");
  console.log("PASS Admin change request, manager document replacement, and resubmission");
  const approved = await api(`/api/admin/clinics/${manager.uid}/decision`, {
    token: adminToken,
    method: "POST",
    body: { status: "approved" },
  });
  assert.equal(approved.clinic.status, "approved");
  assert.equal((await api("/api/clinics/mine", { token: manager.token })).clinic.status, "approved");
  const reviewHistory = await api(`/api/admin/clinics/${manager.uid}/history`, { token: adminToken });
  assert.ok(reviewHistory.history.some((entry) => entry.action === "clinic.application_submitted"));
  assert.ok(reviewHistory.history.some((entry) => entry.action === "clinic.approved"));
  const service = { id: `svc-${testRun}`, name: "Wellness check", price: 250, durationMinutes: 30 };
  await api("/api/clinics/mine/services", {
    token: manager.token,
    method: "PUT",
    body: { services: [service] },
  });
  await api("/api/clinics/mine/availability", {
    token: manager.token,
    method: "PUT",
    body: { workingHours: { days: [0, 1, 2, 3, 4, 5, 6], open: "00:00", close: "23:59" } },
  });
  console.log("PASS authorized test Admin approves clinic and manager dashboard is enabled");

  const petId = `pet-${testRun}`;
  await api("/api/pets/sync", {
    token: owner.token,
    method: "POST",
    body: { pet: { id: petId, name: "Emulator Pet", type: "Dog", age: 3 } },
  });
  cleanups.push(() => db.collection("adminPetSummaries").doc(`${owner.uid}_${petId}`).delete());
  const firstAppointmentTime = futureCairoTime(3);
  const firstBookingRequest = {
    petId,
    serviceId: service.id,
    date: firstAppointmentTime.date,
    time: firstAppointmentTime.time,
    notes: "Synthetic emulator test booking",
    requestId: randomUUID(),
  };
  const firstBooking = await api(`/api/clinics/${manager.uid}/appointments`, {
    token: owner.token,
    method: "POST",
    body: firstBookingRequest,
    expectedStatus: 201,
  });
  const retriedBooking = await api(`/api/clinics/${manager.uid}/appointments`, {
    token: owner.token,
    method: "POST",
    body: firstBookingRequest,
  });
  assert.equal(retriedBooking.appointment.id, firstBooking.appointment.id);
  cleanups.push(() => db.collection("clinicAppointments").doc(firstBooking.appointment.id).delete());
  const confirmed = await api(`/api/clinics/mine/appointments/${firstBooking.appointment.id}/status`, {
    token: manager.token,
    method: "POST",
    body: { status: "confirmed" },
  });
  assert.equal(confirmed.appointment.status, "confirmed");
  const secondAppointmentTime = futureCairoTime(5);
  const secondBooking = await api(`/api/clinics/${manager.uid}/appointments`, {
    token: owner.token,
    method: "POST",
    body: {
      petId,
      serviceId: service.id,
      date: secondAppointmentTime.date,
      time: secondAppointmentTime.time,
      notes: "Synthetic rejection test booking",
      requestId: randomUUID(),
    },
    expectedStatus: 201,
  });
  cleanups.push(() => db.collection("clinicAppointments").doc(secondBooking.appointment.id).delete());
  const rejected = await api(`/api/clinics/mine/appointments/${secondBooking.appointment.id}/status`, {
    token: manager.token,
    method: "POST",
    body: { status: "rejected", reason: "Synthetic test rejection" },
  });
  assert.equal(rejected.appointment.status, "rejected");
  console.log("PASS Pet Owner booking and Clinic Manager confirmation/rejection");

  const productId = `emulator-test-${testRun}`;
  const productRef = db.collection("adminProducts").doc(productId);
  await productRef.set({
    name: "Emulator Test Pet Food",
    category: "Food",
    petType: "dog",
    description: "Synthetic emulator-only test product.",
    imageUrl: "",
    price: 1000,
    stock: 5,
    published: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  cleanups.push(() => productRef.delete());
  const products = await api("/api/store/products");
  assert.ok(products.products.some((item) => item.id === productId));
  console.log("PASS PetCare-owned product loads from the Store API");

  const checkout = await api("/api/store/orders", {
    token: owner.token,
    method: "POST",
    expectedStatus: 201,
    body: {
      requestId: randomUUID(),
      items: [{ id: productId, qty: 2 }],
      expectedSubtotal: 2000,
      paymentMethod: "Cash on delivery",
      address: {
        name: "Emulator Test Owner",
        phone: "+201001234567",
        city: "Cairo",
        address: "101 Test Street",
      },
    },
  });
  const orderId = checkout.order.id;
  auditTargets.add(orderId);
  cleanups.push(() => db.collection("adminOrders").doc(orderId).delete());
  assert.equal((await productRef.get()).data().stock, 3);
  await api(`/api/store/orders/${orderId}/cancel`, {
    token: owner.token,
    method: "POST",
  });
  assert.equal((await productRef.get()).data().stock, 5);
  console.log("PASS synthetic checkout deducts stock and cancellation restores it");

  await managerClinicPath.update({
    status: "rejected",
    rejectedAt: Timestamp.fromDate(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)),
  });
  await api(`/api/admin/clinics/${manager.uid}/retention-hold`, {
    token: adminToken,
    method: "POST",
    body: { active: true, type: "appeal", reason: "Synthetic appeal hold test." },
  });
  const heldCleanup = await api("/api/admin/clinic-retention/cleanup", {
    token: adminToken,
    method: "POST",
    body: {},
  });
  assert.equal(heldCleanup.documentsDeleted, 0);
  assert.equal((await api("/api/clinics/mine/documents", { token: manager.token })).documents.length, 3);
  await api(`/api/admin/clinics/${manager.uid}/retention-hold`, {
    token: adminToken,
    method: "POST",
    body: { active: false, reason: "Synthetic appeal hold resolved." },
  });
  const purged = await api("/api/admin/clinic-retention/cleanup", {
    token: adminToken,
    method: "POST",
    body: {},
  });
  assert.equal(purged.documentsDeleted, 3);
  assert.equal((await api("/api/clinics/mine/documents", { token: manager.token })).documents.every((item) => item.metadata === null), true);
  console.log("PASS Admin retention cleanup honors appeal hold and removes only expired synthetic documents");

}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error("[emulator e2e]", error?.message || "Test failed.");
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
