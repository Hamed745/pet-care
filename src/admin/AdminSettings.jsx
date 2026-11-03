import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, CreditCard, Database, Globe2, HelpCircle, LoaderCircle, LockKeyhole, Mail, PackageCheck, Percent, RefreshCw, RotateCcw, Save, Server, ShieldCheck, SlidersHorizontal, Truck } from "lucide-react";
import { adminApi } from "./adminApi.js";

const translations = {
  en: {
    title: "Platform configuration",
    desc: "Saved to Firestore with server-verified admin permissions and an audit trail.",
    active: "Live setting",
    future: "Not active yet",
    general: "General & Support",
    generalDesc: "Admin contact reference. Public profile display is not connected yet.",
    name: "Platform name",
    supportEmail: "Support email",
    supportPhone: "Support phone",
    shipping: "Orders & Delivery",
    shippingDesc: "These delivery settings affect real checkout totals for newly placed orders.",
    fee: "Standard delivery fee (₽)",
    threshold: "Free delivery from (₽)",
    thresholdHelp: "Set to 0 for free delivery on all orders. Existing orders keep their original fees.",
    cod: "Cash on delivery",
    codNote: "Only actual payment method supported by the order API.",
    visa: "Visa preview",
    visaNote: "Demo only — no real payment or order is created.",
    notif: "Notifications",
    notifDesc: "Server-wide automatic push for newly placed orders. Individual admins still need to enable browser notifications on the Notifications page.",
    push: "Send automatic new-order push notifications",
    verify: "Verification & Approvals",
    verifyDesc: "Clinic, store and service-provider onboarding rules will become editable once their approval workflows are implemented. Nothing can be toggled here yet.",
    commission: "Commission Settings",
    commissionDesc: "Future commission percentages are not collected yet. Do not set pretend live rates until provider billing is implemented.",
    security: "Security",
    securityDesc: "Admin access is verified server-side from Firebase custom claims. API keys remain in hosting environment variables; they cannot be viewed here.",
    status: "System Status",
    statusDesc: "Live checks from the authenticated backend. External services may need separate verification.",
    backend: "Backend",
    database: "Firestore",
    imagekit: "ImageKit",
    maps: "2GIS Maps",
    online: "Connected",
    configured: "Configured (not verified)",
    notConfigured: "Not configured",
    unknown: "Not checked",
    mapsNote: "2GIS uses its own API and MapGL keys. Check the map page and hosting settings separately.",
    check: "Check connection",
    audit: "Last saved",
    by: "by",
    unsaved: "Unsaved changes",
    saved: "Settings saved to Firestore. New delivery rules are now effective.",
    save: "Save settings",
    saving: "Saving…",
    reset: "Discard changes",
    load: "Loading settings…",
    refresh: "Reload from server",
    err: "Could not load settings.",
    conflict: "Settings changed elsewhere. Reload the latest version before saving.",
  },
  ru: {
    title: "Настройки платформы",
    desc: "Сохранение в Firestore с проверкой прав администратора и журналом изменений.",
    active: "Работает",
    future: "Пока не активно",
    general: "Общие настройки и поддержка",
    generalDesc: "Контакты для администраторов. Публикация в профиле пока не подключена.",
    name: "Название платформы",
    supportEmail: "Электронная почта поддержки",
    supportPhone: "Телефон поддержки",
    shipping: "Заказы и доставка",
    shippingDesc: "Настройки доставки влияют на итоговую сумму новых заказов.",
    fee: "Стоимость доставки (₽)",
    threshold: "Бесплатная доставка от (₽)",
    thresholdHelp: "0 — бесплатная доставка для всех заказов. Старые заказы не изменятся.",
    cod: "Оплата при получении",
    codNote: "Единственный реальный способ оплаты в API заказов.",
    visa: "Демо Visa",
    visaNote: "Только демонстрация — без оплаты и оформления заказа.",
    notif: "Уведомления",
    notifDesc: "Автоматические push-уведомления о новых заказах. Каждый администратор отдельно включает уведомления в разделе «Уведомления».",
    push: "Отправлять push о новых заказах",
    verify: "Проверка и одобрение",
    verifyDesc: "Настройки регистрации клиник, магазинов и услуг станут доступны после внедрения их процессов проверки.",
    commission: "Комиссии",
    commissionDesc: "Комиссии пока не начисляются. Здесь нельзя устанавливать фиктивные действующие ставки.",
    security: "Безопасность",
    securityDesc: "Права администратора проверяются сервером по Firebase custom claims. Секретные ключи хранятся только в переменных окружения.",
    status: "Состояние системы",
    statusDesc: "Проверки через защищённый сервер. Внешние сервисы проверяются отдельно.",
    backend: "Сервер API",
    database: "Firestore",
    imagekit: "ImageKit",
    maps: "Карты 2ГИС",
    online: "Подключено",
    configured: "Настроено (не проверено)",
    notConfigured: "Не настроено",
    unknown: "Не проверено",
    mapsNote: "У 2ГИС отдельные ключи API и MapGL. Проверяйте страницу карты и настройки хостинга.",
    check: "Проверить",
    audit: "Последнее сохранение",
    by: "пользователем",
    unsaved: "Несохранённые изменения",
    saved: "Настройки сохранены в Firestore. Новые правила доставки уже действуют.",
    save: "Сохранить",
    saving: "Сохранение…",
    reset: "Отменить изменения",
    load: "Загрузка настроек…",
    refresh: "Загрузить с сервера",
    err: "Не удалось загрузить настройки.",
    conflict: "Настройки изменились в другой сессии. Загрузите актуальную версию.",
  },
};

