# Firestore security check before deployment

Cloud Functions use the Firebase Admin SDK; callers need the verified `petcareAdmin` custom claim. They do NOT require browser access to the administrative collections.

The following are **example rules to integrate inside your existing** `match /databases/{database}/documents` block. Review ALL existing wildcard rules before deployment:

```
match /adminUserProfiles/{uid} { allow read, write: if false; }
match /adminPetSummaries/{petId} { allow read, write: if false; }
match /adminOrders/{orderId} { allow read, write: if false; }
match /adminProducts/{productId} { allow read, write: if false; }
match /adminAuditLogs/{entryId} { allow read, write: if false; }
```

**Firestore rule matches are OR-combined.** An overly broad rule such as `match /{document=**} { allow read: if request.auth != null; }` still permits reads, even when a narrower matching rule says `false`. Inspect and correct overly broad permissive matches instead of assuming a more-specific deny overrides them.

These collections are private until a future approved storefront/checkout implementation explicitly grants the minimum customer access needed, e.g., owners reading their own orders. The ZIP does not change or deploy any Firestore rules automatically.
