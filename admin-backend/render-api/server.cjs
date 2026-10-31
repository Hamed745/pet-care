"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PORT = Number(process.env.PORT || 10000);
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
const emulatorMode = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
);

function initializeFirebaseAdmin() {
  if (getApps().length) return;

  if (rawServiceAccount) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
    }
    initializeApp({
      credential: cert(serviceAccount),
      projectId: PROJECT_ID || serviceAccount.project_id,
    });
    return;
  }

  if (emulatorMode) {
    initializeApp({ projectId: PROJECT_ID || "demo-petcare" });
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
      ...(PROJECT_ID ? { projectId: PROJECT_ID } : {}),
    });
    return;
  }

  throw new Error(
    "Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON in Render."
  );
}

initializeFirebaseAdmin();

const auth = getAuth();
const db = getFirestore();
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  optionsSuccessStatus: 204,
};

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  })
);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const sanitize = (value, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const stamp = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return String(value).slice(0, 60);
};

const unwrap = (doc) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    createdAt: stamp(data.createdAt),
    updatedAt: stamp(data.updatedAt),
    history: Array.isArray(data.history)
      ? data.history.map((item) => ({ ...item, at: stamp(item.at) }))
      : [],
  };
};

const count = async (collectionName) =>
  (await db.collection(collectionName).count().get()).data().count;

const audit = (actorUid, action, targetId, reason = "") =>
  db.collection("adminAuditLogs").add({
    actorUid,
    action,
    targetId,
    reason: sanitize(reason, 300),
    createdAt: FieldValue.serverTimestamp(),
  });

const authenticate = asyncRoute(async (req, res, next) => {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Sign in first.");

  try {
    req.authUser = await auth.verifyIdToken(match[1], true);
  } catch {
    throw new HttpError(401, "Your session is invalid or expired. Sign in again.");
  }
  return next();
});

const requireAdmin = (req, res, next) => {
  if (req.authUser?.petcareAdmin !== true) {
    return next(new HttpError(403, "Admin permissions required."));
  }
  return next();
};

const adminRoute = (handler) => [authenticate, requireAdmin, asyncRoute(handler)];
const signedInRoute = (handler) => [authenticate, asyncRoute(handler)];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "petcare-admin-api" });
});

app.get(
  "/api/admin/overview",
  ...adminRoute(async (_req, res) => {
    let usersCount = 0;
    let disabledCount = 0;
    const existingUserUids = new Set();
    let pageToken;
    let limitReached = false;

    do {
      const batch = await auth.listUsers(1000, pageToken);
      usersCount += batch.users.length;
      disabledCount += batch.users.filter((user) => user.disabled).length;
      batch.users.forEach((user) => existingUserUids.add(user.uid));
      pageToken = batch.pageToken;
    } while (pageToken && usersCount < 10000);

    if (pageToken) limitReached = true;

    // Deleting an Authentication user does not automatically remove Firestore
    // documents. Exclude orphaned profiles and pets from live dashboard figures.
    const [profilesSnap, petsSnap] = await Promise.all([
      db.collection("adminUserProfiles").limit(10000).get(),
      db.collection("adminPetSummaries").select("ownerUid").limit(10000).get(),
    ]);
    const cityCounts = new Map();
    let profilesWithCity = 0;

    profilesSnap.forEach((doc) => {
      if (!existingUserUids.has(doc.id)) return;
      const city = sanitize(doc.data().city, 100);
      if (!city) return;
      profilesWithCity += 1;
      const key = city.toLocaleLowerCase("ru-RU");
      const existing = cityCounts.get(key);
      cityCounts.set(key, {
        city: existing?.city || city,
        count: (existing?.count || 0) + 1,
      });
    });

    const cities = [...cityCounts.values()]
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
      .slice(0, 100);

    const petsCount = petsSnap.docs.filter((doc) =>
      existingUserUids.has(doc.data().ownerUid)
    ).length;

    const [productsCount, ordersCount, activeSnap, recentSnap] =
      await Promise.all([
        count("adminProducts"),
        count("adminOrders"),
        db
          .collection("adminOrders")
          .where("status", "in", [
            "pending",
            "confirmed",
            "preparing",
            "out_for_delivery",
            "ready_for_pickup",
          ])
          .count()
          .get(),
        db.collection("adminOrders").orderBy("createdAt", "desc").limit(5).get(),
      ]);

    res.json({
      usersCount,
      disabledCount,
      petsCount,
      productsCount,
      ordersCount,
      activeOrders: activeSnap.data().count,
      profilesWithCity,
      cities,
      recentOrders: recentSnap.docs.map(unwrap),
      partial: limitReached || profilesSnap.size === 10000 || petsSnap.size === 10000,
    });
  })
);

