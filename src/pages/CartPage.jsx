import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, btn2, card, input } from "../ui.js";
import { EmptyState } from "../components/ui.jsx";
import { PriceTag, ProductImage } from "../components/store/StoreComponents.jsx";

const fieldNames = ["name", "phone", "city", "address"];
export default function CartPage() {
  const { cart, updateCartQuantity, removeCartProduct, clearCart, createStoreOrder, user } = useApp();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ name: user?.name || "", phone: user?.phone || "", city: user?.city || "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState("Cash on delivery");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + (item.oldPrice || item.price) * item.qty, 0);
  const discount = cart.reduce((sum, item) => sum + Math.max(0, (item.oldPrice || item.price) - item.price) * item.qty, 0);
  const deliveryFee = subtotal >= 1200 ? 0 : cart.length ? 35 : 0;
  const total = subtotal - discount + deliveryFee;
  const updateField = (key) => (event) => { setAddress((current) => ({ ...current, [key]: event.target.value })); setErrors((current) => ({ ...current, [key]: "" })); };
  const submitOrder = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    fieldNames.forEach((key) => { if (!address[key].trim()) nextErrors[key] = "This field is required."; });
    if (address.phone && !/^[+()\d\s-]{7,}$/.test(address.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setSubmitting(true);
    try {
      const order = await createStoreOrder({ items: cart.map(({ id, name, brand, category, image, images, price, oldPrice, qty, variant }) => ({ id, name, brand, category, image: images?.[0] || image, price, oldPrice: oldPrice || null, qty, variant: variant || null })), subtotal, discount, deliveryFee, total, address: { ...address }, paymentMethod });
      await clearCart();
      navigate(`/order-confirmed/${order.id}`);
    } finally { setSubmitting(false); }
  };

  if (!cart.length) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Your cart is empty" description="Browse the shop for everyday essentials and thoughtful finds for your pet." icon={ShoppingBag} action={<Link to="/store" className={btn}>Browse the store <ArrowRight size={16} /></Link>} /></div>;
  return <div>
    <header className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">PetCare Store</p><h1 className="mt-2 text-3xl font-extrabold">Your cart</h1><p className="mt-2 text-sm text-ink-500">Review your items and delivery details.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label="Cart items" className="space-y-3">{cart.map((item) => <article key={`${item.id}-${item.variant?.id || "default"}`} className={`${card} flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap`}>
        <Link to={`/store/${item.id}`} className="shrink-0"><ProductImage src={item.images?.[0] || item.image} alt={item.name} category={item.category || item.cat} className="size-20 rounded-xl object-cover" /></Link>
        <div className="min-w-0 flex-1"><Link to={`/store/${item.id}`} className="font-extrabold hover:text-primary-700">{item.name}</Link><p className="mt-1 text-xs text-ink-500">{item.brand || "PetCare"}{item.variant?.label ? ` · ${item.variant.label}` : ""}</p><PriceTag product={item} className="mt-2 text-sm" /></div>
        <div className="flex items-center gap-2"><button type="button" aria-label={`Decrease quantity of ${item.name}`} disabled={item.qty <= 1} className={`${btn2} size-9 min-h-9 p-0`} onClick={() => updateCartQuantity(item.id, -1, item.variant?.id)}><Minus size={14} /></button><span aria-live="polite" className="w-6 text-center text-sm font-bold">{item.qty}</span><button type="button" aria-label={`Increase quantity of ${item.name}`} className={`${btn2} size-9 min-h-9 p-0`} onClick={() => updateCartQuantity(item.id, 1, item.variant?.id)}><Plus size={14} /></button></div>
        <span className="w-24 text-right text-sm font-extrabold">{item.price * item.qty} EGP</span>
        <button type="button" aria-label={`Remove ${item.name} from cart`} className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600" onClick={() => removeCartProduct(item.id, item.variant?.id)}><Trash2 size={16} /></button>
      </article>)}</section>
      <form noValidate onSubmit={submitOrder} className={`${card} space-y-5 lg:sticky lg:top-24`}>
        <div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Delivery details</p><h2 className="mt-1 text-xl font-extrabold">Checkout</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><label className="block text-xs font-bold">Full name<input required autoComplete="name" className={`${input} mt-2 ${errors.name ? "border-danger-600" : ""}`} value={address.name} onChange={updateField("name")} aria-invalid={Boolean(errors.name)} />{errors.name && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.name}</span>}</label><label className="block text-xs font-bold">Phone number<input required autoComplete="tel" type="tel" className={`${input} mt-2 ${errors.phone ? "border-danger-600" : ""}`} value={address.phone} onChange={updateField("phone")} aria-invalid={Boolean(errors.phone)} />{errors.phone && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.phone}</span>}</label><label className="block text-xs font-bold">City<input required autoComplete="address-level2" className={`${input} mt-2 ${errors.city ? "border-danger-600" : ""}`} value={address.city} onChange={updateField("city")} aria-invalid={Boolean(errors.city)} />{errors.city && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.city}</span>}</label><label className="block text-xs font-bold sm:col-span-2 lg:col-span-1">Address<input required autoComplete="street-address" className={`${input} mt-2 ${errors.address ? "border-danger-600" : ""}`} value={address.address} onChange={updateField("address")} aria-invalid={Boolean(errors.address)} />{errors.address && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.address}</span>}</label></div>
        <label className="block text-xs font-bold">Payment method<select className={`${input} mt-2`} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash on delivery</option><option>Card (demo)</option></select></label>
        <div className="border-t border-stone-100 pt-4"><h3 className="text-sm font-extrabold">Order review</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{subtotal} EGP</span></div><div className="flex justify-between text-ink-500"><span>Discount</span><span>-{discount} EGP</span></div><div className="flex justify-between text-ink-500"><span>Delivery</span><span>{deliveryFee ? `${deliveryFee} EGP` : "Free"}</span></div><div className="flex justify-between border-t border-stone-100 pt-3 text-base font-extrabold"><span>Total</span><span>{total} EGP</span></div></div></div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-500"><span className="inline-flex items-center gap-1"><Truck size={14} /> Tracked delivery</span><span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Secure checkout</span><span className="inline-flex items-center gap-1"><MapPin size={14} /> Local delivery</span></div>
        <button disabled={submitting} className={`${btn} w-full`}>{submitting ? "Placing order..." : <><ShoppingBag size={17} /> Place order</>}</button><Link to="/store" className="block text-center text-xs font-bold text-primary-700">Continue shopping</Link>
      </form>
    </div>
  </div>;
}
