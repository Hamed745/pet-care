# Homepage hero image — Admin Settings

The **Platform Name** input in Admin Settings is replaced by a **Homepage Hero Image** picker. The platform identity remains PetCare. The existing `general.displayName` field is kept in Firestore and request validation for backwards compatibility, but it is not editable in this screen.

## Workflow

1. Sign in as `petcareAdmin=true`.
2. Open Admin → Settings → General & Support → Homepage Hero Image.
3. Choose a JPG, PNG or WebP image (up to 5 MB; recommended 5:4 landscape, about 1200×960 px).
4. See a local preview; click Save Settings to publish. Image uploads go via the existing admin-only ImageKit signed upload flow, into `/petcare/branding`.
5. Firestore `platformSettings/global` stores image URL, ImageKit file ID and path; settings changes remain versioned and audited.
6. The public homepage reads `GET /api/public/homepage`, which returns only `{heroImageUrl}` and no credentials, tokens or admin contact details.
7. All website visitors see the new image after a page refresh. The existing dog photo remains the default until an admin publishes an override; if the API or custom image is unavailable, the old picture is used instead.
8. "Restore original photo" removes the override on Save. Old branding images are deleted through the existing admin-only ImageKit endpoint after a successful settings update, with best-effort cleanup.

## Security

- Only admin users can request a signed ImageKit upload and save the image setting.
- Backend requires ImageKit URL to match the configured `IMAGEKIT_URL_ENDPOINT`, HTTPS, the correct file path under `/petcare/branding/`, and a valid image file ID. No arbitrary external URL inputs.
- Public endpoint returns URL only; image deletion requires admin auth.
- Firestore changes and audit log entry happen in one transaction with optimistic version checks; stale changes return HTTP 409.

## Deployment

Deploy the frontend and backend code together in the relevant Vercel projects. Existing backend variables `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` are reused. `VITE_ADMIN_API_BASE_URL` must point to the live API in the frontend.

No schema migration, extra paid service or new environment variable is required. The settings document gains optional `general.heroImageUrl`, `general.heroImageKitFileId` and `general.heroImageKitFilePath` fields after first save.

## Tests before merge

- `npm ci && npm test && npm run build`.
- Upload photo as admin; confirm picture changes on public homepage in another browser session (not logged in).
- Reload settings; photo remains.
- Change image again; check old branding file cleanup.
- Restore original photo; refresh Home and confirm default dog image.
- Try invalid MIME or a file greater than 5 MB — upload must be blocked.
- Verify normal pet owner gets HTTP 403 on settings writes and cannot get an ImageKit upload signature.
- Confirm order delivery fees and order push settings are unchanged.
- If uploading fails due to ImageKit outage, the existing published photo remains unchanged.