app.get(
  "/api/admin/users",
  ...adminRoute(async (req, res) => {
    const token = sanitize(req.query.pageToken, 2000) || undefined;
    let list;
    try {
      list = await auth.listUsers(100, token);
    } catch {
      throw new HttpError(400, "Invalid pagination token.");
    }

    const refs = list.users.map((user) => db.doc(`adminUserProfiles/${user.uid}`));
    const profiles = refs.length ? await db.getAll(...refs) : [];

    res.json({
      users: list.users.map((user, index) => ({
        uid: user.uid,
        email: user.email || "",
        name: profiles[index]?.data()?.name || user.displayName || "",
        city: profiles[index]?.data()?.city || "",
        disabled: user.disabled,
        createdAt: user.metadata?.creationTime || "",
      })),
      nextPageToken: list.pageToken || "",
    });
  })
);

app.get(
  "/api/admin/pets",
  ...adminRoute(async (_req, res) => {
    const docs = await db.collection("adminPetSummaries").limit(250).get();
    const ownerUids = [...new Set(docs.docs.map((doc) => doc.data().ownerUid).filter(Boolean))];
    const existingOwners = new Set();
    for (let index = 0; index < ownerUids.length; index += 100) {
      const result = await auth.getUsers(
        ownerUids.slice(index, index + 100).map((uid) => ({ uid }))
      );
      result.users.forEach((user) => existingOwners.add(user.uid));
    }
    res.json({
      pets: docs.docs.filter((doc) => existingOwners.has(doc.data().ownerUid)).map(unwrap),
      limited: docs.size === 250,
    });
  })
);

app.get(
  "/api/admin/orders",
  ...adminRoute(async (_req, res) => {
    const docs = await db
      .collection("adminOrders")
      .orderBy("createdAt", "desc")
      .limit(250)
      .get();
    res.json({ orders: docs.docs.map(unwrap), limited: docs.size === 250 });
  })
);

app.get(
  "/api/admin/products",
  ...adminRoute(async (_req, res) => {
    const docs = await db
      .collection("adminProducts")
      .orderBy("updatedAt", "desc")
      .limit(300)
      .get();
    res.json({ products: docs.docs.map(unwrap), limited: docs.size === 300 });
  })
);

app.get(
  "/api/admin/activity",
  ...adminRoute(async (_req, res) => {
    const docs = await db
      .collection("adminAuditLogs")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    res.json({ logs: docs.docs.map(unwrap) });
  })
);

app.post(
  "/api/admin/users/:uid/suspension",
  ...adminRoute(async (req, res) => {
    const actorUid = req.authUser.uid;
    const uid = sanitize(req.params.uid, 128);
    const disabled = req.body?.disabled;
    const reason = sanitize(req.body?.reason, 300);

    if (!uid || uid === actorUid || typeof disabled !== "boolean" || reason.length < 5) {
      throw new HttpError(400, "Specify a different user, action and reason (5+ chars).");
    }

    let target;
    try {
      target = await auth.getUser(uid);
    } catch {
      throw new HttpError(404, "Account not found.");
    }

    if (target.customClaims?.petcareAdmin === true) {
      throw new HttpError(409, "Another admin account cannot be suspended with this action.");
    }

    await auth.updateUser(uid, { disabled });
    if (disabled) await auth.revokeRefreshTokens(uid);
    await audit(actorUid, disabled ? "user.suspend" : "user.restore", uid, reason);
    res.json({ ok: true });
  })
);

const transitions = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "ready_for_pickup", "cancelled"],
  out_for_delivery: ["delivered"],
  ready_for_pickup: ["picked_up"],
  delivered: [],
  picked_up: [],
  cancelled: [],
  rejected: [],
};

