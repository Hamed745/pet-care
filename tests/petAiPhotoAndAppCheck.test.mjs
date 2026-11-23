import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePetPhoto, MAX_PET_PHOTO_BYTES, ACCEPTED_PET_PHOTO_TYPES } from "../src/services/petAiPhoto.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("photo upload validates type, size and empty files before image processing", () => {
  assert.deepEqual(ACCEPTED_PET_PHOTO_TYPES,["image/jpeg","image/png","image/webp"]);
  assert.equal(validatePetPhoto({type:"image/jpeg",size:250_000}), true);
  assert.equal(validatePetPhoto({type:"image/webp",size:MAX_PET_PHOTO_BYTES}), true);
  for (const type of ["image/svg+xml","application/pdf","text/html","image/gif",""]) {
    assert.throws(()=>validatePetPhoto({type,size:200}), /JPG, PNG or WebP/);
  }
  for (const size of [0,NaN,-1,MAX_PET_PHOTO_BYTES+1]) {
    assert.throws(()=>validatePetPhoto({type:"image/png",size}), /smaller than 6 MB/);
  }
});

test("photo processing uses a canvas to discard EXIF and bounds submitted image size", () => {
  const image=read("src/services/petAiPhoto.js");
  assert.match(image,/createImageBitmap\(file\)/);
  assert.match(image,/1280 \/ Math\.max\(bitmap\.width, bitmap\.height\)/);
  assert.match(image,/context\.drawImage\(bitmap/);
  assert.match(image,/canvas\.toDataURL\("image\/jpeg"/);
  assert.match(image,/MAX_PET_INLINE_BYTES/);
  assert.match(image,/bitmap\?\.close\?\.\(\)/);
  assert.doesNotMatch(image,/uploadBytes|fetch\(|localStorage|putObject|FileReader/);
});

test("Gemini image chat sends inlineData with a real user prompt and verified App Check token", () => {
  const service=read("src/services/petAiService.js");
  const attestation=read("src/firebaseAppCheck.js");
  assert.match(service,/await verifyFirebaseAiAppCheck\(\)/);
  assert.match(attestation,/await getToken\(instance\)/);
  assert.match(service,/imagePart \? \[text \|\|/);
  assert.match(service,/chat\.sendMessageStream\(request,/);
  assert.match(service,/mimeType|imagePart/);
  assert.match(service,/cannot establish a veterinary diagnosis/);
  assert.match(service,/reply naturally in the user's language/i);
});

test("chat composer shows file chooser, preview, removal, safe default and retry including photo", () => {
  const widget=read("src/components/ChatWidget.jsx");
  assert.match(widget,/accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(widget,/await preparePetPhoto\(imageFile\)/);
  assert.match(widget,/URL\.createObjectURL\(imageFile\)/);
  assert.match(widget,/URL\.revokeObjectURL\(url\)/);
  assert.match(widget,/labels\.photoDefault/);
  assert.match(widget,/retryImagePart: imagePart/);
  assert.match(widget,/imagePart: message\.retryImagePart/);
  assert.match(widget,/message\.imagePreview/);
  assert.match(widget,/photoHelp/);
});

test("secure AI failure is actionable, not hidden or solved by disabling App Check", () => {
  const service=read("src/services/petAiService.js");
  const startup=read("src/main.jsx");
  assert.match(service,/Secure AI verification failed/);
  assert.match(service,/reCAPTCHA Enterprise configuration/);
  assert.match(startup,/initializeFirebaseAppCheck/);
  assert.doesNotMatch(service,/FIREBASE_APPCHECK_DEBUG_TOKEN|AIza|sk_live_/);
});
