export async function getUser(user) { return user; }
export async function updateUser(_currentUser, user) { return user; }
export async function clearDemoData() { return { user: null, pets: [], bookings: [], cart: [], reports: [], calendarEvents: [], notifications: [], adoptionListings: [], favorites: [], recentlyViewed: [], orders: [], storeSort: "featured" }; }