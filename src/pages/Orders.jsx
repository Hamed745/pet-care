import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { btn, btn2, btnDanger, card } from "../ui.js";
import { Badge, Button, EmptyState, Modal } from "../components/ui.jsx";
import { OrderTimeline, ProductImage } from "../components/store/StoreComponents.jsx";

const statusStyle = { Placed: "warning", Preparing: "warning", Shipped: "success", Delivered: "success", Cancelled: "danger" };

export function Orders() {
  const { user, orders, ordersLoading, ordersError, refreshOrders } = useApp();
  useEffect(() => { refreshOrders(); }, [refreshOrders]);
  const { t, language } = useLanguage();
  const money = (value) => `${Number(value || 0).toLocaleString()} ${t("common.rub", "₽")}`;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("orders.please_login", "Please log in to view your orders")}
          description={t("orders.login_desc", "Your order history and delivery updates are saved here.")}
          icon={ShoppingBag}
          action={
            <Link to="/login" state={{ from: "/orders" }} className={btn}>
              {t("nav.log_in", "Log in")}
            </Link>
          }
        />
      </div>
    );
  }

  if (ordersLoading) return <p className="py-12 text-center text-sm text-ink-500">Loading your orders…</p>;
  if (ordersError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{ordersError}</p>;

  return (
    <div>
      <header className="mb-7">
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">
          {t("orders.your_purchases", "Your purchases")}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("orders.title", "Orders")}</h1>
      </header>
      {orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, index) => (
                    <ProductImage
                      key={`${order.id}-${item.id}-${index}`}
                      src={item.image || item.images?.[0]}
                      alt={item.name}
                      category={item.category}
                      className="size-12 rounded-lg border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-extrabold">{t("orders.order_num", { id: order.id })}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {new Date(order.createdAt).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")} · {order.items.length} {t("common.results", "items")} · {money(order.total)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Badge variant={statusStyle[order.status] || "neutral"}>
                  {t(`orders.status_${order.status.toLowerCase()}`, order.status)}
                </Badge>
                <Link to={`/orders/${order.id}`} className={`${btn2} min-h-9 px-3 text-xs`}>
                  {t("orders.view_order", "View order")} <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("orders.no_orders", "No orders yet")}
          description={t("orders.no_orders_desc", "Completed purchases will appear here with their delivery status.")}
          icon={PackageCheck}
          action={
            <Link to="/store" className={btn}>
              {t("orders.shop_supplies", "Shop supplies")}
            </Link>
          }
        />
      )}
    </div>
  );
}

