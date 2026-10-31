# PetCare Admin browser push notifications

This branch adds Firebase Cloud Messaging (FCM) web push for new store orders.

## Required configuration

### Firebase Console

1. Open the Firebase project used by this PetCare deployment.
2. In Project settings → Cloud Messaging, generate or locate the Web Push certificates key pair.
3. Copy the **Web Push certificate key pair public key** (VAPID public key). Never put a private key in frontend configuration.
4. Confirm that Cloud Messaging is enabled for the project and that the web app configuration matches the existing PetCare frontend.

### Vercel frontend environment

Add this environment variable to the PetCare Vercel project, for every environment where push should work:

- `VITE_FIREBASE_VAPID_KEY` = the Firebase Web Push public VAPID key.

The existing `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` values are reused.

Redeploy the frontend after changing environment variables. The site must be served over HTTPS (localhost is also allowed for development).

### Render backend

The existing Firebase Admin service account on Render must belong to the same Firebase project as the frontend and have permission to send Firebase Cloud Messaging messages. The backend uses the existing `FIREBASE_SERVICE_ACCOUNT_JSON` credential and does not need a separate VAPID private key.

Deploy the `admin-backend/render-api` service from this branch (or after merging it). Keep the existing Render start command and environment variables.

## Admin setup and testing

1. Sign in using an account with the `petcareAdmin: true` custom claim.
2. Open Administration → Notifications.
3. Click **Enable notifications** and allow browser notifications.
4. Click **Test notification**. A test alert should appear through the browser/operating system notification center.
5. Place a new test order from a separate customer account. A new-order push should be delivered to every registered, enabled admin device.

Each browser/device must grant permission and register once. The device registration is stored in the server-side `adminPushTokens` collection; tokens are never written directly from the browser to Firestore.

## Sound and background behavior

The service worker receives push messages while the admin page is in the background or closed, subject to browser/OS support and notification permission. The browser/OS controls the notification sound. PetCare cannot force a custom sound or override Windows Focus Assist, site notification settings, or muted browser notification channels.

## Security notes

- Token registration, removal, and test delivery require a verified Firebase ID token with the `petcareAdmin: true` claim.
- Order delivery targets only registered accounts whose current Firebase custom claim still marks them as admins and which are not disabled.
- Invalid/unregistered FCM tokens are removed after send failures.
- The browser only receives the public VAPID key; the Firebase Admin service-account credential remains on Render.
