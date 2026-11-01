import { useEffect, useState } from "react";
import { AlertCircle, Clock3, ExternalLink, Globe2, Mail, MapPin, Navigation, Phone, Share2 } from "lucide-react";
import { Modal } from "../../components/ui.jsx";
import { fetchNearbyPlaceDetails } from "../../services/nearbyPlaceDetailsService.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const actionClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm font-bold text-primary-800 transition hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
const mapClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

export default function PlaceDetailsModal({ place, onClose, categoryName = "" }) {
  const { isRussian } = useLanguage();
  const tr = (english, russian) => isRussian ? russian : english;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!place?.id) { setDetail(null); setError(""); return; }
    const controller = new AbortController();
    setDetail(null);
    setError("");
    setLoading(true);
    fetchNearbyPlaceDetails(place.id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setDetail(data.place);
      })
      .catch((reason) => {
        if (!controller.signal.aborted && reason.name !== "AbortError") {
          setError(reason.message || "Contact details unavailable.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [place?.id]);

  if (!place) return null;
  const current = detail || place;
  const phones = detail?.phones || [];
  const websites = detail?.websites || [];
  const socials = detail?.socials || [];
  const emails = detail?.emails || [];
  const mapUrl = detail?.mapUrl || place.url;
  const contactCount = phones.length + websites.length + socials.length + emails.length;

  return <Modal open={Boolean(place)} onClose={onClose} title={current.name} className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {categoryName && <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">{categoryName}</span>}
        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-ink-600">{tr("Information from 2GIS", "Данные 2ГИС")}</span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
        <MapPin size={20} className="mt-0.5 shrink-0 text-primary-700" />
        <div className="min-w-0">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">{tr("Address", "Адрес")}</h3>
          <p className="mt-1 break-words text-sm font-semibold text-ink-900">{current.address || tr("Address unavailable", "Адрес не указан")}</p>
          {place.distanceKm != null && <p className="mt-1 text-xs text-ink-500">{place.distanceKm.toFixed(1)} {tr("km straight-line", "км по прямой")}</p>}
          {detail?.is24x7 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-700"><Clock3 size={14}/>{tr("Listed as open 24/7 in 2GIS; confirm by phone", "По данным 2ГИС круглосуточно; уточните по телефону")}</p>}
        </div>
      </div>

      {loading && <p role="status" className="flex items-center gap-2 rounded-xl bg-primary-50 p-4 text-sm text-primary-800"><span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"/>{tr("Loading contact information...", "Загружаем контактные данные...")}</p>}

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{tr("Direct contacts are temporarily unavailable. You can still open this business in 2GIS.", "Контакты временно недоступны. Вы можете открыть организацию в 2ГИС.")}</p>}

      {!loading && detail && contactCount === 0 && <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-ink-600">
        {tr("No phone numbers or websites were provided by our 2GIS API access for this business. Open its 2GIS listing to check the latest contact details.", "Для этой организации API 2ГИС не передал телефон или сайт. Откройте карточку в 2ГИС для актуальных контактов.")}
      </p>}

      {phones.length > 0 && <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900"><Phone size={17} className="text-primary-700"/>{tr("Phone numbers", "Телефоны")}</h3>
        <div className="flex flex-wrap gap-2">
          {phones.map((phone) => <a key={phone.url} href={phone.url} className={actionClass}><Phone size={15}/>{phone.label}</a>)}
        </div>
      </section>}

      {websites.length > 0 && <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900"><Globe2 size={17} className="text-primary-700"/>{tr("Official websites listed in 2GIS", "Сайты, указанные в 2ГИС")}</h3>
        <div className="flex flex-wrap gap-2">
          {websites.map((site) => <a key={site.url} href={site.url} target="_blank" rel="noopener noreferrer" className={actionClass}><Globe2 size={15}/>{site.label}<ExternalLink size={14}/></a>)}
        </div>
        <p className="text-xs leading-5 text-ink-500">{tr("If the clinic offers online appointments, you can book on its own website. PetCare does not confirm external bookings.", "Если клиника предлагает запись онлайн, вы можете записаться на её сайте. PetCare не подтверждает внешние бронирования.")}</p>
      </section>}

      {socials.length > 0 && <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900"><Share2 size={17} className="text-primary-700"/>{tr("Social media and messengers", "Соцсети и мессенджеры")}</h3>
        <div className="flex flex-wrap gap-2">
          {socials.map((social) => <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className={actionClass}>{social.label}<ExternalLink size={14}/></a>)}
        </div>
      </section>}

      {emails.length > 0 && <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900"><Mail size={17} className="text-primary-700"/>{tr("Email", "Эл. почта")}</h3>
        <div className="flex flex-wrap gap-2">{emails.map((email) => <a key={email.url} href={email.url} className={actionClass}><Mail size={15}/>{email.label}</a>)}</div>
      </section>}

      <div className="border-t border-stone-200 pt-4">
        <p className="mb-3 text-xs leading-5 text-ink-500">{tr("This is a public 2GIS business listing, not a PetCare partner. Contact details and appointment availability are managed by the business or 2GIS.", "Это организация из каталога 2ГИС, не партнёр PetCare. Контакты и возможность записи уточняйте у организации.")}</p>
        <div className="flex flex-wrap gap-2">
          {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={mapClass}><Navigation size={16}/>{tr("Open in 2GIS / Directions", "Открыть в 2ГИС / Маршрут")}<ExternalLink size={14}/></a>}
          <button type="button" onClick={onClose} className={actionClass}>{tr("Close", "Закрыть")}</button>
        </div>
      </div>
    </div>
  </Modal>;
}
