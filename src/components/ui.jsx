import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Check, Info, Star, X } from "lucide-react";
import { Link } from "react-router-dom";

const buttonStyles = {
  primary: "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md",
  secondary: "border border-primary-100 bg-white text-primary-700 hover:border-primary-500 hover:bg-primary-50",
  ghost: "text-ink-700 hover:bg-stone-100",
  danger: "bg-danger-600 text-white hover:bg-red-700",
};
const buttonSizes = { sm: "min-h-9 px-3 text-xs", md: "min-h-11 px-5 text-sm", lg: "min-h-12 px-6 text-sm" };

export function Button({ variant = "primary", size = "md", loading = false, disabled = false, className = "", children, ...props }) {
  return <button disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 disabled:pointer-events-none disabled:opacity-50 ${buttonStyles[variant] || buttonStyles.primary} ${buttonSizes[size] || buttonSizes.md} ${className}`} {...props}>{loading && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}{children}</button>;
}

function FormControl({ as: Element = "input", label, error, id, className = "", ...props }) {
  const generatedId = useId();
  const controlId = id || generatedId;
  return <div className="w-full"><label htmlFor={controlId} className="mb-2 block text-xs font-bold text-ink-700">{label}</label><Element id={controlId} aria-invalid={Boolean(error)} aria-describedby={error ? `${controlId}-error` : undefined} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-stone-400 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 ${error ? "border-danger-600" : "border-stone-300"} ${className}`} {...props} />{error && <p id={`${controlId}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-danger-600"><AlertCircle size={13} />{error}</p>}</div>;
}

export const Input = (props) => <FormControl as="input" {...props} />;
export const Select = (props) => <FormControl as="select" {...props} />;
export const Textarea = (props) => <FormControl as="textarea" {...props} />;

export function Card({ as: Element = "div", className = "", children, ...props }) {
  return <Element className={`rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_-22px_rgba(23,49,47,0.28)] ${className}`} {...props}>{children}</Element>;
}

const badgeStyles = {
  neutral: "bg-stone-100 text-ink-700",
  success: "bg-primary-50 text-primary-700",
  warning: "bg-accent-50 text-amber-800",
  danger: "bg-red-50 text-danger-600",
};
export function Badge({ variant = "neutral", className = "", children, ...props }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeStyles[variant] || badgeStyles.neutral} ${className}`} {...props}>{children}</span>;
}

export function Tabs({ items, value, onChange, label = "Sections", className = "" }) {
  return <div role="tablist" aria-label={label} className={`inline-flex gap-1 rounded-xl bg-stone-100 p-1 ${className}`}>{items.map((item) => { const itemValue = typeof item === "string" ? item : item.value; const text = typeof item === "string" ? item : item.label; return <button key={itemValue} type="button" role="tab" aria-selected={value === itemValue} onClick={() => onChange(itemValue)} className={`min-h-10 rounded-lg px-4 text-sm font-bold transition ${value === itemValue ? "bg-white text-primary-700 shadow-sm" : "text-ink-500 hover:text-ink-900"}`}>{text}</button>; })}</div>;
}

export function Modal({ open, onClose, title, children, className = "" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    requestAnimationFrame(() => dialog?.querySelector(focusableSelector)?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current?.(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(dialog?.querySelectorAll(focusableSelector) || [])].filter((element) => element.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); requestAnimationFrame(() => previousFocus?.isConnected && previousFocus.focus()); };
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-900/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current?.(); }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`my-4 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ${className}`}><div className="mb-5 flex items-start justify-between gap-4"><h2 className="text-xl font-extrabold">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-stone-100"><X size={19} /></button></div>{children}</section></div>;
}

