import test from "node:test";
import assert from "node:assert/strict";
import { parseClinicMapLink, addressMatch, resolveApprovedClinic, handle } from "../server/clinic-location.mjs";
const approved={id:"approved-clinic",verified:true,name:"Vet Clinic",city:"Москва",region:"Москва",
 address:"улица Тверская, 10",mapUrl:"https://2gis.ru/moscow/firm/70000001012345678",latitude:null,longitude:null};
const fakePoint={lon:37.61,lat:55.75};
const apiResponse=(clinics=[approved])=>({ok:true,json:async()=>({clinics})});
function fakeFetch(url){
 const u=new URL(String(url));
 if(u.pathname==="/api/clinics")return Promise.resolve(apiResponse());
 if(u.pathname==="/3.0/items/byid")return Promise.resolve({ok:true,json:async()=>({meta:{code:200},result:{items:[{id:"70000001012345678",point:fakePoint}]}})});
 throw Error("Unexpected route: "+u.pathname);
}
const makeRes=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.payload=JSON.parse(v)}});
test("supported 2GIS firm link is resolved by ID without requesting the user URL",async()=>{
 assert.deepEqual(parseClinicMapLink("https://2gis.ru/moscow/firm/70000001012345678"),{firmId:"70000001012345678"});
 assert.deepEqual(await resolveApprovedClinic(approved,"fake-token",fakeFetch),{lon:37.61,lat:55.75,source:"2gis_firm"});
});
test("map link parsing refuses unsafe or spoofed hosts",()=>{
 for(const url of ["https://evil.example/firm/70000001012345678","http://2gis.ru/moscow/firm/70000001012345678",
 "https://2gis.ru.evil.example/moscow/firm/70000001012345678","javascript:alert(1)"]){
  assert.equal(parseClinicMapLink(url),null);
 }
});
test("supported map links with embedded coordinates produce real pins",()=>{
 assert.deepEqual(parseClinicMapLink("https://2gis.ru/moscow?m=37.6176%2C55.7558%2F14"),{lon:37.6176,lat:55.7558,source:"map_link"});
 assert.deepEqual(parseClinicMapLink("https://yandex.ru/maps/?ll=37.6176%2C55.7558"),{lon:37.6176,lat:55.7558,source:"map_link"});
 assert.deepEqual(parseClinicMapLink("https://www.google.com/maps/@55.7558,37.6176,12z"),{lon:37.6176,lat:55.7558,source:"map_link"});
 assert.deepEqual(parseClinicMapLink("https://www.openstreetmap.org/?mlat=55.7558&mlon=37.6176"),{lon:37.6176,lat:55.7558,source:"map_link"});
});
test("unapproved clinics are never geocoded",async()=>{
 let n=0;const v=await resolveApprovedClinic({...approved,verified:false},"fake",async()=>{n++;throw Error("called")});
 assert.equal(v,null);assert.equal(n,0);
});
test("address-based geocoding requires matching house and street",async()=>{
 const clinic={...approved,mapUrl:"https://yandex.ru/maps/213/moscow/"};
 assert.equal(addressMatch(clinic,{full_address_name:"Москва"}),false);
 assert.equal(addressMatch(clinic,{full_address_name:"Москва, улица Арбат, 10"}),false);
 const f=async()=>({ok:true,json:async()=>({meta:{code:200},result:{items:[
  {point:fakePoint,full_address_name:"Москва"}, {point:fakePoint,full_address_name:"Москва, улица Тверская, 10"}
 ]}})});
 assert.deepEqual(await resolveApprovedClinic(clinic,"demo",f),{lon:37.61,lat:55.75,source:"address"});
});
test("public endpoint only accepts IDs present in approved clinic list",async()=>{
 const res=makeRes();
 await handle({method:"GET",url:"/api/clinic-location?clinicId=approved-clinic"},res,{fetcher:fakeFetch,key:"test"});
 assert.equal(res.statusCode,200);assert.deepEqual(res.payload.location,{lon:37.61,lat:55.75,source:"2gis_firm"});
 assert.equal("mapUrl" in res.payload,false);
 const invalid=makeRes();
 await handle({method:"GET",url:"/api/clinic-location?clinicId=../private"},invalid,{fetcher:fakeFetch,key:"test"});
 assert.equal(invalid.statusCode,400);
 const forbidden=makeRes();
 await handle({method:"GET",url:"/api/clinic-location?clinicId=unknown"},forbidden,{fetcher:fakeFetch,key:"test"});
 assert.equal(forbidden.statusCode,404);
});
test("missing trusted coordinates returns a null location, never a fake pin",async()=>{
 const res=makeRes();
 await handle({method:"GET",url:"/api/clinic-location?clinicId=approved-clinic"},res,{
  fetcher:()=>Promise.resolve(apiResponse([{...approved,mapUrl:"https://2gis.ru/moscow",address:""}])),key:""
 });
 assert.equal(res.statusCode,200);assert.equal(res.payload.location,null);
});
