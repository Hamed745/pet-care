# Clinic-only workspace and home navigation

Clinic managers now see a dedicated clinic workspace, not the pet-owner storefront.
- Clinic role discovery uses the signed-in Firebase user's UID and the server's GET /api/clinics/mine response, not an editable dropdown. A UID-scoped signup-intent hint keeps new clinic applicants in their own workflow before they save a draft, but never grants permissions.
- When a clinic application exists (draft, pending, approved, suspended etc.) the public Home, store, adoption, pets, wishlist, cart, normal bookings, owner footer, floating AI chat and mobile consumer menus are not rendered. Entering a public URL redirects to /clinic.
- Clinic brand and Home go to /clinic. Requests, appointments, calendar, services and settings use section query parameters and work across browser navigation and reload. Language (EN/RU) and signout remain accessible in the clinic header.
- Approved clinic dashboard navigation is deliberately short: Dashboard, booking requests, appointments, calendar, services/pricing, settings. Existing team/medical/patient modules and protected APIs remain in the repository, but they do not appear in the basic manager's menu.
- Clinic manager may select a final booking date and time while accepting a pending request; the backend checks clinic-local future time, hours, overlaps and UID-owned branch permissions before atomically reserving that slot and updating the owner-visible request.
- Account type checks fail closed if the clinic API cannot be reached, rather than displaying an owner dashboard until role discovery completes.
- Pet owner and verified admin routes are preserved. Existing ImageKit, Firebase, Supabase, store and maps implementation is unchanged.

Validation: isolated backend tests and static navigation regressions, production build, plus browser smoke test of clinic-versus-pet-owner menus, fresh clinic signup, signout, refresh and attempted navigation to /store or /adoption. No real identity documents.