app.post(
  "/api/admin/orders/:orderId/status",
  ...adminRoute(async (req, res) => {
    const actorUid = req.authUser.uid;
    const orderId = sanitize(req.params.orderId, 128);
    const status = sanitize(req.body?.status, 40);
    const note = sanitize(req.body?.note, 250);

    if (!orderId || !Object.hasOwn(transitions, status)) {
      throw new HttpError(400, "Invalid order or status.");
    }

    const ref = db.collection("adminOrders").doc(orderId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new HttpError(404, "Order not found.");

      const record = snap.data();
      const previous = record.status || "pending";
      if (!(transitions[previous] || []).includes(status)) {
        throw new HttpError(409, `Status transition ${previous} -> ${status} is not allowed.`);
      }
      if (status === "out_for_delivery" && record.fulfilment === "pickup") {
        throw new HttpError(409, "Pickup orders cannot be shipped.");
      }
      if (status === "ready_for_pickup" && record.fulfilment === "delivery") {
        throw new HttpError(409, "Delivery orders cannot use store pickup.");
      }

      const history = [...(record.history || []).slice(-99), {
        status,
        at: new Date().toISOString(),
        by: actorUid,
        note,
      }];
      transaction.update(ref, {
        status,
        history,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await audit(actorUid, "order.status", orderId, `${status}${note ? `: ${note}` : ""}`);
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/products",
  ...adminRoute(async (req, res) => {
    const actorUid = req.authUser.uid;
    const product = req.body?.product || {};
    const name = sanitize(product.name, 120);
    const category = sanitize(product.category, 100);
    const petType = sanitize(product.petType, 40);
    const description = sanitize(product.description, 1500);
    const imageUrl = sanitize(product.imageUrl, 1000);
    const price = Number(product.price);
    const stock = Number(product.stock);
    const published = product.published === true;

    if (
      !name ||
      !category ||
      !["dog", "cat", "bird", "fish", "small"].includes(petType) ||
      !Number.isInteger(price) || price < 0 || price > 10000000 ||
      !Number.isInteger(stock) || stock < 0 || stock > 10000000
    ) {
      throw new HttpError(400, "Invalid product fields.");
    }

    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      throw new HttpError(400, "Product image must be an HTTPS URL.");
    }

    const suppliedId = Boolean(product.id);
    const id = suppliedId ? sanitize(product.id, 120) : db.collection("adminProducts").doc().id;
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
      throw new HttpError(400, "Invalid product ID.");
    }

    const ref = db.collection("adminProducts").doc(id);
    if (suppliedId && !(await ref.get()).exists) {
      throw new HttpError(404, "Product does not exist.");
    }

    await ref.set({
      name,
      category,
      petType,
      description,
      imageUrl,
      price,
      stock,
      published,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid,
      ...(!suppliedId ? { createdAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: true });

    await audit(actorUid, suppliedId ? "product.update" : "product.create", id);
    res.json({ ok: true, id });
  })
);

app.post(
  "/api/profile/sync",
  ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const profile = req.body?.profile || {};
    const city = sanitize(profile.city, 100);
    const name = sanitize(profile.name, 100);
    const phone = sanitize(profile.phone, 30);
    const patch = { updatedAt: FieldValue.serverTimestamp() };

    if (city) patch.city = city;
    if (name) patch.name = name;
    if (phone) patch.phone = phone;

    if (Object.keys(patch).length === 1) {
      res.json({ ok: true, skipped: true });
      return;
    }

    await db.collection("adminUserProfiles").doc(uid).set(patch, { merge: true });
    res.json({ ok: true });
  })
);

app.post(
  "/api/pets/sync",
  ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const pet = req.body?.pet || {};
    const petId = sanitize(String(pet.id || ""), 80);
    const name = sanitize(pet.name, 100);
    const type = sanitize(pet.type, 60);
    const breed = sanitize(pet.breed, 100);
    const age = Number(pet.age);

    if (!/^[\w-]{1,80}$/.test(petId) || !name || !type || !Number.isFinite(age) || age < 0 || age > 120) {
      throw new HttpError(400, "Invalid pet data.");
    }

    if (petId === "1" && name === "Luna") {
      res.json({ ok: true, skipped: true });
      return;
    }

    const ownerDoc = await db.collection("adminUserProfiles").doc(uid).get();
    await db.collection("adminPetSummaries").doc(`${uid}_${petId}`).set({
      ownerUid: uid,
      ownerName: ownerDoc.data()?.name || "",
      name,
      type,
      breed,
      age,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true });
  })
);

app.delete(
  "/api/pets/:petId",
  ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const petId = sanitize(req.params.petId, 80);
    if (!/^[\w-]{1,80}$/.test(petId)) throw new HttpError(400, "Invalid pet ID.");
    await db.collection("adminPetSummaries").doc(`${uid}_${petId}`).delete();
    res.json({ ok: true });
  })
);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Origin not allowed by CORS") {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large." });
    return;
  }
  console.error("[petcare-admin-api]", error?.code || error?.message || "Unknown error");
  res.status(500).json({ error: "Internal server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PetCare Admin API listening on port ${PORT}`);
  });
}

module.exports = app;
