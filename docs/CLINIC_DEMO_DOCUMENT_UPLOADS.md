# Clinic document demo uploads (graduation project)

This branch enables **demo-only file uploads** from the Clinic Manager portal through the authenticated backend into Supabase Private Storage bucket `clinic-documents`. Supported: PDF/JPEG/PNG <= 5MB each. All documents must be fictitious, redacted or created specifically for the graduation presentation. **Never upload real passports, IDs, private medical data or real veterinarian licences.**

The backend checks the Firebase identity token, uses UID-scoped document references, validates file signatures and size, verifies the Supabase bucket is private, and marks metadata `demo: true` and `scanStatus: "demo_unscanned"`. A PetCare admin with the verified custom claim can preview files in the existing isolated Admin Clinics reviewer, then approve/reject/request changes. There is **no automated verification of license authenticity** and no claim of malware scanning.

The app enables demo uploads when `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `SUPABASE_BUCKET=clinic-documents` are present in the backend deployment, and `CLINIC_DEMO_UPLOADS_ENABLED` is not `false`. To disable demo uploads immediately, set `CLINIC_DEMO_UPLOADS_ENABLED=false` on the backend deployment and redeploy. Do not place the Supabase secret key into the frontend or GitHub files. If the bucket cannot be verified as private, uploads fail closed.

This switch is **not** an alternative to genuine production verification/security. Before accepting real personal documents, disable demo uploads, implement and audit operational malware scanning / quarantine, verify retention/legal notices, and test privacy boundaries.

Verification route: `GET /api/clinics/verification-config`, shows `storageProvider: "supabase"`, `uploadEnabled: true`, and `demoUploads: true` when configured. After registering a synthetic clinic, send 3 sample files and confirm the `pending` request and manual review in `/admin` > Clinics. No Vercel environment variables should be exposed publicly.
