import test from "node:test";
import assert from "node:assert/strict";
import { readAccountData, getStoredAccountProfile, transferGuestCart } from "../src/utils/accountStorage.js";

const empty = { user: null, pets: [{ id: 1, name: "DEMO" }], cart: [], bookings: [], notifications: [], calendarEvents: [], favorites: [], recentlyViewed: [], adoptionListings: [], reports: [], orders: [] };

function setup(data = {}) {
  const values = new Map(Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]));
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };
  return values;
}

test("each Firebase UID sees only their own legacy pets, with no demo or anonymous pets", () => {
  setup({
    "petcare-demo-v1": {
      user: { uid: "uid-a", email: "a@example.test" },
      pets: [
        { id: 1, name: "Dog A", ownerUid: "uid-a" },
        { id: 1, name: "Dog B", ownerUid: "uid-b" },
        { id: 2, name: "Luna" },
      ],
      bookings: [{ pet: { id: 1 }, notes: "unowned booking" }],
    },
  });
  const a = readAccountData("uid-a", empty);
  const b = readAccountData("uid-b", empty);
  assert.deepEqual(a.pets.map((pet) => pet.name), ["Dog A"]);
  assert.deepEqual(b.pets.map((pet) => pet.name), ["Dog B"]);
  assert.deepEqual(a.bookings, []);
  assert.deepEqual(b.bookings, []);
  assert.equal(a.user.uid, "uid-a");
  assert.equal(b.user, null);
});

test("account-scoped records are kept in separate browser storage namespaces", () => {
  setup({
    "petcare-account-v2:uid-a": { user: { uid: "uid-a" }, pets: [{ id: 10, name: "A" }] },
    "petcare-account-v2:uid-b": { user: { uid: "uid-b" }, pets: [{ id: 10, name: "B" }] },
  });
  assert.equal(readAccountData("uid-a", empty).pets[0].name, "A");
  assert.equal(readAccountData("uid-b", empty).pets[0].name, "B");
  assert.equal(getStoredAccountProfile("uid-b").uid, "uid-b");
  assert.equal(readAccountData(null, empty).pets.length, 0);
});

test("guest cart moves to signed-in account without moving guest pets", () => {
  const values = setup({
    "petcare-guest-v2": { user: null, cart: [{ id: "sku-1", qty: 2 }], pets: [{ id: 1, name: "Guest pet" }] },
    "petcare-account-v2:uid-a": { user: { uid: "uid-a" }, cart: [{ id: "sku-2", qty: 1 }], pets: [] },
  });
  transferGuestCart("uid-a", empty);
  const account = JSON.parse(values.get("petcare-account-v2:uid-a"));
  const guest = JSON.parse(values.get("petcare-guest-v2"));
  assert.deepEqual(account.cart.map((item) => item.id).sort(), ["sku-1", "sku-2"]);
  assert.deepEqual(account.pets, []);
  assert.deepEqual(guest.cart, []);
  assert.equal(guest.pets[0].name, "Guest pet");
  transferGuestCart("uid-a", empty);
  assert.equal(JSON.parse(values.get("petcare-account-v2:uid-a")).cart.length, 2);
});

test("previously saved profile from another UID is not shared", () => {
  setup({ "petcare-demo-v1": { user: { uid: "uid-a", city: "Cairo" } } });
  assert.equal(getStoredAccountProfile("uid-a")?.city, "Cairo");
  assert.equal(getStoredAccountProfile("uid-b"), null);
});
