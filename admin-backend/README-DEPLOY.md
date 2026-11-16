# PetCare Admin backend — deployment instructions

The dashboard uses **Firebase Authentication custom claims** and **Firebase Cloud Functions**.
Client-only admin checks are not sufficient: the functions verify `petcareAdmin === true` from the verified token.

## Mandatory setup (the ZIP never deploys automatically)
1. Make sure you control the Firebase project. Enable Firestore, Cloud Functions and billing if prompted by Firebase. These services may incur costs.
2. Install Node.js 22 (or supported Cloud Functions runtime), Firebase CLI, and sign into the correct Firebase project.
3. `cd admin-backend/functions` then `npm.cmd install`.
4. `cd ..` then `npx firebase-tools deploy --only functions --project YOUR_FIREBASE_PROJECT_ID`.
5. **From a trusted admin machine only**, acquire an Application Default Credential using `gcloud auth application-default login` or a secured service account credentials file outside this repository. Never copy secret JSON into the web app or ZIP.
6. `node grant-admin.mjs FIREBASE_AUTH_UID` from `admin-backend/functions` (after `npm.cmd install` in that folder).
7. Sign out and sign in with your existing PetCare login. The Admin Dashboard link will appear only for the claimed account.

## Collections
- `adminUserProfiles/{uid}`: profile city/name. New/returning logins try to mirror their city after Cloud Functions are deployed.
- `adminPetSummaries/{uid}_{petId}`: basic pet summary only (no medical records). New pets with an authenticated owner UID (and later edits to those same pets) sync after backend deployment. Older browser-only pets are not uploaded automatically, to avoid leaking pets across accounts sharing a browser.
- `adminOrders/{id}`: **future centrally-created orders**. Old orders in the browser `localStorage` are NOT visible to other users or the admin. This release does not change checkout or auto-upload demo orders.
- `adminProducts/{id}`: admin product records in Firestore. Storefront is still code-based; newly created admin products do NOT appear on the old Store until a future integration phase.
- `adminAuditLogs/{id}`: immutable-by-client admin audit records, created only by server functions.

The Firebase Admin SDK in Cloud Functions bypasses Firestore client rules. Do not open these collections to all web clients. No Firestore rules are deployed or overwritten by this package.

## Limits and security
- Only the manual trusted bootstrap may grant the admin custom claim.
- Do not put service account credentials or admin IDs into Vite `VITE_*` environment variables.
- Dashboard lists up to 100 Auth users/page and up to 250 orders/pets; Overview handles up to 10,000 accounts and profiles. Larger datasets need scalable aggregation and pagination.
- City analytics use voluntarily saved registration city and never GPS. Older Auth users missing centrally synced profiles are not guessed.
- Account disable/reactivate changes Firebase Authentication. Basic order status changes are transactional and audited; terminal statuses cannot be reverted.
- This release is an **admin-first foundation**: linking future checkout to `adminOrders`, and loading the shop from `adminProducts`, are separate phases requested by the project owner.

## Clinic verification documents (Render API)

Production clinic verification documents use the private Supabase Storage bucket `clinic-documents`; Firebase Auth and Firestore remain the identity and application-record systems. Firestore stores only generated object references and file metadata, never production bytes or Base64 data. The Supabase secret key is used only by the Express API and must never be defined in Vercel frontend settings or any `VITE_*` variable.

### Local configuration

The backend-only file `admin-backend/render-api/.env.supabase.local` is ignored by Git and loaded only by the backend `dev` and `dev:emulator` npm scripts. Enter `SUPABASE_URL` and `SUPABASE_SECRET_KEY` locally; keep `SUPABASE_BUCKET=clinic-documents` and `SUPABASE_ALLOW_SYNTHETIC_UPLOADS=false` for local server sessions. The API refuses to start if that legacy flag is set to `true`; only the integration test may opt into synthetic uploads by passing `testOnlySyntheticUploads: true` with the explicit test environment. `npm.cmd start` does not load this file. Do not copy its contents into the repository root or frontend environment.

Run a real Supabase Storage smoke test only after you have filled in the backend local file:

```powershell
npm.cmd --prefix admin-backend/render-api run test:supabase:integration
```

The test checks the bucket is private, uploads a generated-path synthetic PDF under a unique test UID, retrieves it, and removes only the object created by that run. It does not touch Firebase or pre-existing bucket objects. If configuration is missing, it reports variable names only.

