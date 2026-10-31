"use strict";

const completedStatuses = new Set(["delivered", "picked_up"]);
const cancelledStatuses = new Set(["cancelled", "rejected"]);

function asTimestamp(value) {
  const time = value instanceof Date ? value.getTime() : Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : 0;
}

function amount(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeCity(value) {
  const city = typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 100) : "";
  return city ? { key: city.toLocaleLowerCase("ru-RU"), name: city } : null;
}

function summarizeOrders(orders, { days = 30, now = Date.now() } = {}) {
  const periodStart = days > 0 ? now - days * 86400000 : 0;
  const selected = orders.filter((order) => asTimestamp(order.createdAt) >= periodStart);
  const summary = {
    totalOrders: selected.length, activeOrders: 0, completedOrders: 0,
    cancelledOrders: 0, revenue: 0, merchandiseRevenue: 0,
    shippingRevenue: 0, unitsSold: 0, averageOrder: 0,
    grossProductProfit: 0, costKnownOrders: 0, costUnknownOrders: 0,
  };
  const products = new Map();
  const useMonths = days === 0 || days > 30;
  const bucketCount = useMonths ? 6 : Math.max(1, days);
  const labels = [];
  for (let index = bucketCount - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    if (useMonths) {
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCMonth(date.getUTCMonth() - index);
      labels.push(date.toISOString().slice(0, 7));
    } else {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - index);
      labels.push(date.toISOString().slice(0, 10));
    }
  }
  const trend = new Map(labels.map((label) => [label, { label, orders: 0, revenue: 0 }]));

  for (const order of selected) {
    if (cancelledStatuses.has(order.status)) { summary.cancelledOrders++; continue; }
    if (!completedStatuses.has(order.status)) { summary.activeOrders++; continue; }

    summary.completedOrders++;
    const total = amount(order.total);
    const subtotal = amount(order.subtotal);
    const netSubtotal = Math.max(0, subtotal - amount(order.discount));
    summary.revenue += total;
    summary.merchandiseRevenue += netSubtotal;
    summary.shippingRevenue += amount(order.deliveryFee);

    if (Number.isFinite(order.costOfGoods) && order.costOfGoods >= 0) {
      summary.grossProductProfit += netSubtotal - order.costOfGoods;
      summary.costKnownOrders++;
    } else {
      summary.costUnknownOrders++;
    }

    for (const item of Array.isArray(order.items) ? order.items : []) {
      const quantity = Number.isInteger(item.qty) && item.qty > 0 ? item.qty : 0;
      const value = amount(item.price) * quantity;
      summary.unitsSold += quantity;
      const id = String(item.id || item.name || "unknown");
      const entry = products.get(id) || { id, name: String(item.name || "Product"), quantity: 0, revenue: 0 };
      entry.quantity += quantity;
      entry.revenue += value;
      products.set(id, entry);
    }

    const time = asTimestamp(order.createdAt);
    if (time) {
      const key = new Date(time).toISOString().slice(0, useMonths ? 7 : 10);
      const entry = trend.get(key);
      if (entry) { entry.revenue += total; entry.orders++; }
    }
  }

  summary.averageOrder = summary.completedOrders ? summary.revenue / summary.completedOrders : 0;
  return {
    summary,
    trend: [...trend.values()],
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 8),
  };
}

function summarizeGeography(profiles, orders) {
  const cities = new Map();
  const getCity = (value) => {
    const city = normalizeCity(value);
    if (!city) return null;
    if (!cities.has(city.key)) cities.set(city.key, { city: city.name, users: 0, orders: 0, completedOrders: 0, revenue: 0 });
    return cities.get(city.key);
  };
  let usersWithCity = 0;
  let ordersWithoutCity = 0;
  for (const profile of profiles) {
    const entry = getCity(profile.city);
    if (entry) { entry.users++; usersWithCity++; }
  }
  for (const order of orders) {
    const entry = getCity(order.address?.city);
    if (!entry) { ordersWithoutCity++; continue; }
    entry.orders++;
    if (completedStatuses.has(order.status)) {
      entry.completedOrders++;
      entry.revenue += amount(order.total);
    }
  }
  return {
    usersWithCity, ordersWithoutCity,
    cities: [...cities.values()].sort((a, b) => b.orders - a.orders || b.users - a.users || a.city.localeCompare(b.city)),
  };
}

function makeOrderNotifications(orders, lastReadAt) {
  const lastReadTime = asTimestamp(lastReadAt);
  return orders.map((order) => ({
    id: order.id,
    order,
    // Notifications are for newly placed orders, not ordinary status changes.
    unread: asTimestamp(order.createdAt) > lastReadTime,
  }));
}

function hideInternalOrderCosts(order) {
  const { costOfGoods, ...publicFields } = order;
  return publicFields;
}

module.exports = { summarizeOrders, summarizeGeography, normalizeCity, makeOrderNotifications, hideInternalOrderCosts };
