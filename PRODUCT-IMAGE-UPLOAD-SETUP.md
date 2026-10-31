# PetCare product image uploads (ImageKit)

The admin product form lets an administrator select or drag a product photo from their computer. The browser requests short-lived upload authentication from the PetCare Admin API, uploads the file directly to ImageKit, then saves the returned URL and ImageKit file ID with the product in Firestore.

## Supported files

- JPEG/JPG, PNG, and WebP
- Maximum file size: 5 MB
- Image preview and upload progress are shown in the product form.
- A manually entered HTTPS image URL remains available as a fallback.
- Replacing an ImageKit photo removes the old asset after the product record has been saved.

## ImageKit setup

In the ImageKit dashboard, open Developer → API Keys and Configuration → URL endpoints.

Add these environment variables to the Backend Vercel project (petcare-api), not the frontend project:

| Variable | Value |
| --- | --- |
| IMAGEKIT_PUBLIC_KEY | The account's public_ key |
| IMAGEKIT_PRIVATE_KEY | The account's private_ key |
| IMAGEKIT_URL_ENDPOINT | The account URL endpoint, e.g. https://ik.imagekit.io/your_imagekit_id/ |

Set them for Production (and Preview if you test preview deployments). Never add the private key to a VITE_ variable, the frontend project, GitHub, or a chat message.

After adding or changing Backend environment variables, redeploy the Backend.

## How the secure upload works

1. The admin signs in with the existing PetCare account.
2. The frontend asks the Backend for upload authentication.
3. The Backend verifies the Firebase ID token and the petcareAdmin: true custom claim.
4. The Backend signs a short-lived ImageKit upload token using IMAGEKIT_PRIVATE_KEY.
5. The browser uploads the image to ImageKit using the public key and short-lived signature.
6. The Backend saves the ImageKit URL, file ID, and file path with the product in Firestore.
7. When an image is replaced, the Backend deletes the old ImageKit asset after the product save succeeds.

The private API key remains on the Backend. The frontend does not need an ImageKit SDK or a Firebase Storage bucket.

## Deployment and testing

1. Merge this change into main.
2. Pull the latest main locally:
   powershell: git pull --ff-only origin main
3. Add the three ImageKit variables to the Backend Vercel project and redeploy it.
4. Wait for both Backend and Frontend Vercel deployments to become Ready.
5. Open Admin Dashboard → Products → Add product.
6. Select a JPG, PNG, or WebP image up to 5 MB and save the product.
7. Confirm the image URL opens, the product appears in the storefront, and the image remains after a page refresh.
8. Edit the product with another image and verify the new image appears and the old asset is deleted.

## Notes

- No Firebase Storage setup or Firebase Blaze upgrade is required for product photos.
- Firestore remains the product database; ImageKit stores only media files.
- Existing Firebase Authentication, Firestore data, inventory, and order workflows remain unchanged.
