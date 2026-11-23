import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLINIC_RU, clinicText } from "../src/clinic/clinicTranslations.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const workspace = read("src/pages/ClinicWorkspace.jsx");
const portal = read("src/pages/ClinicPortal.jsx");
const shell = read("src/components/ClinicShell.jsx");

test("doctor/staff fields and status have Russian labels but persisted enum values remain unchanged", () => {
  for (const pair of [["Veterinarian","Ветеринар"],["Receptionist","Администратор"],
    ["Full name","ФИО"],["Specialty","Специализация"],["Work email","Рабочая электронная почта"],
    ["Working days","Рабочие дни"],["Add team member","Добавить сотрудника"],
    ["Save changes","Сохранить изменения"],["active","активен"]]) {
    assert.equal(clinicText("ru",pair[0]),pair[1]);
    assert.equal(clinicText("en",pair[0]),pair[0]);
  }
  assert.match(workspace, /<option value="veterinarian">\{tr\("Veterinarian"\)\}<\/option>/);
  assert.match(workspace, /<option value="active">\{tr\("Active"\)\}<\/option>/);
  assert.match(workspace, /tr\(s\.role\)/);
  assert.match(workspace, /tr\(s\.status\)|<Pill value=\{s\.status\}/);
  assert.match(workspace, /tr\(days\[n\]\)/);
  assert.match(workspace, /useLanguage\(\)/);
});

test("clinic requests, calendar, services and notifications react to language", () => {
  for (const english of [
    "New booking requests","Confirm date","Confirm time","Accept & confirm time",
    "All clinic appointments","Clinic calendar","No appointments today.",
    "Published services","Notifications and privacy settings","Save branch settings",
    "Appointment confirmed with selected date and time.","Request rejected.",
    "Edit team member","Patient directory"
  ]) assert.ok(CLINIC_RU[english],english);
  assert.match(workspace,/\{tr\(notice\)\}/);
  assert.match(workspace,/\{tr\(error\)\}/);
  assert.match(workspace,/toLocaleDateString\(language==="ru"\?"ru-RU":"en-GB"/);
  assert.match(workspace,/tr\("Reason for rejection \(at least 5 characters\):"\)/);
});

test("clinic service editor, onboarding and approval messages translate independently of saved form values", () => {
  for (const english of [
    "Clinic services · RUB (₽)","+ Add service","Service name","Price (RUB)",
    "Available for booking","Save services","Appointment requests",
    "Your clinic is pending approval","Clinic access is suspended",
    "Clinic license","Manager identity document","Responsible veterinarian's license"
  ]) assert.ok(CLINIC_RU[english],english);
  assert.match(portal,/\{tr\(title\)\}/);
  assert.match(portal,/\{tr\("Clinic services · RUB \(₽\)"\)\}/);
  assert.match(portal,/\{tr\(item\.status\)\}/);
  assert.match(portal,/useLanguage\(\)/);
  assert.match(shell,/label\("Unable to sign out/);
});

test("all static Russian-translation calls in workspace and portal have dictionary entries", () => {
  for(const [file,source] of [["workspace",workspace],["portal",portal]]) {
    const referenced = [...source.matchAll(/\btr\("([^"]+)"\)/g)].map(x=>x[1]);
    const missing = referenced.filter(x=>!Object.hasOwn(CLINIC_RU,x));
    assert.deepEqual(missing,[],file + ": missing Russian labels");
  }
});

test("no untranslated human-facing static labels remain in clinic workspace", () => {
  const labels = [...workspace.matchAll(/\b(?:label|title|description|aria-label)="([^"]+)"/g)].map(x=>x[1]);
  const phrases = [...workspace.matchAll(/>([^<>}{\n]+)</g)].map(x=>x[1].trim()).filter(x=>/^[A-Za-z][A-Za-z ]{3,}$/.test(x));
  assert.deepEqual(labels.filter(x=>/\b[A-Za-z]{4}\b/.test(x)),[]);
  assert.deepEqual(phrases,[]);
});

test("legacy approved clinic directory also translates booking fields and status", () => {
  const directory = read("src/pages/ClinicDirectory.jsx");
  assert.match(directory, /label=\{tr\("Your pet","Ваш питомец"\)\}/);
  assert.match(directory, /label=\{tr\("Clinic service","Услуга клиники"\)\}/);
  assert.match(directory, /clinicText\(isRussian\?"ru":"en",item\.status\)/);
  assert.match(directory, /tr\("Cancel request","Отменить заявку"\)/);
});
