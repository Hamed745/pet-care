import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("new clinic registration uses share link, region and time zone rather than manual coordinates",()=>{
  const portal=source("src/pages/ClinicPortal.jsx");
  assert.match(portal,/Clinic map link/);
  assert.match(portal,/form\.mapUrl/);
  assert.match(portal,/form\.region/);
  assert.match(portal,/form\.timeZone/);
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
