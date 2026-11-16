"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateMapUrl, safeMapUrl, validateClinicTimeZone,
  clinicTimeZone, clinicCurrency, clinicRegion,
} = require("../clinicLocation.cjs");
const { validateApplication, validateClinicDraft, validateClinicProfile, publicClinic } = require("../clinics.cjs");

const russian = {
  name:"Severnaya Vet Clinic", managerName:"Anna Ivanova",
  region:"Московская область", city:"Химки", address:"Ленинский проспект, 10",
  mapUrl:"https://2gis.ru/moscow/firm/1234567890", timeZone:"Europe/Moscow",
  phone:"+79991234567", email:"clinic@example.com", description:"Local vet care",
  clinicLicenseNumber:"RU-TEST-123", responsibleVetName:"Dr Ivanov", responsibleVetLicenseNumber:"RU-TEST-VET",
};
test("Russian regions require map URL and valid clinic time zone",()=>{
  const x=validateApplication(russian);
  assert.equal(x.country,"RU");assert.equal(x.region,russian.region);assert.equal(x.currency,"RUB");
  assert.equal(x.mapUrl,russian.mapUrl);assert.equal(x.timeZone,"Europe/Moscow");
  assert.equal("latitude" in x,false);assert.equal("longitude" in x,false);
  assert.throws(()=>validateApplication({...russian,mapUrl:""}),/map link/i);
  assert.throws(()=>validateApplication({...russian,region:""}),/region/i);
  assert.throws(()=>validateApplication({...russian,timeZone:"Africa/Cairo"}),/Russian clinic time zone/i);
});
test("2GIS, Yandex, Google, OSM and Apple share links are accepted",()=>{
  for(const url of [
    "https://2gis.ru/moscow/firm/12345",
    "https://go.2gis.com/example",
    "https://yandex.ru/maps/213/moscow/?ll=1%2C2",
    "https://www.google.com/maps/place/Moscow",
    "https://maps.app.goo.gl/7xYd8",
    "https://www.openstreetmap.org/?mlat=55&mlon=37",
    "https://maps.apple.com/?ll=55.75,37.62",
  ]) assert.equal(validateMapUrl(url),new URL(url).toString());
});
test("unsafe, internal, non-map, executable and spoofed URLs cannot be published",()=>{
  for(const url of [
    "javascript:alert(1)", "http://2gis.ru/moscow", "https://2gis.ru.evil.com/firm/42",
    "https://example.com/not-a-map", "https://127.0.0.1/admin", "https://localhost/",
    "https://user:secret@2gis.ru/firm/123", "https://google.com/drive/file",
    "https://yandex.ru/profile", "https://2gis.ru:8443/firm",
  ]) assert.throws(()=>validateMapUrl(url),/map link|location link|HTTPS/i, url);
  assert.equal(safeMapUrl("javascript:alert(1)"),"");
});
test("legacy Egyptian geographic data can still be read without conversion",()=>{
  const data={name:"Legacy",governorate:"Cairo",latitude:30.0,longitude:31.0,status:"approved",services:[]};
  const x=publicClinic({id:"legacy",data:()=>data});
  assert.equal(x.region,"Cairo");assert.equal(x.currency,"EGP");
  assert.equal(x.timeZone,"Africa/Cairo");assert.equal(x.mapUrl,"");
});
test("Russian drafts accept optional map URL; profile updates validate external link",()=>{
  const draft=validateClinicDraft({name:"Draft",region:"Москва",mapUrl:"",timeZone:"Europe/Moscow"});
  assert.equal(draft.country,"RU");assert.equal(draft.currency,"RUB");assert.equal(draft.mapUrl,"");
  const profile=validateClinicProfile({region:"Москва",mapUrl:"https://2gis.ru/moscow",timeZone:"Europe/Moscow"});
  assert.equal(profile.country,"RU");assert.equal(profile.currency,"RUB");
  assert.throws(()=>validateClinicDraft({region:"Москва",mapUrl:"https://evil.com"}),/HTTPS/i);
  assert.throws(()=>validateClinicProfile({mapUrl:"https://127.0.0.1"}),/HTTPS/i);
});
test("Russian clinic timezone is configured per branch, not forced to Cairo",()=>{
  assert.equal(validateClinicTimeZone("Asia/Vladivostok"),"Asia/Vladivostok");
  assert.equal(clinicTimeZone({region:"Приморский край",timeZone:"Asia/Vladivostok"}),"Asia/Vladivostok");
  assert.equal(clinicCurrency({region:"Приморский край"}),"RUB");
  assert.equal(clinicRegion({region:"Москва"}),"Москва");
});
