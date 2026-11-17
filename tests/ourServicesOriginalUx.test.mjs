import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Public and Our Services use the identical NearbyPlaces layout and only change data source",()=>{
 const app=read("src/App.jsx"),nearby=read("src/features/nearby/NearbyPlaces.jsx");
 assert.match(app,/path="\/nearby\/our\/:kind" element=\{<NearbyPlaces mode="our"/);
 assert.match(app,/path="\/nearby\/:kind" element=\{<NearbyPlaces mode="public"/);
 assert.match(nearby,/<TwoGisMap center=\{mapFocus \|\| center\} places=\{places\} onSelectPlace=\{setSelectedPlace\}/);
 assert.match(nearby,/isOur \? fetchPetCarePlaces/);
 assert.match(nearby,/: fetchNearbyPlaces/);
 assert.match(nearby,/aria-label="Search options"/);
 assert.match(nearby,/aria-label="Nearby results"/);
 assert.match(nearby,/id="petcare-city-query"/);
 assert.match(nearby,/onClick=\{findMyLocation\}/);
 assert.match(nearby,/onClick=\{\(\) => searchPlaces\(\)\}/);
 assert.doesNotMatch(nearby,/showComingSoon|previewNotice|Our Services — Coming Soon/);
});

test("Both map marker and result-card click open a service-specific modal",()=>{
 const nearby=read("src/features/nearby/NearbyPlaces.jsx");
 assert.match(nearby,/onSelectPlace=\{setSelectedPlace\}/);
 assert.match(nearby,/onClick=\{\(\) => setSelectedPlace\(place\)\}/);
 assert.match(nearby,/<OurClinicBookingModal place=\{selectedPlace\}/);
 assert.match(nearby,/<PlaceDetailsModal place=\{selectedPlace\}/);
 assert.match(nearby,/onBooked=\{\(\) => setBookingNotice/);
});

test("Booking modal has real owner pet, verified doctor picker, date/time and notes without fabricating doctors",()=>{
 const modal=read("src/features/nearby/OurClinicBookingModal.jsx");
 const api=read("src/services/clinicApi.js");
 for(const name of ["Your pet","Service","Veterinarian","Preferred date","Preferred time","Contact phone","Notes for the clinic"]){
  assert.ok(modal.includes(name),name);
 }
 assert.match(modal,/clinicApi\.doctors\(clinic\.id\)/);
 assert.match(modal,/doctors\.map\(d=>/);
 assert.match(modal,/clinicApi\.syncPet\(pet\)/);
 assert.match(modal,/clinicApi\.book\(clinic\.id/);
 assert.match(modal,/requestId\.current/);
 assert.match(modal,/!canBook\|\|busy/);
 assert.match(modal,/No active doctors have been listed by this clinic yet/);
 assert.match(api,/doctors: \(clinicId\) => request/);
});

test("Clinic-only search still relies on approved API and distance or city, never fake pins",()=>{
 const adapter=read("src/services/approvedClinicPlaces.js");
 assert.match(adapter,/clinicApi\.list\(\)/);
 assert.match(adapter,/if \(!clinic\?\.verified\) return false/);
 assert.match(adapter,/\/api\/clinic-location\?clinicId=/);
 assert.match(adapter,/clinicSearchPlacement/);
 assert.match(adapter,/mapCityConflict:mapLinkCityConflict/);
 assert.match(adapter,/lon:coord\?\.lon\?\?null/);
 assert.match(adapter,/lat:coord\?\.lat\?\?null/);
 assert.match(adapter,/nearby: placement\.nearby/);
});
