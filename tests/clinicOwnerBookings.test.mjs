import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("pet owners can track backend clinic appointments without replacing legacy bookings", () => {
  const bookings = read("src/pages/Bookings.jsx");
  const owner = read("src/features/nearby/MyClinicAppointments.jsx");
  const clinicApi = read("src/services/clinicApi.js");

  assert.match(bookings, /import MyClinicAppointments from/);
  assert.match(bookings, /<MyClinicAppointments ownerUid=\{user\?\.uid\} \/>/);
  assert.match(bookings, /const \{ bookings, updateBookingStatus/);
  assert.match(owner, /clinicApi\.myBookings\(\)/);
  assert.match(clinicApi, /myBookings: \(\) => request\("\/api\/clinics\/my-appointments", \{ authenticated: true \}\)/);
  assert.match(owner, /snapshot\.ownerUid === ownerUid/);
  assert.match(owner, /generation\.current/);
});

test("owners can see confirmation changes and cancel their own clinic requests", () => {
  const owner = read("src/features/nearby/MyClinicAppointments.jsx");
  const clinicApi = read("src/services/clinicApi.js");
  const backend = read("admin-backend/render-api/clinics.cjs");
  const nearby = read("src/features/nearby/NearbyPlaces.jsx");

  for (const status of ["pending", "confirmed", "rejected", "completed", "cancelled"]) {
    assert.match(owner, new RegExp(status + ":"));
  }
  assert.match(owner, /appointment\.date/);
  assert.match(owner, /appointment\.time/);
  assert.match(owner, /appointment\.doctorName/);
  assert.match(owner, /appointment\.statusReason/);
  assert.match(owner, /clinicApi\.cancelBooking\(appointment\.id\)/);
  assert.match(clinicApi, /cancelBooking: \(id\) => request/);
  assert.match(backend, /app\.get\("\/api\/clinics\/my-appointments", \.\.\.signedInRoute/);
  assert.match(backend, /appointments\.where\("ownerUid", "==", req\.authUser\.uid\)/);
  assert.match(backend, /app\.post\("\/api\/clinics\/my-appointments\/:id\/cancel", \.\.\.signedInRoute/);
  assert.match(nearby, /to="\/bookings"/);
  assert.match(nearby, /<OurClinicBookingModal place=\{selectedPlace\}/);
  assert.match(nearby, /<PlaceDetailsModal place=\{selectedPlace\}/);
});
