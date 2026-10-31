"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createHash, createHmac, randomUUID } = require("node:crypto");
const { summarizeOrders, summarizeGeography, makeOrderNotifications, hideInternalOrderCosts } = require("./adminInsights.cjs");
const { initializeApp, cert, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

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

// Cost of goods is an admin-only accounting field. Never expose it to buyers.
const publicOrder = (doc) => hideInternalOrderCosts(unwrap(doc));

const loadRecentOrders = async (limit = 2000) => {
  const docs = await db.collection("adminOrders").orderBy("createdAt", "desc").limit(limit).get();
  return { orders: docs.docs.map(unwrap), limited: docs.size === limit };
};

async function listExistingAccountIds() {
  const ids = new Set();
  let disabledCount = 0;
  let token;
  do {
    const batch = await auth.listUsers(1000, token);
    batch.users.forEach((user) => ids.add(user.uid));
    disabledCount += batch.users.filter((user) => user.disabled).length;
    token = batch.pageToken;
  } while (token && ids.size < 10000);
  return { ids, disabledCount, limited: Boolean(token) };
}

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

const PUSH_TOKEN_COLLECTION = "adminPushTokens";
const invalidPushTokenCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const pushTokenDocumentId = (token) =>
  createHash("sha256").update(token).digest("hex");

async function sendPushToTokenDocs(tokenDocs, data) {
  const validDocs = tokenDocs.filter((doc) => {
    const token = doc.data()?.token;
    return typeof token === "string" && token.length >= 50 && token.length <= 4096;
  });
  let successCount = 0;
  let failureCount = tokenDocs.length - validDocs.length;

  for (let index = 0; index < validDocs.length; index += 500) {
    const batch = validDocs.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((doc) => doc.data().token),
      data,
      webpush: { headers: { TTL: "3600", Urgency: "high" } },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    const staleRefs = response.responses
      .map((result, resultIndex) => ({
        result,
        ref: batch[resultIndex].ref,
      }))
      .filter(({ result }) =>
        !result.success && invalidPushTokenCodes.has(result.error?.code)
      )
      .map(({ ref }) => ref);

    await Promise.all(staleRefs.map((ref) => ref.delete().catch(() => {})));
  }

  return { successCount, failureCount };
}

async function sendNewOrderPush(order) {
  const snapshot = await db.collection(PUSH_TOKEN_COLLECTION).limit(2000).get();
  if (snapshot.empty) return { successCount: 0, failureCount: 0 };

  const candidateDocs = snapshot.docs.filter((doc) => {
    const data = doc.data() || {};
    return typeof data.uid === "string" && data.uid &&
      typeof data.token === "string" && data.token.length >= 50;
  });
  const adminUids = [...new Set(candidateDocs.map((doc) => doc.data().uid))];
  const statuses = await Promise.all(adminUids.map(async (uid) => {
    try {
      const user = await auth.getUser(uid);
      return [uid, user.disabled !== true && user.customClaims?.petcareAdmin === true ? true : false];
    } catch (error) {
      if (error?.code === "auth/user-not-found") return [uid, false];
      console.warn("[order push] Could not verify admin account:", error?.code || "unknown");
      return [uid, null];
    }
  }));
  const statusByUid = new Map(statuses);
  const staleDocs = candidateDocs.filter((doc) => statusByUid.get(doc.data().uid) === false);
  await Promise.all(staleDocs.map((doc) => doc.ref.delete().catch(() => {})));

  const activeDocs = candidateDocs.filter((doc) => statusByUid.get(doc.data().uid) === true);
  if (!activeDocs.length) return { successCount: 0, failureCount: 0 };

  const total = Number.isFinite(order.total) ? Math.max(0, Math.round(order.total)) : 0;
  return sendPushToTokenDocs(activeDocs, {
    type: "new_order",
    title: "New PetCare order",
    body: `Order #${String(order.id)} · RUB ${total.toLocaleString("en-US")}`,
    orderId: String(order.id),
    url: "/admin?section=notifications",
    tag: `petcare-new-order-${String(order.id)}`,
  });
}

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

// The public shop is intentionally empty until an administrator publishes products.
app.get(
  "/api/store/products",
  asyncRoute(async (_req, res) => {
    const docs = await db.collection("adminProducts").where("published", "==", true).limit(300).get();
    res.set("Cache-Control", "no-store");
    res.json({
      products: docs.docs.map((doc) => {
        const p = doc.data();
        return {
          id: doc.id, name: p.name, category: p.category, petType: p.petType,
          description: p.description || "", imageUrl: p.imageUrl || "",
          price: p.price, stock: p.stock, createdAt: stamp(p.createdAt),
        };
      }),
      limited: docs.size === 300,
    });
  })
);

app.get(
  "/api/store/orders",
  ...signedInRoute(async (req, res) => {
    const docs = await db.collection("adminOrders")
      .where("userId", "==", req.authUser.uid).limit(100).get();
    const orders = docs.docs.map(publicOrder).sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    res.set("Cache-Control", "no-store");
    res.json({ orders, limited: docs.size === 100 });
  })
);

app.post(
  "/api/store/orders",
  ...signedInRoute(async (req, res) => {
    const uid = req.authUser.uid;
    const requestId = sanitize(req.body?.requestId, 50);
    const rawItems = req.body?.items;
    const address = req.body?.address || {};
    const name = sanitize(address.name, 100);
    const phone = sanitize(address.phone, 30);
    const city = sanitize(address.city, 100);
    const street = sanitize(address.address, 250);

    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !Array.isArray(rawItems) ||
        rawItems.length < 1 || rawItems.length > 30 || !name || !city || !street ||
        !/^[+()\d\s-]{7,30}$/.test(phone) || req.body?.paymentMethod !== "Cash on delivery") {
      throw new HttpError(400, "Invalid checkout details. Sign in and use cash on delivery.");
    }

    const ids = new Set();
    const items = rawItems.map((item) => {
      const id = sanitize(item?.id, 120);
      const qty = Number(item?.qty);
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(id) || !Number.isInteger(qty) ||
          qty < 1 || qty > 100 || ids.has(id)) {
        throw new HttpError(400, "Invalid order items.");
      }
      ids.add(id);
      return { id, qty };
    });

    const orderId = `PC-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 24)}`;
    const orderRef = db.collection("adminOrders").doc(orderId);
    const created = await db.runTransaction(async (transaction) => {
      // Idempotency: retrying the same checkout never charges stock twice.
      const existing = await transaction.get(orderRef);
      if (existing.exists) {
        if (existing.data().userId !== uid) throw new HttpError(409, "Order conflict.");
        return false;
      }

      const productRefs = items.map((item) => db.collection("adminProducts").doc(item.id));
      const productSnaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
      let subtotal = 0;
      let costOfGoods = 0;
      let costsComplete = true;
      const orderItems = productSnaps.map((snap, index) => {
        const product = snap.data();
        const { qty } = items[index];
        if (!snap.exists || product.published !== true ||
            !Number.isInteger(product.price) || product.price < 0 ||
            !Number.isInteger(product.stock) || product.stock < qty) {
          throw new HttpError(409, "A product is unavailable or has insufficient stock. Refresh the cart.");
        }
        subtotal += product.price * qty;
        if (Number.isInteger(product.costPrice) && product.costPrice >= 0) {
          costOfGoods += product.costPrice * qty;
        } else {
          costsComplete = false;
        }
        if (!Number.isSafeInteger(subtotal)) throw new HttpError(400, "Order total is too large.");
        return {
          id: snap.id, name: product.name, category: product.category,
          image: product.imageUrl || "", price: product.price, qty,
        };
      });

      const deliveryFee = subtotal >= 1200 ? 0 : 35;
      if (subtotal !== req.body.expectedSubtotal) {
        throw new HttpError(409, "Prices have changed. Refresh the cart before checkout.");
      }
      productRefs.forEach((ref, index) => transaction.update(ref, {
        stock: productSnaps[index].data().stock - items[index].qty,
        updatedAt: FieldValue.serverTimestamp(),
      }));
      transaction.create(orderRef, {
        userId: uid, customerName: name, customerEmail: req.authUser.email || "",
        items: orderItems, subtotal, discount: 0, deliveryFee, total: subtotal + deliveryFee,
        costOfGoods: costsComplete ? costOfGoods : null,
        address: { name, phone, city, address: street },
        paymentMethod: "Cash on delivery", paymentStatus: "unpaid", fulfilment: "delivery",
        status: "pending", history: [{ status: "pending", at: new Date().toISOString(), by: uid }],
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (created) {
      await audit(uid, "order.placed", orderId).catch((err) => console.error("[order audit]", err?.message));
    }
    const savedOrder = await orderRef.get();
    if (created) {
      await sendNewOrderPush({ id: orderId, total: Number(savedOrder.data()?.total) || 0 }).catch((err) =>
        console.warn("[order push] Delivery attempt failed:", err?.code || err?.message || "unknown")
      );
    }
    res.status(201).json({ order: publicOrder(savedOrder) });
  })
);

app.post(
  "/api/store/orders/:orderId/cancel",
  ...signedInRoute(async (req, res) => {
    const orderId = sanitize(req.params.orderId, 128);
    if (!/^PC-[0-9a-f]{24}$/.test(orderId)) throw new HttpError(400, "Invalid order ID.");
    const orderRef = db.collection("adminOrders").doc(orderId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(orderRef);
      if (!snap.exists || snap.data().userId !== req.authUser.uid) {
        throw new HttpError(404, "Order not found.");
      }
      const order = snap.data();
      if (order.status !== "pending" || hasOrderEverShipped(order)) {
        throw new HttpError(409, "This order cannot be cancelled now.");
      }
      const refs = order.items.map((item) => db.collection("adminProducts").doc(item.id));
      const products = await Promise.all(refs.map((ref) => transaction.get(ref)));
      refs.forEach((ref, index) => {
        if (products[index].exists) transaction.update(ref, {
          stock: products[index].data().stock + order.items[index].qty,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      transaction.update(orderRef, {
        status: "cancelled",
        history: [...(order.history || []).slice(-99), {
          status: "cancelled", at: new Date().toISOString(), by: req.authUser.uid,
        }],
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await audit(req.authUser.uid, "order.cancelled_by_customer", orderId).catch((err) => console.error("[order audit]", err?.message));
    res.json({ order: publicOrder(await orderRef.get()) });
  })
);

app.get(
  "/api/admin/overview",
  ...adminRoute(async (_req, res) => {
    const accounts = await listExistingAccountIds();
    const existingUserUids = accounts.ids;

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

    const [productsCount, ordersCount, activeSnap, recentOrders, productsSnap] =
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
        loadRecentOrders(),
        db.collection("adminProducts").where("published", "==", true).limit(300).get(),
      ]);

    const lowStockItems = productsSnap.docs
      .filter((doc) => Number.isInteger(doc.data().stock) && doc.data().stock <= 5)
      .map((doc) => ({ id: doc.id, name: doc.data().name, stock: doc.data().stock }))
      .sort((a, b) => a.stock - b.stock);

    res.json({
      usersCount: existingUserUids.size,
      disabledCount: accounts.disabledCount,
      petsCount,
      productsCount,
      ordersCount,
      activeOrders: activeSnap.data().count,
      profilesWithCity,
      cities,
      recentOrders: recentOrders.orders.slice(0, 5),
      insights: summarizeOrders(recentOrders.orders, { days: 30 }),
      lowStock: lowStockItems.slice(0, 8),
      lowStockCount: lowStockItems.length,
      partial: accounts.limited || profilesSnap.size === 10000 || petsSnap.size === 10000 || recentOrders.limited || productsSnap.size === 300,
    });
  })
);

app.get(
  "/api/admin/notifications",
  ...adminRoute(async (req, res) => {
    const [ordersSnap, stateSnap] = await Promise.all([
      db.collection("adminOrders").orderBy("createdAt", "desc").limit(60).get(),
      db.collection("adminNotificationState").doc(req.authUser.uid).get(),
    ]);
    const notifications = makeOrderNotifications(ordersSnap.docs.map(unwrap), stamp(stateSnap.data()?.lastReadAt));
    res.set("Cache-Control", "no-store");
    res.json({ notifications, unreadCount: notifications.filter((item) => item.unread).length, limited: ordersSnap.size === 60 });
  })
);

app.post(
  "/api/admin/notifications/read",
  ...adminRoute(async (req, res) => {
    await db.collection("adminNotificationState").doc(req.authUser.uid).set({
      lastReadAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await audit(req.authUser.uid, "notifications.mark_read", "orders");
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/push/register",
  ...adminRoute(async (req, res) => {
    const token = sanitize(req.body?.token, 4096);
    if (token.length < 50) throw new HttpError(400, "Invalid browser push token.");

    const ref = db.collection(PUSH_TOKEN_COLLECTION).doc(pushTokenDocumentId(token));
    await ref.set({
      uid: req.authUser.uid,
      token,
      userAgent: sanitize(req.body?.userAgent, 300),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/push/unregister",
  ...adminRoute(async (req, res) => {
    const token = sanitize(req.body?.token, 4096);
    if (token.length < 50) throw new HttpError(400, "Invalid browser push token.");

    const ref = db.collection(PUSH_TOKEN_COLLECTION).doc(pushTokenDocumentId(token));
    const snapshot = await ref.get();
    if (snapshot.exists && snapshot.data()?.uid === req.authUser.uid) {
      await ref.delete();
    }
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/push/test",
  ...adminRoute(async (req, res) => {
    const snapshot = await db.collection(PUSH_TOKEN_COLLECTION)
      .where("uid", "==", req.authUser.uid)
      .get();
    if (snapshot.empty) {
      throw new HttpError(409, "No push-enabled device is registered for this admin account.");
    }

    const result = await sendPushToTokenDocs(snapshot.docs, {
      type: "test",
      title: "PetCare test notification",
      body: "Push notifications are working on this device.",
      url: "/admin?section=notifications",
      tag: `petcare-test-${Date.now()}`,
    });
    if (!result.successCount) {
      throw new HttpError(502, "Firebase could not deliver the test notification. Check the browser token and Firebase Cloud Messaging configuration.");
    }
    res.json({ ok: true, ...result });
  })
);

app.get(
  "/api/admin/reports",
  ...adminRoute(async (req, res) => {
    const period = String(req.query.days || "30");
    if (!["7", "30", "90", "all"].includes(period)) throw new HttpError(400, "Invalid report period.");
    const days = period === "all" ? 0 : Number(period);
    const result = await loadRecentOrders();
    res.set("Cache-Control", "no-store");
    res.json({ ...summarizeOrders(result.orders, { days }), period, limited: result.limited });
  })
);

app.get(
  "/api/admin/geography",
  ...adminRoute(async (_req, res) => {
    const [accounts, profiles, recentOrders] = await Promise.all([
      listExistingAccountIds(),
      db.collection("adminUserProfiles").limit(10000).get(),
      loadRecentOrders(),
    ]);
    const knownProfiles = profiles.docs
      .filter((doc) => accounts.ids.has(doc.id))
      .map((doc) => ({ city: doc.data().city }));
    res.set("Cache-Control", "no-store");
    res.json({
      ...summarizeGeography(knownProfiles, recentOrders.orders),
      usersCount: accounts.ids.size,
      ordersCount: recentOrders.orders.length,
      limited: accounts.limited || profiles.size === 10000 || recentOrders.limited,
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
  ...adminRoute(async (req, res) => {
    const cursor = sanitize(req.query.cursor, 128);
    const collection = db.collection("adminAuditLogs");
    let query = collection.orderBy("createdAt", "desc");
    if (cursor) {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(cursor)) throw new HttpError(400, "Invalid activity cursor.");
      const cursorDoc = await collection.doc(cursor).get();
      if (!cursorDoc.exists) throw new HttpError(400, "Activity page has expired. Refresh the log.");
      query = query.startAfter(cursorDoc);
    }
    const docs = await query.limit(41).get();
    const pageDocs = docs.docs.slice(0, 40);
    const actors = [...new Set(pageDocs.map((doc) => doc.data().actorUid).filter(Boolean))];
    const actorNames = new Map();
    if (actors.length) {
      try {
        const result = await auth.getUsers(actors.map((uid) => ({ uid })));
        result.users.forEach((user) => actorNames.set(user.uid, user.displayName || user.email || user.uid));
      } catch (error) {
        console.warn("[activity] Actor display names unavailable:", error?.code || "unknown");
      }
    }
    res.set("Cache-Control", "no-store");
    res.json({
      logs: pageDocs.map((doc) => ({ ...unwrap(doc), actorName: actorNames.get(doc.data().actorUid) || doc.data().actorUid || "—" })),
      nextCursor: docs.size > 40 ? pageDocs.at(-1).id : "",
    });
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

// All four tracking stages are directly selectable, including correcting a
// prematurely completed order. Cancellation remains final because stock was
// restored, and shipped orders require a separate returns/refunds workflow.
const terminalOrderStatuses = new Set(["cancelled", "rejected"]);
const deliveryStages = ["pending", "preparing", "out_for_delivery", "delivered"];
const pickupStages = ["pending", "preparing", "ready_for_pickup", "picked_up"];
const orderStatusTargets = new Set([...deliveryStages, ...pickupStages, "cancelled", "rejected"]);
const shippedStatuses = new Set(["out_for_delivery", "ready_for_pickup", "delivered", "picked_up"]);

function hasOrderEverShipped(order) {
  return order.shippingStarted === true || shippedStatuses.has(order.status) ||
    (order.history || []).some(({ status }) => shippedStatuses.has(status));
}

function canAdminChangeOrderStatus(order, nextStatus) {
  const previous = order.status || "pending";
  if (previous === nextStatus || terminalOrderStatuses.has(previous)) return false;

  if (nextStatus === "cancelled" || nextStatus === "rejected") {
    // Includes the history check so backdating a shipment cannot restore stock.
    return ["pending", "confirmed", "preparing"].includes(previous) && !hasOrderEverShipped(order);
  }

  const stages = order.fulfilment === "pickup" ? pickupStages : deliveryStages;
  return stages.includes(nextStatus);
}

app.post(
  "/api/admin/orders/:orderId/status",
  ...adminRoute(async (req, res) => {
    const actorUid = req.authUser.uid;
    const orderId = sanitize(req.params.orderId, 128);
    const status = sanitize(req.body?.status, 40);
    const note = sanitize(req.body?.note, 250);

    if (!orderId || !orderStatusTargets.has(status)) {
      throw new HttpError(400, "Invalid order or status.");
    }

    const ref = db.collection("adminOrders").doc(orderId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new HttpError(404, "Order not found.");

      const record = snap.data();
      const previous = record.status || "pending";
      if (!canAdminChangeOrderStatus(record, status)) {
        throw new HttpError(409, `Status transition ${previous} -> ${status} is not allowed.`);
      }
      if (status === "out_for_delivery" && record.fulfilment === "pickup") {
        throw new HttpError(409, "Pickup orders cannot be shipped.");
      }
      if (status === "ready_for_pickup" && record.fulfilment === "delivery") {
        throw new HttpError(409, "Delivery orders cannot use store pickup.");
      }

      if (status === "cancelled" || status === "rejected") {
        const items = Array.isArray(record.items) ? record.items : [];
        const productRefs = items.map((item) => db.collection("adminProducts").doc(item.id));
        const productSnaps = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));
        productRefs.forEach((productRef, index) => {
          if (productSnaps[index].exists && Number.isInteger(items[index].qty)) {
            transaction.update(productRef, {
              stock: productSnaps[index].data().stock + items[index].qty,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        });
      }

      const history = [...(record.history || []).slice(-99), {
        status,
        at: new Date().toISOString(),
        by: actorUid,
        note,
      }];
      transaction.update(ref, {
        status,
        // Sticky flag: reversing a tracking stage must not make shipped stock
        // eligible for cancellation/restocking, even if history is truncated.
        shippingStarted: hasOrderEverShipped(record) || shippedStatuses.has(status),
        history,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await audit(actorUid, "order.status", orderId, `${status}${note ? `: ${note}` : ""}`);
    res.json({ ok: true });
  })
);

app.post(
  "/api/admin/imagekit/upload-auth",
  ...adminRoute(async (_req, res) => {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    if (!publicKey.startsWith("public_") || !privateKey.startsWith("private_")) {
      throw new HttpError(503, "Image uploads are not configured. Ask the platform administrator to configure ImageKit.");
    }

    const token = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 10 * 60;
    const signature = createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    res.set("Cache-Control", "no-store");
    res.json({ token, expire, signature, publicKey });
  })
);

app.delete(
  "/api/admin/imagekit/files/:fileId",
  ...adminRoute(async (req, res) => {
    const actorUid = req.authUser.uid;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const fileId = sanitize(req.params.fileId, 128);
    if (!privateKey.startsWith("private_")) {
      throw new HttpError(503, "ImageKit deletion is not configured.");
    }
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(fileId)) {
      throw new HttpError(400, "Invalid ImageKit file ID.");
    }

    const response = await fetch(
      `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (response.status === 404) {
      res.json({ ok: true, alreadyDeleted: true });
      return;
    }
    if (!response.ok) {
      console.warn("[imagekit] File deletion failed:", response.status);
      throw new HttpError(502, "ImageKit could not delete the product image. Try again.");
    }

    await audit(actorUid, "product.image.delete", fileId);
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
    const imageKitFileId = sanitize(product.imageKitFileId, 128);
    const imageKitFilePath = sanitize(product.imageKitFilePath, 500);
    const price = Number(product.price);
    const rawCostPrice = product.costPrice;
    const costPrice = rawCostPrice === "" || rawCostPrice == null ? null : Number(rawCostPrice);
    const stock = Number(product.stock);
    const published = product.published === true;

    if (
      !name ||
      !category ||
      !["dog", "cat", "bird", "fish", "small"].includes(petType) ||
      !Number.isInteger(price) || price < 0 || price > 10000000 ||
      (costPrice !== null && (!Number.isInteger(costPrice) || costPrice < 0 || costPrice > 10000000)) ||
      !Number.isInteger(stock) || stock < 0 || stock > 10000000
    ) {
      throw new HttpError(400, "Invalid product fields.");
    }

    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      throw new HttpError(400, "Product image must be an HTTPS URL.");
    }
    if (imageKitFileId) {
      let endpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";
      while (endpoint.endsWith("/")) endpoint = endpoint.slice(0, -1);
      if (
        !/^[A-Za-z0-9_-]{1,128}$/.test(imageKitFileId) ||
        !endpoint ||
        !imageUrl.startsWith(`${endpoint}/`)
      ) {
        throw new HttpError(400, "Invalid ImageKit product image details.");
      }
    } else if (imageKitFilePath) {
      throw new HttpError(400, "ImageKit file path requires a file ID.");
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
      imageKitFileId,
      imageKitFilePath,
      imageStoragePath: FieldValue.delete(),
      price,
      costPrice,
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
    const gender = ["Male", "Female"].includes(pet.gender) ? pet.gender : "";
    const rawWeight = pet.weight === "" || pet.weight == null ? null : Number(pet.weight);
    const weight = rawWeight !== null && Number.isFinite(rawWeight) && rawWeight >= 0 && rawWeight <= 1000
      ? rawWeight
      : null;
    const healthStatus = ["Healthy", "Monitoring", "Under treatment"].includes(pet.healthStatus)
      ? pet.healthStatus
      : "";

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
      gender,
      weight,
      healthStatus,
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
