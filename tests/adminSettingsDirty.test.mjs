import test from "node:test";
import assert from "node:assert/strict";
import { formFromSettings, effectiveForm, hasUnsavedSettings } from "../src/admin/settingsForm.js";

const savedSettings = (override = {}) => ({
  // The backend stores support fields before the ImageKit image fields.
  general: {
    displayName: "PetCare",
    supportEmail: "support@example.org",
    supportPhone: "+7 999 1234567",
    heroImageUrl: "https://ik.imagekit.io/petcare/petcare/branding/dog.webp",
    heroImageKitFileId: "img-123",
    heroImageKitFilePath: "/petcare/branding/dog.webp",
    ...override,
  },
  checkout: { deliveryFee: 35, freeDeliveryThreshold: 1200 },
  notifications: { newOrderPush: true },
});

test("already-saved homepage image does not show Unsaved changes", () => {
  const stored = savedSettings();
  const form = formFromSettings(stored);
  // Different property ordering is what caused the original false positive.
  assert.notEqual(JSON.stringify(effectiveForm(form)), JSON.stringify(stored));
  assert.equal(hasUnsavedSettings(form, stored), false);
});

test("new local image selection is unsaved until the save succeeds", () => {
  const stored = savedSettings({ heroImageUrl: "", heroImageKitFileId: "", heroImageKitFilePath: "" });
  const form = formFromSettings(stored);
  assert.equal(hasUnsavedSettings(form, stored), false);
  assert.equal(hasUnsavedSettings(form, stored, { name: "new-dog.webp" }), true);
  const updated = savedSettings();
  assert.equal(hasUnsavedSettings(formFromSettings(updated), updated), false);
});

test("real changes to homepage image and delivery rules remain detected", () => {
  const stored = savedSettings();
  const changedImage = formFromSettings(stored);
  changedImage.heroImageUrl = "";
  changedImage.heroImageKitFileId = "";
  changedImage.heroImageKitFilePath = "";
  assert.equal(hasUnsavedSettings(changedImage, stored), true);

  const changedDelivery = formFromSettings(stored);
  changedDelivery.deliveryFee = "45";
  assert.equal(hasUnsavedSettings(changedDelivery, stored), true);
  changedDelivery.deliveryFee = "35";
  assert.equal(hasUnsavedSettings(changedDelivery, stored), false);
});

test("form comparison is independent of server settings field insertion order", () => {
  const stored = savedSettings();
  const differentlyOrdered = {
    notifications: { newOrderPush: true },
    general: {
      heroImageKitFilePath: stored.general.heroImageKitFilePath,
      heroImageKitFileId: stored.general.heroImageKitFileId,
      heroImageUrl: stored.general.heroImageUrl,
      supportPhone: stored.general.supportPhone,
      supportEmail: stored.general.supportEmail,
      displayName: stored.general.displayName,
    },
    checkout: { freeDeliveryThreshold: 1200, deliveryFee: 35 },
  };
  assert.equal(hasUnsavedSettings(formFromSettings(stored), differentlyOrdered), false);
});
