const LEGACY_KEY = "petcare-demo-v1";
const GUEST_KEY = "petcare-guest-v2";
const accountKey = (uid) => uid ? `petcare-account-v2:${uid}` : GUEST_KEY;

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function defaultAccountData(initial, uid) {
  return {
    ...initial,
    user: uid ? null : null,
    pets: [],
    bookings: [],
    reports: [],
    calendarEvents: [],
    notifications: [],
    adoptionListings: [],
    favorites: [],
    recentlyViewed: [],
    cart: [],
    orders: [],
  };
}

// A previous release stored every account in one localStorage document.
// Import only explicitly owned records. Leave the legacy key untouched as a
// backup; anonymous records must never be assigned to a signed-in account.
export function readAccountData(uid, initial) {
  const stored = readJson(accountKey(uid));
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    return { ...defaultAccountData(initial, uid), ...stored };
  }

  const base = defaultAccountData(initial, uid);
  if (!uid) return base;

  const legacy = readJson(LEGACY_KEY);
  if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return base;

  const ownedPets = (Array.isArray(legacy.pets) ? legacy.pets : [])
    .filter((pet) => pet && pet.ownerUid === uid);
  const petIds = new Set(ownedPets.map((pet) => String(pet.id)));
  const ownedBookings = (Array.isArray(legacy.bookings) ? legacy.bookings : [])
    .filter((booking) => booking && booking.ownerUid === uid && petIds.has(String(booking.pet?.id)));

  const ownerMatches = legacy.user?.uid === uid;
  return {
    ...base,
    user: ownerMatches ? legacy.user : null,
    pets: ownedPets,
    bookings: ownedBookings,
    calendarEvents: (Array.isArray(legacy.calendarEvents) ? legacy.calendarEvents : [])
      .filter((event) => event && event.ownerUid === uid && petIds.has(String(event.petId))),
    cart: ownerMatches && Array.isArray(legacy.cart) ? legacy.cart : [],
    favorites: ownerMatches && Array.isArray(legacy.favorites) ? legacy.favorites : [],
    recentlyViewed: ownerMatches && Array.isArray(legacy.recentlyViewed) ? legacy.recentlyViewed : [],
  };
}

export function getStoredAccountProfile(uid) {
  if (!uid) return null;
  const scoped = readJson(accountKey(uid));
  if (scoped?.user?.uid === uid) return scoped.user;
  const legacy = readJson(LEGACY_KEY);
  return legacy?.user?.uid === uid ? legacy.user : null;
}

// A guest may place products in the cart before being asked to log in.
// Transfer the cart to the verified Firebase UID at login; never transfer
// pets, bookings, private records, or another user's data.
export function transferGuestCart(uid, initial) {
  if (!uid) return;
  const guest = readJson(GUEST_KEY);
  if (!guest || !Array.isArray(guest.cart) || guest.cart.length === 0) return;
  const userData = readAccountData(uid, initial);
  const known = new Map((Array.isArray(userData.cart) ? userData.cart : [])
    .map((item) => [String(item.id), item]));
  for (const item of guest.cart) {
    if (!item || !item.id) continue;
    const id = String(item.id);
    if (!known.has(id)) known.set(id, item);
  }
  try {
    window.localStorage.setItem(accountKey(uid), JSON.stringify({
      ...userData, cart: [...known.values()],
    }));
    window.localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guest, cart: [] }));
  } catch {
    // Do not erase the guest cart if the account write fails.
  }
}