### Upload and review controls

- Each authenticated request uploads one file; the API limits uploads to 12 requests per hour and 5 MiB per file. Applications require one manager ID, clinic license and veterinarian verification document.
- The backend validates PDF/JPEG/PNG signatures and does not trust filenames or client MIME types. Supabase object names are random and generated server-side.
- Supabase must report the selected bucket as private. No public links or signed URLs are created. Admin document contents are streamed through the API with Firebase ID-token/custom-claim authorization and `Cache-Control: no-store`; only submitted applications can be reviewed. Upload, replacement, deletion, metadata access, document views and review decisions are written to `adminAuditLogs` without document bytes, object paths, or credentials.
- Managers can upload, replace or delete documents only on their own draft, returned or rejected application. A replacement is saved before the previous object is removed; cleanup failures return an explicit error and require support cleanup.
- The adapter includes a quarantine-and-scan interface. **Production uploads are hard-disabled in the Render API** until a malware scanner, tested production controls and an approved retention/deletion process are wired. Local Supabase uploads are explicitly synthetic-test-only; do not use real identity documents.
- No production scanner is currently configured. ClamAV is the practical open-source candidate, but Render Free's 512 MB memory limit is below the scanner's multi-gigabyte operating requirements. Do not treat quarantine as a malware scan, and do not send identity documents to an unapproved third-party scanning API. A separately provisioned scanner with adequate memory, isolation and tested failure handling is required.
- Document consent is captured and audited server-side before upload; the stored version is `clinic-document-consent-v1`. The displayed consent and retention terms are a draft pending legal review and do not authorize production uploads.
- The current document policy removes draft files after 30 days of inactivity; files for changes-requested applications after 60 inactive days; rejected files 30 days after final rejection (including the 14-day appeal window); and closed/terminated clinic files 90 days after relationship end. Approved/suspended clinic documents require an Admin necessity review every 365 days, based on the last necessity review or initial Admin review. Records with no usable review date are flagged due immediately. A missed review does not automatically delete active-clinic documents. Legal holds, active appeals and active reviews pause deletion. Clinic audit events are retained for 365 days from creation.
- An Admin-authorized retention-hold control records the hold type, reason and actor. The Admin dashboard exposes an explicit, audited manual cleanup action; it deletes only eligible private document objects/references and `clinic.*` audit events past their retention period. It does not erase clinic applications or unrelated PetCare Admin audit events. The operation must be monitored for reported failures and rerun after remediation.
- Admins can record and audit a document-necessity review for active approved/suspended clinics. The Admin list flags overdue annual reviews; the 365-day interval remains subject to legal approval before production document uploads are enabled.
- No reliable scheduler is configured on the current free-tier deployment, so expiration is **not automatic**. A supported scheduler/worker and operational alerting must be provisioned before relying on deletion deadlines.
- Clinic API requests require Firebase App Check outside explicit emulator mode. Production must configure the frontend `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, enable the matching Firebase App Check provider, and set the Render CORS origin allowlist to the deployed frontend origin. Clinic calls fail closed when token acquisition or verification fails.
- Synthetic Firebase Emulator uploads use an in-process local test provider and Firestore Emulator metadata. They are separate from Supabase; never put real documents in emulator tests.

The retention and consent implementation is a draft pending legal review; no automatic scheduler is configured. Production uploads must remain disabled until the consent/policy is approved, malware scanning and operational cleanup scheduling are deployed and tested, and the annual necessity-review interval is legally approved.

Vercel currently serves the SPA and contains no API function; the clinic Express API is a separate Render service. Vercel Functions' 4.5 MB request limit therefore does not apply to the current Render upload route. Do not move this upload route into a Vercel Function unchanged: its request-body limit is below the current 5 MiB document limit.

The browser workflow can be run locally with `npm.cmd run test:browser`. It starts the Auth and Firestore demo emulators, the emulator API and Vite on loopback; it creates and cleans up only unique synthetic emulator records. Never point it at a production Firebase project.

## Firestore rules review (required)
Check `FIRESTORE-RULES-NOTES.md` and audit your project's currently deployed rules BEFORE using admin functions with real customer data. Generic permissive `/{document=**}` rules can expose the administrative collections; more-specific deny rules do not override broad allow rules. This package intentionally does not overwrite deployed security rules.
