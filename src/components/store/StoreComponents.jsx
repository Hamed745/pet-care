import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bed, Bone, BriefcaseBusiness, Check, Heart, HeartPulse, Minus, PawPrint, Plus, ShoppingBag, Sparkles, SprayCan, Star, Tag, Target, ToyBrick, Utensils, Waves } from "lucide-react";
import { useApp } from "../../store.jsx";
import { btn, btn2, card } from "../../ui.js";
import { Badge, Rating } from "../ui.jsx";

const iconByCategory = { Food: Utensils, Treats: Bone, Toys: ToyBrick, "Grooming and care": Sparkles, Accessories: Tag, "Beds and sleep": Bed, Training: Target, "Health and supplements": HeartPulse, "Cleaning and litter": SprayCan, "Travel and carriers": BriefcaseBusiness, "Aquariums and habitats": Waves };
export function CategoryIcon({ category, size = 22, className = "" }) {
  const Icon = iconByCategory[category] || PawPrint;
  return <Icon aria-hidden="true" size={size} className={className} />;
}

export function ProductImage({ src, alt, category, className = "", loading = "lazy" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed || !src) return <div role="img" aria-label={alt} className={`grid place-items-center bg-stone-100 text-primary-700 ${className}`}><CategoryIcon category={category} size={34} /></div>;
  return <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} className={className} />;
}

export function PetTile({ tile, onSelect }) {
  const [failed, setFailed] = useState(false);
  return <button type="button" onClick={() => onSelect(tile.value)} className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl bg-primary-50 text-left text-white shadow-sm focus-visible:outline-offset-4 sm:aspect-[1/1.12]">
    {!failed ? <img src={tile.image} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="absolute inset-0 grid place-items-center bg-primary-100 text-primary-700"><PawPrint size={42} /></span>}
    <span className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" /><span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-sm font-extrabold sm:inset-x-4 sm:bottom-4 sm:text-base">{tile.name}<ArrowRight size={17} className="shrink-0 transition group-hover:translate-x-1" /></span>
  </button>;
}

export function CategoryTile({ category, count, onSelect }) {
  const [failed, setFailed] = useState(false);
  return <button type="button" onClick={() => onSelect(category.name)} className="group relative flex min-h-28 items-end overflow-hidden rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    {!failed ? <img src={category.image} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover opacity-20 transition group-hover:scale-105" /> : null}
    <span className="absolute inset-0 bg-gradient-to-t from-white via-white/75 to-white/30" />
    <span className="relative flex w-full items-end justify-between gap-2"><span><span className="grid size-9 place-items-center rounded-lg bg-primary-50 text-primary-700"><CategoryIcon category={category.name} size={19} /></span><span className="mt-3 block text-sm font-extrabold text-ink-900">{category.name}</span><span className="mt-1 block text-xs text-ink-500">{count} {count === 1 ? "item" : "items"}</span></span><ArrowRight size={16} className="mb-1 shrink-0 text-primary-700" /></span>
  </button>;
}

export function PriceTag({ product, price = product.price, className = "" }) {
  const discount = product.oldPrice ? Math.round((1 - price / product.oldPrice) * 100) : 0;
  return <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}><strong className="font-extrabold text-ink-900">{price} EGP</strong>{product.oldPrice && <><span className="text-xs text-ink-500 line-through">{product.oldPrice} EGP</span><span className="text-[10px] font-extrabold text-danger-600">-{discount}%</span></>}</span>;
}

export function QuantityStepper({ value, onChange, label = "Quantity", compact = false }) {
  return <div className={`inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 ${compact ? "h-9" : "h-11"}`} aria-label={label}>
    <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))} className="grid size-7 place-items-center rounded-md text-ink-700 hover:bg-stone-100 disabled:opacity-35"><Minus size={14} /></button>
    <span aria-live="polite" className="min-w-7 text-center text-sm font-bold">{value}</span>
    <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(value + 1)} className="grid size-7 place-items-center rounded-md text-ink-700 hover:bg-stone-100"><Plus size={14} /></button>
  </div>;
}

function favoriteBadge(product) {
  if (product.oldPrice) return `-${Math.round((1 - product.price / product.oldPrice) * 100)}%`;
  if (product.badges?.length) return product.badges[0];
  if (product.stock > 0 && product.stock <= 5) return "Low stock";
  return "";
}

