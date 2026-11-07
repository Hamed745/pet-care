export const formFromSettings = (settings) => ({
  displayName: settings.general.displayName,
  heroImageUrl: settings.general.heroImageUrl || "",
  heroImageKitFileId: settings.general.heroImageKitFileId || "",
  heroImageKitFilePath: settings.general.heroImageKitFilePath || "",
  supportEmail: settings.general.supportEmail,
  supportPhone: settings.general.supportPhone,
  deliveryFee: String(settings.checkout.deliveryFee),
  freeDeliveryThreshold: String(settings.checkout.freeDeliveryThreshold),
  newOrderPush: settings.notifications.newOrderPush,
});

export const effectiveForm = (form) => ({
  general: {
    displayName: form.displayName.trim(),
    heroImageUrl: form.heroImageUrl,
    heroImageKitFileId: form.heroImageKitFileId,
    heroImageKitFilePath: form.heroImageKitFilePath,
    supportEmail: form.supportEmail.trim(),
    supportPhone: form.supportPhone.trim(),
  },
  checkout: {
    deliveryFee: Number(form.deliveryFee),
    freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
  },
  notifications: {
    newOrderPush: form.newOrderPush,
  },
});

// Compare canonical settings values, not raw JSON objects whose property order
// can differ between Firestore and the edit form after saving the hero photo.
export const hasUnsavedSettings = (form, settings, selectedHero = null) =>
  Boolean(selectedHero) || Boolean(form && settings &&
    JSON.stringify(effectiveForm(form)) !==
      JSON.stringify(effectiveForm(formFromSettings(settings))));
