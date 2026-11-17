import { mapLinkCityConflict } from "../src/services/clinicDiscovery.js";
// Geocode an APPROVED PetCare clinic by ID; never fetch an arbitrary URL
// provided by a visitor. This endpoint does not approve clinics or modify data.
const API_BASE = (process.env.CLINIC_PUBLIC_API_BASE_URL || "https://petcare-api-brown.vercel.app").replace(/\/+$/, "");
const DGIS_ORIGIN = "https://catalog.api.2gis.com";
const HOSTS = ["2gis.ru","2gis.com","yandex.ru","yandex.com","yandex.kz","yandex.by",
  "google.com","google.ru","google.co.uk","maps.app.goo.gl","maps.apple.com","openstreetmap.org"];
const validCoord = (lon,lat) => Number.isFinite(+lon) && Number.isFinite(+lat) &&
  +lon >= -180 && +lon <= 180 && +lat >= -90 && +lat <= 90;
const responsePoint = (point, source) =>
  point && validCoord(point.lon,point.lat) ? {lon:+point.lon,lat:+point.lat,source} : null;
const normalized = (v) => String(v||"").toLocaleLowerCase("ru").replace(/ё/g,"е")
  .replace(/[^a-zа-я0-9]+/gi," ").trim();
const supportedMapUrl = (value) => {
  try {
    const u = new URL(value);
    if(u.protocol !== "https:" || u.username || u.password || (u.port && u.port!=="443"))return null;
    const hostname=u.hostname.toLowerCase().replace(/\.$/,"");
    if(!HOSTS.some(h=>hostname===h||hostname.endsWith("."+h)))return null;
    return u;
  }catch{return null}
};
function parseClinicMapLink(url) {
  const u=supportedMapUrl(url);if(!u)return null;
  const host=u.hostname.toLowerCase();
  const pair=(value,order="lonlat")=>{
    const m=String(value||"").match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
    if(!m)return null;
    return order==="latlon"?responsePoint({lat:m[1],lon:m[2]},"map_link"):
      responsePoint({lon:m[1],lat:m[2]},"map_link");
  };
  if(host.includes("2gis.")) {
    const m=u.pathname.match(/(?:^|\/)firm\/(\d{8,24})(?:\/|$)/);
    if(m) return {firmId:m[1]};
    const point=pair(u.searchParams.get("m")||u.searchParams.get("ll"));
    if(point)return point;
  }
  if(host.includes("yandex.")) {
    const point=pair(u.searchParams.get("ll"));if(point)return point;
  }
  if(host.includes("google.")||host==="maps.app.goo.gl"){
    const match=u.pathname.match(/\/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
    if(match)return responsePoint({lat:match[1],lon:match[2]},"map_link");
    const point=pair(u.searchParams.get("q")||u.searchParams.get("query"),"latlon");
    if(point)return point;
  }
  if(host==="maps.apple.com"){
    const point=pair(u.searchParams.get("ll"),"latlon");
    if(point)return point;
  }
  if(host==="openstreetmap.org" || host.endsWith(".openstreetmap.org")){
    const lat=u.searchParams.get("mlat"),lon=u.searchParams.get("mlon");
    if(validCoord(lon,lat))return responsePoint({lon,lat},"map_link");
    const frag=u.hash.match(/(?:^#|\/)(\d{1,2})\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if(frag)return responsePoint({lat:frag[2],lon:frag[3]},"map_link");
  }
  return null;
}
function addressMatch(clinic, item) {
  const source=normalized(clinic.address);
  const found=normalized(item.full_address_name||item.address_name);
  const house=(source.match(/\b\d+[a-zа-я]?\b/i)||[])[0];
  if(!house || !found || !found.split(" ").includes(house))return false;
  const tokens=source.split(" ").filter(x=>x.length>=4 && !["улица","ул","street","проспект","дом","house","road","building","корпус","область"].includes(x));
  if(tokens.length && !tokens.some(x=>found.includes(x)))return false;
  const city=normalized(clinic.city);
  const full=normalized(item.full_address_name||"");
  // When the provider supplies a city, reject a result explicitly named for
  // another city; do not pin at a city center if only a vague match is returned.
  if(city && full && !full.includes(city))return false;
  return true;
}
async function catalog(path,params,key,fetcher=fetch){
  const u=new URL(path,DGIS_ORIGIN);
  for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
  u.searchParams.set("key",key);
  const res=await fetcher(u,{signal:AbortSignal.timeout(9000),headers:{Accept:"application/json"}});
  if(!res.ok)throw Error("2GIS geocoding temporarily unavailable.");
  const body=await res.json();
  if(body?.meta?.code===404)return [];
  if(body?.meta?.code!==200 || !Array.isArray(body?.result?.items))throw Error("2GIS did not return usable coordinates.");
  return body.result.items;
}
async function resolveApprovedClinic(clinic,key,fetcher=fetch){
  if(!clinic?.verified) return null;
  // A contradictory 2GIS city slug is not an authoritative clinic pin.
  if(mapLinkCityConflict(clinic.city,clinic.mapUrl))return null;
  if(validCoord(clinic.longitude,clinic.latitude) && clinic.longitude!=null && clinic.latitude!=null){
    return responsePoint({lon:clinic.longitude,lat:clinic.latitude},"verified_coordinates");
  }
  const parsed=parseClinicMapLink(clinic.mapUrl);
  if(parsed?.lat!==undefined)return parsed;
  if(!key)return null;
  if(parsed?.firmId){
    const items=await catalog("/3.0/items/byid",{
      id:parsed.firmId,locale:"ru_RU",fields:"items.point,items.full_address_name"
    },key,fetcher);
    const point=responsePoint(items[0]?.point,"2gis_firm");
    if(point)return point;
  }
  // No reliable coordinates in the share link: geocode the full real address.
  // Do not guess a marker from the city name alone.
  const q=[clinic.region,clinic.city,clinic.address].filter(Boolean).join(", ").slice(0,300);
  if(!clinic.address || !clinic.city || q.length<8)return null;
  const items=await catalog("/3.0/items/geocode",{
    q,locale:"ru_RU",fields:"items.point,items.full_address_name",page_size:"5"
  },key,fetcher);
  const result=items.find(item=>responsePoint(item?.point,"address")&&addressMatch(clinic,item));
  return result ? responsePoint(result.point,"address") : null;
}
async function handle(req,res,{fetcher=fetch,key=process.env.DGIS_PLACES_KEY,apiBase=API_BASE}={}){
  const send=(code,body,cache="no-store")=>{
    res.statusCode=code;
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Cache-Control",cache);
    res.end(JSON.stringify(body));
  };
  if(req.method!=="GET")return send(405,{error:"GET only"});
  const q=new URL(req.url,"https://frontend.local").searchParams;
  const id=q.get("clinicId");
  if(!id||!/^[a-zA-Z0-9_-]{1,128}$/.test(id))return send(400,{error:"Invalid clinic ID"});
  try{
    // Never trust the caller's address, map link or claimed approval status.
    const response=await fetcher(apiBase+"/api/clinics",{
      headers:{Accept:"application/json"},signal:AbortSignal.timeout(9000)
    });
    if(!response.ok)throw Error("Clinic directory unavailable.");
    const body=await response.json();
    const clinic=Array.isArray(body?.clinics)?body.clinics.find(c=>c.id===id&&c.verified===true):null;
    if(!clinic)return send(404,{error:"Approved clinic not found"});
    const point=await resolveApprovedClinic(clinic,key,fetcher);
    if(!point)return send(200,{clinicId:id,location:null,reason:!key?"geocoding_not_configured":"no_precise_match"},"public, s-maxage=300");
    return send(200,{clinicId:id,location:point},"public, s-maxage=1800, stale-while-revalidate=300");
  }catch{
    // Never expose the API key, upstream URLs or arbitrary backend errors.
    return send(503,{error:"Clinic map location service is temporarily unavailable."});
  }
}
export { parseClinicMapLink, addressMatch, resolveApprovedClinic, handle };
