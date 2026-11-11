# PetCare clinic onboarding MVP

This branch adds the first end-to-end PetCare-managed veterinary clinic workflow. It does not change external 2GIS search or payment processing.

## Browser routes

- `/clinic`: Signed-in clinic manager registration, review status, service configuration and appointment decisions.
- `/nearby/our/veterinary`: Public directory of approved PetCare clinics, appointment requests and the signed-in pet owner's requests.
- `/admin`: New **Clinics** review section, accessible only to a Firebase user with the existing `petcareAdmin` custom claim.
- `/nearby/veterinary`: Existing external 2GIS directory; those entries cannot receive PetCare bookings.

## Backend

Routes are registered in `admin-backend/render-api/clinics.cjs` by the existing Express/Firebase Admin API.

1. A Firebase-authenticated manager submits clinic details and three small verification images.
2. The documents stay in a server-access-only Firestore subcollection, rather than being exposed on the public clinic response.
3. Only an authorized PetCare administrator can view verification documents and approve, reject, request corrections or suspend a clinic.
4. Pending and rejected clinics never appear in the directory and cannot receive appointments. An approved manager can publish services.
5. A signed-in pet owner can request an appointment only for a pet held under their own server-side Firebase UID namespace. Requests start as `pending`.
6. The clinic manager confirms or rejects a request. Confirming reserves the selected date/time with a Firestore transaction to prevent simultaneous confirmations of the same clinic slot. The owner can cancel their own pending or confirmed appointments.

The MVP uses one independent clinic branch per manager account, with no Organization Owner role. One account can still be both a Pet Owner and Clinic Manager.

## Local setup

1. Use the existing Firebase Auth configuration in `.env.local`.
2. Run the **admin backend** (`admin-backend/render-api`) with its usual Firebase Admin credentials. It must contain these new clinic endpoints. The frontend alone cannot save registration requests.
3. Set `VITE_ADMIN_API_BASE_URL` to the admin API's URL (e.g., `http://localhost:10000`) and ensure the admin API `ALLOWED_ORIGINS` includes the Vite origin.
4. Run `npm ci` then `npm run dev` at the repository root.
5. Run `npm test` and `npm run build` before publishing.

## Important production limits

**Do not ask actual clinics to upload sensitive identification documents yet.** The MVP stores images up to 190 KB each in protected Firestore documents to support the demo. Before taking real legal/identity documents, migrate them to private object storage with signed access, malware/file-signature validation, encryption, access audit, explicit consent, a retention/deletion policy and applicable privacy review. Use test-only or redacted documents now.

The next phase will add invitations for doctor accounts, shift calendars, notification delivery, authorized medical-record workflows, and a production-grade private document upload provider. The current appointment request form asks for a *preferred* time; manager approval is required because detailed doctor availability is not implemented yet.

## Testing checklist

- Manager A submits a valid test application, sees `pending`; Manager B sees no details from A.
- The public directory remains empty until an admin approves a clinic.
- An unauthorized account cannot access the admin clinic review API or documents.
- Admin requests changes: Manager A can edit and resubmit; admin approves after reviewing documents.
- Manager A adds a bookable service; pet owner books only their own synced pet.
- Manager A accepts the request; a duplicate request for the same slot cannot also be confirmed.
- The pet owner cancels a confirmed booking; the slot becomes free.
- A suspended clinic disappears from public listings and cannot receive new bookings.
- Verify mobile layouts, English/Russian labels, backend configuration and production builds.
