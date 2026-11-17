import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = source("src/App.jsx");
const layout = source("src/components/Layout.jsx");
const shell = source("src/components/ClinicShell.jsx");
const context = source("src/clinic/ClinicAudienceContext.jsx");
const workspace = source("src/pages/ClinicWorkspace.jsx");
const portal = source("src/pages/ClinicPortal.jsx");
const auth = source("src/pages/Auth.jsx");

test("clinic mode is resolved from the authenticated branch API and a per-user signup intent", () => {
  assert.match(context,/clinicApi\.mine\(\)/);
  assert.match(context,/result\.clinic/);
  assert.match(context,/PREFIX \+ uid/);
  assert.match(context,/requestId\.current !== id/);
  assert.match(auth,/rememberClinicIntent\(credential\.user\.uid\)/);
  assert.match(portal,/markClinic\(updated\)/);
  assert.match(app,/<ClinicAudienceProvider>/);
});

test("clinic manager never sees owner routes, store, adoption or the public navbar", () => {
  assert.match(layout,/if \(audience\.isClinic\)/);
  assert.match(layout,/location\.pathname !== "\/clinic"/);
  assert.match(layout,/<Navigate to="\/clinic" replace/);
  assert.match(layout,/<ClinicShell toastItems=\{toastItems\}/);
  const only = shell.slice(shell.indexOf("const links"),shell.indexOf("export default"));
  for(const forbidden of ["/store","/adoption","/pets","/bookings","/nearby","/wishlist","/cart"]) {
    assert.equal(only.includes(forbidden),false,"Clinic navigation should not contain "+forbidden);
  }
  assert.doesNotMatch(shell,/<Footer|<FloatingChat|<Navbar/);
  assert.match(layout,/<Footer \/>/); // owner experience unchanged
  assert.match(layout,/<Navbar \/>/);
});

test("Home, appointments, requests, calendar, services and settings stay inside the clinic workspace",()=>{
  for(const route of ["dashboard","requests","appointments","calendar","services","team","settings"]) {
    assert.match(shell,new RegExp('"'+route+'"'));
    assert.match(workspace,new RegExp('"'+route+'"'));
  }
  assert.match(shell,/to=\{key === "dashboard" \? "\/clinic"/);
  assert.match(workspace,/useSearchParams\(\)/);
  assert.match(workspace,/setSearchParams\(to==="dashboard"\?\{\}:\{section:to\}\)/);
  assert.match(workspace,/const tab=menuItems\.some/);
  assert.doesNotMatch(workspace,/onClick=\{\(\)=>navigate\("patients"\)\}>Manage patients/);
  assert.doesNotMatch(workspace,/onClick=\{\(\)=>navigate\("newVisit"\)\}>Add visit record/);
  assert.doesNotMatch(portal,/View Our Clinics →/);
});

test("clinic header retains language and signout without owner account menus",()=>{
  assert.match(shell,/<LanguageSwitcher\/>/);
  assert.match(shell,/await logoutUser\(\)/);
  assert.match(shell,/navigate\("\/login", \{ replace: true \}\)/);
  assert.match(shell,/aria-label=\{label\("Clinic navigation"/);
  assert.match(context,/checking/);
  assert.match(layout,/Unable to verify account type/);
  assert.match(layout,/onClick=\{audience\.refresh\}/);
});

test("clinic requests can select a date and time before accepting",()=>{
  assert.match(workspace,/Confirm date/);
  assert.match(workspace,/Confirm time/);
  assert.match(workspace,/Accept & confirm time/);
  assert.match(workspace,/slotEdits\[x\.id\]\?\.date/);
  assert.match(source("src/services/clinicApi.js"),/updateBooking: \(id, status, reason = "", slot = \{\}\)/);
});
