# PetCare Maps — Phase 1 (React/Vite + 2GIS)

## Scope
- **MapGL / Map Tiles API:** real basemap and location pins.
- **Places API:** live nearby veterinary clinics, emergencies, pet hotels and pet daycare/boarding.
- **Routing API:** **not implemented** yet. The listed distance is straight-line, not road distance/time.
- 2GIS listing links open the official 2GIS firm page (which provides its own route option).
- Phone numbers are intentionally omitted: `items.contact_groups` requires additional 2GIS permission.
- The demo key has time/usage limits. Check your license and remaining quota.
- This starter is **local development only**, not a deployed or production-secure API.

## Setup
1. In PowerShell, navigate to your **current, up-to-date GitHub clone** of PetCare (folder with `package.json` and `src/App.jsx`).
2. Ensure `git status` is clean and Node.js 22+ is installed.
3. Run the accompanying `Setup-PetCareMaps.ps1` from this pack. It creates a **feature branch**, copies new files, adds npm commands, and inserts only one `/nearby/:kind` route. It does not overwrite existing code or `.env.local`.
4. Set `VITE_2GIS_MAP_KEY=...` in the repository root `.env.local` (domain-restrict this browser-visible map key).
5. Set `DGIS_PLACES_KEY=...` in repository root `.env.server.local` (server-only; never prefix with `VITE_`). For a trial, the same demo key may work for both APIs if enabled, subject to license.
6. In PowerShell tab 1: `npm run dev:maps:api`.
7. In PowerShell tab 2: `npm run dev:maps:web`.
8. Open `http://localhost:5173/nearby/emergency` (or the Vite URL shown). Other routes: `/nearby/veterinary`, `/nearby/hotels`, `/nearby/daycare`.
9. Verify a live `2GIS Places API` request and an actual MapGL map. Do **not** call the feature live before both succeed.
10. Run `npm run build`, `git diff --check`, and review changes before committing/pushing to GitHub.

## Key handling
- `.env.local` and `.env.server.local` must be **Git ignored**. Do not upload these files or paste actual keys in chat.
- Vite `VITE_*` variables ship to the browser. Map Tiles keys must be restricted by website Origin/Referer in the 2GIS Platform Manager.
- Server-only Places key must **not** appear in the browser. Move the API to a secure deployed backend with production auth/rate-limits before publishing.
- Coordinates should not be logged or stored without an explicit product need and appropriate privacy notice.

## Production work still required
1. Integrate links/components into current Emergency, Veterinary Services, and Pet Sitting UI without discarding existing logic.
2. Confirm the correct 2GIS production licenses, API quotas, and permissions for phone/schedule data.
3. Add verified 24h/emergency filtering: `work_time=now` means open now, **not** accepting emergencies.
4. Add the separate Routing API for actual driving distance, ETA, and accessible routes.
5. Deploy an HTTPS backend proxy with robust abuse protection. Configure production proxy routing (`/api/places`).
6. Validate city search and translations; expand city picker or city geocoding as needed.
7. Test Russia-specific search coverage, privacy, accessibility, offline/failure states, and mobile browsers.