const formFromSettings = (settings) => ({
  displayName: settings.general.displayName,
  supportEmail: settings.general.supportEmail,
  supportPhone: settings.general.supportPhone,
  deliveryFee: String(settings.checkout.deliveryFee),
  freeDeliveryThreshold: String(settings.checkout.freeDeliveryThreshold),
  newOrderPush: settings.notifications.newOrderPush,
});

const effectiveForm = (form) => ({
  general: {
    displayName: form.displayName.trim(),
    supportEmail: form.supportEmail.trim(),
    supportPhone: form.supportPhone.trim(),
  },
  checkout: {
    deliveryFee: Number(form.deliveryFee),
    freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
  },
  notifications: {
    newOrderPush: form.newOrderPush,
  },
});

const Heading = ({ Icon, title, description, badge }) => (
  <header className="pa-settings-heading">
    <span className="pa-settings-icon"><Icon size={20} aria-hidden="true"/></span>
    <div className="pa-settings-head-copy">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {badge && <span className="pa-settings-badge">{badge}</span>}
  </header>
);

function Indicator({ label, value, state, Icon }) {
  return <div className="pa-settings-indicator">
    <Icon size={19} aria-hidden="true" />
    <div><strong>{label}</strong><span>{value}</span></div>
    <span aria-label={value} className={`pa-settings-dot ${state === "good" ? "is-good" : "is-neutral"}`}/>
  </div>;
}

