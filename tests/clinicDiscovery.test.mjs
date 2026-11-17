import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clinicSearchPlacement, mapLinkCityConflict, isPlausibleClinicPoint, addressMentionsClinicCity } from "../src/services/clinicDiscovery.js";
import { resolveApprovedClinic, addressMatch } from "../server/clinic-location.mjs";

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

test("reject zero, null, and out-of-city 2GIS points before calculating a distance", () => {
  const clinic = {city:"krasnoyarsk"};
  for (const point of [{lon:null,lat:null},{lon:0,lat:0},{lon:"",lat:""},{lon:37.6176,lat:55.7558}]) {
    assert.equal(isPlausibleClinicPoint(clinic,point),false,JSON.stringify(point));
  }
  assert.equal(isPlausibleClinicPoint(clinic,{lon:92.8526,lat:56.0101}),true);
  assert.equal(isPlausibleClinicPoint(clinic,{lon:"92.8526",lat:"56.0101"}),true);
  assert.equal(addressMentionsClinicCity("krasnoyarsk","Красноярск, улица Лесников, 27"),true);
  assert.equal(addressMentionsClinicCity("krasnoyarsk","Москва, улица Лесников, 27"),false);
  assert.equal(addressMatch({city:"krasnoyarsk",address:"Улица Лесников, 27/9 секция; 1 этаж"},
    {full_address_name:"Красноярск, улица Лесников, 27"}),true);
});

test("invalid 2GIS firm zero point falls back to a matching geocoded street, never a fake pin", async () => {
  const clinic = {
    id:"petss",verified:true,city:"krasnoyarsk",region:"krasnoyarsk",
    address:"Улица Лесников, 27/9 секция; 1 этаж",
    mapUrl:"https://2gis.ru/krasnoyarsk/firm/70000001056796999",
    latitude:null,longitude:null,
  };
  const visited=[];
  const fetcher=async url=>{
    const path=new URL(String(url)).pathname;
    visited.push(path);
    return {
      ok:true,
      json:async()=>({meta:{code:200},result:{
        items:path.endsWith("byid")?
          [{point:{lat:null,lon:null},full_address_name:"Красноярск, улица Лесников, 27"}]:
          [{point:{lat:56.0101,lon:92.8526},full_address_name:"Красноярск, улица Лесников, 27"}],
      }}),
    };
  };
  assert.deepEqual(await resolveApprovedClinic(clinic,"demo-key",fetcher),
    {lat:56.0101,lon:92.8526,source:"address"});
  assert.deepEqual(visited,["/3.0/items/byid","/3.0/items/geocode"]);
  // A valid firm point should be preferred over address geocoding.
  const firm = await resolveApprovedClinic(clinic,"demo-key",async()=>({
    ok:true,json:async()=>({meta:{code:200},result:{items:[
      {point:{lat:56.0101,lon:92.8526},full_address_name:"Красноярск, улица Лесников, 27"},
    ]}}),
  }));
  assert.equal(firm.source,"2gis_firm");
});

test("booking modal keeps text/date fields editable even before the clinic publishes services", () => {
  const modal=read("src/features/nearby/OurClinicBookingModal.jsx");
  assert.match(modal,/availableServices.length===0/);
  assert.match(modal,/Other form fields remain editable/);
  assert.match(modal,/<button type="submit" disabled=\{!canBook\|\|busy\}/);
  assert.equal((modal.match(/disabled=\{!canBook\|\|busy\}/g)||[]).length,1);
  assert.doesNotMatch(modal,/disabled=\{!canBook \|\| busy\}/);
});
