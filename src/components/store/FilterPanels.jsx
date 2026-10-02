import { useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui.jsx";
import { storeCategories, storeProducts } from "../../storeCatalog.js";

const petTypes = [["dog", "Dogs"], ["cat", "Cats"], ["bird", "Birds"], ["fish", "Fish"], ["small", "Small pets"]];
const ageGroups = [["young", "Puppy / Kitten"], ["adult", "Adult"], ["senior", "Senior"]];

function FilterControls({ filters, onChange }) {
  const brands = [...new Set(storeProducts.map((product) => product.brand))].sort();
  const check = (label, checked, onClick, count) => <label key={label} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={checked} onChange={onClick} className="size-4 accent-primary-600" /><span className="min-w-0 flex-1">{label}</span>{count !== undefined && <span className="text-xs text-ink-500">{count}</span>}</label>;
  return <div className="space-y-5">
    <fieldset><legend className="mb-2 text-sm font-extrabold">Pet type</legend>{petTypes.map(([value, label]) => check(label, filters.pet === value, () => onChange({ pet: filters.pet === value ? "" : value })))}</fieldset>
    <fieldset><legend className="mb-2 text-sm font-extrabold">Category</legend>{storeCategories.map(({ name }) => check(name, filters.category === name, () => onChange({ category: filters.category === name ? "" : name }), storeProducts.filter((product) => product.category === name).length))}</fieldset>
    <fieldset><legend className="mb-2 text-sm font-extrabold">Brand</legend>{brands.map((brand) => check(brand, filters.brand === brand, () => onChange({ brand: filters.brand === brand ? "" : brand }), storeProducts.filter((product) => product.brand === brand).length))}</fieldset>
    <fieldset><legend className="mb-2 text-sm font-extrabold">Price range (EGP)</legend><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-ink-500">Minimum<input aria-label="Minimum price" type="number" min="0" className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-2 text-sm text-ink-900" value={filters.min} onChange={(event) => onChange({ min: event.target.value })} /></label><label className="text-[11px] font-semibold text-ink-500">Maximum<input aria-label="Maximum price" type="number" min="0" className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-2 text-sm text-ink-900" value={filters.max} onChange={(event) => onChange({ max: event.target.value })} /></label></div></fieldset>
    <fieldset><legend className="mb-2 text-sm font-extrabold">Age group</legend>{ageGroups.map(([value, label]) => check(label, filters.age === value, () => onChange({ age: filters.age === value ? "" : value })))}</fieldset>
    <fieldset><legend className="mb-2 text-sm font-extrabold">Rating</legend>{check("4 stars and up", filters.rating === "4", () => onChange({ rating: filters.rating ? "" : "4" }))}</fieldset>
    <fieldset className="space-y-1 border-t border-stone-100 pt-4"><legend className="sr-only">Availability</legend>{check("In stock only", filters.stock, () => onChange({ stock: !filters.stock }))}{check("On sale", filters.sale, () => onChange({ sale: !filters.sale }))}</fieldset>
  </div>;
}

export function FilterSidebar({ filters, onChange }) {
  return <aside aria-label="Product filters" className="sticky top-[92px] max-h-[calc(100vh-108px)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-4"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={17} className="text-primary-700" /><h2 className="font-extrabold">Filters</h2></div><FilterControls filters={filters} onChange={onChange} /></aside>;
}

export function FilterDrawer({ open, onClose, filters, onChange, resultCount }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const selector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";
    requestAnimationFrame(() => panel?.querySelector(selector)?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(panel?.querySelectorAll(selector) || [])].filter((element) => element.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); panel?.focus(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); requestAnimationFrame(() => previousFocus?.isConnected && previousFocus.focus()); };
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] bg-ink-900/45" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="store-filter-title" className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><h2 id="store-filter-title" className="text-lg font-extrabold">Filters</h2><button type="button" aria-label="Close filters" onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-stone-100"><X size={19} /></button></header><div className="overflow-y-auto px-5 py-4"><FilterControls filters={filters} onChange={onChange} /></div><footer className="border-t border-stone-100 p-4"><Button type="button" className="w-full" onClick={onClose}>Apply ({resultCount} results)</Button></footer></section></div>;
}