export default function AdminSettings({ data, language, onReload }) {
  const tx = translations[language === "ru" ? "ru" : "en"];
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const settings = data?.settings;
  useEffect(() => {
    if (!settings) return;
    setForm(formFromSettings(settings));
    setMessage("");
    setError("");
  }, [data?.version, settings === undefined]);

  const dirty = useMemo(() => form && settings &&
    JSON.stringify(effectiveForm(form)) !== JSON.stringify(settings), [form, settings]);

  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError("");
    try { setStatus(await adminApi.systemStatus()); }
    catch (reason) { setStatus(null); setStatusError(reason.message || "Status unavailable."); }
    finally { setStatusLoading(false); }
  };

  useEffect(() => { checkStatus(); }, []);

  const set = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setMessage("");
    setError("");
  };

  const onSave = async (event) => {
    event.preventDefault();
    if (!settings || !form || !dirty || saving) return;
    const next = effectiveForm(form);
    if (!Number.isInteger(next.checkout.deliveryFee) ||
        !Number.isInteger(next.checkout.freeDeliveryThreshold) ||
        next.checkout.deliveryFee < 0 || next.checkout.freeDeliveryThreshold < 0) {
      setError(language === "ru" ? "Введите неотрицательные целые числа." : "Enter non-negative whole numbers.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    try {
      await adminApi.updateSettings(next, data.version);
      await onReload();
      setMessage(tx.saved);
    } catch (reason) {
      setError(/changed in another admin session|409/.test(reason.message || "") ? tx.conflict : reason.message || tx.err);
    } finally { setSaving(false); }
  };

  if (!settings || !form) return <section className="pa-card"><p role="status" className="pa-settings-loading"><LoaderCircle size={18} className="animate-spin" />{tx.load}</p></section>;

  return <div className="pa-settings">
    <div className="pa-settings-intro">
      <div><p className="pa-eyebrow">PETCARE / CONFIGURATION</p><h2>{tx.title}</h2><p>{tx.desc}</p></div>
      <button type="button" className="pa-outline-button" onClick={onReload} disabled={saving}><RefreshCw size={16}/>{tx.refresh}</button>
    </div>

    {error && <div className="pa-alert pa-error" role="alert"><CircleAlert size={18}/><span>{error}</span></div>}
    {message && <div className="pa-alert pa-ok" role="status"><CheckCircle2 size={18}/><span>{message}</span></div>}

    <form onSubmit={onSave}>
      <div className="pa-settings-grid">
        <section className="pa-card">
          <Heading Icon={SlidersHorizontal} title={tx.general} description={tx.generalDesc} badge={tx.active}/>
          <label className="pa-form-field">{tx.name}<input required minLength={2} maxLength={80} value={form.displayName} onChange={(e)=>set("displayName",e.target.value)}/></label>
          <div className="pa-fields-two">
            <label className="pa-form-field">{tx.supportEmail}<input type="email" maxLength={160} placeholder="support@example.org" value={form.supportEmail} onChange={(e)=>set("supportEmail",e.target.value)}/></label>
            <label className="pa-form-field">{tx.supportPhone}<input type="tel" maxLength={40} placeholder="+7 ..." value={form.supportPhone} onChange={(e)=>set("supportPhone",e.target.value)}/></label>
          </div>
        </section>

        <section className="pa-card">
          <Heading Icon={Truck} title={tx.shipping} description={tx.shippingDesc} badge={tx.active}/>
          <div className="pa-fields-two">
            <label className="pa-form-field">{tx.fee}<input type="number" min="0" max="100000" step="1" required value={form.deliveryFee} onChange={(e)=>set("deliveryFee",e.target.value)}/></label>
            <label className="pa-form-field">{tx.threshold}<input type="number" min="0" max="10000000" step="1" required value={form.freeDeliveryThreshold} onChange={(e)=>set("freeDeliveryThreshold",e.target.value)}/></label>
          </div>
          <p className="pa-muted">{tx.thresholdHelp}</p>
          <div className="pa-settings-row"><PackageCheck size={18}/><div><strong>{tx.cod}</strong><small>{tx.codNote}</small></div><LockKeyhole size={17}/></div>
          <div className="pa-settings-row"><CreditCard size={18}/><div><strong>{tx.visa}</strong><small>{tx.visaNote}</small></div><LockKeyhole size={17}/></div>
        </section>

        <section className="pa-card">
          <Heading Icon={BellRing} title={tx.notif} description={tx.notifDesc} badge={tx.active}/>
          <label className="pa-settings-switch"><input type="checkbox" checked={form.newOrderPush} onChange={(e)=>set("newOrderPush",e.target.checked)}/><span>{tx.push}</span></label>
        </section>

        <section className="pa-card">
          <Heading Icon={ShieldCheck} title={tx.security} description={tx.securityDesc}/>
          <div className="pa-settings-row"><LockKeyhole size={18}/><div><strong>Firebase custom claim</strong><small>petcareAdmin = true</small></div><CheckCircle2 size={17}/></div>
        </section>

        <section className="pa-card">
          <Heading Icon={PackageCheck} title={tx.verify} description={tx.verifyDesc} badge={tx.future}/>
          <div className="pa-settings-coming"><HelpCircle size={18}/><span>{tx.future}</span></div>
        </section>

        <section className="pa-card">
          <Heading Icon={Percent} title={tx.commission} description={tx.commissionDesc} badge={tx.future}/>
          <div className="pa-settings-coming"><HelpCircle size={18}/><span>{tx.future}</span></div>
        </section>
      </div>

      <div className="pa-settings-actions">
        <div>{dirty && <p className="pa-settings-unsaved"><CircleAlert size={15}/>{tx.unsaved}</p>}
          <small>{tx.audit}: {data.updatedAt ? new Date(data.updatedAt).toLocaleString(language === "ru" ? "ru-RU" : "en-GB") : "—"} {data.updatedBy ? `${tx.by} ${data.updatedBy.slice(0, 10)}…` : ""}</small></div>
        <div className="pa-settings-actions-buttons">
          <button type="button" className="pa-outline-button" disabled={!dirty || saving} onClick={()=>{setForm(formFromSettings(settings));setError("");setMessage("");}}><RotateCcw size={15}/>{tx.reset}</button>
          <button type="submit" className="pa-primary-button" disabled={!dirty || saving}>{saving ? <LoaderCircle size={15} className="animate-spin"/> : <Save size={15}/>} {saving ? tx.saving : tx.save}</button>
        </div>
      </div>
    </form>

    <section className="pa-card pa-settings-status">
      <div className="pa-settings-status-heading"><Heading Icon={Server} title={tx.status} description={tx.statusDesc}/><button type="button" className="pa-outline-button" onClick={checkStatus} disabled={statusLoading}>{statusLoading ? <LoaderCircle size={16} className="animate-spin"/> : <RefreshCw size={16}/>} {tx.check}</button></div>
      {statusError && <p className="pa-form-error" role="alert">{statusError}</p>}
      <div className="pa-settings-status-grid">
        <Indicator Icon={Server} label={tx.backend} value={status?.backend?.reachable ? tx.online : tx.unknown} state={status?.backend?.reachable ? "good" : "neutral"}/>
        <Indicator Icon={Database} label={tx.database} value={status?.firestore?.reachable ? tx.online : tx.unknown} state={status?.firestore?.reachable ? "good" : "neutral"}/>
        <Indicator Icon={Mail} label={tx.imagekit} value={status?.imagekit?.configured === true ? tx.configured : status?.imagekit?.configured === false ? tx.notConfigured : tx.unknown} state="neutral"/>
        <Indicator Icon={Globe2} label={tx.maps} value={tx.unknown} state="neutral"/>
      </div>
      <p className="pa-muted">{tx.mapsNote}</p>
    </section>
  </div>;
}
