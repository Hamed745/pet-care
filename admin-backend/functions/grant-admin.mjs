import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const uid = process.argv[2];
if (!uid || uid.length < 10 || uid.includes('@')) {console.error('Usage: node scripts/grant-admin.mjs <FIREBASE_AUTH_UID>'); process.exit(1);}
initializeApp({credential:applicationDefault()});
try {
 const auth=getAuth();const user=await auth.getUser(uid);
 const otherClaims=user.customClaims||{};
 await auth.setCustomUserClaims(uid,{...otherClaims,petcareAdmin:true});
 await auth.revokeRefreshTokens(uid);
 console.log(`Admin custom claim granted to Firebase Auth UID: ${uid}. Sign out, then sign in again.`);
} catch (error) {console.error(`Grant failed: ${error.code||error.message}`);process.exitCode=1;}
