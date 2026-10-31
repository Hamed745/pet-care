import { adminApi } from "./adminApi.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateProductImage(file) {
  if (!file) return "";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return "";
}

function safeFileName(file) {
  const extension = file.type === "image/jpeg" ? "jpg"
    : file.type === "image/png" ? "png" : "webp";
  const base = String(file.name || "product-image")
    .replace(/\\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "product-image";
  const suffix = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}.${extension}`;
}

export async function uploadProductImage(file, onProgress = () => {}) {
  const validationError = validateProductImage(file);
  if (validationError) throw new Error(validationError);

  // The backend verifies the Firebase admin claim and signs a short-lived
  // ImageKit upload request. The private API key never reaches the browser.
  const auth = await adminApi.imageKitUploadAuth();
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", safeFileName(file));
  form.append("publicKey", auth.publicKey);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("signature", auth.signature);
  form.append("folder", "/petcare/products");
  form.append("useUniqueFileName", "true");

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { data = {}; }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.message || data.help || `Image upload failed (${xhr.status}).`));
        return;
      }
      if (!data.url || !data.fileId) {
        reject(new Error("ImageKit returned an incomplete upload response."));
        return;
      }
      onProgress(100);
      resolve(data);
    };
    xhr.onerror = () => reject(new Error("Could not connect to ImageKit. Check your internet connection and try again."));
    xhr.ontimeout = () => reject(new Error("Image upload timed out. Try a smaller image or try again."));
    xhr.onabort = () => reject(new Error("Image upload was cancelled."));
    xhr.send(form);
  });

  return {
    imageUrl: result.url,
    imageKitFileId: result.fileId,
    imageKitFilePath: result.filePath || "",
  };
}

export async function deleteProductImage(fileId) {
  if (!fileId) return;
  await adminApi.deleteImageKitFile(fileId);
}
