"use strict";

const { test, expect } = require("@playwright/test");
const { randomUUID } = require("node:crypto");
const { access, readdir, readFile } = require("node:fs/promises");
const path = require("node:path");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const runId = randomUUID();
const projectId = process.env.FIREBASE_PROJECT_ID;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const backendUrl = "http://127.0.0.1:10000";
const clinicName = `Browser Test Clinic ${runId.slice(0, 8)}`;
const managerEmail = `clinic-manager-${runId}@example.test`;
const ownerEmail = `pet-owner-${runId}@example.test`;
const adminEmail = `clinic-admin-${runId}@example.test`;
const password = `LocalOnly-${randomUUID()}-Aa1!`;
const petName = `Test Pet ${runId.slice(0, 6)}`;
const serviceName = `Synthetic exam ${runId.slice(0, 6)}`;
let adminApp;
let adminAuth;
let db;

test.beforeAll(async () => {
  if (projectId !== "demo-petcare" || !authHost || !firestoreHost ||
      process.env.PETCARE_USE_FIREBASE_EMULATORS !== "true" ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Browser E2E requires only the demo-petcare Firebase emulators.");
  }
  adminApp = initializeApp({ projectId }, `clinic-browser-${runId}`);
  adminAuth = getAuth(adminApp);
  db = getFirestore(adminApp);
  const response = await fetch(`${backendUrl}/health`);
  const health = await response.json();
  expect(health.firebase).toEqual({ mode: "emulator", projectId });
  const adminUser = await adminAuth.createUser({
    email: adminEmail,
    password,
    displayName: "Synthetic Browser Admin",
  });
  await adminAuth.setCustomUserClaims(adminUser.uid, { petcareAdmin: true });
});

test.afterAll(async () => {
  if (!adminAuth || !db) return;
  for (const email of [managerEmail, ownerEmail, adminEmail]) {
    try {
      const user = await adminAuth.getUserByEmail(email);
      const clinicRef = db.collection("clinicBranches").doc(user.uid);
      for (const collectionName of ["verificationDocuments", "reservedSlots"]) {
        const refs = await clinicRef.collection(collectionName).listDocuments();
        await Promise.all(refs.map((ref) => ref.delete()));
      }
      const bookings = await db.collection("clinicAppointments").where("clinicId", "==", user.uid).get();
      await Promise.all(bookings.docs.map((doc) => doc.ref.delete()));
      const petSummaries = await db.collection("adminPetSummaries").where("ownerUid", "==", user.uid).get();
      await Promise.all(petSummaries.docs.map((doc) => doc.ref.delete()));
      const audit = await db.collection("adminAuditLogs").where("targetId", "==", user.uid).get();
      await Promise.all(audit.docs.map((doc) => doc.ref.delete()));
      await clinicRef.delete();
      await db.collection("adminUserProfiles").doc(user.uid).delete().catch(() => {});
      await adminAuth.deleteUser(user.uid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") {
        console.warn("[browser e2e cleanup]", error?.code || "test data cleanup failed");
      }
    }
  }
  if (adminApp) await deleteApp(adminApp).catch(() => {});
});

async function registerAccount(page, role, email, name) {
  await page.goto("/register");
  await page.getByTestId("account-type-selection").waitFor();
  const accountTypes = page.getByTestId("account-type-selection").getByRole("button");
  await expect(accountTypes).toHaveCount(2);
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.locator("#register-name").fill(name);
  await page.locator("#register-email").fill(email);
  await page.locator("#register-phone").fill("+201001234567");
  await page.locator("#register-city").fill("Cairo");
  await page.locator("#register-password").fill(password);
  await page.locator("#register-confirm").fill(password);
  await page.locator('input[name="terms"]').check();
  await page.locator("form").last().getByRole("button", { name: /Create an account/i }).click();
}

async function assertFrontendHasNoSupabaseCredentials(page) {
  async function collectFiles(directory, extensions) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath, extensions) :
        extensions.test(entry.name) ? [entryPath] : [];
    }));
    return nested.flat();
  }
  const sourceRoot = path.resolve(process.cwd(), "src");
  const sourceFiles = await collectFiles(sourceRoot, /\.(?:js|jsx|ts|tsx)$/);
  const frontendFiles = [...sourceFiles];
  const buildRoot = path.resolve(process.cwd(), "dist");
  try {
    await access(buildRoot);
    frontendFiles.push(...await collectFiles(path.join(buildRoot, "assets"), /\.js$/));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const frontend = (await Promise.all(frontendFiles.map((file) => readFile(file, "utf8")))).join("\n");
  expect(frontend).not.toMatch(/SUPABASE_SECRET_KEY|VITE_SUPABASE|SUPABASE_URL|sb_secret_/i);
  expect(await page.locator("body").innerText()).toContain("PetCare");
}

