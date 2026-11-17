# Live Our Services

The former Coming Soon Our Services route now lists approved PetCare clinics, their services, and the existing booking requests with an interactive 2GIS map. Public Services remains unchanged. Only clinics returned by the public approved clinic API are eligible for pins.

The frontend-only serverless endpoint /api/clinic-location accepts a clinicId, looks up the clinic using the backend public approved list, and resolves a precise point from existing approved coordinates, a supported map link, a 2GIS firm identifier, or a matching street/building address using server-side DGIS_PLACES_KEY. It never fetches arbitrary URLs from users, does not expose the API key, and never makes a fabricated pin at the city center. Unresolved clinics remain visible as cards with their original external map links.

The current categories are based on published approved-clinic services, so categories with no corresponding service have empty results (no fake providers). The existing clinic registration, approval, booking, appointment notifications, ImageKit and other public maps remain unchanged.

Requirements: configure DGIS_PLACES_KEY on petcare-frontend Vercel server functions for by-ID/geocoder calls and keep the existing VITE_2GIS_MAP_KEY for the interactive map. The clinic public API default host is petcare-api-brown.vercel.app; set CLINIC_PUBLIC_API_BASE_URL for other environments. For test clinics with no exact match in the input address or share link, show a warning and the original location link, not a false marker.

Test the preview with one approved Russian clinic, a valid real 2GIS firm link and a booking request. Verify public search /nearby/veterinary continues to work; only approved clinics show in Our Services.
