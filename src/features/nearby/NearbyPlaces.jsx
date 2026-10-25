import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CalendarCheck2, Clock3, LocateFixed, MapPin, Navigation, Search, ShieldCheck, Star, Sparkles } from "lucide-react";
import TwoGisMap from "./TwoGisMap.jsx";
import { NEARBY_CATEGORIES, RUSSIAN_CITY_CENTERS } from "./nearbyCategories.js";
import { fetchNearbyPlaces } from "../../services/nearbyPlacesService.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const CATEGORY_RU = {
  emergency: ["Экстренная ветеринарная помощь", "Ветеринарные клиники поблизости. Уточняйте возможность экстренного приёма по телефону."],
  veterinary: ["Ветеринарные клиники", "Найдите ветеринарные клиники и больницы в России."],
  hotels: ["Гостиницы для животных", "Найдите гостиницы и передержку животных."],
  daycare: ["Дневной уход", "Найдите временный дневной уход за животными."],
  grooming: ["Груминг", "Найдите реальные груминг-салоны в 2ГИС."],
  "pet-sitting": ["Зооняня", "Найдите услуги по присмотру за питомцами в 2ГИС."],
};
const CITY_RU = {
  moscow: "Москва", krasnoyarsk: "Красноярск", saint_petersburg: "Санкт-Петербург",
  kazan: "Казань", novosibirsk: "Новосибирск", yekaterinburg: "Екатеринбург",
};
const HOURS = [
  ["any", "All hours", "Любое время"],
  ["now", "Open now", "Открыто сейчас"],
  ["alltime", "Open 24 hours (24/7)", "Круглосуточно (24/7)"],
];

