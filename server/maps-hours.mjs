// Verification layer for opening-hours data returned by 2GIS.
// Unknown/missing schedules MUST NOT be reported as open.
import tzLookup from "@photostructure/tz-lookup";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REVERSE_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function atLocation(instant, lat, lon) {
  const tz = tzLookup(lat, lon);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(instant);
  const v = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { iso: `${v.year}-${v.month}-${v.day}`, day: v.weekday.slice(0, 3), minute: Number(v.hour) * 60 + Number(v.minute) };
}
function minutes(text) {
  if (typeof text !== "string" || !/^\d{1,2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(":").map(Number);
  return h <= 24 && m < 60 && (h < 24 || m === 0) ? 60 * h + m : null;
}
function hoursForDay(schedule, special, localDate, day) {
  const override = Array.isArray(special) ? special.find((entry) => entry?.date === localDate) : undefined;
  if (override) return Array.isArray(override.working_hours) ? override.working_hours : [];
  return schedule?.[day]?.working_hours || [];
}
function within(hours, minute, fromPreviousDay) {
  if (!Array.isArray(hours)) return false;
  return hours.some((period) => {
    if (!period || typeof period !== "object") return false;
    const start = minutes(period.from);
    const finish = minutes(period.to);
    // 2GIS sometimes represents the full day with null endpoints.
    if (start == null && finish == null && period.from == null && period.to == null) return !fromPreviousDay;
    if (start == null || finish == null) return false;
    if (fromPreviousDay) return finish <= start && minute < finish;
    if (start === finish) return false; // Ambiguous, never assume 24 hours.
    return start < finish ? minute >= start && minute < finish : minute >= start;
  });
}
export function scheduleIs247(schedule) {
  return schedule?.is_24x7 === true;
}
export function scheduleOpenNow(schedule, special, lat, lon, instant = new Date()) {
  if (!schedule || !Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  let current;
  try { current = atLocation(instant, lat, lon); } catch { return false; }
  const previousDate = new Date(`${current.iso}T00:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const prevIso = previousDate.toISOString().slice(0, 10);
  const previousDay = REVERSE_DAYS[(DAYS.indexOf(current.day) + 6) % 7];
  const todayException = Array.isArray(special) && special.some((entry) => entry?.date === current.iso);
  if (scheduleIs247(schedule) && !todayException) return true;
  const todayHours = hoursForDay(schedule, special, current.iso, current.day);
  const yesterdayHours = hoursForDay(schedule, special, prevIso, previousDay);
  return within(todayHours, current.minute, false) || within(yesterdayHours, current.minute, true);
}
export function verifiedOpening(place, mode, instant = new Date()) {
  const schedule = place?.schedule;
  const exceptions = place?.schedule_special;
  const lat = Number(place?.point?.lat);
  const lon = Number(place?.point?.lon);
  if (mode === "alltime") return scheduleIs247(schedule) && scheduleOpenNow(schedule, exceptions, lat, lon, instant) ? "24_7" : null;
  if (mode === "now") return scheduleOpenNow(schedule, exceptions, lat, lon, instant) ? "open_now" : null;
  return "unknown";
}
