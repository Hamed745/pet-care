import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const component = readFileSync(new URL("../src/admin/AdminClinicApprovals.jsx", import.meta.url), "utf8");
const backend = readFileSync(new URL("../admin-backend/render-api/clinics.cjs", import.meta.url), "utf8");
test("clinic documents open in a full-screen portal instead of an inline thumbnail", () => {
  assert.match(component, /import \{ createPortal \} from "react-dom"/);
  assert.match(component, /data-testid="clinic-document-fullscreen"/);
  assert.match(component, /className="fixed inset-0 z-\[9999\] flex flex-col bg-white"/);
  assert.match(component, /onClick=\{\(\) => loadDocument\(kind, title\)\}/);
  assert.match(component, /setPreview\(\{ \.\.\.file, kind, title \}\)/);
  assert.doesNotMatch(component, /className="h-44 w-full"/);
  assert.doesNotMatch(component, /className="max-h-44 w-full"/);
});
test("multipage PDFs use a full-height scrollable native viewer and images remain scrollable", () => {
  assert.match(component, /preview\.mimeType === "application\/pdf"/);
  assert.match(component, /<iframe[\s\S]*?src=\{preview\.url\}[\s\S]*?sandbox="allow-scripts allow-downloads"/);
  assert.match(component, /className="h-full w-full border-0 bg-white"/);
  assert.match(component, /className="min-h-0 flex-1 overflow-auto bg-stone-100"/);
  assert.match(component, /<img src=\{preview\.url\} alt=\{preview\.title\}/);
});
test("the viewer can close by button or Escape and does not retain object URLs after closing a clinic", () => {
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /setPreview\(null\)/);
  assert.match(component, /Close document viewer/);
  assert.match(component, /URL\.revokeObjectURL\(url\)/);
  assert.match(component, /selectedClinicId\.current !== clinicId/);
  assert.match(component, /document\.body\.style\.overflow = previousOverflow/);
});
test("the clinic review screen hides advanced retention and audit implementation details", () => {
  for (const text of [
    "Application history", "Document retention control", "Place retention hold",
    "Record necessity review", "Last necessity review", "Run retention cleanup",
    "Annual document review due", "pending legal review", "Time zone:"
  ]) assert.equal(component.includes(text), false, text + " should not appear in clinic review UI");
  assert.match(backend, /\/api\/admin\/clinics\/:id\/retention-hold/);
  assert.match(backend, /\/api\/admin\/clinics\/:id\/history/);
  assert.match(backend, /\/api\/admin\/clinics\/:id\/documents\/:kind/);
});
test("admin approval still requires manually viewing all three private documents", () => {
  assert.match(component, /DOCUMENTS\.every\(\(\[kind\]\) => documents\[kind\]\)/);
  assert.match(component, /clinicApi\.adminDocument\(clinicId, kind\)/);
  assert.match(component, /clinicApi\.decide\(selected\.id, status, reason\)/);
  assert.match(component, /Write a reason with at least 5 characters/);
  assert.match(component, /Request changes/);
  assert.match(component, /Advanced clinic status actions/);
  assert.match(component, /<details/);
  assert.match(backend, /clinicAdminRoute/);
});