export default function NearbyPlaces({ mode = "public" }) {
  const { kind: rawKind } = useParams();
  const isOur = mode === "our";
  const { isRussian } = useLanguage();
  const tr = (english, russian) => isRussian ? russian : english;
  const kind = Object.hasOwn(NEARBY_CATEGORIES, rawKind) ? rawKind : "veterinary";
  const category = NEARBY_CATEGORIES[kind];
  const categoryName = tr(category.label, category.ruLabel || CATEGORY_RU[kind]?.[0] || category.label);
  const [city, setCity] = useState("krasnoyarsk");
  const [customCity, setCustomCity] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [locationError, setLocationError] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityMatches, setCityMatches] = useState([]);
  const [cityError, setCityError] = useState("");
  const [searchingCity, setSearchingCity] = useState(false);
  const [hoursFilter, setHoursFilter] = useState("any");
  const [radius, setRadius] = useState(10000);
  const [places, setPlaces] = useState([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [previewNotice, setPreviewNotice] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const center = useMemo(() => location || customCity || RUSSIAN_CITY_CENTERS[city] || RUSSIAN_CITY_CENTERS.krasnoyarsk, [city, customCity, location]);
  const selectedCityName = location
    ? `${tr("My location", "Моё местоположение")}${locationName ? ` — ${locationName}` : ""}`
    : customCity?.name || tr(RUSSIAN_CITY_CENTERS[city]?.label || "Krasnoyarsk", CITY_RU[city] || "Красноярск");

  function showComingSoon() {
    setPreviewNotice(true);
  }
  function clearResults() {
    setPlaces([]);
    setSearched(false);
    setError("");
    setSearchTarget(null);
  }
  function searchPlaces(nextHours = hoursFilter, chosenCenter = center) {
    if (isOur) { showComingSoon(); return; }
    setSearchTarget({ kind, lon: chosenCenter.lon, lat: chosenCenter.lat, radius, hours: nextHours });
  }
  function changeHoursFilter(filter) {
    if (isOur) { showComingSoon(); return; }
    setHoursFilter(filter);
    if (searchTarget) searchPlaces(filter, { lon: searchTarget.lon, lat: searchTarget.lat });
  }
  useEffect(() => {
    if (!searchTarget || isOur) return;
    const controller = new AbortController();
    setPending(true);
    setSearched(true);
    setPlaces([]);
    setError("");
    fetchNearbyPlaces({ ...searchTarget, signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setPlaces(items); })
      .catch((err) => { if (!controller.signal.aborted && err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [searchTarget, isOur]);
  useEffect(() => { clearResults(); setHoursFilter("any"); setPreviewNotice(false); }, [kind, isOur]);

  // Query cities from 2GIS instead of maintaining an impossible-to-complete static list.
  useEffect(() => {
    if (isOur) return;
    const q = cityQuery.trim();
    if (q.length < 2) { setCityMatches([]); setSearchingCity(false); setCityError(""); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchingCity(true); setCityError("");
      fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "City lookup unavailable");
          return body.items;
        })
        .then((items) => { if (!controller.signal.aborted) setCityMatches(Array.isArray(items) ? items : []); })
        .catch((err) => { if (!controller.signal.aborted && err.name !== "AbortError") { setCityMatches([]); setCityError(tr("City lookup is unavailable. Use a preset city or GPS.", "Поиск городов недоступен. Выберите город из списка или используйте геолокацию.")); } })
        .finally(() => { if (!controller.signal.aborted) setSearchingCity(false); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cityQuery, isOur]);

  function selectCityMatch(choice) {
    if (isOur) { showComingSoon(); return; }
    setLocation(null);
    setLocationName("");
    setCustomCity({ lon: choice.lon, lat: choice.lat, name: choice.name });
    setCity("__custom__");
    setCityQuery("");
    setCityMatches([]);
    setLocationError("");
    clearResults();
  }
  function changeCity(next) {
    if (isOur) { showComingSoon(); return; }
    if (next === "__gps__" || next === "__custom__") return;
    setCity(next);
    setLocation(null);
    setLocationName("");
    setCustomCity(null);
    setLocationError("");
    clearResults();
  }
  function findMyLocation() {
    if (isOur) { showComingSoon(); return; }
    if (!navigator.geolocation) {
      setLocationError(tr("Your browser does not support geolocation.", "Ваш браузер не поддерживает геолокацию."));
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const coord = { lon: position.coords.longitude, lat: position.coords.latitude };
      setLocation(coord);
      setCustomCity(null);
      setLocationName("");
      clearResults();
      // City name lookup is optional; coordinates are authoritative even if lookup fails.
      try {
        const response = await fetch(`/api/reverse-city?lon=${coord.lon}&lat=${coord.lat}`);
        if (response.ok) {
          const body = await response.json();
          if (body.name) setLocationName(body.name);
        }
      } catch { /* GPS coordinates still work without reverse geocoding. */ }
    }, () => setLocationError(tr("Location unavailable or permission denied. Select a city instead.", "Геолокация недоступна или доступ запрещён. Выберите город.")), {
      enableHighAccuracy: true, maximumAge: 0, timeout: 15000,
    });
  }

  return <div className="space-y-5 py-3">
    <nav className="flex flex-wrap items-center gap-2 text-xs text-ink-500" aria-label="Breadcrumb">
      <Link to="/services" className="hover:underline">{tr("Services", "Услуги")}</Link><span>/</span><span>{categoryName}</span>
    </nav>
    <nav className="grid grid-cols-2 gap-3" aria-label={tr("Services mode", "Режим услуг")}>
      <Link to={`/nearby/${kind}`} aria-current={!isOur ? "page" : undefined}
        className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-5 ${!isOur ? "border-primary-700 bg-primary-50 shadow-sm" : "border-stone-200 bg-white hover:border-primary-200"}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary-700"><MapPin size={22} /></span>
        <span className="min-w-0"><strong className="block text-sm font-extrabold text-ink-900 sm:text-lg">{tr("Public Services", "Общедоступные услуги")}</strong><span className="mt-1 block text-xs text-ink-500">{tr("Live 2GIS search", "Поиск в 2ГИС")}</span></span>
      </Link>
      <Link to={`/nearby/our/${kind}`} aria-current={isOur ? "page" : undefined}
        className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-5 ${isOur ? "border-primary-700 bg-primary-50 shadow-sm" : "border-stone-200 bg-white hover:border-primary-200"}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary-700"><CalendarCheck2 size={22} /></span>
        <span className="min-w-0"><strong className="block text-sm font-extrabold text-ink-900 sm:text-lg">{tr("Our Services", "Наши услуги")}</strong><span className="mt-1 block text-xs text-amber-700">{tr("Coming soon", "Скоро")}</span></span>
      </Link>
    </nav>
    {isOur && <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-teal-50 p-5 sm:p-6" aria-label={tr("Our Services benefits", "Преимущества наших услуг")}>
      <div className="flex items-start gap-3"><Sparkles size={24} className="mt-1 shrink-0 text-violet-600" />
        <div><h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{tr("Our Services — Coming Soon", "Наши услуги — Скоро")}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">{tr("We're building a simpler way to find and book trusted veterinary care. The map and search tools below are a preview; booking and live search through Our Services are not available yet.", "Мы создаём удобный сервис для поиска и записи к проверенным ветеринарам. Карта и поиск ниже представлены для предварительного просмотра; запись и поиск в наших услугах пока недоступны.")}</p></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Clock3, en: "Choose your appointment time", ru: "Удобное время приёма" },
          { icon: Star, en: "Compare clinics by ratings", ru: "Сравнение по рейтингу" },
          { icon: ShieldCheck, en: "Explore trusted partners", ru: "Проверенные партнёры" },
          { icon: CalendarCheck2, en: "Manage bookings in PetCare", ru: "Управление записями" },
        ].map(({ icon: Icon, en, ru }) => <div key={en} className="rounded-xl border border-white bg-white/90 p-3 text-center shadow-sm"><Icon className="mx-auto text-primary-700" size={23} /><p className="mt-2 text-xs font-semibold leading-5 text-ink-800">{tr(en, ru)}</p></div>)}
      </div>
    </section>}
    <header className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
      <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{isOur ? tr("PetCare services preview", "Предпросмотр услуг PetCare") : tr("Live 2GIS directory", "Каталог организаций 2ГИС")}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">{isOur ? tr(`Our Services — ${category.label}`, `Наши услуги — ${categoryName}`) : tr(`${category.label} near you`, `${categoryName} рядом с вами`)}</h1>
      <p className="mt-2 text-sm text-ink-600">{isOur ? tr("Explore our future services in this interactive preview. Real provider listings and appointments are coming soon.", "Ознакомьтесь с будущими услугами. Реальные предложения и запись появятся позже.") : tr(category.description, category.ruDescription || CATEGORY_RU[kind]?.[1] || category.description)}</p>
      {!isOur && <p className="mt-2 text-xs text-ink-500">{tr("Results come from 2GIS; distances are straight-line. Call to confirm opening and emergency admission.", "Данные организаций — из 2ГИС, расстояния указаны по прямой. Уточняйте время работы и экстренный приём по телефону.")}</p>}
    </header>
    <nav className="flex flex-wrap gap-2" aria-label="Nearby place categories">
      {Object.entries(NEARBY_CATEGORIES).filter(([id]) => id !== "hotels").map(([id, info]) => <Link key={id} to={isOur ? `/nearby/our/${id}` : `/nearby/${id}`} aria-current={kind === id ? "page" : undefined}
        className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === id ? "bg-primary-700 text-white" : "border border-stone-200 bg-white text-ink-700"}`}>
        {tr(info.label, info.ruLabel || CATEGORY_RU[id]?.[0] || info.label)}
      </Link>)}
    </nav>
    {!isOur && <div className="flex flex-wrap justify-end">
      <Link to="/services/catalog" className="text-xs font-semibold text-primary-700 underline underline-offset-4">{tr("Grooming & pet sitting bookings (demo catalog)", "Запись на груминг и передержку (демо-каталог)")}</Link>
    </div>}
    <section className="relative grid gap-3 rounded-xl border border-stone-200 bg-white p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end" aria-label="Search options">
      {isOur && <button type="button" onClick={showComingSoon} className="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-white/35" aria-label={tr("Search preview — Coming soon", "Поиск пока недоступен")} title={tr("Our Services are coming soon", "Наши услуги скоро появятся")} />}
      <div className="min-w-0">
        <label htmlFor="petcare-city" className="text-xs font-bold text-ink-700">{tr("Search center", "Центр поиска")}</label>
        <select id="petcare-city" className="mt-1 block min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm"
          value={location ? "__gps__" : city} onChange={(event) => changeCity(event.target.value)}>
          {location && <option value="__gps__">{selectedCityName}</option>}
          {customCity && !location && <option value="__custom__">{customCity.name}</option>}
          {Object.entries(RUSSIAN_CITY_CENTERS).map(([id, info]) => <option key={id} value={id}>{tr(info.label, CITY_RU[id] || info.label)}</option>)}
        </select>
        <label htmlFor="petcare-city-query" className="mt-3 block text-xs font-bold text-ink-700">{tr("Any city in 2GIS — type its name", "Любой город в 2ГИС — введите название")}</label>
        <input id="petcare-city-query" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)}
          placeholder={tr("e.g. Krasnoyarsk", "Например, Красноярск")}
          className="mt-1 block min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm" maxLength={80} autoComplete="off" />
        {searchingCity && <p className="mt-1 text-xs text-ink-500">{tr("Finding cities...", "Поиск городов...")}</p>}
        {cityError && <p className="mt-1 text-xs text-amber-700" role="status">{cityError}</p>}
        {cityMatches.length > 0 && <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white" aria-label={tr("City matches", "Найденные города")}>
          {cityMatches.map((match) => <li key={match.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50" onClick={() => selectCityMatch(match)}>{match.name}</button></li>)}
        </ul>}
      </div>
      <label className="text-xs font-bold text-ink-700">{tr("Search radius", "Радиус поиска")}
        <select className="mt-1 block min-h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm" value={radius}
          onChange={(event) => { setRadius(Number(event.target.value)); clearResults(); }}>
          {[5000, 10000, 20000, 50000].map((v) => <option key={v} value={v}>{v / 1000} {tr("km", "км")}</option>)}
        </select>
      </label>
      <button type="button" onClick={findMyLocation} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary-200 px-3 text-sm font-semibold text-primary-800">
        <LocateFixed size={16} /> {tr("My location", "Моё местоположение")}
      </button>
      <button type="button" disabled={pending} onClick={() => searchPlaces()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
        <Search size={16} /> {pending ? tr("Searching...", "Поиск...") : tr("Find places", "Найти места")}
      </button>
      {(kind === "emergency" || kind === "veterinary") && <fieldset className="md:col-span-4">
        <legend className="mb-2 text-xs font-bold text-ink-700">{tr("Opening hours", "Время работы")}</legend>
        <div className="flex flex-wrap gap-2">
          {HOURS.map(([value, en, ru]) => <button key={value} type="button" aria-pressed={hoursFilter === value} onClick={() => changeHoursFilter(value)}
            className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-semibold transition ${hoursFilter === value ? "border-primary-700 bg-primary-700 text-white" : "border-stone-200 bg-white text-ink-700 hover:border-primary-400"}`}>{tr(en, ru)}</button>)}
        </div>
        <p className="mt-2 text-xs text-ink-500">{tr("Filtered results require supporting opening-hours data from 2GIS. Unknown or unverifiable schedules are excluded. Call the clinic to confirm.", "Для фильтрации необходимы подтверждённые данные о часах работы в 2ГИС. Организации без достоверного расписания исключены. Уточняйте работу клиники по телефону.")}</p>
      </fieldset>}
      <p className="text-xs font-semibold text-primary-700 md:col-span-4">
        {tr("Searching around:", "Район поиска:")} {selectedCityName}{location && <span> · GPS</span>}
      </p>
      {locationError && <p className="text-sm text-amber-800 md:col-span-4" role="status">{locationError}</p>}
    </section>
    {previewNotice && isOur && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span><AlertCircle size={16} className="mr-2 inline" />{tr("Our Services are coming soon. Searching, GPS and bookings will be available after launch.", "Наши услуги скоро появятся. Поиск, геолокация и запись будут доступны после запуска.")}</span><button type="button" className="shrink-0 font-bold underline" onClick={() => setPreviewNotice(false)}>{tr("Close", "Закрыть")}</button></div>}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,1fr)]">
      <div className="relative">
        <TwoGisMap center={center} places={isOur ? [] : places} />
        {isOur && <button type="button" onClick={showComingSoon} className="absolute inset-0 z-10 flex cursor-not-allowed items-end justify-center rounded-xl bg-slate-900/5 p-3" aria-label={tr("Map preview — Coming soon", "Предпросмотр карты — Скоро")}><span className="rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-primary-800 shadow-md">{tr("Map preview • Live search coming soon", "Предпросмотр карты • Поиск скоро")}</span></button>}
      </div>
      <section className="max-h-[480px] space-y-3 overflow-y-auto" aria-label="Nearby results" aria-live="polite">
        {!isOur && kind === "emergency" && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={16} className="mr-1 inline" />{tr("Always phone the clinic first: listed opening hours do not guarantee emergency admission.", "Перед поездкой обязательно позвоните: часы работы не гарантируют экстренный приём.")}</div>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {pending && <p role="status" className="rounded-xl border bg-white p-4 text-sm">{tr("Searching 2GIS...", "Идёт поиск в 2ГИС...")}</p>}
        {isOur && <div className="rounded-xl border border-primary-100 bg-primary-50 p-5 text-sm text-ink-700"><h2 className="font-extrabold">{tr("PetCare appointments are coming soon", "Запись через PetCare скоро появится")}</h2><p className="mt-2 leading-6">{tr("When Our Services launches, you will be able to choose clinics, compare ratings and book at a time that works for you. No providers or availability are offered in preview mode.", "После запуска вы сможете выбирать клиники, сравнивать рейтинги и записываться на удобное время. В режиме просмотра реальные организации и свободные места не предлагаются.")}</p></div>}
        {!isOur && !pending && !error && !searched && <p className="rounded-xl border bg-white p-4 text-sm text-ink-500">{tr("Select a city or GPS, then press Find places.", "Выберите город или используйте геолокацию, затем нажмите «Найти места».")}</p>}
        {!isOur && !pending && searched && !error && places.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-ink-500">{tr("No verified matches for this filter and radius. Try a larger radius or All hours; never assume a clinic is open without calling.", "Нет подтверждённых результатов для выбранного фильтра и радиуса. Увеличьте радиус или выберите «Любое время». Всегда уточняйте работу клиники по телефону.")}</p>}
        {!isOur && !pending && !error && places.map((place) => <article key={place.id} className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-extrabold text-ink-900">{place.name}</h2>
          <p className="mt-1 flex gap-1 text-xs text-ink-600"><MapPin size={14} className="shrink-0" />{place.address || tr("Address unavailable", "Адрес не указан")}</p>
          {place.opening === "24_7" && <p className="mt-2 text-xs font-semibold text-primary-700">{tr("24/7 according to 2GIS", "Круглосуточно по данным 2ГИС")}</p>}
          {place.opening === "open_now" && <p className="mt-2 text-xs font-semibold text-primary-700">{tr("Open now according to listed schedule", "Открыто сейчас по указанному расписанию")}</p>}
          <p className="mt-2 text-xs text-ink-600">{place.distanceKm != null ? `${place.distanceKm.toFixed(1)} ${tr("km straight-line", "км по прямой")}` : tr("Distance unavailable", "Расстояние неизвестно")}</p>
          {place.url && <a href={place.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary-700 px-3 py-2 text-xs font-bold text-white"><Navigation size={14} /> {tr("Open in 2GIS / Directions", "Открыть в 2ГИС / Маршрут")}</a>}
        </article>)}
      </section>
    </div>
  </div>;
}
