# PetCare owner data backend (first integration milestone)

## What exists
The current admin/store Express service in `admin-backend/render-api/server.cjs` already authenticates Firebase ID tokens and uses Firestore. This milestone adds full pet/medical-record APIs to **that service**, rather than running a separate unauthenticated backend.

Each user has records at **`users/{firebaseUid}/pets/{petId}`** in Firestore. The server obtains `firebaseUid` **only from a verified Firebase ID token**, never from the client-supplied `ownerUid` field.

API routes:
- `GET /api/me/pets` — list the signed-in user's pets (max 200).
- `POST /api/me/pets` — create a pet. Repeating the same ID cannot overwrite an existing pet.
- `PUT /api/me/pets/:petId` — update a pet and its medical fields.
- `DELETE /api/me/pets/:petId` — delete an owned pet.

All routes require `Authorization: Bearer <Firebase ID token>` and use the existing revocation-aware authentication middleware. Invalid pet ID / input is rejected. Pet age, type, and medical arrays are validated; body size is limited in the main server. Frontend ownership is checked as additional defense, **not as a replacement for backend authorization**.

## Configure frontend locally
In the frontend directory, create a private `.env.local` from the tracked `.env.example`. Insert the **web-app config** for the correct Firebase project, and the backend base URL:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=...
VITE_ADMIN_API_BASE_URL=http://localhost:10000
```

The screenshot showing `.env.example` on the teammate's PC is **not** a working Firebase setup: placeholders must be replaced locally. A valid App Check site key is also needed for the current boot flow. Use the same Firebase project for frontend auth and Admin SDK.

## Configure Express backend
At the backend hosting provider (existing Render or Vercel API deployment), configure:

- `FIREBASE_PROJECT_ID` = Firebase project ID.
- `FIREBASE_SERVICE_ACCOUNT_JSON` = **private** Firebase Admin service account JSON kept ONLY in backend environment variables. Alternatively, use `GOOGLE_APPLICATION_CREDENTIALS` pointing to a secure credential file in an appropriate server environment. Do not put these in client `VITE_*` variables or GitHub.
- `ALLOWED_ORIGINS` = comma-separated allowed browser origins, e.g. `http://localhost:5173,https://<your-real-frontend-domain>`.
- `PORT` = `10000` for local development (default). Hosting providers may inject their own port.
- Any existing image-upload, admin push, and store secrets should remain on the backend as already configured.

Check `http://localhost:10000/health` when running locally. Set `VITE_ADMIN_API_BASE_URL` to the deployed API's **actual** HTTPS URL in the frontend hosting environment. The default localhost value is not useful for a public website.

## Run and test

Frontend root:
```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

Backend in `admin-backend/render-api`:
```powershell
npm.cmd ci
npm.cmd start
```

The backend won't start unless a supported Admin SDK credential or Firebase emulator is configured. Never share private service account JSON in screenshots or chats.

## Manual acceptance checks (do not skip)
1. Sign in to Account A, add a pet, upload small photo, add vaccination/medication/vet visit; refresh: all data is present.
2. Sign out, sign in to Account B: A's pets and medical history must be absent. Create pet B.
3. Sign in to A on another device/browser: A's pets should be loaded from the backend.
4. Attempt to access A's pet ID through B's authenticated API: GET list excludes it, PUT/DELETE return 404.
5. Disconnect API and edit pet: UI should surface an error, not claim remote save succeeded.
6. Confirm checkout and admin store still work as before.

## Legacy migration and caveats
- Previous PetCare versions kept all account records in a single `petcare-demo-v1` browser key. The prerequisite PR #8 introduces UID-separated local storage and excludes unowned demo records.
- On first successful API load, the client tries to import **only** locally available pets with an explicit matching `ownerUid`. Import never overwrites an existing server record with the same ID. A local marker prevents importing old records again after they have been intentionally deleted. The old browser data is not erased.
- Old pets without a provable `ownerUid` must be inspected and assigned by an authorized administrator; never auto-assign them to a logged-in user.
- Photo data URLs are temporarily limited to small payloads. **Production must move photo and attachments to Firebase Storage or ImageKit** with per-user upload authorization and size/type verification. Firestore documents must not become large image databases.
- This milestone does **not** turn demo clinic booking into an actual clinic/provider booking or implement branch approvals, real Visa payment, secure medical record sharing with vets, adoption review, or full multi-tenant store workflow. Those need separate backend modules, permissions, and end-to-end tests.
- Do not deploy permissive Firestore rules. If clients use Firestore directly, write ownership checks in rules; Firebase Admin SDK bypasses rules, so server authorization must remain explicit.
- Never expose `FIREBASE_SERVICE_ACCOUNT_JSON`, payment secrets, or server 2GIS keys in a frontend environment variable. Public web/map API keys should still be restricted by referrers, APIs and quota.

## Rollout
This branch is based on `fix/account-isolation-checkout-card-demo` (PR #8), so merge that prerequisite after its checks succeed, then merge this PR. Do not merge either before validating Firebase project configuration, the API deployment, and the manual two-account tests.
