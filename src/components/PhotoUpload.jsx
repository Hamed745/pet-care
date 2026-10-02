import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui.jsx";
import { ALLOWED_IMAGE_TYPES } from "../config.js";
import { compressImageFile, validateImageFile } from "../utils/imageTools.js";

export default function PhotoUpload({ value, onChange, square = false, showPreview = true, label = "Pet photo" }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const selectFile = async (file) => {
    const validation = validateImageFile(file);
    if (validation) { setError(validation); return; }
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await compressImageFile(file, { maxSide: square ? 400 : 800, square, quality: 0.8 });
      onChange(dataUrl);
    } catch {
      setError("Photo could not be processed. Choose another image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const picker = <input ref={inputRef} className="sr-only" type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} aria-label={`Choose ${label.toLowerCase()}`} onChange={(event) => selectFile(event.target.files?.[0])} />;
  if (value) return <div className="flex flex-wrap items-center gap-4">
    {showPreview && <img src={value} alt={label} className={`${square ? "size-24" : "size-20"} rounded-2xl border border-stone-200 object-cover`} />}
    {picker}<div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus size={15} /> Change</Button><Button type="button" variant="ghost" size="sm" onClick={() => { onChange(""); setError(""); }}><Trash2 size={15} /> Remove</Button></div>
    {error && <p role="alert" className="basis-full text-xs font-semibold text-danger-600">{error}</p>}
  </div>;

  return <div>{picker}<button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }} className={`flex min-h-28 w-full items-center gap-4 rounded-2xl border border-dashed p-4 text-left transition ${dragging ? "border-primary-500 bg-primary-50" : "border-stone-300 bg-stone-50 hover:border-primary-500 hover:bg-primary-50/50"}`}><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-primary-700"><Upload size={21} /></span><span><b className="block text-sm">Drop a photo here</b><span className="mt-1 block text-xs text-ink-500">PNG, JPEG or WebP · up to 5 MB</span></span></button><div className="mt-2 flex items-center gap-3"><Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus size={15} />{busy ? "Processing photo..." : "Choose photo"}</Button>{error && <p role="alert" className="text-xs font-semibold text-danger-600">{error}</p>}</div></div>;
}