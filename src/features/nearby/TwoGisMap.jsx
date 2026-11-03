import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { classifyMapIssue } from "./mapIssue.js";

const MESSAGES = {
  key: [
    "2GIS refused the map key. Check the MapGL license, quota and allowed website domain.",
    "2ГИС отклонил ключ карты. Проверьте лицензию MapGL, лимит и разрешённый домен сайта.",
  ],
  webgl: [
    "WebGL is unavailable. Enable hardware acceleration or try another browser.",
    "WebGL недоступен. Включите аппаратное ускорение или попробуйте другой браузер.",
  ],
  network: [
    "The 2GIS map script could not load. Check connectivity to mapgl.2gis.com without VPN.",
    "Скрипт карты 2ГИС не загрузился. Проверьте соединение с mapgl.2gis.com без VPN.",
  ],
  style: [
    "2GIS map design could not load. Check map-style requests and the MapGL key.",
    "Не удалось загрузить стиль карты 2ГИС. Проверьте запросы стилей и ключ MapGL.",
  ],
  unknown: [
    "2GIS map initialization failed. Check the browser Console and Network tab.",
    "Не удалось загрузить карту 2ГИС. Проверьте консоль браузера и вкладку Network.",
  ],
};

/** Public MapGL key must be restricted in the 2GIS Platform Manager.
 * Contact/Places API uses a separate server-side key; never insert it here.
 */
export default function TwoGisMap({ center, places, onSelectPlace }) {
  const { isRussian } = useLanguage();
  const tr = (english, russian) => isRussian ? russian : english;
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const moduleRef = useRef(null);
  const markersRef = useRef([]);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;
  const [errorCode, setErrorCode] = useState("");
  const [ready, setReady] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const key = import.meta.env.VITE_2GIS_MAP_KEY;

  useEffect(() => {
    if (!key || !nodeRef.current) return undefined;
    let disposed = false;
    let map;
    let loadTimeout;
    setErrorCode("");

    const fail = (code) => {
      if (disposed) return;
      const reason = code || "unknown";
      setErrorCode(reason);
      // Log a diagnostic category only: a raw request error could include a key.
      console.warn("[PetCare/2GIS MapGL] failure category:", reason);
    };

    (async () => {
      try {
        const { load } = await import("@2gis/mapgl");
        const mapgl = await Promise.race([
          load(),
          new Promise((_, reject) => {
            loadTimeout = window.setTimeout(
              () => reject(new Error("2GIS script loading timed out")), 15000
            );
          }),
        ]);
        window.clearTimeout(loadTimeout);
        if (disposed || !nodeRef.current) return;
        if (typeof mapgl.isSupported === "function" && !mapgl.isSupported()) {
          fail("webgl");
          return;
        }
        map = new mapgl.Map(nodeRef.current, {
          key,
          center: [center.lon, center.lat],
          zoom: 12,
        });
        mapRef.current = map;
        moduleRef.current = mapgl;

        // MapGL can report a bad key or style failure AFTER the constructor.
        map.on("error", (event) => {
          const detail = event?.error || event;
          const code = classifyMapIssue(detail);
          if (code !== "unknown") fail(code);
        });
        map.on("styleloaderror", () => fail("style"));
        map.on("styleload", () => {
          if (!disposed) setErrorCode("");
        });
        setReady((value) => value + 1);
      } catch (cause) {
        if (!disposed) fail(classifyMapIssue(cause));
      } finally {
        window.clearTimeout(loadTimeout);
      }
    })();

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      markersRef.current.forEach((marker) => marker.destroy());
      markersRef.current = [];
      if (map) map.destroy();
      if (mapRef.current === map) mapRef.current = null;
      moduleRef.current = null;
    };
    // The map itself is constructed once per key/retry. Viewport updates are below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setCenter([center.lon, center.lat]);
  }, [center.lon, center.lat, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = moduleRef.current;
    if (!map || !mapgl) return;
    markersRef.current.forEach((marker) => marker.destroy());
    markersRef.current = places
      .filter((place) => Number.isFinite(place.lon) && Number.isFinite(place.lat))
      .map((place) => {
        const marker = new mapgl.Marker(map, { coordinates: [place.lon, place.lat] });
        marker.on("click", () => onSelectPlaceRef.current?.(place));
        return marker;
      });
  }, [places, ready]);

  if (!key) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-900">
        <AlertCircle size={22} />
        <p>{tr("Missing VITE_2GIS_MAP_KEY for this Vercel deployment. Configure a MapGL browser key and redeploy the frontend.", "Ключ VITE_2GIS_MAP_KEY не задан для этой версии сайта. Добавьте публичный ключ MapGL и пересоберите фронтенд.")}</p>
      </div>
    );
  }

  const message = MESSAGES[errorCode] || MESSAGES.unknown;
  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200">
      <div ref={nodeRef} role="region" aria-label={tr("Interactive map of nearby places", "Интерактивная карта ближайших организаций")} className="h-[340px] w-full sm:h-[460px]" />
      {errorCode && (
        <div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl border border-amber-200 bg-white/95 p-3 shadow-lg">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1">{tr(...message)} {tr("The nearby business list can still work separately.", "Список организаций может работать отдельно.")}</p>
          </div>
          <button type="button" className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-sm font-bold text-amber-900 hover:bg-amber-50" onClick={() => setAttempt((v) => v + 1)}>
            <RefreshCw size={15} /> {tr("Retry map", "Повторить загрузку карты")}
          </button>
        </div>
      )}
    </div>
  );
}
