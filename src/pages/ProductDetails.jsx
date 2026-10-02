import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import { storeProducts } from "../storeCatalog.js";
import { useApp } from "../store.jsx";
import { btn, btn2, card } from "../ui.js";
import { Badge, EmptyState, Rating } from "../components/ui.jsx";
import { Gallery, PriceTag, ProductCard, QuantityStepper } from "../components/store/StoreComponents.jsx";

const demoReviews = [
  { name: "Nadia R.", date: "September 2026", rating: 5, text: "Thoughtful quality and just the right size for our daily routine." },
  { name: "Omar K.", date: "August 2026", rating: 5, text: "Arrived quickly and feels sturdy. My pet settled into it straight away." },
  { name: "Salma M.", date: "July 2026", rating: 4, text: "Good value and exactly as described. I would order it again." },
];

export default function ProductDetails() {
  const { id } = useParams();
  const product = storeProducts.find((item) => String(item.id) === id);
  const { markProductViewed, favorites, toggleFavorite, addCartProduct, showToast } = useApp();
  const [activeTab, setActiveTab] = useState("Description");
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = product?.variants?.find((variant) => variant.id === variantId);
  const priceProduct = product && selectedVariant ? { ...product, price: selectedVariant.price } : product;
  const isFavorite = product ? favorites.includes(product.id) : false;
  useEffect(() => { if (product) markProductViewed(product.id); }, [product?.id]);
  if (!product) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Product not found" description="This item may have moved or is no longer available." icon={ArrowLeft} action={<Link className={btn} to="/store">Back to store</Link>} /></div>;
  const add = async () => { await addCartProduct(product, selectedVariant, quantity); showToast(`${product.name} added to your cart.`, "success", { label: "View cart", to: "/cart" }); };
  const related = storeProducts.filter((item) => item.id !== product.id && (item.category === product.category || item.petType === product.petType)).slice(0, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const tabItems = ["Description", "Details", "Reviews"];

  return <div>
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-500"><Link to="/store" className="hover:text-primary-700">Store</Link><span aria-hidden="true">›</span><Link to={`/store?category=${encodeURIComponent(product.category)}`} className="hover:text-primary-700">{product.category}</Link><span aria-hidden="true">›</span><span aria-current="page" className="max-w-[55vw] truncate text-ink-900">{product.name}</span></nav>
    <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-12"><Gallery images={product.images} alt={product.name} category={product.category} />
      <section><Link to="/store" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary-700 lg:hidden"><ArrowLeft size={15} /> Store</Link><p className="text-xs font-bold uppercase text-ink-500">{product.brand}</p><div className="mt-2 flex items-start justify-between gap-4"><h1 className="text-2xl font-extrabold sm:text-3xl">{product.name}</h1><button type="button" aria-label={`${isFavorite ? "Remove from" : "Add to"} wishlist`} aria-pressed={isFavorite} onClick={() => toggleFavorite(product.id)} className={`grid size-11 shrink-0 place-items-center rounded-full border border-stone-200 ${isFavorite ? "text-danger-600" : "text-ink-700"}`}><Heart size={19} fill={isFavorite ? "currentColor" : "none"} /></button></div>
        <a href="#reviews" onClick={() => setActiveTab("Reviews")} className="mt-3 inline-flex items-center gap-2"><Rating value={product.rating} count={product.reviewsCount} /><span className="text-xs font-bold text-primary-700 underline">Read reviews</span></a>
        <div className="mt-4 flex flex-wrap items-center gap-3"><PriceTag product={product} price={priceProduct.price} className="text-xl" />{product.oldPrice && <Badge variant="danger">Save {discount}%</Badge>}</div>
        {product.variants?.length > 0 && <fieldset className="mt-6"><legend className="text-sm font-extrabold">Choose size</legend><div className="mt-2 flex flex-wrap gap-2">{product.variants.map((variant) => <button key={variant.id} type="button" aria-pressed={variantId === variant.id} onClick={() => setVariantId(variant.id)} className={`min-h-10 rounded-lg border px-4 text-sm font-bold ${variantId === variant.id ? "border-primary-600 bg-primary-50 text-primary-800" : "border-stone-300 text-ink-700 hover:bg-stone-50"}`}>{variant.label} · {variant.price} EGP</button>)}</div></fieldset>}
        <p className={`mt-5 text-sm font-bold ${product.stock === 0 ? "text-danger-600" : product.stock <= 3 ? "text-accent-500" : "text-primary-700"}`}>{product.stock === 0 ? "Out of stock" : product.stock <= 3 ? `Only ${product.stock} left` : "In stock"}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3"><QuantityStepper value={quantity} onChange={setQuantity} label={`${product.name} quantity`} /><button type="button" disabled={product.stock === 0} onClick={add} className={`${btn} min-w-44 flex-1 sm:flex-none`}><Check size={17} /> Add to cart</button></div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-stone-100 py-4 text-center text-[11px] font-semibold text-ink-500"><span className="flex flex-col items-center gap-2"><RotateCcw size={18} className="text-primary-700" />Free returns</span><span className="flex flex-col items-center gap-2"><ShieldCheck size={18} className="text-primary-700" />Secure checkout</span><span className="flex flex-col items-center gap-2"><Truck size={18} className="text-primary-700" />Fast delivery</span></div>
      </section>
    </div>
    <section className={`${card} mt-12`}>
      <div role="tablist" aria-label="Product information" className="flex gap-2 overflow-x-auto border-b border-stone-100 pb-3">{tabItems.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-primary-50 text-primary-800" : "text-ink-500 hover:bg-stone-50"}`}>{tab}</button>)}</div>
      <div className="pt-5">{activeTab === "Description" && <div><h2 className="text-lg font-extrabold">About this product</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-ink-700">{product.description}</p></div>}{activeTab === "Details" && <div><h2 className="text-lg font-extrabold">Product details</h2><ul className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">{product.details.map((detail) => <li key={detail} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-primary-700" />{detail}</li>)}</ul></div>}{activeTab === "Reviews" && <div id="reviews"><h2 className="text-lg font-extrabold">Customer reviews</h2><div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]"><div><div className="text-4xl font-extrabold">{product.rating}</div><Rating value={product.rating} count={product.reviewsCount} className="mt-2" />{[5, 4, 3, 2, 1].map((stars) => <div key={stars} className="mt-2 flex items-center gap-2 text-xs"><span className="w-8">{stars} stars</span><span className="h-2 flex-1 overflow-hidden rounded bg-stone-100"><span className="block h-full rounded bg-accent-400" style={{ width: `${stars === 5 ? 74 : stars === 4 ? 19 : 7}%` }} /></span></div>)}</div><div className="divide-y divide-stone-100">{/* Demo review data until customer reviews are provided by the API. */}{demoReviews.map((review) => <article key={review.name} className="py-3 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-extrabold">{review.name}</span><time className="text-xs text-ink-500">{review.date}</time></div><span className="mt-1 flex gap-0.5 text-accent-500" aria-label={`${review.rating} stars`}>{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}</span><p className="mt-2 text-sm leading-6 text-ink-700">{review.text}</p></article>)}</div></div></div>}</div>
    </section>
    {related.length > 0 && <section className="mt-14"><h2 className="mb-4 text-xl font-extrabold">You may also like</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
  </div>;
}
