import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Heart, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { storeCategories, storeProducts, petShopTiles } from "../storeCatalog.js";
import { useApp } from "../store.jsx";
import { btn, btn2, input } from "../ui.js";
import { Badge, Skeleton } from "../components/ui.jsx";
import { CategoryIcon, ProductCard } from "../components/store/StoreComponents.jsx";
import { FilterDrawer } from "../components/store/FilterPanels.jsx";

const sortOptions = [["featured", "Featured"], ["price-asc", "Price low to high"], ["price-desc", "Price high to low"], ["rating", "Top rated"], ["newest", "Newest"]];
const readFilters = (params) => ({ q: params.get("q") || "", pet: params.get("pet") || "", category: params.get("category") || "", brand: params.get("brand") || "", min: params.get("min") || "", max: params.get("max") || "", age: params.get("age") || "", rating: params.get("rating") || "", stock: params.get("stock") === "1", sale: params.get("sale") === "1", bestSeller: params.get("bestSeller") === "1" });

function sortList(list, sort) {
  const result = [...list];
  if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
  else if (sort === "rating") result.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
  else if (sort === "newest") result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else result.sort((a, b) => Number(b.badges.includes("Best seller")) - Number(a.badges.includes("Best seller")) || b.rating - a.rating);
  return result;
}

