import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, CalendarDays, Check, Clock3, MapPin, Star, X } from "lucide-react";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { btn, btn2, btnDanger, card, input } from "../ui.js";
import { Badge, Button, Modal, Tabs } from "../components/ui.jsx";
import PetAvatar from "../components/PetAvatar.jsx";
import { CalendarClock } from "lucide-react";

export default function Bookings() {
  const { bookings, updateBookingStatus, updateBookingDetails, submitBookingReview, user, showToast } = useApp();
  const { t, language } = useLanguage();
  const location = useLocation();
  const handledToastRef = useRef(null);
  const [tab, setTab] = useState("Upcoming");
  const [cancelId, setCancelId] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleFields, setRescheduleFields] = useState({ date: "", time: "" });
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (location.state?.toast && handledToastRef.current !== location.key) {
      handledToastRef.current = location.key;
      showToast(location.state.toast);
    }
  }, [location.key]);

  const list = bookings.filter((b) => (tab === "Upcoming") === (b.status === "Upcoming"));
  const [statusSaving, setStatusSaving] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [reviewSaving, setReviewSaving] = useState(false);

  const cancelBooking = async () => {
    setStatusSaving(true);
    try {
      await updateBookingStatus(cancelId, "Cancelled");
      setCancelId(null);
      showToast(t("bookings.booking_cancelled", "Booking cancelled."));
    } finally {
      setStatusSaving(false);
    }
  };

  const getCityName = (cityName) => {
    if (cityName === "Cairo") return t("common.cairo", "Cairo");
    if (cityName === "Giza") return t("common.giza", "Giza");
    if (cityName === "Alexandria") return t("common.alexandria", "Alexandria");
    return cityName;
  };

  if (!user) {
    return (
      <div className={`${card} mx-auto max-w-lg py-14 text-center`}>
        <CalendarDays size={30} className="mx-auto text-primary-600" />
        <h1 className="mt-4 text-2xl font-extrabold">{t("bookings.login_required", "Please log in to view bookings")}</h1>
        <p className="mt-2 text-sm text-ink-500">{t("bookings.login_sub", "Your appointments will be kept here.")}</p>
        <Link to="/login" state={{ from: "/bookings" }} className={`${btn2} mt-5`}>
          {t("nav.log_in", "Log in")}
        </Link>
      </div>
    );
  }

  const tabItems = [
    { value: "Upcoming", label: t("bookings.tab_upcoming", "Upcoming") },
    { value: "History", label: t("bookings.tab_history", "History") },
  ];

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">
          {t("bookings.schedule_tag", "Your schedule")}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">{t("bookings.title", "Bookings")}</h1>
        <p className="mt-2 text-sm text-ink-500">{t("bookings.subtitle", "Keep track of every visit and appointment.")}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="mb-6 flex gap-2 border-b border-stone-200">
            {tabItems.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`min-h-11 border-b-2 px-4 text-sm font-extrabold transition-all ${
                  tab === item.value
                    ? "border-primary-600 text-primary-800"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {list.map((booking) => (
              <article key={booking.id} className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="flex min-w-0 gap-4">
                  <PetAvatar name={booking.pet?.name || "Pet"} photo={booking.pet?.photo} className="size-12" iconSize={13} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold">{booking.provider.name}</h2>
                      <Badge variant={booking.status === "Upcoming" ? "warning" : booking.status === "Completed" ? "success" : "danger"}>
                        {t(`bookings.status_${booking.status.toLowerCase()}`, booking.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} /> {booking.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={14} /> {booking.time}
                      </span>
                      <span>{booking.pet?.name || "Pet"}</span>
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-ink-500">
                      <MapPin size={13} /> {getCityName(booking.provider.city)}
                      <span className="mx-1">·</span>
                      {booking.provider.price} {t("common.rub", "₽")}
                    </p>
                    {booking.notes && <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-ink-700">{booking.notes}</p>}
                  </div>
                </div>
                {booking.status === "Upcoming" && (
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <button
                      className={btn2}
                      onClick={() => {
                        setRescheduleFields({ date: booking.date, time: booking.time });
                        setRescheduleBooking(booking);
                      }}
                    >
                      <CalendarClock size={15} /> {t("bookings.reschedule", "Reschedule")}
                    </button>
                    <button
                      className={btn2}
                      disabled={statusSaving}
                      onClick={async () => {
                        setStatusSaving(true);
                        try {
                          await updateBookingStatus(booking.id, "Completed");
                          showToast(t("bookings.booking_completed", "Booking marked complete."));
                        } finally {
                          setStatusSaving(false);
                        }
                      }}
                    >
                      <Check size={15} /> {t("bookings.complete", "Complete")}
                    </button>
                    <button
                      disabled={statusSaving}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-2 text-sm font-semibold text-danger-600 transition hover:bg-red-50 disabled:opacity-50"
                      onClick={() => setCancelId(booking.id)}
                    >
                      <X size={15} /> {t("bookings.cancel", "Cancel")}
                    </button>
                  </div>
                )}
              </article>
            ))}
            {tab === "History" &&
              list
                .filter((booking) => booking.status === "Completed")
                .map((booking) => (
                  <article key={`review-${booking.id}`} className={`${card} flex flex-wrap items-center justify-between gap-4`}>
                    <div>
                      <h2 className="font-extrabold">{t("bookings.leave_review", "Review")} · {booking.provider.name}</h2>
                      <p className="mt-1 text-xs text-ink-500">
                        {booking.pet?.name || "Pet"} · {booking.date}
                      </p>
                      {booking.review && (
                        <p className="mt-2 text-sm text-ink-700">
                          {booking.review.rating}/5 stars{booking.review.comment ? ` · ${booking.review.comment}` : ""}
                        </p>
                      )}
                    </div>
                    {booking.review ? (
                      <Badge variant="success">{t("bookings.reviewed", "Reviewed")}</Badge>
                    ) : (
                      <button
                        type="button"
                        className={btn2}
                        onClick={() => {
                          setReviewBooking(booking);
                          setReview({ rating: 5, comment: "" });
                        }}
                      >
                        <Star size={15} /> {t("bookings.leave_review", "Leave a review")}
                      </button>
                    )}
                  </article>
                ))}
            {!list.length && (
              <div className={`${card} py-16 text-center`}>
                <CalendarDays size={30} className="mx-auto text-primary-600" />
                <h2 className="mt-4 text-lg font-extrabold">
                  {tab === "Upcoming" ? t("bookings.no_upcoming", "No upcoming bookings") : t("bookings.no_history", "No past bookings")}
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  {tab === "Upcoming" ? t("bookings.no_upcoming_sub", "Find a service and choose a time that works.") : t("bookings.no_history_sub", "Completed or cancelled appointments will appear here.")}
                </p>
                {tab === "Upcoming" ? (
                  <Link to="/services" className={`${btn} mt-5`}>
                    {t("bookings.book_service", "Book a service")}
                  </Link>
                ) : (
                  <button className={`${btn2} mt-5`} onClick={() => setTab("Upcoming")}>
                    {t("bookings.view_upcoming", "View upcoming bookings")}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className={`${card} border-t-2 border-t-primary-600`}>
            <p className="text-xs font-bold uppercase text-ink-500">{t("bookings.activity_tag", "Your care activity")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-stone-50 p-3">
                <span className="block text-2xl font-extrabold text-primary-700">
                  {bookings.filter((booking) => booking.status === "Upcoming").length}
                </span>
                <span className="mt-1 block text-xs text-ink-500">{t("bookings.upcoming_count", "Upcoming")}</span>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <span className="block text-2xl font-extrabold">
                  {bookings.filter((booking) => booking.status === "Completed").length}
                </span>
                <span className="mt-1 block text-xs text-ink-500">{t("bookings.completed_count", "Completed")}</span>
              </div>
            </div>
          </section>
          <section className={card}>
            <h2 className="text-sm font-bold">{t("bookings.plan_next_visit", "Plan your next visit")}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              {t("bookings.plan_desc", "Find trusted care or review upcoming pet reminders.")}
            </p>
            <div className="mt-4 grid gap-2">
              <Link to="/services" className={`${btn} w-full`}>
                <CalendarDays size={16} /> {t("home.book_a_service", "Find a service")}
              </Link>
              <Link to="/calendar" className={`${btn2} w-full`}>
                <CalendarClock size={16} /> {t("home.open_calendar", "Open calendar")}
              </Link>
            </div>
          </section>
        </aside>
      </div>
      <Modal open={cancelId !== null} onClose={() => setCancelId(null)} title={t("bookings.cancel_modal_title", "Cancel this booking?")}>
        <p className="text-sm leading-6 text-ink-500">
          {t("bookings.cancel_modal_desc", "This appointment will move to your booking history as cancelled.")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className={btn2} onClick={() => setCancelId(null)}>
            {t("bookings.keep_booking", "Keep booking")}
          </button>
          <button disabled={statusSaving} className={btnDanger} onClick={cancelBooking}>
            {statusSaving ? t("orders.cancelling", "Cancelling...") : t("bookings.cancel_booking", "Cancel booking")}
          </button>
        </div>
      </Modal>
      <Modal open={Boolean(rescheduleBooking)} onClose={() => setRescheduleBooking(null)} title={t("bookings.reschedule_modal_title", "Reschedule booking")}>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setRescheduling(true);
            try {
              await updateBookingDetails(rescheduleBooking.id, rescheduleFields);
              setRescheduleBooking(null);
              showToast(t("bookings.rescheduled", "Booking rescheduled."));
            } finally {
              setRescheduling(false);
            }
          }}
        >
          <label className="block text-xs font-bold">
            {t("bookings.new_date", "New date")}
            <input
              required
              type="date"
              className={`${input} mt-2`}
              value={rescheduleFields.date}
              onChange={(event) => setRescheduleFields((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label className="block text-xs font-bold">
            {t("bookings.new_time", "New time")}
            <input
              required
              type="time"
              className={`${input} mt-2`}
              value={rescheduleFields.time}
              onChange={(event) => setRescheduleFields((current) => ({ ...current, time: event.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={btn2} onClick={() => setRescheduleBooking(null)}>
              {t("bookings.keep_current_time", "Keep current time")}
            </button>
            <button disabled={rescheduling} className={btn}>
              {rescheduling ? t("common.saving", "Saving...") : t("bookings.save_time", "Save time")}
            </button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(reviewBooking)} onClose={() => setReviewBooking(null)} title={t("bookings.review_title", "Review your appointment")}>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setReviewSaving(true);
            try {
              await submitBookingReview(reviewBooking.id, review);
              setReviewBooking(null);
              showToast(t("bookings.reviewed", "Review submitted."));
            } finally {
              setReviewSaving(false);
            }
          }}
        >
          <fieldset>
            <legend className="text-xs font-bold">{t("bookings.rating", "Rating")}</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  aria-label={`${rating} stars`}
                  aria-pressed={review.rating === rating}
                  onClick={() => setReview((current) => ({ ...current, rating }))}
                  className={`grid size-10 place-items-center rounded-lg ${
                    review.rating >= rating ? "bg-accent-50 text-accent-500" : "bg-stone-50 text-ink-500"
                  }`}
                >
                  <Star size={18} fill={review.rating >= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-bold">
            {t("bookings.comment", "Comment")}
            <textarea
              rows="4"
              className={`${input} mt-2`}
              value={review.comment}
              onChange={(event) => setReview((current) => ({ ...current, comment: event.target.value }))}
            />
          </label>
          <div className="flex justify-end">
            <Button disabled={reviewSaving}>
              {reviewSaving ? t("common.saving", "Submitting...") : t("bookings.submit_review", "Submit review")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
