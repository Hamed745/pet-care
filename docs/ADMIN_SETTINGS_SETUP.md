# PetCare Admin Settings — operational implementation

## Routes (existing Express API)
All `/api/admin/*` routes require an authenticated Firebase ID token with `petcareAdmin: true` custom claim, verified server-side:

- `GET /api/admin/settings`: returns stored platform settings, server version and last editor/time.
- `PUT /api/admin/settings`: validates **only** supported fields and requires `version` to match the currently saved document. Conflicts return `409`. Both config and a corresponding `settings.update` audit entry are committed in one Firestore transaction.
- `GET /api/admin/system-status`: checks that the authenticated backend can read Firestore; reports whether ImageKit config is present (not whether uploads work). Never returns secret values.
- `GET /api/store/policy`: **public**, read-only order policy; returns delivery fee, free shipping threshold and explicit COD-only payment methods. No contact emails or secrets.

Firestore document: `platformSettings/global`.
If this document doesn't exist, existing shipping rules remain **35 RUB fee and free above 1200 RUB**. The initial Settings screen uses these existing defaults. It is **not** necessary to manually create a document.

## Settings that actually do something

1. **Delivery fee and free delivery threshold**: Admin changes are saved to Firestore. New store orders calculate fees using the same settings **on the server** and the Cart UI reads the public policy to preview totals. Previously placed orders retain their saved totals. If policy can't load, checkout cannot place a real order.
2. **Automatic new-order push**: Disables/enables the backend-triggered push only when a new order is created. Device opt-in/out and manual test notifications remain on the Notifications page.
3. **General platform name and support contact**: Persistent *admin reference information*. These values do **not** yet change the consumer site header, send emails or contact staff; the UI explicitly says they are not published.

## Items intentionally not editable

- **Clinic/store verification**: Real provider registration and approval workflows aren't live yet. There is no false "Auto-approve" switch.
- **Commission percentages**: Not charged by current order system. No fake slider.
- **Payment**: Cash on delivery is the only live backend method. Visa demo is visual only; no card processor has been installed.
- **API secrets, service account JSON, 2GIS keys and VAPID keys**: These remain in hosting environment variables and are never returned by Settings endpoints.

## Deployment requirements

Frontend must have `VITE_ADMIN_API_BASE_URL` configured to point to the current backend. The backend must have valid Firebase Admin credentials and Firestore access (already used by the shop/admin).

The Settings page and new endpoints must be deployed together. Rolling out the frontend first will cause `/api/admin/settings` to return 404 until the backend is updated. Keep the existing Vercel deployment and data unchanged until the PR is reviewed and both deployments complete.

Run `npm ci && npm test && npm run build` in the root directory. No new package dependencies were added.

### QA (do before merge)

1. Sign in as an approved Super Admin, open Settings, confirm defaults display, change delivery fee to **45** and threshold to **1500**, Save. Reload the browser and confirm values remain.
2. Open the public Cart, check a subtotal below 1500: delivery must display 45 RUB; above 1500: free. Place one actual COD order and check its stored total on the server. **Restore 35/1200 afterward** if you were only testing.
3. Disable new order push, create a new order and confirm no new push is emitted; re-enable and test again.
4. Check Activity Log contains `settings.update` and the authenticated status section shows backend/Firestore reachable (ImageKit reports only configuration).
5. Sign in as a regular Pet Owner, try the admin Settings API: must return 403. No token must return 401.
6. Open Settings simultaneously in two admin sessions; saving one and then the stale copy must return 409, not silently overwrite.
7. Confirm Visa demo remains UI-only; no credit-card data is sent to the API.

## Security and consistency notes

The API only accepts finite nonnegative integer delivery values, known settings fields and a strictly validated support email/phone. It doesn't allow arbitrary field names such as `apiKey` or `firebasePrivateKey`. Shipping rules are re-read by the server before checkout and the authoritative total is calculated server-side; stale cart values can be refreshed. Settings writes are audited in the same Firestore transaction with the document update. Public policy includes only operational store numbers and COD-only status.

This is an operational first phase, not a complete enterprise configuration/verification/commission platform. The non-operational sections are clearly labelled as future work in the UI.