export function ProductCard({ product, horizontal = false }) {
  const { cart, favorites, toggleFavorite, addCartProduct, updateCartQuantity, showToast } = useApp();
  const isFavorite = favorites.includes(product.id);
  const inCart = cart.filter((item) => item.id === product.id).reduce((total, item) => total + item.qty, 0);
  const cartEntry = cart.find((item) => item.id === product.id);
  const badge = favoriteBadge(product);
  const add = async () => { await addCartProduct(product); showToast(`${product.name} added to your cart.`, "success", { label: "View cart", to: "/cart" }); };
  const addExistingVariant = async () => { await addCartProduct(product, cartEntry?.variant); };
  const cardClass = `${card} relative flex h-full flex-col overflow-hidden p-3 sm:p-4 ${horizontal ? "w-[220px] shrink-0 snap-start sm:w-[244px]" : ""}`;
  return <article className={cardClass}>
    <Link to={`/store/${product.id}`} aria-label={`View ${product.name}`} className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" />
    <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col pointer-events-none">
    <div className="relative overflow-hidden rounded-xl">
      <ProductImage src={product.images[0]} alt={product.name} category={product.category} className={`aspect-square w-full object-cover ${product.stock === 0 ? "opacity-45" : ""}`} />
      {badge && <Badge variant={product.oldPrice ? "danger" : "neutral"} className="absolute left-2 top-2 max-w-[70%] truncate bg-white/95">{badge}</Badge>}
      <button type="button" aria-label={`${isFavorite ? "Remove from" : "Add to"} wishlist: ${product.name}`} aria-pressed={isFavorite} onClick={() => toggleFavorite(product.id)} className={`pointer-events-auto absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${isFavorite ? "text-danger-600" : "text-ink-700"}`}><Heart size={17} fill={isFavorite ? "currentColor" : "none"} /></button>
    </div>
    <div className="mt-3 min-h-[3.25rem]"><span className="block truncate text-[11px] font-semibold text-ink-500">{product.brand}</span><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-ink-900">{product.name}</h3></div>
    <Rating value={product.rating} count={product.reviewsCount} className="mt-2 text-xs" />
    <PriceTag product={product} className="mt-2 text-sm" />
    <div className="mt-auto pt-3">
      {product.stock === 0 ? <button disabled className={`${btn2} pointer-events-auto min-h-10 w-full cursor-not-allowed text-xs opacity-60`}>Out of stock</button> : inCart ? <div className="pointer-events-auto flex items-center justify-between gap-2"><button type="button" aria-label={`Remove one ${product.name} from cart`} onClick={() => updateCartQuantity(product.id, -1, cartEntry?.variant?.id)} className="grid size-10 place-items-center rounded-lg border border-stone-200 text-ink-700 hover:bg-stone-50"><Minus size={15} /></button><span aria-live="polite" className="text-sm font-bold">{inCart} in cart</span><button type="button" aria-label={`Add one ${product.name} to cart`} onClick={addExistingVariant} className="grid size-10 place-items-center rounded-lg bg-primary-600 text-white hover:bg-primary-700"><Plus size={15} /></button></div> : <button type="button" className={`${btn} pointer-events-auto min-h-10 w-full px-2 text-xs sm:text-sm`} onClick={add}><ShoppingBag size={15} /> Add to cart</button>}
    </div>
    </div>
  </article>;
}

export function ProductRow({ title, products, to }) {
  if (!products.length) return null;
  return <section className="space-y-4">
    <div className="flex items-end justify-between gap-3"><h2 className="text-xl font-extrabold">{title}</h2><Link to={to} className="inline-flex items-center gap-1 text-sm font-bold text-primary-700 hover:underline">See all <ArrowRight size={15} /></Link></div>
    <div className="home-scroll-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{products.map((product) => <ProductCard key={product.id} product={product} horizontal />)}</div>
  </section>;
}

export function Gallery({ images, alt, category }) {
  const [selected, setSelected] = useState(0);
  const move = (direction) => setSelected((current) => (current + direction + images.length) % images.length);
  return <div>
    <div className="relative overflow-hidden rounded-xl bg-stone-100"><ProductImage src={images[selected]} alt={alt} category={category} loading="eager" className="aspect-square w-full object-cover" /><button type="button" aria-label="Previous image" onClick={() => move(-1)} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-900 shadow"><ArrowLeft size={17} /></button><button type="button" aria-label="Next image" onClick={() => move(1)} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-900 shadow"><ArrowRight size={17} /></button></div>
    <div className="mt-3 grid grid-cols-2 gap-3">{images.map((src, index) => <button key={src} type="button" aria-label={`Show product image ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); } if (event.key === "ArrowRight") { event.preventDefault(); move(1); } }} className={`overflow-hidden rounded-lg border-2 ${selected === index ? "border-primary-600" : "border-transparent"}`}><ProductImage src={src} alt={`${alt}, view ${index + 1}`} category={category} className="aspect-square w-full object-cover" /></button>)}</div>
  </div>;
}

const orderSteps = ["Placed", "Preparing", "Shipped", "Delivered"];
export function OrderTimeline({ status }) {
  const current = status === "Delivered" ? 3 : status === "Shipped" ? 2 : status === "Preparing" || status === "Cancelled" ? 1 : 0;
  return <ol aria-label="Order status" className="grid grid-cols-4 gap-2">{orderSteps.map((step, index) => <li key={step} className="relative flex flex-col items-center text-center"><span className={`grid size-8 place-items-center rounded-full border-2 ${index <= current ? "border-primary-600 bg-primary-600 text-white" : "border-stone-300 bg-white text-ink-500"}`}>{index < current ? <Check size={15} /> : <span className="text-xs font-bold">{index + 1}</span>}</span><span className={`mt-2 text-[10px] font-bold sm:text-xs ${index <= current ? "text-primary-700" : "text-ink-500"}`}>{step}</span></li>)}</ol>;
}
