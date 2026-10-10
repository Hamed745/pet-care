import { useEffect, useRef, useState } from "react";
import { Activity, Bot, Camera, Clock3, MapPin, Phone, ShieldAlert, UploadCloud, Navigation, List, LocateFixed, Search, Check } from "lucide-react";
import { card } from "../ui.js";
import { ChatConversation } from "../components/ChatWidget.jsx";
import { useApp } from "../store.jsx";
import { btn, btn2, input } from "../ui.js";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from "../config.js";
import { validateImageFile } from "../utils/imageTools.js";
const clinics = [["Happy Paws Clinic (24h)", "Cairo", "01000000010"], ["Alexandria Animal Hospital (24h)", "Alexandria", "01000000011"], ["Giza Vet Pharmacy", "Giza", "01000000012"]];
const clinicCoordinates = { Cairo: [30.0444, 31.2357], Alexandria: [31.2001, 29.9187], Giza: [29.987, 31.2118] };
const distanceFrom = (origin, city) => { const target = clinicCoordinates[city]; if (!origin || !target) return Number.POSITIVE_INFINITY; const radians = (value) => value * Math.PI / 180; const latDelta = radians(target[0] - origin[0]); const lonDelta = radians(target[1] - origin[1]); const arc = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(origin[0])) * Math.cos(radians(target[0])) * Math.sin(lonDelta / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)); };
export function Emergency() {
  const [cityFilter, setCityFilter] = useState(""); const [openOnly, setOpenOnly] = useState(false); const [view, setView] = useState("list"); const [selectedClinic, setSelectedClinic] = useState(clinics[0]); const [locationMessage, setLocationMessage] = useState(""); const [coordinates, setCoordinates] = useState(null);
  const visibleClinics = clinics.filter(([, city, , open = true]) => (!cityFilter || city === cityFilter) && (!openOnly || open)).sort((a, b) => distanceFrom(coordinates, a[1]) - distanceFrom(coordinates, b[1]));
  const nearestClinic = visibleClinics[0] || clinics[0];
  const useMyLocation = () => { if (!navigator.geolocation) { setLocationMessage("Location is not available in this browser."); return; } setLocationMessage("Checking your location..."); navigator.geolocation.getCurrentPosition((position) => { setCoordinates([position.coords.latitude, position.coords.longitude]); setCityFilter(""); setLocationMessage("Contacts are sorted by approximate distance to demo city centers; locations are illustrative."); }, () => setLocationMessage("Location permission was unavailable. Choose a city to browse contacts."), { timeout: 7000 }); };
  return <div><section className="relative isolate overflow-hidden rounded-2xl bg-danger-600 px-6 py-10 text-white sm:px-10 sm:py-12"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"><ShieldAlert size={15} /> Urgent pet care</span><h1 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">When every minute matters, reach out.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/90">Call a nearby clinic for urgent advice. This directory is demo data; contact the clinic directly to confirm availability.</p><a href={`tel:${nearestClinic[2]}`} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-danger-600 hover:bg-red-50"><Phone size={18} /> Call nearest clinic</a></section>
    <section className="mt-10"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-danger-600">Get help now</p><h2 className="mt-2 text-2xl font-extrabold">Nearby emergency contacts</h2></div><button type="button" className={btn2} onClick={useMyLocation}><LocateFixed size={16} /> Use my location</button></div>{locationMessage && <p role="status" className="mb-3 text-sm text-ink-500">{locationMessage}</p>}<div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><label className="block text-xs font-bold">City<select aria-label="Emergency clinic city" className={`${input} mt-1`} value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All locations</option>{[...new Set(clinics.map(([, city]) => city))].map((city) => <option key={city}>{city}</option>)}</select></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} className="accent-primary-600" />Open now / 24h</label><div className="inline-flex gap-1 rounded-lg bg-stone-100 p-1"><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`grid size-9 place-items-center rounded-md ${view === "list" ? "bg-white text-primary-700 shadow-sm" : "text-ink-500"}`} aria-label="List view"><List size={17} /></button><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} className={`grid size-9 place-items-center rounded-md ${view === "map" ? "bg-white text-primary-700 shadow-sm" : "text-ink-500"}`} aria-label="Map view"><MapPin size={17} /></button></div></div>{view === "list" ? <div className="grid gap-4">{visibleClinics.map(([name, city, telephone], index) => <article key={name} onClick={() => setSelectedClinic([name, city, telephone])} className={`${card} flex flex-wrap items-center justify-between gap-4 ${selectedClinic?.[0] === name ? "border-primary-300" : ""}`}><div className="flex items-center gap-4"><span className={`grid size-12 place-items-center rounded-xl ${index === 0 ? "bg-red-50 text-danger-600" : "bg-primary-50 text-primary-700"}`}><Activity size={22} /></span><div><h3 className="font-extrabold">{name}</h3><p className="mt-1 flex items-center gap-2 text-sm text-ink-500"><MapPin size={14} /> {city}<span className="text-stone-300">·</span><Clock3 size={14} /> 24 hours</p></div></div><div className="flex gap-2"><a href={`tel:${telephone}`} onClick={(event) => event.stopPropagation()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-danger-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"><Phone size={16} /> Call clinic</a><a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${name} ${city}`)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className={btn2}><Navigation size={15} /> Directions</a></div></article>)}</div> : <div className="relative isolate flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-[#e8f0e9] p-6 text-center"><div className="absolute inset-0 -z-10 opacity-50" style={{ backgroundImage: "linear-gradient(30deg, transparent 47%, #c8d9ce 48%, #c8d9ce 50%, transparent 51%), linear-gradient(120deg, transparent 47%, #d6e1d8 48%, #d6e1d8 50%, transparent 51%)", backgroundSize: "76px 76px" }} /><span className="grid size-14 place-items-center rounded-full bg-primary-700 text-white shadow-lg"><MapPin size={25} /></span><div className="absolute left-[24%] top-[25%] grid size-9 place-items-center rounded-full bg-white text-danger-600 shadow"><MapPin size={17} /></div><div className="absolute right-[22%] bottom-[24%] grid size-9 place-items-center rounded-full bg-white text-primary-700 shadow"><MapPin size={17} /></div><div className="absolute bottom-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-ink-500">Map preview · clinic locations are illustrative</div></div>}{selectedClinic && <div className={`${card} mt-4 flex flex-wrap items-center justify-between gap-3`}><div><p className="text-xs font-extrabold uppercase tracking-wider text-danger-600">Selected contact</p><h3 className="mt-1 font-extrabold">{selectedClinic[0]}</h3><p className="mt-1 text-sm text-ink-500">{selectedClinic[1]} · Demo directory contact</p></div><div className="flex gap-2"><a href={`tel:${selectedClinic[2]}`} className={btn}><Phone size={15} /> Call</a><a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${selectedClinic[0]} ${selectedClinic[1]}`)}`} target="_blank" rel="noreferrer" className={btn2}><Navigation size={15} /> Directions</a></div></div>}</section>
    </div>
  }
  export function AI() {
  const { pets } = useApp();
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [petId, setPetId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const fileInput = useRef(null);
  const analysisInFlightRef = useRef(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const addImage = (file) => {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setImageFile(file);
    setResult(null);
    setUploadError("");
    setAnalysisError("");
  };

  const chooseImage = () => {
    if (fileInput.current) fileInput.current.value = "";
    fileInput.current?.click();
  };

  const removeImage = () => {
    setPreviewUrl("");
    setImageFile(null);
    setResult(null);
    setUploadError("");
    setAnalysisError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const analyze = async () => {
    if (!imageFile || analysisInFlightRef.current) return;
    analysisInFlightRef.current = true;
    setAnalyzing(true);
    setResult(null);
    setAnalysisError("");
    const selectedPet = pets.find((pet) => String(pet.id) === petId);
    try {
      const { analyzePetBreed } = await import("../services/petBreedService.js");
      const analysis = await analyzePetBreed(
        imageFile,
        selectedPet
          ? { type: selectedPet.type, breed: selectedPet.breed, age: selectedPet.age }
          : {},
      );
      setResult({ ...analysis, associatedPetName: selectedPet?.name || "" });
    } catch (error) {
      setAnalysisError(error.message);
    } finally {
      analysisInFlightRef.current = false;
      setAnalyzing(false);
    }
  };

  const selectedPet = pets.find((pet) => String(pet.id) === petId);
  const animalLabels = {
    dog: "Dog",
    cat: "Cat",
    other: "Other animal",
    none: "No animal detected",
    unclear: "Unable to identify",
  };
  const resultMessages = {
    no_animal: "No animal was visible in this photo. Try a clear photo that includes your pet.",
    multiple_animals: "More than one animal is visible, so an individual breed is uncertain. Try a photo with one pet in focus.",
    unclear_image: "The animal could not be identified clearly from this image. Try a brighter, sharper photo.",
    unsupported_species: "A pet is visible, but this analysis is intended to identify dogs and cats.",
  };

  return <div><div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">PetCare assistant</p><h1 className="mt-2 text-3xl font-extrabold">A little help, right here</h1><p className="mt-2 text-sm text-ink-500">Get answers to pet-care questions or try a breed photo preview.</p></div><div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
    <section className={`${card} overflow-hidden !p-0`}><ChatConversation embedded prompts={["How often should I brush my cat?", "What should I pack for a vet visit?"]} /></section>
    <section className={`${card} min-w-0 p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-500"><Camera size={20} /></span><div><h2 className="font-extrabold">Breed recognition</h2><p className="text-xs text-ink-500">AI-powered appearance estimate</p></div></div>
      {pets.length > 0 && <label className="mt-4 block text-xs font-bold">Associate with a pet <span className="font-normal text-ink-500">(optional)</span><select className={`${input} mt-2`} value={petId} disabled={analyzing} onChange={(event) => setPetId(event.target.value)}><option value="">No pet selected</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label>}
      <input ref={fileInput} className="sr-only" type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} aria-label="Choose a dog or cat photo" onChange={(event) => { addImage(event.target.files?.[0]); event.target.value = ""; }} />
      {!previewUrl && <button type="button" onClick={chooseImage} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addImage(event.dataTransfer.files?.[0]); }} className={`mt-4 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-primary-500 bg-primary-50" : "border-stone-300 bg-stone-50 hover:border-primary-500 hover:bg-primary-50/50"}`}><UploadCloud size={28} className="text-primary-600" /><b className="mt-3 text-sm">Drop a photo here or browse</b><span className="mt-1 text-xs text-ink-500">JPEG, PNG or WebP · up to {MAX_UPLOAD_SIZE / (1024 * 1024)} MB</span></button>}
      {previewUrl && <div className="mt-4 min-w-0"><img src={previewUrl} alt="Selected pet for breed recognition preview" className="max-h-56 w-full rounded-xl bg-stone-50 object-contain" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={analyzing} onClick={chooseImage} className={btn2}>Replace photo</button><button type="button" disabled={analyzing} onClick={removeImage} className={btn2}>Remove photo</button></div><button type="button" disabled={analyzing} onClick={analyze} className={`${btn} mt-3 w-full justify-center`}>{analyzing ? <><span className="motion-safe:animate-spin">⟳</span> Analyzing your pet...</> : <><Search size={16} /> Analyze Photo</>}</button></div>}
      {uploadError && <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">{uploadError}</p>}
      {analysisError && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{analysisError}</p>{imageFile && <button type="button" disabled={analyzing} onClick={analyze} className="mt-2 font-bold underline">Retry analysis</button>}</div>}
      {analyzing && <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-primary-700">Analyzing your pet...</p>}
      {result && <section aria-live="polite" aria-label="Breed analysis result" className="mt-4 rounded-xl border border-accent-100 bg-accent-50 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">AI appearance analysis{result.associatedPetName ? ` · ${result.associatedPetName}` : ""}</p>
        <h3 className="mt-2 text-base font-bold text-ink-700">Animal type: {animalLabels[result.animalType]}</h3>
        {result.recognitionStatus === "pet_identified" ? <><h4 className="mt-2 text-lg font-extrabold">Likely breed: {result.likelyBreed}</h4>{result.alternativeBreeds.length > 0 && <div className="mt-3"><h5 className="text-sm font-bold">Other possibilities</h5><ul className="mt-1 list-inside list-disc text-sm text-ink-700">{result.alternativeBreeds.map((breed) => <li key={breed}>{breed}</li>)}</ul></div>}</> : <p className="mt-2 text-sm font-semibold">{resultMessages[result.recognitionStatus]}</p>}
        {result.visibleCharacteristics.length > 0 && <div className="mt-3"><h5 className="text-sm font-bold">Visible characteristics</h5><ul className="mt-1 list-inside list-disc text-sm text-ink-700">{result.visibleCharacteristics.map((trait) => <li key={trait}>{trait}</li>)}</ul></div>}
        <p className="mt-3 text-sm text-ink-700">{result.explanation}</p>
        <p className="mt-2 text-xs text-ink-600">{result.uncertainty}</p>
        {result.recognitionStatus === "pet_identified" && result.mixedBreedPossible && <p className="mt-2 text-xs text-ink-600">Mixed ancestry is possible; appearance alone cannot confirm breed.</p>}
        <p className="mt-3 border-t border-accent-100 pt-3 text-[11px] leading-5 text-ink-600">AI breed identification is an estimate based on appearance, not proof of pedigree or genetic ancestry.</p>
        <button type="button" onClick={() => { setResult(null); setAnalysisError(""); chooseImage(); }} className={`${btn2} mt-3`}>Analyze Another Photo</button>
      </section>}
    </section></div></div>;
}
