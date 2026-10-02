import { products as storeProducts } from "../storeCatalog.js";

export async function getCart(cart) { return cart; }
const sameCartItem = (item, id, variantId) => item.id === id && (item.variant?.id || "") === (variantId || "");
const itemStock = (item) => Number.isFinite(item?.stock) ? item.stock : storeProducts.find((product) => product.id === item?.id)?.stock ?? Number.POSITIVE_INFINITY;
export async function addCartItem(cart, product, variant, quantity = 1) {
	const variantId = variant?.id || "";
	const currentProductQuantity = cart.filter((item) => item.id === product.id).reduce((total, item) => total + item.qty, 0);
	const stock = Number.isFinite(product.stock) ? Math.max(0, product.stock) : itemStock(product);
	const quantityToAdd = Math.min(quantity, Math.max(0, stock - currentProductQuantity));
	if (quantityToAdd <= 0) return cart;
	const existing = cart.find((item) => sameCartItem(item, product.id, variantId));
	if (existing) return cart.map((item) => sameCartItem(item, product.id, variantId) ? { ...item, stock, qty: item.qty + quantityToAdd } : item);
	return [...cart, { ...product, price: variant?.price ?? product.price, variant: variant || null, qty: quantityToAdd }];
}
export async function changeCartQuantity(cart, id, delta, variantId) {
	const currentProductQuantity = cart.filter((item) => item.id === id).reduce((total, item) => total + item.qty, 0);
	const target = cart.find((item) => sameCartItem(item, id, variantId));
	const stock = Math.max(0, itemStock(target));
	const quantityToAdd = Math.min(delta, Math.max(0, stock - currentProductQuantity));
	return cart.map((item) => sameCartItem(item, id, variantId) ? { ...item, qty: item.qty + (delta > 0 ? quantityToAdd : delta) } : item).filter((item) => item.qty > 0);
}
export async function removeCartItem(cart, id, variantId) { return cart.filter((item) => !sameCartItem(item, id, variantId)); }
export async function clearCart() { return []; }
export async function getFavorites(favorites) { return favorites; }
export async function toggleFavorite(favorites, productId) { return favorites.includes(productId) ? favorites.filter((id) => id !== productId) : [...favorites, productId]; }
export async function getRecentlyViewed(ids) { return ids.slice(0, 8); }
export async function addRecentlyViewed(ids, productId) { return [productId, ...ids.filter((id) => id !== productId)].slice(0, 8); }
export async function getOrders(orders) { return orders; }
export async function createOrder(order) { return { ...order, id: `PC-${Date.now().toString().slice(-8)}`, status: "Preparing", createdAt: new Date().toISOString() }; }
export async function cancelOrder(orders, id) { return orders.map((order) => order.id === id && order.status === "Preparing" ? { ...order, status: "Cancelled" } : order); }