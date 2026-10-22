import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

/** Browser-exposed map-tile key: restrict by allowed domain in 2GIS Platform Manager. */
export default function TwoGisMap({ center, places }) {
  const { isRussian } = useLanguage();
  const tr = (english, russian) => isRussian ? russian : english;
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const moduleRef = useRef(null);
  const markersRef = useRef([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(0);
  const key = import.meta.env.VITE_2GIS_MAP_KEY;

  useEffect(() => {
    if (!key || !nodeRef.current) return;
    let disposed = false;
    let map;
    (async () => {
      try {
        const { load } = await import("@2gis/mapgl");
        const mapgl = await load();
        if (disposed || !nodeRef.current) return;
        map = new mapgl.Map(nodeRef.current, {
          key,
          center: [center.lon, center.lat],
          zoom: 12,
        });
        mapRef.current = map;
        moduleRef.current = mapgl;
        setError("");
        setReady((v) => v + 1);
      } catch {
        if (!disposed) setError("Could not load 2GIS MapGL. Check the Map Tiles key and browser support.");
      }
    })();
    return () => {
      disposed = true;
      for (const marker of markersRef.current) marker.destroy();
      markersRef.current = [];
      if (map) map.destroy();
      if (mapRef.current === map) mapRef.current = null;
      moduleRef.current = null;
    };
    // The map is created once; subsequent center/results changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.setCenter([center.lon, center.lat]);
  }, [center.lon, center.lat, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = moduleRef.current;
    if (!map || !mapgl) return;
    markersRef.current.forEach((marker) => marker.destroy());
    markersRef.current = places.filter((place) => Number.isFinite(place.lon) && Number.isFinite(place.lat))
      .map((place) => new mapgl.Marker(map, { coordinates: [place.lon, place.lat] }));
  }, [places, ready]);

  if (!key) {
    return <div className="flex h-80 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-5 text-center text-sm text-ink-500">{tr("2GIS Map Tiles key is not configured yet. The place list can still work with its separate backend key.", "Ключ для карты 2ГИС ещё не настроен. Список организаций может работать с отдельным серверным ключом.")}</div>;
  }
  return <div className="relative overflow-hidden rounded-xl border border-stone-200">
    <div ref={nodeRef} role="region" aria-label={tr("Interactive map of nearby places", "Интерактивная карта ближайших организаций")} className="h-[340px] w-full sm:h-[460px]" />
    {error && <p role="alert" className="p-3 text-sm text-red-700">{tr(error, "Не удалось загрузить карту 2ГИС. Проверьте ключ карты и поддержку браузера.")}</p>}
  </div>;
}
