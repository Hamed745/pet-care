"use strict";

function normalizeStoreOrderItems(rawItems, HttpError, sanitize) {
  const ids = new Set();
  return rawItems.map((item) => {
    const id = sanitize(item?.id, 120);
    const qty = Number(item?.qty);
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(id) || !Number.isInteger(qty) ||
        qty < 1 || qty > 100 || ids.has(id)) {
      throw new HttpError(400, "Invalid order items.");
    }
    ids.add(id);
    return { id, qty };
  });
}

function assertPurchasableProduct(product, qty, HttpError) {
  if (!product || product.published !== true ||
      !Number.isInteger(product.price) || product.price < 0 ||
      !Number.isInteger(product.stock) || product.stock < qty) {
    throw new HttpError(409, "A product is unavailable or has insufficient stock. Refresh the cart.");
  }
}

function stockAfterPurchase(stock, qty) {
  if (!Number.isInteger(stock) || !Number.isInteger(qty) || qty < 1 || stock < qty) {
    throw new Error("Cannot reserve unavailable product stock.");
  }
  return stock - qty;
}

function stockAfterCancellation(stock, qty) {
  if (!Number.isInteger(stock) || !Number.isInteger(qty) || qty < 1) {
    throw new Error("Cannot restore invalid product stock.");
  }
  return stock + qty;
}

module.exports = {
  normalizeStoreOrderItems,
  assertPurchasableProduct,
  stockAfterPurchase,
  stockAfterCancellation,
};
