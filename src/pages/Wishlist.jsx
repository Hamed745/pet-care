import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { storeProducts } from "../storeCatalog.js";
import { useApp } from "../store.jsx";
import { btn, card } from "../ui.js";
import { EmptyState } from "../components/ui.jsx";
import { ProductCard } from "../components/store/StoreComponents.jsx";

export default function Wishlist() {
  const { user, favorites, toggleFavorite } = useApp();
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view your wishlist" description="Your saved products will be ready here when you sign in." icon={Heart} action={<Link to="/login" state={{ from: "/wishlist" }} className={btn}>Log in</Link>} /></div>;
  const savedProducts = favorites.map((id) => storeProducts.find((product) => product.id === id)).filter(Boolean);
  if (!savedProducts.length) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Your wishlist is empty" description="Save the products you love and come back to them here." icon={Heart} action={<Link to="/store" className={btn}><ShoppingBag size={16} /> Browse the store</Link>} /></div>;
  return <div><header className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Your saved finds</p><h1 className="mt-2 text-3xl font-extrabold">Wishlist</h1></header><div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 2xl:grid-cols-4">{savedProducts.map((product) => <div key={product.id} className="flex min-w-0 flex-col"><ProductCard product={product} onRemove={() => toggleFavorite(product.id)} /><button type="button" onClick={() => toggleFavorite(product.id)} className="mt-2 min-h-10 rounded-lg border border-stone-200 bg-white text-sm font-bold text-ink-700 hover:bg-stone-50">Remove from wishlist</button></div>)}</div></div>;
}
