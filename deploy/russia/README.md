# PetCare availability in Russia — diagnostics and alternate hosting

## Why this exists

PetCare is deployed on **two Vercel hosts**:
- Public SPA: `https://petcare-frontend-rosy.vercel.app`
- REST API: `https://petcare-api-brown.vercel.app`

The browser additionally communicates directly with **Firebase Auth, Firebase App Check/reCAPTCHA, and 2GIS**. In November 2026, Russian users report needing a VPN to access or fully use the site. A successful Vercel deployment or `/health` response from another region does **not** establish connectivity from Russia.

Do not delete Firebase or redeploy `main` to solve this blindly. Do not assume a new custom domain on the *same Vercel edge* fixes regional TCP/TLS filtering.

## Step 1 — gather facts from a Russian network with VPN **OFF**

On the affected Windows PC, from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-russia-connectivity.ps1
```

The script sends **GET** requests to the public website, API and public Google/2GIS endpoints; it never sends a username, cookie, Firebase ID token or secret. Share only the results, not browser authentication data.

Interpretation:
- `exit=6/7/28/35/60` or `HTTP=000`: name resolution, TCP, timeout, TLS, or certificate problem. This is **outside React**.
- `HTTP=200` (Frontend), `HTTP=200` (API health) are expected when reachable.
- `HTTP=401` for unauthenticated `/api/me/pets` is **correct**.
- `HTTP=403`/`404` from the public Firebase service roots still proves TCP/TLS worked; those roots intentionally do not expose a public unauthenticated operation.
- If the frontend works but the Vercel API fails, product administration, checkout and pet synchronization will fail.
- If Firebase Auth/secure token/reCAPTCHA fails, moving only the frontend cannot restore registration/login.
- If only one ISP fails, test a second Russian ISP/mobile network and show Vercel Support the target IP and curl error without credentials.

If the problem occurs after HTML loads, open browser DevTools → Network with VPN off and look for red requests (Vercel REST API vs Google vs MapGL), but never export session cookies/tokens to a public ticket.

## Step 2 — alternate infrastructure (OPTIONAL)

This folder contains a **production-oriented Docker Compose template** to run PetCare from **one HTTPS domain** on a VPS reachable from Russian networks. It does not require changing the existing Firebase project or deleting any Firestore data:

- `web`: Vite static build served via Caddy with automatically managed HTTPS.
- `api`: existing Express + Firebase Admin API (Firestore, orders, admin, pets).
- `maps`: same 2GIS places/place-details code as Vercel, using a server-side Catalog key.
- All HTTP traffic visible to the browser for the app's own `/api/*` services uses the *same public domain*, avoiding the two Vercel ingress connections.
- External Firebase Auth/reCAPTCHA and 2GIS map-tiles **remain browser connections**. Confirm they work without VPN before relying on this architecture.

**Potential host**: a VPS in Russia from a provider independently tested on multiple target ISPs; Selectel has a Docker Compose-ready cloud image, and Timeweb offers Linux VPS in Russian regions. Neither can guarantee reachability from every ISP. A custom domain is required for TLS and should be tested from Russia before switching users.

### Prerequisites

1. Obtain a Russian VPS (2 vCPU / 2–4 GB RAM recommended to build; disk at least 20 GB), Docker Compose, and a domain you own. Point its DNS `A` record to the public VPS IP.
2. Open ports **80 and 443** on the VPS firewall. Allow SSH only to trusted admins.
3. Clone or copy PetCare to the VPS and keep the current Vercel deployment as backup.
4. From the repository root:

```bash
cp deploy/russia/.env.example deploy/russia/.env
mkdir -p deploy/russia/secrets
chmod 700 deploy/russia/secrets
# Edit deploy/russia/.env and replace placeholder values. Keep this file private.
chmod 600 deploy/russia/.env
```

5. Obtain the Firebase Admin **service-account JSON** only from the official project owner and install securely at:
`deploy/russia/secrets/firebase-service-account.json` (permissions `chmod 600`). Never commit it, paste it into a chat, or place it in `VITE_*` variables.
6. Set `SITE_DOMAIN` to **just** the new host name, e.g. `petcare.example.ru`, not `https://` or a URL path. Set web Firebase values, `DGIS_PLACES_KEY`, and optional ImageKit credentials in the private `deploy/russia/.env`. **`VITE_ADMIN_API_BASE_URL` is built automatically as `https://SITE_DOMAIN`**.
7. Keep **`VITE_FIREBASE_PROJECT_ID` and `FIREBASE_PROJECT_ID` for the *same existing Firestore project*.**

### Deploy

From the repository root:

```bash
docker compose --env-file deploy/russia/.env -f deploy/russia/compose.yaml up --build -d
docker compose --env-file deploy/russia/.env -f deploy/russia/compose.yaml ps
```

Do not share `docker compose config` output publicly: it can contain secret environment values.

After DNS and TLS are ready, verify from a Russian network without VPN:

```bash
curl -i https://petcare.example.ru/health
curl -i https://petcare.example.ru/api/me/pets
curl -i https://petcare.example.ru/api/store/products
curl -i https://petcare.example.ru/api/health
```

Replace `petcare.example.ru` with your actual hostname. Expect:
- `/health` => `200 OK`
- `/api/me/pets` **without** a login token => `401 Unauthorized`
- `/api/store/products` => public products JSON
- `/api/health` => 2GIS Catalog key configured flag

Add the new domain to **Firebase Authentication → Authorized domains**, permitted domains for **reCAPTCHA Enterprise/App Check**, and the allowed referrers for the **2GIS MapGL public key**. Rebuild the web image after changing any `VITE_*` values.

Then test the production user journeys from an affected Russian ISP **without VPN**: login/refresh, pets from Firestore, product list/admin, checkout order once, map results, and external place details.

## Rollback

Do **not** change or delete Vercel production during this migration. If the alternate origin fails or Firebase Auth remains unreachable, keep the original URLs and restore the DNS A record to the previous target if you had changed it. A separate new hostname can be used for parallel validation without affecting existing users.

## Security reminders

- Do not run the Firebase Admin service account in a browser. This Compose template mounts it read-only as a Docker secret.
- Keep Google API and private 2GIS keys server-side. Only Firebase Web SDK and MapGL **public** keys should have a `VITE_` prefix.
- A same-origin API doesn't eliminate Firebase Auth's independent Google endpoint calls. If those are blocked in Russia, investigate a supported architecture with secure server-side login or a reachable identity provider as a **separate migration** before claiming no-VPN support.
- Respect local data privacy and hosting laws. Consider hosting medical and personal data with the requirements of your actual user locations.
- Verify the **real** host from the actual Russian ISP. Being in a Russian data center alone isn't proof of client reachability.
