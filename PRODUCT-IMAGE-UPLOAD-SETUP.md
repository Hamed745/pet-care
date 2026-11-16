# PetCare product image uploads

The admin product form now accepts a photo from the administrator's computer. The browser uploads the selected file to Firebase Storage, obtains a download URL, and saves that URL and its Storage path with the product in Firestore. Customers can then see the image from the public storefront; the file is not kept only on the administrator's local computer.

## Supported files

- JPEG/JPG, PNG, and WebP
- Maximum file size: 5 MB
- Upload progress and an image preview are shown in the product form.
- A manually entered HTTPS image URL remains available as an optional fallback.

## Firebase setup

1. Open the Firebase project used by PetCare and confirm that **Storage** is enabled and the default bucket exists.
2. From the repository root, deploy the included Storage rules to the same Firebase project:
   ```powershell
   npx firebase-tools deploy --only storage --project pet-care-d663b
   ```
   If Firebase CLI asks you to sign in, sign in with an account that has permission to manage Firebase Storage rules.
3. The existing frontend `VITE_FIREBASE_STORAGE_BUCKET` setting must point to that project's bucket. No service-account JSON or private VAPID key is needed in the frontend.
4. Deploy the frontend and Render API changes from this branch. The Render API validates and stores the uploaded file path with the product record.

## Security

- Product image reads are public so shoppers can see published product photos.
- Upload, replacement, and deletion require a signed-in account with the verified `petcareAdmin: true` Firebase custom claim.
- Each administrator can write only within their own `products/{uid}/` folder.
- Storage rules accept only JPEG, PNG, or WebP files up to 5 MB.
- Firebase Admin service-account credentials remain on the Backend and are not used by the browser upload flow.

## Admin workflow

1. Open Admin Dashboard → Products → Add product (or edit an existing product).
2. Select **Choose from computer** or drag an image into the upload area.
3. Check the preview and upload progress.
4. Save the product. The uploaded image is stored in Firebase Storage and its download URL is saved automatically.
5. Publish the product to make it visible in the public store.

If Storage is not enabled for the Firebase project, enable it in Firebase Console first, then deploy the included rules.
