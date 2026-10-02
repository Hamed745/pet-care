export async function getBookings(currentBookings) { return currentBookings; }
export async function createBooking(currentBookings, booking) { return [{ ...booking, id: Date.now(), status: "Upcoming" }, ...currentBookings]; }
export async function updateBooking(currentBookings, id, changes) { return currentBookings.map((booking) => booking.id === id ? { ...booking, ...changes } : booking); }
export async function deleteBookingsForPet(currentBookings, petId, cancelUpcoming = true) {
	return currentBookings.map((booking) => booking.pet?.id === petId ? {
		...booking,
		status: cancelUpcoming && booking.status === "Upcoming" ? "Cancelled" : booking.status,
		pet: { ...booking.pet, vaccines: [], meds: [] },
	} : booking);
}
export async function getUpcomingBookingsForPet(currentBookings, petId) { return currentBookings.filter((booking) => booking.pet?.id === petId && booking.status === "Upcoming"); }