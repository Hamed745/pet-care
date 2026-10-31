import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { btn, btn2, card } from "../ui.js";
import { Badge, EmptyState, Rating } from "../components/ui.jsx";
import { Gallery, PriceTag, ProductCard, QuantityStepper } from "../components/store/StoreComponents.jsx";

export default function ProductDetails() {
  const { id } = useParams();
  const { products: storeProducts, productsLoading, productsError, cart, markProductViewed, favorites, toggleFavorite, addCartProduct, showToast } = useApp();
  const product = storeProducts.find((item) => String(item.id) === id);
  const { t, language, productName, productDescription, productDetails, variantLabel } = useLanguage();
  const name = product ? productName(product) : "";
  const [activeTab, setActiveTab] = useState("Description");
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = product?.variants?.find((variant) => variant.id === variantId);
  const priceProduct = product && selectedVariant ? { ...product, price: selectedVariant.price } : product;
  const isFavorite = product ? favorites.includes(product.id) : false;
  const quantityInCart = product ? cart.filter((item) => item.id === product.id).reduce((total, item) => total + item.qty, 0) : 0;
  const remainingStock = product ? Math.max(0, product.stock - quantityInCart) : 0;

  useEffect(() => { if (product) markProductViewed(product.id); }, [product?.id]);
  useEffect(() => { setQuantity((current) => Math.min(current, Math.max(1, remainingStock))); }, [product?.id, remainingStock]);

  if (productsLoading) return <p className="py-12 text-center text-sm text-ink-500">Loading product…</p>;
  if (productsError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{productsError}</p>;
  if (!product) return <div className="mx-auto max-w-xl py-8"><EmptyState title={t("common.page_not_found", "Product not found")} description={t("common.page_not_found_desc", "This item may have moved or is no longer available.")} icon={ArrowLeft} action={<Link className={btn} to="/store">{t("cart.browse_store", "Back to store")}</Link>} /></div>;

  const add = async () => {
    if (remainingStock <= 0) return;
    await addCartProduct(product, selectedVariant, Math.min(quantity, remainingStock));
    setQuantity(1);
    showToast(`${name} ${t("store.added_to_cart", "added to your cart.")}`, "success", { label: t("store.view_cart", "View cart"), to: "/cart" });
  };

  const related = storeProducts.filter((item) => item.id !== product.id && (item.category === product.category || item.petType === product.petType)).slice(0, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const tabLabels = {
    Description: t("store.about_product"),
    Details: t("store.product_details"),
    Reviews: t("store.customer_reviews"),
  };
  const tabItems = ["Description", "Details", "Reviews"];

  return <div>
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-500">
      <Link to="/store" className="hover:text-primary-700">{t("nav.store", "Store")}</Link>
      <span aria-hidden="true">›</span>
      <Link to={`/store?category=${encodeURIComponent(product.category)}`} className="hover:text-primary-700">{t(`categories.${product.category}`, product.category)}</Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page" className="max-w-[55vw] truncate text-ink-900">{name}</span>
    </nav>
    <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-12">
      <Gallery images={product.images} alt={name} category={product.category} />
      <section>
        <Link to="/store" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary-700 lg:hidden"><ArrowLeft size={15} /> {t("nav.store", "Store")}</Link>
        <p className="text-xs font-bold uppercase text-ink-500">{product.brand}</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{name}</h1>
          <button type="button" aria-label={`${isFavorite ? "Remove from" : "Add to"} wishlist`} aria-pressed={isFavorite} onClick={() => toggleFavorite(product.id)} className={`grid size-11 shrink-0 place-items-center rounded-full border border-stone-200 ${isFavorite ? "text-danger-600" : "text-ink-700"}`}>
            <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <a href="#reviews" onClick={() => setActiveTab("Reviews")} className="mt-3 inline-flex items-center gap-2">
          <Rating value={product.rating} count={product.reviewsCount} />
          <span className="text-xs font-bold text-primary-700 underline">{t("store.read_reviews", "Read reviews")}</span>
        </a>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PriceTag product={product} price={priceProduct.price} className="text-xl" />
          {product.oldPrice && <Badge variant="danger">-{discount}%</Badge>}
        </div>
        {product.variants?.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-extrabold">{t("store.choose_size", "Choose size")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={variantId === variant.id}
                  onClick={() => setVariantId(variant.id)}
                  className={`min-h-10 rounded-lg border px-4 text-sm font-bold ${
                    variantId === variant.id
                      ? "border-primary-600 bg-primary-50 text-primary-800"
                      : "border-stone-300 text-ink-700 hover:bg-stone-50"
                  }`}
                >
                  {variantLabel(variant.label)} · {variant.price} {t("common.rub", "₽")}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <p className={`mt-5 text-sm font-bold ${product.stock === 0 ? "text-danger-600" : product.stock <= 3 ? "text-accent-500" : "text-primary-700"}`}>
          {product.stock === 0 ? t("store.out_of_stock", "Out of stock") : product.stock <= 3 ? t("store.low_stock", { count: product.stock }) : t("store.in_stock", "In stock")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, remainingStock)} label={t("common.quantity")} />
          <button type="button" disabled={product.stock === 0 || remainingStock === 0} onClick={add} className={`${btn} min-w-44 flex-1 sm:flex-none`}>
            <Check size={17} /> {t("store.add_to_cart", "Add to cart")}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-stone-100 py-4 text-center text-[11px] font-semibold text-ink-500">
          <span className="flex flex-col items-center gap-2"><RotateCcw size={18} className="text-primary-700" />{t("store.free_returns", "Free returns")}</span>
          <span className="flex flex-col items-center gap-2"><ShieldCheck size={18} className="text-primary-700" />{t("store.secure_checkout", "Secure checkout")}</span>
          <span className="flex flex-col items-center gap-2"><Truck size={18} className="text-primary-700" />{t("store.fast_delivery", "Fast delivery")}</span>
        </div>
      </section>
    </div>
    <section className={`${card} mt-12`}>
      <div role="tablist" aria-label="Product information" className="flex gap-2 overflow-x-auto border-b border-stone-100 pb-3">
        {tabItems.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${
              activeTab === tab ? "bg-primary-50 text-primary-800" : "text-ink-500 hover:bg-stone-50"
            }`}
          >
            {tabLabels[tab] || tab}
          </button>
        ))}
      </div>
      <div className="pt-5">
        {activeTab === "Description" && (
          <div>
            <h2 className="text-lg font-extrabold">{t("store.about_product", "About this product")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-700">{productDescription(product)}</p>
          </div>
        )}
        {activeTab === "Details" && (
          <div>
            <h2 className="text-lg font-extrabold">{t("store.product_details", "Product details")}</h2>
            <ul className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
              {productDetails(product).map((detail) => (
                <li key={detail} className="flex items-start gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-primary-700" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === "Reviews" && (
          <div id="reviews">
            <h2 className="text-lg font-extrabold">{t("store.customer_reviews", "Customer reviews")}</h2>
            <p className="mt-4 text-sm text-ink-500">No verified customer reviews yet.</p>
          </div>
        )}
      </div>
    </section>
    {related.length > 0 && (
      <section className="mt-14">
        <h2 className="mb-4 text-xl font-extrabold">{t("store.you_may_also_like", "You may also like")}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    )}
  </div>;
}
