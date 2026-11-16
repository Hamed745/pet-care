# Russian clinic location and verification workflow

Clinic managers now register a branch for Russia with a free-text **Region / Федеральный субъект РФ**, city, street address and a HTTPS **map share link**. No embedded map or latitude/longitude is required in the form. Accepted provider links include 2GIS, Yandex Maps, Google Maps, OpenStreetMap and Apple Maps. All URLs are checked server-side; local, non-HTTPS, credentials-bearing or spoofed-host links are rejected, and links open externally with noopener/noreferrer. The admin reviews the same submitted location. Approved clinics publish it in /clinics.

The appointment time zone is chosen per clinic from Russian IANA time zones to avoid mistaking all Russia for Moscow time. New Russian clinic prices and revenue labels use **RUB** (₽); legacy Egyptian clinic records are still readable in their original currency and time zone without changing or converting historic amounts.

For verification documents, **production identity upload remains fail-closed**, because no live malware scanner is provisioned in the Vercel backend and consent/retention wording remains a draft pending Russian privacy/legal review. Supabase's private clinic-documents bucket alone does not meet these conditions. Clinic managers can save a draft; approval/submission cannot proceed with real documents until scanner/quarantine and privacy compliance are actually configured and tested. Do not remove this safety gate, enable access to the bucket publicly, or upload real identity files as test fixtures.

Regression tests cover map URL validation, clinic draft/profile validation, admin approval & public map links with synthetic documents, legacy clinic compatibility, no exposed private verification data, and frontend registration/admin/directory paths. Existing ImageKit, other maps, the store and pet owner account isolation are unchanged.

## Simplified clinic registration and administrator-only decision

The clinic manager no longer sees or submits the technical IANA time zone selector.
The backend determines booking-local time from Russian region and city, preserving
existing stored zones and legacy Egyptian clinic data. Unknown or ambiguous regions
fall back to Europe/Moscow; staff should verify booking times for these locations
before opening appointments. Russian regions such as Yakutia may span multiple time zones.

Verification authenticity is reviewed manually by an authorized PetCare administrator.
A security scanner, when configured, only assesses whether a file is safe to handle;
it does not approve or reject a license, clinic or manager. Real identity-document
uploads remain disabled until private storage and operational file-safety controls
are available and the privacy notice is reviewed.
