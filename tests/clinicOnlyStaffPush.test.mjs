import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { explainAdminPushError } from "../src/admin/adminPushErrors.js";
const src = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Our Services activates only ordinary veterinary clinics and leaves Public Services intact", () => {
  const nearby = src("src/features/nearby/NearbyPlaces.jsx");
  const app = src("src/App.jsx");
  assert.match(nearby, /if \(isOur && id === "emergency"\) return null/);
  assert.match(nearby, /if \(isOur && id !== "veterinary"\) return <span/);
  assert.match(nearby, /aria-disabled="true"/);
  assert.match(nearby, /Coming Soon/);
  assert.match(nearby, /ourCategoryUnavailable/);
  assert.match(nearby, /kind === "emergency" \? "\/nearby\/emergency"/);
  assert.match(nearby, /\/nearby\/our\/veterinary/);
  assert.match(nearby, /fetchNearbyPlaces/);
  assert.match(app, /path="\/nearby\/our\/:kind"/);
  assert.match(app, /path="\/nearby\/:kind"/);
});

test("booking groups owner's actual pets into Dogs, Cats and Others without replacing pet ID", () => {
  const modal = src("src/features/nearby/OurClinicBookingModal.jsx");
  assert.match(modal, /value="dog">\{tr\("Dogs"/);
  assert.match(modal, /value="cat">\{tr\("Cats"/);
  assert.match(modal, /value="other">\{tr\("Others"/);
  assert.match(modal, /ownedPets\.filter\(p => petKind\(p\) === petCategory\)/);
  assert.match(modal, /petId:""/);
  assert.match(modal, /filteredPets\.map\(p=><option/);
  assert.match(modal, /clinicApi\.syncPet\(pet\)/);
  assert.match(modal, /clinicApi\.book\(clinic\.id/);
  assert.match(modal, /p\.ownerUid === user\.uid/);
});

test("clinic manager sees Doctors & Staff in both header and workspace sidebar", () => {
  const shell = src("src/components/ClinicShell.jsx");
  const workspace = src("src/pages/ClinicWorkspace.jsx");
  const backend = src("admin-backend/render-api/clinicWorkspace.cjs");
  const doctors = src("admin-backend/render-api/clinics.cjs");
  assert.match(shell, /\["team", UsersRound, "Doctors & Staff"/);
  assert.match(workspace, /\["team","Doctors & staff"/);
  assert.match(workspace, /data&&tab==="team"/);
  assert.match(workspace, /clinicWorkspaceApi\.addStaff\(staffForm\)/);
  assert.match(workspace, /<option value="veterinarian">\{tr\("Veterinarian"\)\}/);
  assert.match(workspace, /<option value="active">\{tr\("Active"\)\}/);
  assert.match(doctors, /where\("role", "==", "veterinarian"\)/);
  assert.match(doctors, /doc\.data\(\)\?\.status === "active"/);
  assert.match(backend, /app\.post\("\/api\/clinics\/mine\/staff"/);
});

test("push signup separates browser push service failures from PetCare backend errors", () => {
  const text = explainAdminPushError(new Error("Registration failed - push service error"), "FCM token");
  assert.match(text.message, /Browser push service rejected registration/);
  assert.match(text.message, /before the PetCare backend/);
  assert.match(explainAdminPushError(new Error("Subscription failed - no active Service Worker")).message, /worker could not start/);
  assert.match(explainAdminPushError({code:"messaging/invalid-vapid-key",message:"invalid VAPID key"}).message, /VAPID public key/);
  const api = explainAdminPushError(new Error("Request failed (503)"), "PetCare admin token registration");
  assert.match(api.message, /PetCare admin token registration failed/);
});

test("admin notifications expose errors, keep retry available, and wait for active worker", () => {
  const code = src("src/admin/adminPush.js");
  const ui = src("src/admin/AdminPushSettings.jsx");
  assert.match(code, /await waitForActiveWorker\(registration\)/);
  assert.match(code, /await getToken\(messaging/);
  assert.match(code, /await adminApi\.registerPushToken\(token\)/);
  assert.match(ui, /Retry notifications/);
  assert.match(ui, /role=\{messageIsError \? "alert" : "status"\}/);
  assert.match(ui, /\.catch\(\(error\) => \{/);
});
