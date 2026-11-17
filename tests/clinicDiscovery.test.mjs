import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clinicSearchPlacement, mapLinkCityConflict } from "../src/services/clinicDiscovery.js";
import { resolveApprovedClinic } from "../server/clinic-location.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved partners outside GPS radius remain discoverable, never classified as nearby", () => {
  assert.deepEqual(clinicSearchPlacement({distanceKm: 18, radius: 10000, sameCity: false, gps: true}),
    {nearby: false, withinRadius: false, cityOnly: false});
  assert.deepEqual(clinicSearchPlacement({distanceKm: 3, radius: 10000, sameCity: false, gps: true}),
    {nearby: true, withinRadius: true, cityOnly: false});
  assert.deepEqual(clinicSearchPlacement({distanceKm: null, radius: 10000, sameCity: true, gps: false}),
    {nearby: true, withinRadius: false, cityOnly: true});
  assert.deepEqual(clinicSearchPlacement({distanceKm: null, radius: 10000, sameCity: true, gps: true}),
    {nearby: false, withinRadius: false, cityOnly: false});
});

test("mismatched 2GIS link city is explained to clinic manager instead of placing a false pin", async () => {
  const url = "https://2gis.ru/krasnoyarsk/firm/70000001056796999";
  assert.equal(mapLinkCityConflict("Moscow", url), "krasnoyarsk");
  assert.equal(mapLinkCityConflict("Москва", url), "krasnoyarsk");
  assert.equal(mapLinkCityConflict("Красноярск", url), null);
  assert.equal(mapLinkCityConflict("Moscow", "https://2gis.ru/moscow/firm/70000001056796999"), null);
  assert.equal(mapLinkCityConflict("Moscow", "https://2gis.ru.evil.invalid/krasnoyarsk/firm/70000001056796999"), null);
  assert.equal(mapLinkCityConflict("Moscow", "https://www.openstreetmap.org/#map=12/55/37"), null);
  let upstreamCalls = 0;
  const result = await resolveApprovedClinic({
    verified: true, city: "Moscow", address: "Moscow",
    mapUrl: url, latitude: null, longitude: null,
  }, "fake-key", async () => { upstreamCalls++; throw Error("Do not geocode contradictory URL"); });
  assert.equal(result, null);
  assert.equal(upstreamCalls, 0);
  const portal = read("src/pages/ClinicPortal.jsx");
  assert.match(portal, /mapLinkCityConflict\(profile\.city, profile\.mapUrl\)/);
  assert.match(portal, /Please correct the city or paste the link/);
});

test("approved clinics outside the range remain cards, verified pins are drawn automatically", () => {
  const search = read("src/services/approvedClinicPlaces.js");
  const nearby = read("src/features/nearby/NearbyPlaces.jsx");
  assert.match(search, /clinicSearchPlacement\(\{distanceKm,radius,sameCity,gps\}\)/);
  assert.doesNotMatch(search, /if\(distanceKm==null && !sameCity\)return null/);
  assert.match(search, /lon:coord\?\.lon\?\?null/);
  assert.match(nearby, /Showing all approved PetCare clinics/);
  assert.doesNotMatch(nearby, /Show pin on map|Показать метку на карте|setMapFocus/);
  assert.match(nearby, /<TwoGisMap center=\{center\} places=\{places\}/);
  assert.match(nearby, /mapCityConflict/);
  assert.match(nearby, /<OurClinicBookingModal place=\{selectedPlace\}/);
});
