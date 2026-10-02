import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { useApp } from "../store.jsx";
import { btn, btn2, btnDanger, card } from "../ui.js";
import { Badge, Button, EmptyState, Modal } from "../components/ui.jsx";
import { OrderTimeline, ProductImage } from "../components/store/StoreComponents.jsx";

const money = (value) => `${Number(value || 0).toLocaleString()} EGP`;
const statusStyle = { Preparing: "warning", Shipped: "success", Delivered: "success", Cancelled: "danger" };

export function Orders() {
  const { user, orders } = useApp();
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view your orders" description="Your order history and delivery updates are saved here." icon={ShoppingBag} action={<Link to="/login" state={{ from: "/orders" }} className={btn}>Log in</Link>} /></div>;
  return <div><header className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Your purchases</p><h1 className="mt-2 text-3xl font-extrabold">Orders</h1></header>{orders.length ? <div className="space-y-4">{orders.map((order) => <article key={order.id} className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}><div className="flex min-w-0 items-center gap-4"><div className="flex -space-x-2">{order.items.slice(0, 3).map((item, index) => <ProductImage key={`${order.id}-${item.id}-${index}`} src={item.image || item.images?.[0]} alt={item.name} category={item.category} className="size-12 rounded-lg border-2 border-white object-cover" />)}</div><div><p className="text-sm font-extrabold">Order {order.id}</p><p className="mt-1 text-xs text-ink-500">{new Date(order.createdAt).toLocaleDateString()} · {order.items.length} items · {money(order.total)}</p></div></div><div className="flex items-center justify-between gap-3"><Badge variant={statusStyle[order.status] || "neutral"}>{order.status}</Badge><Link to={`/orders/${order.id}`} className={`${btn2} min-h-9 px-3 text-xs`}>View order <ArrowRight size={14} /></Link></div></article>)}</div> : <EmptyState title="No orders yet" description="Completed purchases will appear here with their delivery status." icon={PackageCheck} action={<Link to="/store" className={btn}>Shop supplies</Link>} />}</div>;
}

export function OrderDetails() {
  const { id } = useParams();
  const { user, orders, cancelStoreOrder } = useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const order = orders.find((item) => item.id === id);
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view this order" description="Sign in to see items, delivery details, and order progress." icon={ShoppingBag} action={<Link to="/login" state={{ from: `/orders/${id}` }} className={btn}>Log in</Link>} /></div>;
  if (!order) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Order not found" description="We could not find this order in your local order history." icon={PackageCheck} action={<Link to="/orders" className={btn}>Back to orders</Link>} /></div>;
  const cancel = async () => { setCancelling(true); try { await cancelStoreOrder(order.id); setCancelOpen(false); } finally { setCancelling(false); } };
  return <div><Link to="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> Orders</Link><header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Order details</p><h1 className="mt-2 text-3xl font-extrabold">{order.id}</h1><p className="mt-2 text-sm text-ink-500">Placed {new Date(order.createdAt).toLocaleDateString()}</p></div><Badge variant={statusStyle[order.status] || "neutral"}>{order.status}</Badge></header>
    <div className={`${card} mb-5`}><h2 className="mb-5 text-base font-extrabold">Delivery progress</h2><OrderTimeline status={order.status} /></div>
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]"><section className="space-y-3">{order.items.map((item, index) => <article key={`${item.id}-${index}`} className={`${card} flex items-center gap-4`}><ProductImage src={item.image || item.images?.[0]} alt={item.name} category={item.category} className="size-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><h2 className="text-sm font-extrabold">{item.name}</h2><p className="mt-1 text-xs text-ink-500">{item.variant?.label ? `${item.variant.label} · ` : ""}Qty {item.qty}</p></div><span className="text-sm font-extrabold">{money(item.price * item.qty)}</span></article>)}</section>
      <aside className="space-y-4"><section className={card}><h2 className="text-base font-extrabold">Order summary</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between text-ink-500"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div className="flex justify-between text-ink-500"><dt>Discount</dt><dd>-{money(order.discount)}</dd></div><div className="flex justify-between text-ink-500"><dt>Delivery</dt><dd>{order.deliveryFee ? money(order.deliveryFee) : "Free"}</dd></div><div className="flex justify-between border-t border-stone-100 pt-3 font-extrabold text-ink-900"><dt>Total</dt><dd>{money(order.total)}</dd></div></dl></section><section className={card}><h2 className="text-base font-extrabold">Delivery address</h2><p className="mt-3 text-sm font-bold">{order.address.name}</p><p className="mt-1 text-sm text-ink-500">{order.address.phone}</p><p className="mt-1 text-sm text-ink-500">{order.address.address}, {order.address.city}</p>{order.paymentMethod && <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-ink-500">{order.paymentMethod}</p>}</section>{order.status === "Preparing" && <button type="button" className={`${btnDanger} w-full`} onClick={() => setCancelOpen(true)}>Cancel order</button>}</aside></div>
    <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?"><p className="text-sm leading-6 text-ink-500">This order can only be cancelled before it ships.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>Keep order</Button><Button type="button" variant="danger" disabled={cancelling} onClick={cancel}>{cancelling ? "Cancelling..." : "Cancel order"}</Button></div></Modal>
  </div>;
}

export function OrderConfirmed() {
  const { id } = useParams();
  const { orders } = useApp();
  const order = orders.find((item) => item.id === id);
  const estimated = order ? new Date(new Date(order.createdAt).getTime() + 4 * 86400000).toLocaleDateString() : "3 to 5 business days";
  if (!order) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Order confirmation unavailable" description="The order may have been cleared from this browser." icon={PackageCheck} action={<Link to="/store" className={btn}>Continue shopping</Link>} /></div>;
  return <div className="mx-auto max-w-2xl py-6"><section className={`${card} text-center`}><span className="mx-auto grid size-16 place-items-center rounded-full bg-primary-50 text-primary-700"><Check size={30} /></span><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-primary-700">Order placed</p><h1 className="mt-2 text-3xl font-extrabold">Thank you for your order</h1><p className="mt-2 text-sm text-ink-500">Your order <strong className="text-ink-900">{order.id}</strong> is being prepared.</p><div className="mx-auto mt-7 max-w-md rounded-xl bg-stone-50 p-4 text-left"><div className="flex items-center gap-3"><Truck size={20} className="text-primary-700" /><span><span className="block text-xs text-ink-500">Estimated delivery</span><strong className="mt-1 block text-sm">{estimated}</strong></span></div><div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-sm"><span>{order.items.length} items</span><strong>{money(order.total)}</strong></div></div><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to={`/orders/${order.id}`} className={btn}>Track order <ArrowRight size={16} /></Link><Link to="/store" className={btn2}>Continue shopping</Link></div></section></div>;
}