export default function Storefront() {
  const { storeSort, setStoreSort, cart } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = readFilters(searchParams);
  const sort = searchParams.get("sort") || storeSort || "featured";
  const [searchText, setSearchText] = useState(filters.q);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [collection, setCollection] = useState("popular");

  useEffect(() => setSearchText(filters.q), [filters.q]);
  useEffect(() => { if (searchParams.has("sort")) setStoreSort(sort); }, [sort]);
  useEffect(() => {
    setLoading(true);
    setVisibleCount(12);
    const timer = window.setTimeout(() => setLoading(false), 140);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const updateUrl = (patch, { replace = false } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value === false || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace });
  };
  const updateFilters = (patch) => updateUrl(Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, typeof value === "boolean" ? (value ? "1" : "") : value])));
  const filtersForDrawer = filters;
  const filteredProducts = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    const matches = storeProducts.filter((product) => {
      if (filters.pet && product.petType !== filters.pet) return false;
      if (filters.category && product.category !== filters.category) return false;
      if (filters.brand && product.brand !== filters.brand) return false;
      if (term && !`${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase().includes(term)) return false;
      if (filters.min && product.price < Number(filters.min)) return false;
      if (filters.max && product.price > Number(filters.max)) return false;
      if (filters.age && product.ageGroup !== filters.age && product.ageGroup !== "all") return false;
      if (filters.rating && product.rating < Number(filters.rating)) return false;
      if (filters.stock && product.stock <= 0) return false;
      if (filters.sale && !product.oldPrice) return false;
      if (filters.bestSeller && !product.badges.includes("Best seller")) return false;
      return true;
    });
    return sortList(matches, sort);
  }, [filters.q, filters.pet, filters.category, filters.brand, filters.min, filters.max, filters.age, filters.rating, filters.stock, filters.sale, filters.bestSeller, sort]);

  const suggestions = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return [];
    const productMatches = storeProducts.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(term)).slice(0, 4).map((product) => ({ type: "product", id: product.id, label: product.name, hint: `${product.brand} · ${product.category}` }));
    const categoryMatches = storeCategories.filter((category) => category.name.toLowerCase().includes(term)).slice(0, 2).map((category) => ({ type: "category", label: category.name, hint: "Category" }));
    return [...productMatches, ...categoryMatches].slice(0, 6);
  }, [searchText]);
  const chooseSuggestion = (suggestion) => {
    setSuggestionsOpen(false);
    setSuggestionIndex(-1);
    if (suggestion.type === "product") navigate(`/store/${suggestion.id}`);
    else { setSearchText(""); updateFilters({ q: "", category: suggestion.label }); }
  };
  const submitSearch = (event) => { event.preventDefault(); updateFilters({ q: searchText.trim() }); setSuggestionsOpen(false); };
  const clearAll = () => { const next = new URLSearchParams(); if (searchParams.get("sort")) next.set("sort", searchParams.get("sort")); setSearchParams(next); setSearchText(""); };
  const chooseCategory = (category) => updateFilters({ category });
  const handleSort = (value) => { setStoreSort(value); updateUrl({ sort: value }); };
  const activeChips = [
    filters.q && ["q", `Search: ${filters.q}`], filters.pet && ["pet", `Pet: ${({ dog: "Dogs", cat: "Cats", bird: "Birds", fish: "Fish", small: "Small pets" })[filters.pet] || filters.pet}`], filters.category && ["category", filters.category], filters.brand && ["brand", filters.brand], filters.bestSeller && ["bestSeller", "Best sellers"],
    (filters.min || filters.max) && [["min", "max"], `Price: ${filters.min || 0}–${filters.max || "any"} EGP`], filters.age && ["age", `Age: ${filters.age}`], filters.rating && ["rating", `${filters.rating}+ stars`], filters.stock && ["stock", "In stock"], filters.sale && ["sale", "On sale"],
  ].filter(Boolean);
  const collectionProducts = useMemo(() => {
    let matches = filteredProducts;
    if (collection === "new") matches = matches.filter((product) => product.badges.includes("New"));
    if (collection === "best") matches = matches.filter((product) => product.badges.includes("Best seller"));
    const collectionSort = sort === "featured"
      ? { popular: "rating", new: "newest", best: "featured" }[collection]
      : sort;
    return sortList(matches, collectionSort);
  }, [collection, filteredProducts, sort]);
  const cartQuantity = cart.reduce((total, item) => total + item.qty, 0);

  return <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
    <aside aria-label="Product categories" className="hidden rounded-2xl border border-stone-200 bg-white p-4 lg:block">
      <h2 className="mb-4 text-base font-extrabold text-ink-900">Categories</h2>
      <nav aria-label="Store categories" className="space-y-1">
        <button type="button" aria-pressed={!filters.category} onClick={() => chooseCategory("")} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${!filters.category ? "bg-primary-50 text-primary-800" : "text-ink-600 hover:bg-stone-50"}`}><CategoryIcon category="All" size={17} className={!filters.category ? "text-primary-700" : "text-ink-400"} />All Products</button>
        {storeCategories.map((category) => <button key={category.name} type="button" aria-pressed={filters.category === category.name} onClick={() => chooseCategory(category.name)} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${filters.category === category.name ? "bg-primary-50 font-bold text-primary-800" : "text-ink-600 hover:bg-stone-50"}`}><CategoryIcon category={category.name} size={17} className={filters.category === category.name ? "text-primary-700" : "text-ink-400"} /><span className="min-w-0 flex-1">{category.name}</span><span className="text-xs font-medium text-ink-400">{storeProducts.filter((product) => product.category === category.name).length}</span></button>)}
      </nav>
      <div className="mt-4 border-t border-stone-100 pt-4"><Link to="/wishlist" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-600 hover:bg-stone-50"><Heart size={17} className="text-ink-400" />Wishlist</Link><Link to="/orders" className="mt-1 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-600 hover:bg-stone-50"><ShoppingBag size={17} className="text-ink-400" />Orders</Link></div>
    </aside>

    <section aria-label="PetCare store" className="min-w-0">
      <header className="mb-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="relative flex min-w-0 flex-1" role="search"><label htmlFor="store-search" className="sr-only">Search products</label><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" /><input id="store-search" autoComplete="off" aria-autocomplete="list" aria-controls="store-search-suggestions" aria-expanded={suggestionsOpen && suggestions.length > 0} className={`${input} min-h-12 rounded-xl border-stone-200 bg-white pl-10 pr-11`} placeholder="Search products..." value={searchText} onFocus={() => setSuggestionsOpen(true)} onChange={(event) => { setSearchText(event.target.value); setSuggestionsOpen(true); setSuggestionIndex(-1); updateFilters({ q: event.target.value }, { replace: true }); }} onKeyDown={(event) => {
          if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setSuggestionsOpen(true); setSuggestionIndex((index) => (index + 1) % suggestions.length); }
          if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length); }
          if (event.key === "Enter" && suggestionsOpen && suggestionIndex >= 0) { event.preventDefault(); chooseSuggestion(suggestions[suggestionIndex]); }
          if (event.key === "Escape") setSuggestionsOpen(false);
        }} />{searchText && <button type="button" aria-label="Clear search" onClick={() => { setSearchText(""); updateFilters({ q: "" }); setSuggestionsOpen(false); }} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-stone-100"><X size={16} /></button>}
          {suggestionsOpen && suggestions.length > 0 && <ul id="store-search-suggestions" role="listbox" aria-label="Search suggestions" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl">{suggestions.map((suggestion, index) => <li key={`${suggestion.type}-${suggestion.id || suggestion.label}`} role="option" aria-selected={suggestionIndex === index}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${suggestionIndex === index ? "bg-primary-50" : "hover:bg-stone-50"}`}><span className="min-w-0"><span className="block truncate text-sm font-bold">{suggestion.label}</span><span className="mt-0.5 block truncate text-xs text-ink-500">{suggestion.hint}</span></span><span className="text-[10px] font-bold uppercase text-ink-500">{suggestion.type}</span></button></li>)}</ul>}
        </form>
      <Link to="/cart" aria-label={`Cart, ${cartQuantity} items`} className={`${btn2} relative min-h-12 shrink-0 px-4`}><ShoppingBag size={19} /><span className="hidden sm:inline">Cart</span>{cartQuantity > 0 && <span aria-label={`${cartQuantity} items`} className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary-700 px-1 text-[10px] font-extrabold text-white">{cartQuantity}</span>}</Link>
      <nav aria-label="Store account links" className="flex shrink-0 items-center gap-2 sm:hidden"><Link to="/wishlist" aria-label="Wishlist" className="grid size-11 place-items-center rounded-xl border border-stone-200 bg-white text-primary-700"><Heart size={18} /></Link></nav>
      </div>
      </header>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">{storeCategories.map((category) => <button key={category.name} type="button" aria-pressed={filters.category === category.name} onClick={() => chooseCategory(filters.category === category.name ? "" : category.name)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${filters.category === category.name ? "bg-primary-50 text-primary-800 ring-1 ring-primary-200" : "bg-white text-ink-600 ring-1 ring-stone-200"}`}>{category.name}</button>)}</div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200">
      <div role="tablist" aria-label="Product collections" className="flex min-w-0 gap-1 overflow-x-auto">
        {[["popular", "Popular"], ["new", "New Arrivals"], ["best", "Best Sellers"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={collection === value} onClick={() => setCollection(value)} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-bold transition ${collection === value ? "border-primary-600 text-primary-800" : "border-transparent text-ink-500 hover:text-ink-800"}`}>{label}</button>)}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-bold text-ink-500"><span className="hidden sm:block">Sort</span><span className="relative"><select aria-label="Sort products" className={`${input} min-h-10 w-auto appearance-none py-1.5 pe-8 ps-2 text-xs sm:text-sm`} value={sort} onChange={(event) => handleSort(event.target.value)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500" /></span></label>
        <button type="button" onClick={() => setFiltersOpen(true)} className={`${btn2} min-h-10 px-3 text-xs`}><SlidersHorizontal size={15} /><span className="hidden sm:inline">Filters</span></button>
      </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
      <span aria-live="polite" className="me-1 text-sm font-semibold text-ink-500">{collectionProducts.length} products</span>
      {filters.pet && <Badge variant="neutral">{petShopTiles.find((tile) => tile.value === filters.pet)?.name || filters.pet}</Badge>}
      {activeChips.map(([key, label]) => <button key={Array.isArray(key) ? key.join("-") : key} type="button" onClick={() => Array.isArray(key) ? updateUrl({ [key[0]]: "", [key[1]]: "" }) : updateUrl({ [key]: "" })} className="inline-flex min-h-7 items-center gap-1 rounded-full bg-primary-50 px-2.5 text-[11px] font-bold text-primary-800">{label}<X size={12} /></button>)}
      {activeChips.length > 0 && <button type="button" onClick={clearAll} className="min-h-7 px-2 text-xs font-bold text-primary-700 underline">Clear all</button>}
      </div>
      {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="rounded-2xl border border-stone-200 bg-white p-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="mt-3 h-3 w-2/3" /><Skeleton className="mt-2 h-4 w-full" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-4 h-10 w-full" /></div>)}</div> : collectionProducts.length ? <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{collectionProducts.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} listing />)}</div>{visibleCount < collectionProducts.length && <div className="mt-8 text-center"><button type="button" className={btn2} onClick={() => setVisibleCount((count) => count + 12)}>Load more products</button></div>}</> : <div className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-700"><ShoppingBag size={24} /></span><h2 className="mt-4 text-lg font-extrabold text-ink-900">No products found</h2><p className="mt-2 text-sm text-ink-500">Try changing your search or category.</p><button type="button" onClick={clearAll} className={`${btn} mt-4`}>Clear filters</button></div>}
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filtersForDrawer} onChange={updateFilters} resultCount={filteredProducts.length} />
    </section>
  </div>;
}
