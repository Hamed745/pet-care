import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { btn, btn2, card, input } from "../ui.js";
import { EmptyState } from "../components/ui.jsx";
import { PriceTag, ProductImage } from "../components/store/StoreComponents.jsx";
import { getCurrentAuthUser } from "../services/authService.js";

const fieldNames = ["name", "phone", "city", "address"];
const cartItemStock = (item, products) => products.find((product) => product.id === String(item.id))?.stock ?? 0;

export default function CartPage() {
  const { cart, products, productsLoading, productsError, refreshProducts, updateCartQuantity, removeCartProduct, clearCart, createStoreOrder, user } = useApp();
  useEffect(() => { refreshProducts(); }, [refreshProducts]);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ name: user?.name || "", phone: user?.phone || "", city: user?.city || "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState("Cash on delivery");
  const [visaPreview, setVisaPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [requestId] = useState(() => globalThis.crypto.randomUUID());
  const subtotal = cart.reduce((sum, item) => sum + (item.oldPrice || item.price) * item.qty, 0);
  const discount = cart.reduce((sum, item) => sum + Math.max(0, (item.oldPrice || item.price) - item.price) * item.qty, 0);
  const deliveryFee = subtotal >= 1200 ? 0 : cart.length ? 35 : 0;
  const total = subtotal - discount + deliveryFee;

  useEffect(() => {
    if (!user) return;
    setAddress((current) => ({
      ...current,
      name: current.name || user.name || "",
      phone: current.phone || user.phone || "",
      city: current.city || user.city || "",
    }));
  }, [user?.uid]);

  const updateField = (key) => (event) => {
    setAddress((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    // A local profile flag alone is not sufficient proof of a signed-in user.
    if (!user?.uid || getCurrentAuthUser()?.uid !== user.uid) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    if (paymentMethod === "Visa demo") {
      // This is a visual demonstration, not an actual payment or order.
      setVisaPreview(true);
      return;
    }
    const nextErrors = {};
    fieldNames.forEach((key) => {
      if (!address[key].trim()) nextErrors[key] = t("cart.field_required", "This field is required.");
    });
    if (address.phone && !/^[+()\d\s-]{7,}$/.test(address.phone.trim())) {
      nextErrors.phone = t("cart.invalid_phone", "Enter a valid phone number.");
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      const order = await createStoreOrder({
        requestId,
        items: cart.map(({ id, name, brand, category, image, images, price, oldPrice, qty, variant }) => ({
          id,
          name,
          brand,
          category,
          image: images?.[0] || image,
          price,
          oldPrice: oldPrice || null,
          qty,
          variant: variant || null,
        })),
        subtotal,
        discount,
        deliveryFee,
        total,
        address: { ...address },
        paymentMethod,
      });
      await clearCart();
      navigate(`/order-confirmed/${order.id}`);
    } catch (error) {
      setErrors((current) => ({ ...current, checkout: error.message || "Could not place your order." }));
    } finally {
      setSubmitting(false);
    }
  };

  if (productsLoading) return <p className="py-12 text-center text-sm text-ink-500">Checking current products and prices…</p>;
  if (productsError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{productsError}</p>;
  if (!cart.length) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("cart.empty_title", "Your cart is empty")}
          description={t("cart.empty_desc", "Browse the shop for everyday essentials and thoughtful finds for your pet.")}
          icon={ShoppingBag}
          action={
            <Link to="/store" className={btn}>
              {t("cart.browse_store", "Browse the store")} <ArrowRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-7">
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">
          PetCare Store
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("cart.title", "Your cart")}</h1>
        <p className="mt-2 text-sm text-ink-500">{t("cart.subtitle", "Review your items and delivery details.")}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Cart items" className="space-y-3">
          {cart.map((item) => (
            <article key={`${item.id}-${item.variant?.id || "default"}`} className={`${card} flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap`}>
              <Link to={`/store/${item.id}`} className="shrink-0">
                <ProductImage src={item.images?.[0] || item.image} alt={item.name} category={item.category || item.cat} className="size-20 rounded-xl object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/store/${item.id}`} className="font-extrabold hover:text-primary-700">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-ink-500">
                  {item.brand || "PetCare"}
                  {item.variant?.label ? ` · ${item.variant.label}` : ""}
                </p>
                <PriceTag product={item} className="mt-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${item.name}`}
                  disabled={item.qty <= 1}
                  className={`${btn2} size-9 min-h-9 p-0`}
                  onClick={() => updateCartQuantity(item.id, -1, item.variant?.id)}
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite" className="w-6 text-center text-sm font-bold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${item.name}`}
                  disabled={cart.filter((entry) => entry.id === item.id).reduce((sum, entry) => sum + entry.qty, 0) >= cartItemStock(item, products)}
                  className={`${btn2} size-9 min-h-9 p-0`}
                  onClick={() => updateCartQuantity(item.id, 1, item.variant?.id)}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="w-24 text-right text-sm font-extrabold">{item.price * item.qty} {t("common.rub", "₽")}</span>
              <button
                type="button"
                aria-label={`Remove ${item.name} from cart`}
                className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"
                onClick={() => removeCartProduct(item.id, item.variant?.id)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </section>
        <form noValidate onSubmit={submitOrder} className={`${card} space-y-5 lg:sticky lg:top-24`}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">
              {t("cart.delivery_details", "Delivery details")}
            </p>
            <h2 className="mt-1 text-xl font-extrabold">{t("cart.checkout", "Checkout")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block text-xs font-bold">
              {t("cart.full_name", "Full name")}
              <input
                required
                autoComplete="name"
                className={`${input} mt-2 ${errors.name ? "border-danger-600" : ""}`}
                value={address.name}
                onChange={updateField("name")}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.name}</span>}
            </label>
            <label className="block text-xs font-bold">
              {t("cart.phone_number", "Phone number")}
              <input
                required
                autoComplete="tel"
                type="tel"
                className={`${input} mt-2 ${errors.phone ? "border-danger-600" : ""}`}
                value={address.phone}
                onChange={updateField("phone")}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.phone}</span>}
            </label>
            <label className="block text-xs font-bold">
              {t("cart.city", "City")}
              <input
                required
                autoComplete="address-level2"
                className={`${input} mt-2 ${errors.city ? "border-danger-600" : ""}`}
                value={address.city}
                onChange={updateField("city")}
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.city}</span>}
            </label>
            <label className="block text-xs font-bold sm:col-span-2 lg:col-span-1">
              {t("cart.address", "Address")}
              <input
                required
                autoComplete="street-address"
                className={`${input} mt-2 ${errors.address ? "border-danger-600" : ""}`}
                value={address.address}
                onChange={updateField("address")}
                aria-invalid={Boolean(errors.address)}
              />
              {errors.address && <span role="alert" className="mt-1 block text-xs text-danger-600">{errors.address}</span>}
            </label>
          </div>
          <label className="block text-xs font-bold">
            {t("cart.payment_method", "Payment method")}
            <select className={`${input} mt-2`} value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setVisaPreview(false); }}>
              <option value="Cash on delivery">{t("cart.cash_on_delivery", "Cash on delivery")}</option>
              <option value="Visa demo">{language === "ru" ? "Visa (только демонстрация)" : "Visa card (demo only)"}</option>
            </select>
          </label>
          {paymentMethod === "Visa demo" && (
            <section aria-label="Visa demo preview" className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 p-5 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">PetCare</span>
                  <span className="text-2xl font-black italic tracking-tight">VISA</span>
                </div>
                <div className="mt-7 text-lg font-semibold tracking-[0.12em]">•••• •••• •••• 4242</div>
                <div className="mt-6 flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span>Demo card · Not valid for payment</span><span>12/29</span>
                </div>
              </div>
              <p className="flex items-start gap-2 text-xs leading-5 text-blue-950">
                <CreditCard size={17} className="mt-0.5 shrink-0" />
                {language === "ru"
                  ? "Это только демонстрация интерфейса Visa. Не вводите настоящие данные карты. Платежи не обрабатываются, заказ не создаётся."
                  : "Visa interface preview only. Do not enter real card details. No money is charged and no order is created."}
              </p>
              {visaPreview && <p role="status" className="rounded-lg border border-blue-200 bg-white p-3 text-xs font-semibold text-blue-900">
                {language === "ru" ? "Демонстрация завершена. Оплата не выполнялась, заказ не оформлен. Для реального заказа выберите оплату при получении." : "Demo preview completed. No payment was processed and no order was placed. Select cash on delivery to place a real order."}
              </p>}
            </section>
          )}
          <div className="border-t border-stone-100 pt-4">
            <h3 className="text-sm font-extrabold">{t("cart.order_review", "Order review")}</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>{t("cart.subtotal", "Subtotal")}</span>
                <span>{subtotal} {t("common.rub", "₽")}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>{t("cart.discount", "Discount")}</span>
                <span>-{discount} {t("common.rub", "₽")}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>{t("cart.delivery", "Delivery")}</span>
                <span>{deliveryFee ? `${deliveryFee} ${t("common.rub", "₽")}` : t("cart.free", "Free")}</span>
              </div>
              <div className="flex justify-between border-t border-stone-100 pt-3 text-base font-extrabold">
                <span>{t("cart.total", "Total")}</span>
                <span>{total} {t("common.rub", "₽")}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Truck size={14} /> {t("cart.tracked_delivery", "Tracked delivery")}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={14} /> {t("cart.secure_checkout", "Secure checkout")}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {t("cart.local_delivery", "Local delivery")}
            </span>
          </div>
          {!user && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Please <Link to="/login" state={{ from: "/cart" }} className="font-bold underline">sign in</Link> before placing your order.</p>}
          {errors.checkout && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.checkout}</p>}
          <button type="submit" disabled={submitting} className={`${btn} w-full`}>
            {submitting ? t("cart.placing_order", "Placing order...")
              : !user ? <><ShoppingBag size={17} /> {language === "ru" ? "Войти и продолжить заказ" : "Sign in to continue checkout"}</>
              : paymentMethod === "Visa demo" ? <><CreditCard size={17} /> {language === "ru" ? "Посмотреть демо Visa" : "Preview Visa demo (no payment)"}</>
              : <><ShoppingBag size={17} /> {t("cart.place_order", "Place order")}</>}
          </button>
          <Link to="/store" className="block text-center text-xs font-bold text-primary-700">
            {t("cart.continue_shopping", "Continue shopping")}
          </Link>
        </form>
      </div>
    </div>
  );
}
