import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Our Services route serves approved clinics, map and existing booking flow",()=>{
 const app=read("src/App.jsx"),dir=read("src/pages/ClinicDirectory.jsx");
 assert.match(app,/path="\/nearby\/our\/:kind" element=\{<ClinicDirectory showMap/);
 assert.match(dir,/clinicApi\.list\(\)/);
 assert.match(dir,/clinicApi\.book\(clinic\.id/);
 assert.match(dir,/<VerifiedClinicMap clinics=\{filtered\}/);
 assert.match(dir,/serviceCategoryMatches\(clinic,category\)/);
});
test("public 2GIS search route and search API are preserved",()=>{
 const app=read("src/App.jsx"),nearby=read("src/features/nearby/NearbyPlaces.jsx");
 assert.match(app,/path="\/nearby\/:kind" element=\{<NearbyPlaces mode="public"/);
 assert.match(nearby,/fetchNearbyPlaces/);
});
test("Our Services no longer has a Coming Soon teaser or veterinary banner",()=>{
 const nearby=read("src/features/nearby/NearbyPlaces.jsx"),services=read("src/pages/Services.jsx");
 assert.match(nearby,/Approved PetCare partners/);
 assert.doesNotMatch(nearby,/<span className="mt-1 block text-xs text-amber-700">\{tr\("Coming soon"/);
 assert.doesNotMatch(services,/Veterinary Clinics — Coming Soon/);
});
test("map only renders markers from exact server-resolved coordinates",()=>{
 const map=read("src/components/VerifiedClinicMap.jsx"),server=read("server/clinic-location.mjs");
 assert.match(map,/clinic-location\?clinicId=/);
 assert.match(map,/Number\.isFinite\(point\.lon\)/);
 assert.match(map,/Number\.isFinite\(point\.lat\)/);
 assert.match(server,/clinic\?\.verified/);
 assert.match(server,/no_precise_match/);
});
