# PetCare clinic-branch web features

Reference: user-supplied PetCare_Clinic_Branch_Manager_Figma(1).svg (20 screens; functionality not mobile styling).

## Mapping of 20 screens
1. Clinic welcome: clinic entry /clinic.
2. Manager sign-in: existing Firebase Authentication with return to clinic portal.
3. Branch registration: clinic fields and draft save.
4. License verification: identity/license metadata and document upload interface.
5. Pending approval: status and administrator feedback.
6. Dashboard: real clinic metrics.
7. Booking requests: accept or reject.
8. Appointments: list, manual request and status.
9. Calendar: day-filtered bookings.
10. Doctors and staff: roster, roles, status.
11. Doctor profile: specialties, experience and contact.
12. Shift availability: working days and times.
13. Patient directory: branch-only list and search.
14. Patient overview: species, breed, owner, weight, allergies.
15. Medical records: branch-only visit history.
16. New visit: diagnosis, treatment, notes and descriptive lab reference.
17. Services and prices: CRUD by approved manager.
18. Analytics: persisted appointment counts and completed revenue.
19. Notifications: activity events and read status.
20. Settings: clinic contact, working hours, notification preferences.

## Admin
A new Clinics icon in the existing admin sidebar displays application data, documents, review status and approval/rejection/change requests. Server-side permissions use verified Firebase admin custom claims.

## Security constraints
- Existing ImageKit, Firebase Auth, maps, store, adoption and admin settings are retained.
- **Real identity-document uploads stay disabled** until malware scanning, quarantine, private storage and legal wording are approved; Supabase private bucket alone is insufficient. Do not test with real personal identity files.
- Staff roster names/roles are NOT Firebase credentials or medical-data authorization. Verified staff invitation and delegated access remain outside this iteration.
- The medical report attachment field is only descriptive text; do not send medical file contents to the browser API.
- Patient and medical record endpoints require the approved manager for the branch derived from the signed-in Firebase UID.
- Analytics use real appointments and completed revenue, not demo ratings.
- No special mobile architecture is introduced.

## Test commands
npm ci
npm ci --prefix admin-backend/render-api
npm test
npm run build

Integration and cross-account access tests should also run with an isolated Firebase Emulator before production publication.