test("clinic onboarding, review, bookings and frontend secret isolation", async ({ browser, page }) => {
  page.on("response", (response) => {
    if (response.url().startsWith(`${backendUrl}/api/`) && response.status() >= 400) {
      console.error("[browser e2e API response]", response.status(), new URL(response.url()).pathname);
    }
  });
  const managerTokenHeaders = [];
  page.on("request", (request) => {
    if (request.url().startsWith(`${backendUrl}/api/clinics/`)) {
      const token = request.headers().authorization;
      if (token) managerTokenHeaders.push(token);
    }
  });

  await registerAccount(page, "Clinic Manager", managerEmail, "Synthetic Clinic Manager");
  await expect(page).toHaveURL(/\/clinic$/);
  await expect(page.getByRole("heading", { name: "Register your veterinary clinic" }))
    .toBeVisible()
    .catch(async (error) => {
      console.error("[browser e2e clinic portal]", (await page.locator("body").innerText()).slice(0, 1200));
      throw error;
    });

  const fields = {
    "Clinic name": clinicName,
    "Manager full name": "Synthetic Clinic Manager",
    City: "Cairo",
    "Street address": "100 Synthetic Test Street",
    Phone: "+201001234567",
    Email: managerEmail,
    Latitude: "30.0444",
    Longitude: "31.2357",
    "Clinic license number": `TEST-${runId.slice(0, 8)}`,
    "Responsible veterinarian": "Synthetic Veterinarian",
    "Veterinarian license number": `VET-${runId.slice(0, 8)}`,
  };
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Governorate").selectOption("Cairo");
  const syntheticPdf = {
    name: "synthetic-verification.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii"),
  };
  for (const label of ["Clinic license", "Manager identity document", "Responsible veterinarian's license"]) {
    await page.getByLabel(label, { exact: true }).setInputFiles(syntheticPdf);
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Submit for admin review/ }).click();
  await expect(page.getByText("Your clinic is pending approval")).toBeVisible();
  expect(managerTokenHeaders.length).toBeGreaterThan(0);

  const manager = await adminAuth.getUserByEmail(managerEmail);
  const unauthorized = await page.request.get(
    `${backendUrl}/api/admin/clinics/${encodeURIComponent(manager.uid)}/documents/manager_id`,
    { headers: { Authorization: managerTokenHeaders.at(-1) } },
  );
  expect(unauthorized.status()).toBe(403);

  const clinicRecord = await page.request.get(`${backendUrl}/api/clinics`);
  expect((await clinicRecord.json()).clinics).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: clinicName })]),
  );

  const adminPage = await browser.newPage();
  await adminPage.goto("/login");
  await adminPage.locator("#login-email").fill(adminEmail);
  await adminPage.locator("#login-password").fill(password);
  await adminPage.getByRole("button", { name: /^Log in$/i }).click();
  await expect(adminPage).toHaveURL("http://127.0.0.1:5190/");
  await adminPage.goto("/admin");
  const clinicsNavigation = adminPage.getByRole("button", { name: "Clinics" });
  await expect(clinicsNavigation).toBeVisible().catch(async (error) => {
    console.error("[browser e2e admin portal]", (await adminPage.locator("body").innerText()).slice(0, 1200));
    throw error;
  });
  await clinicsNavigation.click();
  const applicationRow = adminPage.getByRole("row").filter({ hasText: clinicName });
  await expect(applicationRow).toContainText("pending");
  await applicationRow.getByRole("button", { name: "Review" }).click();
  const dialog = adminPage.getByRole("dialog", { name: "Review clinic" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("synthetic_emulator_fixture");
  for (const title of ["Clinic license", "Manager identification", "Veterinarian license"]) {
    const viewButton = dialog.getByRole("button", { name: "View" }).first();
    await expect(viewButton).toBeEnabled();
    const documentResponse = adminPage.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(`/documents/${title === "Clinic license"
        ? "clinic_license"
        : title === "Manager identification" ? "manager_id" : "vet_license"}`),
    { timeout: 15000 });
    await viewButton.click();
    expect((await documentResponse).status()).toBe(200);
    await expect(dialog.getByTitle(title)).toBeVisible();
  }
  await expect(dialog.getByRole("button", { name: /Approve/ })).toBeEnabled();
  await dialog.getByRole("button", { name: /Approve/ }).click();
  await expect(dialog).toBeHidden();
  await expect(applicationRow).toContainText("approved");
  await applicationRow.getByRole("button", { name: "Review" }).click();
  const retentionDialog = adminPage.getByRole("dialog", { name: "Review clinic" });
  await expect(retentionDialog).toContainText("Document consent:");
  await retentionDialog.getByLabel("Reason", { exact: true }).fill("Synthetic browser hold test.");
  await retentionDialog.getByRole("button", { name: "Place retention hold" }).click();
  await expect(retentionDialog).toContainText("Hold active: legal");
  await retentionDialog.getByLabel("Necessity review reason").fill("Synthetic periodic review.");
  await retentionDialog.getByRole("button", { name: "Record necessity review" }).click();
  await expect(retentionDialog).not.toContainText("not recorded");
  await retentionDialog.getByLabel("Release reason").fill("Synthetic hold test completed.");
  await retentionDialog.getByRole("button", { name: "Release retention hold" }).click();
  await expect(retentionDialog).toContainText("No retention hold is active.");
  await retentionDialog.getByRole("button", { name: "Close", exact: true }).last().click();
  await adminPage.getByRole("button", { name: "Run retention cleanup" }).click();
  await expect(
  adminPage.getByRole("status").filter({ hasText: "Cleanup complete:" })
  ).toContainText("Cleanup complete:");  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Add service/i }).click();
  await page.getByLabel("Service name").fill(serviceName);
  await page.getByLabel("Price (EGP)").fill("250");
  await page.getByLabel("Minutes").fill("30");
  await page.getByRole("button", { name: "Save services" }).click();
  await page.getByRole("button", { name: "Save availability" }).click();

  const ownerPage = await browser.newPage();
  ownerPage.on("response", (response) => {
    if (response.url().startsWith(`${backendUrl}/api/`) && response.status() >= 400) {
      console.error("[browser e2e owner API response]", response.status(), new URL(response.url()).pathname);
    }
  });
  await ownerPage.goto("/");
  await registerAccount(ownerPage, "Pet Owner", ownerEmail, "Synthetic Pet Owner");
  await expect(ownerPage).toHaveURL("/");
  await ownerPage.goto("/pets/new");
  await ownerPage.getByLabel("Pet name").fill(petName);
  await ownerPage.getByLabel("Age in years").fill("3");
  await ownerPage.getByRole("button", { name: /Save pet profile/i }).click();
  await expect(ownerPage).toHaveURL(/\/pets$/);
  await ownerPage.goto("/nearby/our/veterinary");
  const clinicHeading = ownerPage.getByRole("heading", { name: clinicName, exact: true });
  await expect(clinicHeading).toBeVisible();
  const appointmentDateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(Date.now() + 7 * 86400000));
  const appointmentDateValues = Object.fromEntries(appointmentDateParts.map(({ type, value }) => [type, value]));
  const appointmentDate = `${appointmentDateValues.year}-${appointmentDateValues.month}-${appointmentDateValues.day}`;

  async function requestBooking(time) {
    await ownerPage.getByRole("button", { name: "Book a visit" }).click();
    const petSelect = ownerPage.getByLabel("Your pet");
    await expect(petSelect).toBeVisible().catch(async (error) => {
      console.error("[browser e2e booking form]", (await ownerPage.locator("body").innerText()).slice(0, 1200));
      throw error;
    });
    await petSelect.selectOption({ label: petName });
    await ownerPage.getByLabel("Clinic service").selectOption({ label: `${serviceName} · 250 EGP` });
    await ownerPage.getByLabel("Appointment date").fill(appointmentDate);
    await ownerPage.getByLabel("Preferred time (Egypt time)").fill(time);
    await ownerPage.getByRole("button", { name: "Request appointment" }).click();
    await expect(ownerPage.getByText("Request sent. Waiting for clinic approval.")).toBeVisible();
  }

  await requestBooking("10:00");
  await requestBooking("12:00");
  await page.reload();
  await expect(page.getByText(`${petName} · ${serviceName}`).first()).toBeVisible().catch(async (error) => {
    console.error("[browser e2e clinic bookings]", (await page.locator("body").innerText()).slice(0, 1500));
    throw error;
  });
  await page.getByRole("button", { name: "Accept" }).first().click();
  await expect(page.locator("div.rounded-xl.bg-primary-50")
    .filter({ hasText: "Confirmed bookings" }).locator("strong")).toHaveText("1");
  await page.getByLabel("Rejection reason").fill("Synthetic browser test rejection.");
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.locator("main")).toContainText(/rejected/);

  await ownerPage.reload();
  await expect(ownerPage.getByText(/confirmed/)).toBeVisible();
  await expect(ownerPage.getByText(/rejected/)).toBeVisible();
  await assertFrontendHasNoSupabaseCredentials(ownerPage);

  await adminPage.close();
  await ownerPage.close();
});
