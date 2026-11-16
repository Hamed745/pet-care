# Local Firebase emulator workflow

The local profile is isolated to the `demo-petcare` project and loopback emulator ports. It uses demo Firebase client settings, does not load production service-account credentials, and skips App Check only in the explicit local emulator mode. The production Firebase configuration remains unchanged.

## Requirements

- Node.js 20 or later for the installed Firebase CLI. The backend package currently declares Node 22.
- A JDK 11 or later for the Firestore Emulator. JDK 21 LTS is recommended.

Install a JDK explicitly (for example, download Eclipse Temurin 21 from [Adoptium](https://adoptium.net/temurin/releases/?version=21)). After installation, set `JAVA_HOME` to the JDK directory and add `%JAVA_HOME%\bin` to your user `Path`; open a new PowerShell window and verify with `java -version`. Java was not installed automatically by this project setup.

## Start the local system

Open four PowerShell terminals at the project root:

1. Start Firebase Auth, Firestore, and Emulator UI:
   ```powershell
   npm.cmd run dev:emulators
   ```
2. Start the Express API in explicit emulator mode:
   ```powershell
   npm.cmd run dev:api:emulator
   ```
3. Start the frontend with demo-only Firebase settings:
   ```powershell
   npm.cmd run dev:maps:web:emulator
   ```
4. Run the authenticated integration workflow using synthetic accounts and records:
   ```powershell
   npm.cmd run test:emulators
   ```

The emulator UI is at `http://127.0.0.1:4000`, Auth at `127.0.0.1:9099`, Firestore at `127.0.0.1:8080`, the API at `127.0.0.1:10000`, and the frontend at `http://localhost:5190`.

The integration workflow refuses to run unless the `demo-petcare` project and both emulator host variables are set. It creates and removes synthetic users, a clinic application, appointments, products, orders, and audit entries. Clinic document fixtures use a separate in-process test provider; only their generated metadata is written to the Firestore Emulator. Use synthetic or redacted PDF/JPEG/PNG files and never real identity documents. Firestore emulator security rules deny all client access; the trusted local Admin SDK API accesses the emulator normally.

The optional `npm.cmd --prefix admin-backend/render-api run test:supabase:integration` is separate from the Firebase E2E suite. It skips when backend-only Supabase credentials are missing, verifies the bucket is private, and cleans up only its own synthetic test object.

Run the non-emulator unit suite and production build with:

```powershell
npm.cmd test
npm.cmd run build
```
