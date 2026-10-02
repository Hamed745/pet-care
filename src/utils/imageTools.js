import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from "../config.js";

export function validateImageFile(file) {
  if (!file) return "";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Choose a PNG, JPEG, or WebP image.";
  if (file.size > MAX_UPLOAD_SIZE) return "Photo must be 5 MB or smaller.";
  return "";
}

export function compressImageFile(file, { maxSide = 800, square = false, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const width = square ? maxSide : Math.max(1, Math.round(sourceWidth * scale));
      const height = square ? maxSide : Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Photo could not be processed.")); return; }
      if (square) {
        const cropSide = Math.min(sourceWidth, sourceHeight);
        const sourceX = (sourceWidth - cropSide) / 2;
        const sourceY = (sourceHeight - cropSide) / 2;
        context.drawImage(image, sourceX, sourceY, cropSide, cropSide, 0, 0, width, height);
      } else {
        context.drawImage(image, 0, 0, width, height);
      }
      try { resolve(canvas.toDataURL("image/jpeg", quality)); }
      catch (error) { reject(error); }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Photo could not be read.")); };
    image.src = objectUrl;
  });
}