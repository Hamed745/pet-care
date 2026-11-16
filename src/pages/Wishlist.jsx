import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, card } from "../ui.js";
import { EmptyState } from "../components/ui.jsx";
import { ProductCard } from "../components/store/StoreComponents.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Wishlist() {
  const { user, favorites, toggleFavorite, products: storeProducts, productsLoading, productsError } = useApp();
  const { t } = useLanguage();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("wishlist.login_required")}
          description={t("wishlist.login_sub")}
          icon={Heart}
          action={<Link to="/login" state={{ from: "/wishlist" }} className={btn}>{t("nav.log_in")}</Link>}
        />
      </div>
    );
  }

  if (productsLoading) return <p className="py-12 text-center text-sm text-ink-500">Loading saved products…</p>;
  if (productsError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{productsError}</p>;
  const savedProducts = favorites.map((id) => storeProducts.find((product) => product.id === String(id))).filter(Boolean);

  if (!savedProducts.length) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("wishlist.empty_title")}
          description={t("wishlist.empty_sub")}
          icon={Heart}
          action={<Link to="/store" className={btn}><ShoppingBag size={16} /> {t("wishlist.browse_store")}</Link>}
        />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-7">
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{t("wishlist.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("wishlist.title")}</h1>
      </header>
      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 2xl:grid-cols-4">
        {savedProducts.map((product) => (
          <div key={product.id} className="flex min-w-0 flex-col">
            <ProductCard product={product} onRemove={() => toggleFavorite(product.id)} />
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className="mt-2 min-h-10 rounded-lg border border-stone-200 bg-white text-sm font-bold text-ink-700 hover:bg-stone-50"
            >
              {t("wishlist.remove")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
