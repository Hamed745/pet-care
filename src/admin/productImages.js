import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app, auth } from "../firebase.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
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

export async function uploadProductImage(file, onProgress = () => {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with an administrator account before uploading.");
  const validationError = validateProductImage(file);
  if (validationError) throw new Error(validationError);

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const path = `products/${user.uid}/${uniqueId}.${extension}`;
  const storageRef = ref(getStorage(app), path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: user.uid,
      purpose: "petcare-product-image",
    },
  });

  const snapshot = await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (progress) => {
        const percent = progress.totalBytes
          ? Math.round((progress.bytesTransferred / progress.totalBytes) * 100)
          : 0;
        onProgress(percent);
      },
      reject,
      () => resolve(task.snapshot),
    );
  });

  const imageUrl = await getDownloadURL(snapshot.ref);
  return { imageUrl, imageStoragePath: path };
}

export async function deleteProductImage(path) {
  const user = auth.currentUser;
  if (!user || typeof path !== "string" || !path.startsWith(`products/${user.uid}/`)) {
    return;
  }
  await deleteObject(ref(getStorage(app), path));
}
