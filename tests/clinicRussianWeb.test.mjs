import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("new clinic registration uses region and map link without a technical time zone selector",()=>{
  const portal=source("src/pages/ClinicPortal.jsx");
  assert.match(portal,/Clinic map link/);
  assert.match(portal,/form\.mapUrl/);
  assert.match(portal,/form\.region/);
  assert.doesNotMatch(portal,/form\.timeZone|profile\.timeZone|RUSSIAN_TIME_ZONES|Clinic appointment time zone|Appointment time zone/);
  assert.doesNotMatch(portal,/form\.(latitude|longitude)/);
  assert.doesNotMatch(portal,/GOVERNORATES/);
});
test("approved clinic directory displays a user-provided map link and RUB prices",()=>{
  const directory=source("src/pages/ClinicDirectory.jsx");
  assert.match(directory,/href=\{clinic\.mapUrl/);
  assert.match(directory,/rel="noopener noreferrer"/);
  assert.match(directory,/clinic\.currency/);
  assert.match(directory,/All regions/);
  assert.doesNotMatch(directory,/Egypt time/);
});
test("admin can review the clinic share link instead of manually entered coordinates",()=>{
  const admin=source("src/admin/AdminClinicApprovals.jsx");
  assert.match(admin,/selected\.mapUrl/);
  assert.match(admin,/Open clinic location/);
  assert.doesNotMatch(admin,/selected\.latitude.*selected\.longitude/);
});

test("applicant sees human PetCare administrator review instead of automatic license approval",()=>{
  const portal=source("src/pages/ClinicPortal.jsx");
  assert.match(portal,/administrator personally reviews/);
  assert.match(portal,/approves, rejects or requests changes/);
});
