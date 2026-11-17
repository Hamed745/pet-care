import { useEffect, useMemo, useState } from "react";
import TwoGisMap from "../features/nearby/TwoGisMap.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// All locations are derived from the approved-clinic-only server endpoint.
const MAX_SIMULTANEOUS = 4;
const cache = new Map();
const signature = clinic => [clinic.id,clinic.mapUrl,clinic.address,clinic.city,clinic.region,
  clinic.latitude,clinic.longitude].join("|");

export default function VerifiedClinicMap({ clinics = [] }) {
  const { isRussian } = useLanguage();
  const tr = (en, ru) => isRussian ? ru : en;
  const [locations,setLocations] = useState({});
  const [loading,setLoading] = useState(false);
  const [selected,setSelected] = useState(null);
  const [failures,setFailures] = useState(0);
  const ids = useMemo(() => clinics.map(signature).join("~"),[clinics]);
  useEffect(() => {
    const controller = new AbortController();
    let active=true;
    async function work(){
      if(!clinics.length){setLocations({});setLoading(false);return}
      setLoading(true);setFailures(0);
      const found={};let missing=0;
      const visit=async(clinic)=>{
        const key=signature(clinic);
        if(cache.has(key)){
          const hit=cache.get(key);
          if(hit)found[clinic.id]=hit;else missing++;
          return;
        }
        try{
          const response=await fetch("/api/clinic-location?clinicId="+encodeURIComponent(clinic.id),{
            signal:controller.signal,headers:{Accept:"application/json"}
          });
          if(!response.ok)throw Error("Clinic location unavailable");
          const data=await response.json();
          const point=data.location;
          if(point && Number.isFinite(point.lon) && Number.isFinite(point.lat)){
            const result={id:clinic.id,clinicId:clinic.id,name:clinic.name,address:clinic.address,
              lon:point.lon,lat:point.lat,source:point.source};
            cache.set(key,result);found[clinic.id]=result;
          }else{cache.set(key,null);missing++;}
        }catch(error){if(error.name!=="AbortError")missing++;}
      };
      for(let i=0;i<clinics.length && !controller.signal.aborted;i+=MAX_SIMULTANEOUS){
        await Promise.all(clinics.slice(i,i+MAX_SIMULTANEOUS).map(visit));
        if(active && !controller.signal.aborted){
          setLocations({...found});setFailures(missing);
        }
      }
      if(active && !controller.signal.aborted)setLoading(false);
    }
    work();
    return ()=>{active=false;controller.abort()};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ids]);

  const pins=useMemo(()=>clinics.map(c=>locations[c.id]).filter(Boolean),[clinics,locations]);
  const center=pins.length?{lon:pins[0].lon,lat:pins[0].lat}:{lon:37.6176,lat:55.7558};
  const selectedClinic=clinics.find(c=>c.id===selected?.clinicId);
  return (
    <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-3 sm:p-4" aria-label={tr("Map of approved PetCare clinics","Карта одобренных клиник PetCare")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">{tr("Our clinics on the map","Наши клиники на карте")}</h2>
          <p className="mt-1 text-xs text-ink-600">{tr("Only approved PetCare clinics appear. Locations come from map links or matching addresses.","Показаны только одобренные клиники PetCare. Местоположение определяется по ссылке на карту или точному адресу.")}</p>
        </div>
        <span role="status" className="text-xs font-bold text-primary-700">
          {loading?tr("Locating clinics…","Поиск координат…"):tr(pins.length+" map pins","Точек на карте: "+pins.length)}
        </span>
      </div>
      <TwoGisMap center={center} places={pins} onSelectPlace={setSelected}/>
      {selectedClinic && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-50 p-3 text-sm">
        <div><strong>{selectedClinic.name}</strong><p className="text-xs text-ink-600">{selectedClinic.address}, {selectedClinic.city}</p></div>
        <a href={"#clinic-"+encodeURIComponent(selectedClinic.id)} className="rounded-lg bg-primary-700 px-3 py-2 font-bold text-white">
          {tr("View services and book","Услуги и запись")}
        </a>
      </div>}
      {!loading && !!clinics.length && failures>0 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        {tr(failures+" clinic location(s) could not be pinpointed safely. Their cards and map links remain below; no approximate pins have been invented.",
          "Не удалось точно определить местоположение "+failures+" клиник(и). Карточки и исходные ссылки доступны ниже; неточные метки не создаются.")}
      </p>}
    </section>
  );
}
