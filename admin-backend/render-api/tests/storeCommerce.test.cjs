"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeStoreOrderItems,
  assertPurchasableProduct,
  stockAfterPurchase,
  stockAfterCancellation,
} = require("../storeCommerce.cjs");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sanitize = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

test("checkout accepts platform products without a seller source or approval record", () => {
  const items = normalizeStoreOrderItems([
    { id: "platform-food", qty: 2 },
  ], HttpError, sanitize);
  const product = { published: true, price: 600, stock: 5 };

  assert.deepEqual(items, [{ id: "platform-food", qty: 2 }]);
  assert.doesNotThrow(() => assertPurchasableProduct(product, items[0].qty, HttpError));
});

test("checkout keeps published and available-stock rules", () => {
  assert.throws(
    () => assertPurchasableProduct({ published: false, price: 500, stock: 4 }, 1, HttpError),
    (error) => error.status === 409
  );
  assert.throws(
    () => assertPurchasableProduct({ published: true, price: 500, stock: 0 }, 1, HttpError),
    (error) => error.status === 409
  );
});

test("successful orders decrement platform stock and cancellation restores it", () => {
  const afterPurchase = stockAfterPurchase(5, 2);
  assert.equal(afterPurchase, 3);
  assert.equal(stockAfterCancellation(afterPurchase, 2), 5);
});
