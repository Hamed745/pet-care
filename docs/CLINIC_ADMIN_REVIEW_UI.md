# Clinic Admin review UI — 2026-11-17

The Admin Dashboard / Clinics / Review dialog has been simplified for manual checks:
- Keep clinic manager name, email, phone, address, map-share link, license numbers, review status and the three private verification documents.
- Remove Application history, retention cleanup, retention holds, annual necessity reviews, raw consent version and other administrative noise from the review UI only. Backend audit entries, retention policy and protected endpoints are preserved; no data was deleted.
- View opens a separate full-screen document viewer. Native PDF viewing fills the available height and supports scrolling through multiple PDF pages; images appear at full available width with scrolling for tall pages.
- The reviewer can exit with Close viewer or Escape and return to the same clinic application. Object URLs are revoked on closing the application to avoid retaining sensitive files in memory.
- Approve is available only for pending applications after all three documents have been loaded for inspection. Rejection and change requests require an explanation (validated on click, not ghosted with an unexplained disabled button).
- Suspension and closure controls remain available to authorized administrators under collapsed Advanced clinic status actions, with a required reason; this keeps them out of the ordinary approval flow.

The document API remains authenticated and private. No backend approval rules, file retention protections or Supabase bucket access were modified.

Validation: npm test and npm run build through CI on the review branch. Browser-specific PDF rendering should also be verified in a live test deployment using an invented multi-page PDF, not a real identity document.