export function OrderDetails() {
  const { id } = useParams();
  const { user, orders, ordersLoading, ordersError, refreshOrders, cancelStoreOrder } = useApp();
  useEffect(() => { refreshOrders(); }, [refreshOrders]);
  const { t, language } = useLanguage();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const order = orders.find((item) => item.id === id);
  const money = (value) => `${Number(value || 0).toLocaleString()} ${t("common.rub", "₽")}`;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("orders.please_login", "Please log in to view this order")}
          description={t("orders.login_desc", "Sign in to see items, delivery details, and order progress.")}
          icon={ShoppingBag}
          action={
            <Link to="/login" state={{ from: `/orders/${id}` }} className={btn}>
              {t("nav.log_in", "Log in")}
            </Link>
          }
        />
      </div>
    );
  }

  if (ordersLoading) return <p className="py-12 text-center text-sm text-ink-500">Loading order details…</p>;
  if (ordersError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{ordersError}</p>;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("common.page_not_found", "Order not found")}
          description={t("common.page_not_found_desc", "We could not find this order in your local order history.")}
          icon={PackageCheck}
          action={
            <Link to="/orders" className={btn}>
              {t("nav.orders", "Back to orders")}
            </Link>
          }
        />
      </div>
    );
  }

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelStoreOrder(order.id);
      setCancelOpen(false);
      setCancelError("");
    } catch (error) {
      setCancelError(error.message || "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="order-details-page order-v3-page">
      <div className="order-v3-tracking-wrap">
        <OrderTimeline status={order.status} orderId={order.id} createdAt={order.createdAt} />
      </div>
      <div className="order-v3-details">
        <section className="order-v3-items" aria-label="Items in this order">
          {order.items.map((item, index) => (
            <article key={`${item.id}-${index}`} className="order-v3-item">
              <ProductImage src={item.image || item.images?.[0]} alt={item.name} category={item.category} className="order-v3-product-image" />
              <div className="order-v3-product-copy">
                <h2>{item.name}</h2>
                <p>
                  {item.variant?.label ? `${item.variant.label} · ` : ""}Qty {item.qty}
                </p>
              </div>
              <span className="order-v3-item-price">{money(item.price * item.qty)}</span>
            </article>
          ))}
        </section>
        <aside className="order-v3-aside">
          <section className="order-v3-summary">
            <h2>{t("orders.order_summary", "Order summary")}</h2>
            <dl>
              <div>
                <dt>{t("cart.subtotal", "Subtotal")}</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div>
                <dt>{t("cart.discount", "Discount")}</dt>
                <dd>-{money(order.discount)}</dd>
              </div>
              <div>
                <dt>{t("cart.delivery", "Delivery")}</dt>
                <dd>{order.deliveryFee ? money(order.deliveryFee) : t("cart.free", "Free")}</dd>
              </div>
              <div className="order-v3-total">
                <dt>{t("cart.total", "Total")}</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section className="order-v3-address">
            <h2>{t("orders.delivery_address", "Delivery address")}</h2>
            <p className="order-v3-address-name">{order.address.name}</p>
            <p>{order.address.phone}</p>
            <p>{order.address.address}, {order.address.city}</p>
            {order.paymentMethod && <p className="order-v3-payment">{order.paymentMethod}</p>}
          </section>
          {order.serverStatus === "pending" && (
            <button type="button" className={`${btnDanger} w-full`} onClick={() => setCancelOpen(true)}>
              {t("orders.cancel_order", "Cancel order")}
            </button>
          )}
        </aside>
      </div>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("orders.cancel_modal_title", "Cancel this order?")}>
        {cancelError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{cancelError}</p>}
        <p className="text-sm leading-6 text-ink-500">
          {t("orders.cancel_modal_desc", "This order can only be cancelled before it ships.")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
            {t("orders.keep_order", "Keep order")}
          </Button>
          <Button type="button" variant="danger" disabled={cancelling} onClick={cancel}>
            {cancelling ? t("orders.cancelling", "Cancelling...") : t("orders.cancel_order", "Cancel order")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function OrderConfirmed() {
  const { id } = useParams();
  const { orders, ordersLoading, ordersError } = useApp();
  const { t, language } = useLanguage();
  const order = orders.find((item) => item.id === id);
  const money = (value) => `${Number(value || 0).toLocaleString()} ${t("common.rub", "₽")}`;
  const estimated = order
    ? new Date(new Date(order.createdAt).getTime() + 4 * 86400000).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")
    : "3 to 5 business days";

  if (ordersLoading) return <p className="py-12 text-center text-sm text-ink-500">Loading order confirmation…</p>;
  if (ordersError) return <p role="alert" className="py-12 text-center text-sm text-red-700">{ordersError}</p>;
  if (!order) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <EmptyState
          title={t("common.page_not_found", "Order confirmation unavailable")}
          description={t("common.page_not_found_desc", "The order may have been cleared from this browser.")}
          icon={PackageCheck}
          action={
            <Link to="/store" className={btn}>
              {t("cart.continue_shopping", "Continue shopping")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <section className={`${card} text-center`}>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-50 text-primary-700">
          <Check size={30} />
        </span>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-primary-700">
          {t("orders.order_placed", "Order placed")}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("orders.thank_you", "Thank you for your order")}</h1>
        <p className="mt-2 text-sm text-ink-500">
          {t("orders.order_being_prepared", { id: order.id })}
        </p>
        <div className="mx-auto mt-7 max-w-md rounded-xl bg-stone-50 p-4 text-left">
          <div className="flex items-center gap-3">
            <Truck size={20} className="text-primary-700" />
            <span>
              <span className="block text-xs text-ink-500">{t("orders.estimated_delivery", "Estimated delivery")}</span>
              <strong className="mt-1 block text-sm">{estimated}</strong>
            </span>
          </div>
          <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-sm">
            <span>{order.items.length} {t("common.results", "items")}</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/orders/${order.id}`} className={btn}>
            {t("orders.track_order", "Track order")} <ArrowRight size={16} />
          </Link>
          <Link to="/store" className={btn2}>
            {t("cart.continue_shopping", "Continue shopping")}
          </Link>
        </div>
      </section>
    </div>
  );
}
