"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeOrders, summarizeGeography, normalizeCity, makeOrderNotifications, hideInternalOrderCosts } = require("../adminInsights.cjs");

const now = Date.parse("2026-11-01T12:00:00Z");
const delivered = {
  id: "one", createdAt: "2026-10-31T12:00:00Z", status: "delivered", total: 1250,
  subtotal: 1200, deliveryFee: 50, costOfGoods: 800,
  items: [{ id: "food", name: "Dog food", qty: 2, price: 600 }],
  address: { city: " Moscow " },
};

test("sales only count fulfilled orders; cancellations never inflate revenue", () => {
  const orders = [
    delivered,
    { ...delivered, id: "cancel", status: "cancelled", costOfGoods: null },
    { ...delivered, id: "pending", status: "pending" },
    { ...delivered, id: "old", createdAt: "2026-08-01T12:00:00Z" },
  ];
  const { summary, topProducts, trend } = summarizeOrders(orders, { days: 30, now });
  assert.equal(summary.totalOrders, 3);
  assert.equal(summary.completedOrders, 1);
  assert.equal(summary.cancelledOrders, 1);
  assert.equal(summary.activeOrders, 1);
  assert.equal(summary.revenue, 1250);
  assert.equal(summary.merchandiseRevenue, 1200);
  assert.equal(summary.shippingRevenue, 50);
  assert.equal(summary.grossProductProfit, 400);
  assert.equal(summary.costKnownOrders, 1);
  assert.equal(summary.unitsSold, 2);
  assert.equal(topProducts[0].quantity, 2);
  assert.equal(trend.reduce((sum, row) => sum + row.revenue, 0), 1250);
});

test("missing cost data must not be represented as zero cost or known profit", () => {
  const { summary } = summarizeOrders([{ ...delivered, costOfGoods: null }], { days: 30, now });
  assert.equal(summary.costKnownOrders, 0);
  assert.equal(summary.costUnknownOrders, 1);
  assert.equal(summary.grossProductProfit, 0);
});

test("discounts reduce merchandise gross profit without changing cost basis", () => {
  const { summary } = summarizeOrders([{ ...delivered, discount: 100, total: 1150 }], { days: 30, now });
  assert.equal(summary.merchandiseRevenue, 1100);
  assert.equal(summary.grossProductProfit, 300);
  assert.equal(summary.revenue, 1150);
});

test("geography combines case-insensitive city names without mixing revenue from canceled orders", () => {
  const result = summarizeGeography(
    [{ city: "MOSCOW" }, { city: " Moscow " }, { city: "Kazan" }, { city: "" }],
    [delivered, { ...delivered, status: "cancelled", total: 9999 }, { ...delivered, address: { city: "" } }]
  );
  assert.equal(normalizeCity(" Moscow  ").key, "moscow");
  assert.equal(result.usersWithCity, 3);
  assert.equal(result.ordersWithoutCity, 1);
  assert.equal(result.cities[0].users, 2);
  assert.equal(result.cities[0].orders, 2);
  assert.equal(result.cities[0].completedOrders, 1);
  assert.equal(result.cities[0].revenue, 1250);
});

test("notifications use creation time, so changing an old status does not produce a new alert", () => {
  const recent = { ...delivered, createdAt: "2026-10-31T10:00:00Z" };
  const older = { ...delivered, id: "older", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z" };
  const notices = makeOrderNotifications([recent, older], "2026-10-30T10:00:00Z");
  assert.equal(notices[0].unread, true);
  assert.equal(notices[1].unread, false);
  assert.equal(makeOrderNotifications([recent], "2026-11-01T10:00:00Z")[0].unread, false);
});

test("private cost of goods is never returned in customer order data", () => {
  const result = hideInternalOrderCosts(delivered);
  assert.equal(Object.hasOwn(result, "costOfGoods"), false);
  assert.equal(result.total, 1250);
  assert.equal(result.items[0].name, "Dog food");
});
