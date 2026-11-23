// Image input remains in the browser. No image is uploaded to PetCare storage.
// The compressed base64 payload is sent only to Firebase AI Logic for this turn.
export const MAX_PET_PHOTO_BYTES = 6 * 1024 * 1024;
export const MAX_PET_INLINE_BYTES = 1800 * 1024;
export const ACCEPTED_PET_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePetPhoto(file) {
  if (!file || !ACCEPTED_PET_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP photo of your pet.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PET_PHOTO_BYTES) {
    throw new Error("Photo must be smaller than 6 MB. Please choose a smaller JPG, PNG or WebP image.");
  }
  return true;
}

export async function preparePetPhoto(file) {
  validatePetPhoto(file);
  if (typeof createImageBitmap !== "function") {
    throw new Error("Your browser cannot prepare pet photos. Please try an updated browser.");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 100_000_000) {
      throw new Error("This photo is too large to process safely.");
    }
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the selected photo.");
    // Canvas conversion removes EXIF metadata, including GPS coordinates.
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.78, 0.58, 0.40]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const data = dataUrl.split(",")[1];
      if (data && Math.floor(data.length * 3 / 4) <= MAX_PET_INLINE_BYTES) {
        return { inlineData: { mimeType: "image/jpeg", data } };
      }
    }
    throw new Error("This photo is too detailed to send securely. Please use a smaller photo.");
  } catch (error) {
    if (error instanceof Error && /photo|browser|image/i.test(error.message)) throw error;
    throw new Error("Could not open this photo. Please choose a valid JPG, PNG or WebP file.");
  } finally {
    bitmap?.close?.();
  }
}
