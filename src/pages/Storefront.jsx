import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Heart, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { storeCategories, storeProducts, petShopTiles } from "../storeCatalog.js";
import { useApp } from "../store.jsx";
import { btn, btn2, input } from "../ui.js";
import { Badge, EmptyState, Rating, SectionTitle, Skeleton } from "../components/ui.jsx";
import { CategoryIcon, CategoryTile, PetTile, ProductCard, ProductRow } from "../components/store/StoreComponents.jsx";
import { FilterDrawer, FilterSidebar } from "../components/store/FilterPanels.jsx";

const filterKeys = ["q", "pet", "category", "brand", "min", "max", "age", "rating", "stock", "sale"];
const sortOptions = [["featured", "Featured"], ["price-asc", "Price low to high"], ["price-desc", "Price high to low"], ["rating", "Top rated"], ["newest", "Newest"]];
const readFilters = (params) => ({ q: params.get("q") || "", pet: params.get("pet") || "", category: params.get("category") || "", brand: params.get("brand") || "", min: params.get("min") || "", max: params.get("max") || "", age: params.get("age") || "", rating: params.get("rating") || "", stock: params.get("stock") === "1", sale: params.get("sale") === "1" });

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
  const { storeSort, setStoreSort, recentlyViewed } = useApp();
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
      return true;
    });
    return sortList(matches, sort);
  }, [filters.q, filters.pet, filters.category, filters.brand, filters.min, filters.max, filters.age, filters.rating, filters.stock, filters.sale, sort]);

  const browseMode = filterKeys.every((key) => !searchParams.get(key));
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
  const choosePet = (pet) => updateFilters({ pet });
  const handleSort = (value) => { setStoreSort(value); updateUrl({ sort: value }); };
  const activeChips = [
    filters.q && ["q", `Search: ${filters.q}`], filters.pet && ["pet", `Pet: ${({ dog: "Dogs", cat: "Cats", bird: "Birds", fish: "Fish", small: "Small pets" })[filters.pet] || filters.pet}`], filters.category && ["category", filters.category], filters.brand && ["brand", filters.brand],
    (filters.min || filters.max) && [["min", "max"], `Price: ${filters.min || 0}–${filters.max || "any"} EGP`], filters.age && ["age", `Age: ${filters.age}`], filters.rating && ["rating", `${filters.rating}+ stars`], filters.stock && ["stock", "In stock"], filters.sale && ["sale", "On sale"],
  ].filter(Boolean);
  const recentProducts = recentlyViewed.map((id) => storeProducts.find((product) => product.id === id)).filter(Boolean);
  const bestSellers = sortList(storeProducts.filter((product) => product.badges.includes("Best seller")), "featured").slice(0, 6);
  const arrivals = sortList(storeProducts.filter((product) => product.badges.includes("New")), "newest").slice(0, 6);
  const deals = sortList(storeProducts.filter((product) => product.oldPrice), "price-asc").slice(0, 6);

  return <div>
    <header className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">PetCare supplies</p><h1 className="mt-1 text-3xl font-extrabold">Store</h1></div><nav aria-label="Store account links" className="flex items-center gap-2"><Link to="/wishlist" className={`${btn2} min-h-10 px-3 text-xs sm:text-sm`}><Heart size={16} /> Wishlist</Link><Link to="/orders" className={`${btn2} min-h-10 px-3 text-xs sm:text-sm`}><ShoppingBag size={16} /> Orders</Link></nav></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {browseMode ? <Link to="/" className="sr-only"><ArrowLeft size={14} /> Home</Link> : <Link to="/store" className="inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> Back to store</Link>}
        <form onSubmit={submitSearch} className="relative flex min-w-0 flex-1" role="search"><label htmlFor="store-search" className="sr-only">Search products and categories</label><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" /><input id="store-search" autoComplete="off" aria-autocomplete="list" aria-controls="store-search-suggestions" aria-expanded={suggestionsOpen && suggestions.length > 0} className={`${input} pl-10 pr-11`} placeholder="Search products and categories" value={searchText} onFocus={() => setSuggestionsOpen(true)} onChange={(event) => { setSearchText(event.target.value); setSuggestionsOpen(true); setSuggestionIndex(-1); updateFilters({ q: event.target.value }, { replace: true }); }} onKeyDown={(event) => {
          if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setSuggestionsOpen(true); setSuggestionIndex((index) => (index + 1) % suggestions.length); }
          if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length); }
          if (event.key === "Enter" && suggestionsOpen && suggestionIndex >= 0) { event.preventDefault(); chooseSuggestion(suggestions[suggestionIndex]); }
          if (event.key === "Escape") setSuggestionsOpen(false);
        }} />{searchText && <button type="button" aria-label="Clear search" onClick={() => { setSearchText(""); updateFilters({ q: "" }); setSuggestionsOpen(false); }} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:bg-stone-100"><X size={16} /></button>}
          {suggestionsOpen && suggestions.length > 0 && <ul id="store-search-suggestions" role="listbox" aria-label="Search suggestions" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl">{suggestions.map((suggestion, index) => <li key={`${suggestion.type}-${suggestion.id || suggestion.label}`} role="option" aria-selected={suggestionIndex === index}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${suggestionIndex === index ? "bg-primary-50" : "hover:bg-stone-50"}`}><span className="min-w-0"><span className="block truncate text-sm font-bold">{suggestion.label}</span><span className="mt-0.5 block truncate text-xs text-ink-500">{suggestion.hint}</span></span><span className="text-[10px] font-bold uppercase text-ink-500">{suggestion.type}</span></button></li>)}</ul>}
        </form>
        <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-ink-500"><span className="sr-only">Sort products</span><span className="hidden sm:block">Sort</span><span className="relative"><select aria-label="Sort products" className={`${input} min-h-11 appearance-none py-2 pe-9 ps-3 text-sm`} value={sort} onChange={(event) => handleSort(event.target.value)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown aria-hidden="true" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" /></span></label>
      </div>
      {!browseMode && <div className="flex flex-wrap items-center gap-2"><span aria-live="polite" className="me-1 text-sm font-semibold text-ink-500">{filteredProducts.length} products</span>{activeChips.map(([key, label]) => <button key={Array.isArray(key) ? key.join("-") : key} type="button" onClick={() => Array.isArray(key) ? updateUrl({ [key[0]]: "", [key[1]]: "" }) : updateUrl({ [key]: "" })} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary-50 px-3 text-xs font-bold text-primary-800">{label}<X size={13} /></button>)}<button type="button" onClick={clearAll} className="min-h-8 px-2 text-xs font-bold text-primary-700 underline">Clear all</button></div>}
    </header>

    {browseMode ? <div className="space-y-16">
      <section><SectionTitle title="Shop by pet" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{petShopTiles.map((tile) => <PetTile key={tile.value} tile={tile} onSelect={choosePet} />)}</div></section>
      <section><SectionTitle title="Shop by category" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{storeCategories.map((category) => <CategoryTile key={category.name} category={category} count={storeProducts.filter((product) => product.category === category.name).length} onSelect={chooseCategory} />)}</div></section>
      <ProductRow title="Best sellers" products={bestSellers} to="/store?category=Food" />
      <ProductRow title="New arrivals" products={arrivals} to="/store?sort=newest" />
      <ProductRow title="Deals" products={deals} to="/store?sale=1" />
      {!!recentProducts.length && <ProductRow title="Recently viewed" products={recentProducts} to="/store" />}
    </div> : <>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">{storeCategories.map((category) => <button key={category.name} type="button" aria-pressed={filters.category === category.name} onClick={() => chooseCategory(filters.category === category.name ? "" : category.name)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${filters.category === category.name ? "bg-primary-700 text-white" : "bg-white text-ink-700 ring-1 ring-stone-200"}`}>{category.name}</button>)}</div>
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden"><p aria-live="polite" className="text-sm font-semibold text-ink-500">{filteredProducts.length} products</p><button type="button" onClick={() => setFiltersOpen(true)} className={`${btn2} min-h-10`}><SlidersHorizontal size={16} /> Filters</button></div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><div className="hidden lg:block"><FilterSidebar filters={filtersForDrawer} onChange={updateFilters} /></div><section aria-label="Store results" className="min-w-0"><div className="mb-4 hidden items-center justify-between lg:flex"><p aria-live="polite" className="text-sm font-semibold text-ink-500">{filteredProducts.length} products</p><Badge variant="neutral">{filters.pet ? petShopTiles.find((tile) => tile.value === filters.pet)?.name : "All pets"}</Badge></div>
        {loading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="rounded-xl border border-stone-200 bg-white p-3"><Skeleton className="aspect-square" /><Skeleton className="mt-3 h-3 w-2/3" /><Skeleton className="mt-2 h-4 w-full" /><Skeleton className="mt-3 h-4 w-1/3" /><Skeleton className="mt-4 h-10 w-full" /></div>)}</div> : filteredProducts.length ? <><div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">{filteredProducts.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} />)}</div>{visibleCount < filteredProducts.length && <div className="mt-8 text-center"><button type="button" className={btn2} onClick={() => setVisibleCount((count) => count + 12)}>Load more products</button></div>}</> : <EmptyState title="No products found" description="Try adjusting or clearing a few filters." icon={ShoppingBag} action={<button type="button" onClick={clearAll} className={btn}>Clear filters</button>} />}
      </section></div>
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filtersForDrawer} onChange={updateFilters} resultCount={filteredProducts.length} />
    </>}
  </div>;
}
