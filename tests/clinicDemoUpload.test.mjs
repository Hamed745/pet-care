import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("demo registration offers a file chooser and a manual admin review workflow",()=>{
  const clinic=file("src/pages/ClinicPortal.jsx");
  assert.match(clinic,/type="file"/);
  assert.match(clinic,/demoUploads/);
  assert.match(clinic,/sample or completely fictional PDF, JPG or PNG/);
  assert.match(clinic,/PetCare administrator will examine them manually/);
  assert.match(clinic,/clinicApi\.uploadDocument/);
  assert.match(clinic,/clinicApi\.apply/);
  const storage=file("admin-backend/render-api/clinicDocumentStorage.cjs");
  assert.match(storage,/scanStatus = demoMode \? "demo_unscanned"/);
  assert.match(storage,/metadata\.demo === true/);
  const backend=file("admin-backend/render-api/server.cjs");
  assert.match(backend,/CLINIC_DEMO_UPLOADS_ENABLED/);
  assert.doesNotMatch(backend,/productionUploadsEnabled:true/);
});
test("demo status is advertised by the verification config and handled in clinic UI",()=>{
  assert.match(file("admin-backend/render-api/clinics.cjs"),/demoUploads: documentsStorage\.demoMode === true/);
  assert.match(file("src/pages/ClinicPortal.jsx"),/setDemoUploads\(result\.demoUploads === true\)/);
});
