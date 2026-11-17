import { clinicApi } from "./clinicApi.js";
import { clinicSearchPlacement, mapLinkCityConflict, isPlausibleClinicPoint } from "./clinicDiscovery.js";

// These are approved clinic records from our own server, never external 2GIS
// businesses. Preserve the existing public search UI in NearbyPlaces.
export const matchesPetCareService = (clinic, kind) => {
  if (!clinic?.verified) return false;
  if (!kind || kind === "veterinary") return true;
  const names = (clinic.services || []).filter(s => s.available !== false)
    .map(s => s.name).join(" ").toLocaleLowerCase("ru");
  const patterns = {
    emergency: /emergency|urgent|экстрен|неотлож|скорая/,
    grooming: /groom|грум|стриж|купани/,
    hotels: /hotel|boarding|гостиниц|отел|передерж/,
    daycare: /day.?care|дневн|передерж/,
    "pet-sitting": /sitting|walk|няня|присмотр|выгул/,
  };
  return Boolean(patterns[kind]?.test(names));
};

export const straightLineKm = (one, two) => {
  const toRad = degrees => degrees * Math.PI / 180;
  const a = toRad(two.lat - one.lat), b = toRad(two.lon - one.lon);
  const h = Math.sin(a / 2)**2 + Math.cos(toRad(one.lat)) * Math.cos(toRad(two.lat)) * Math.sin(b / 2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const normalize = value => String(value || "").toLocaleLowerCase("ru").replace(/ё/g,"е")
  .replace(/[^a-zа-я0-9]+/gi," ").trim();
const cityTranslations = {
  moscow:["moscow","москва"],"saint petersburg":["saint petersburg","санкт петербург","петербург"],
  krasnoyarsk:["krasnoyarsk","красноярск"],kazan:["kazan","казань"],
  novosibirsk:["novosibirsk","новосибирск"],yekaterinburg:["yekaterinburg","екатеринбург"],
};
export const matchesCity = (clinic, label) => {
  const requested=normalize(label), actual=normalize(clinic.city);
  if(!requested || !actual)return false;
  if(requested===actual || requested.includes(actual) || actual.includes(requested))return true;
  return Object.values(cityTranslations).some(names => names.some(name=>requested.includes(name)) &&
    names.some(name=>actual.includes(name)));
};

export const isClinicOpenAt = (clinic, current = new Date()) => {
  const hours=clinic.workingHours;
  if(!hours?.days?.length || !hours.open || !hours.close)return false;
  try{
    const parts=new Intl.DateTimeFormat("en-US",{
      timeZone:clinic.timeZone || "Europe/Moscow",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23",
    }).formatToParts(current);
    const dict=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    const day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(dict.weekday);
    const clock=Number(dict.hour)*60+Number(dict.minute);
    const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
    return hours.days.includes(day) && clock>=minutes(hours.open) && clock<minutes(hours.close);
  }catch{return false;}
};

const resolvedLocations=new Map();
const signature=c=>[c.id,c.mapUrl,c.address,c.city,c.latitude,c.longitude].join("|");

async function resolvedPoint(clinic, signal) {
  // A link to a different city is not evidence of the clinic\'s address.
  // Keep the approved clinic visible as a card, but avoid a misleading pin.
  if (mapLinkCityConflict(clinic.city, clinic.mapUrl)) return null;
  if (isPlausibleClinicPoint(clinic,{lat:clinic.latitude,lon:clinic.longitude})) {
    return {lat:clinic.latitude,lon:clinic.longitude};
  }
  const key=signature(clinic);
  if(resolvedLocations.has(key))return resolvedLocations.get(key);
  const response=await fetch("/api/clinic-location?clinicId="+encodeURIComponent(clinic.id),{
    headers:{Accept:"application/json"},signal,
  });
  if(!response.ok)throw Error("Unable to load an exact clinic location");
  const data=await response.json();
  const p=data.location;
  const point=isPlausibleClinicPoint(clinic,p)?{lon:Number(p.lon),lat:Number(p.lat)}:null;
  // Nulls may change when the clinic updates its share link; only cache pins.
  if(point)resolvedLocations.set(key,point);
  return point;
}

export async function fetchPetCarePlaces({kind,lon,lat,radius=10000,hours="any",cityName="",gps=false,signal}) {
  const result=await clinicApi.list();
  if(signal?.aborted)return [];
  const clinics=(result.clinics||[]).filter(c=>matchesPetCareService(c,kind) &&
    (hours==="any" ||
      (hours==="now" && isClinicOpenAt(c)) ||
      (hours==="alltime" && c.workingHours?.days?.length===7 &&
        c.workingHours.open==="00:00" && c.workingHours.close==="23:59")));
  const places=[];
  // Keep concurrency small and do not change the public 2GIS endpoint.
  const batchSize=5;
  for(let i=0;i<clinics.length;i+=batchSize){
    if(signal?.aborted)break;
    const batch=await Promise.all(clinics.slice(i,i+batchSize).map(async clinic=>{
      let coord=null;
      try{coord=await resolvedPoint(clinic,signal);}catch(e){if(e.name==="AbortError")return null;}
      if(signal?.aborted)return null;
      const distanceKm=coord?straightLineKm({lat,lon},coord):null;
      const sameCity=matchesCity(clinic,cityName);
      const placement=clinicSearchPlacement({distanceKm,radius,sameCity,gps});
      // All approved partner clinics remain discoverable in Our Services.
      // Radius controls the Nearby vs Other label, not clinic approval.
      // Pins still require exact verified coordinates; never use a city center.
      return {
        id:clinic.id,name:clinic.name,
        address:[clinic.address,clinic.city].filter(Boolean).join(", "),
        lon:coord?.lon??null,lat:coord?.lat??null,
        distanceKm, nearby: placement.nearby,
        mapCityConflict:mapLinkCityConflict(clinic.city,clinic.mapUrl),
        url:clinic.mapUrl||null,
        opening:hours==="now"?"open_now":null,
        clinic,verified:true,
      };
    }));
    places.push(...batch.filter(Boolean));
  }
  return places.sort((a,b)=>Number(b.nearby)-Number(a.nearby) ||
    (a.distanceKm??Infinity)-(b.distanceKm??Infinity) || a.name.localeCompare(b.name));
}