export function Drawer({ open, onClose, title, children, side = "right" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-ink-900/40" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><aside role="dialog" aria-modal="true" aria-label={title} className={`absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl`}><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-extrabold">{title}</h2><button aria-label="Close drawer" onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-stone-100"><X size={19} /></button></div>{children}</aside></div>;
}

export function Rating({ value, count, className = "" }) {
  return <span className={`inline-flex items-center gap-1 text-sm font-bold ${className}`} aria-label={`${value} out of 5 stars${count === undefined ? "" : `, ${count} reviews`}`}><Star size={15} fill="currentColor" className="text-accent-500" />{value}{count !== undefined && <span className="font-normal text-ink-500">({count})</span>}</span>;
}

export function EmptyState({ title, description, icon: Icon, action, className = "" }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center ${className}`}>{Icon && <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-700"><Icon size={24} /></span>}<h2 className="mt-4 text-lg font-extrabold">{title}</h2>{description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-stone-200 ${className}`} />;
}

export function PageHeader({ title, eyebrow, description, breadcrumb, action }) {
  return <header className="mb-8 flex flex-wrap items-end justify-between gap-4">{breadcrumb && <nav aria-label="Breadcrumb" className="mb-1 w-full text-xs font-semibold text-ink-500">{breadcrumb}</nav>}<div>{eyebrow && <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{eyebrow}</p>}<h1 className="mt-2 text-3xl font-extrabold">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{description}</p>}</div>{action}</header>;
}

export function SectionTitle({ title, description, action, className = "" }) {
  return <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${className}`}><div><h2 className="text-xl font-extrabold">{title}</h2>{description && <p className="mt-1 text-sm text-ink-500">{description}</p>}</div>{action}</div>;
}

function ToastItem({ item, onDismiss }) {
  const timerRef = useRef(null);
  const remainingRef = useRef(4000);
  const startedRef = useRef(0);
  const pausedRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const iconMap = { success: [Check, "text-accent-400"], danger: [AlertTriangle, "text-red-300"], info: [Info, "text-sky-300"] };
  const [Icon, iconColor] = iconMap[item.variant] || iconMap.success;
  const pause = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (startedRef.current) remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedRef.current));
    startedRef.current = 0;
  };
  const startTimer = () => {
    if (pausedRef.current || timerRef.current) return;
    startedRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onDismiss(item.id), remainingRef.current);
  };
  useEffect(() => { startTimer(); return () => window.clearTimeout(timerRef.current); }, [item.id]);
  const resume = () => { pausedRef.current = false; startTimer(); };
  const syncPause = () => { if (hoveredRef.current || focusedRef.current) pause(); else resume(); };
  const action = item.action?.to ? <Link to={item.action.to} onClick={item.action.onClick} className="shrink-0 text-xs font-extrabold text-accent-400 underline underline-offset-2">{item.action.label}</Link> : item.action?.onClick ? <button type="button" onClick={item.action.onClick} className="shrink-0 text-xs font-extrabold text-accent-400 underline underline-offset-2">{item.action.label}</button> : null;
  return <div role="status" aria-live="polite" onMouseEnter={() => { hoveredRef.current = true; syncPause(); }} onMouseLeave={() => { hoveredRef.current = false; syncPause(); }} onFocus={() => { focusedRef.current = true; syncPause(); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { focusedRef.current = false; syncPause(); } }} className="toast-enter flex w-full items-start gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
    <Icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${iconColor}`} />
    <span className="min-w-0 flex-1">{item.message}</span>{action}
    <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)} className="-mr-2 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"><X size={14} /></button>
  </div>;
}

export function ToastStack({ items = [], onDismiss }) {
  if (!items.length) return null;
  return <div aria-label="Notifications" className="fixed inset-x-3 top-[84px] z-[70] mx-auto flex max-w-[360px] flex-col gap-2 sm:inset-x-auto sm:right-4 sm:mx-0">
    {items.slice(0, 3).map((item) => <ToastItem key={item.id} item={item} onDismiss={onDismiss} />)}
  </div>;
}

export function Toast({ message, onClose, variant = "success" }) {
  if (!message) return null;
  return <ToastStack items={[{ id: "single-toast", message, variant }]} onDismiss={onClose || (() => {})} />;
}