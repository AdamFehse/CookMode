// PLAN filter logic
export function applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard) {
	const q = planSearch ? planSearch.value.trim().toLowerCase() : '';
	const p = priorityFilter ? priorityFilter.value : '';
	let filtered = planRows || [];
	if(p) filtered = filtered.filter(r => String(r['PRIORITY']||'').toLowerCase() === p.toLowerCase());
	if(q) filtered = filtered.filter(row => Object.values(row).some(val => String(val||'').toLowerCase().includes(q)));
	renderPlanBoard(filtered);
}
// Group CSV rows by dish
import { slug } from './utils.js';
export function groupByDish(rows) {
	const map = new Map();
	for (const r of rows) {
		const name = (r["DISH"] || r["Dish"] || r["dish"] || "").trim();
		if (!name) continue;
		const cat = r["CATEGORY"] || r["Category"] || r["category"] || "";
		const orders = Number(r["# OF ORDERS"] || r["Orders"] || r["orders"] || 0) || 0;
		const comp = (
			r["COMPONENT"] ||
			r["Component"] ||
			r["component"] ||
			"Main"
		).trim();
		const ingredient = (
			r["INGREDIENT"] ||
			r["Ingredient"] ||
			r["ingredient"] ||
			""
		).trim();
		const qtyPer =
			r["QUANTITY PER SERVING"] ||
			r["Quantity per serving"] ||
			r["QUANTITY PER SERVING"] ||
			"";
		const unit = r["UNIT"] || r["Unit"] || r["unit"] || "";

		if (!map.has(name)) {
			map.set(name, {
				id: slug(name),
				name,
				category: cat,
				totalOrders: 0,
				components: new Map(),
				method: "",
			});
		}
		const entry = map.get(name);
		entry.totalOrders = Math.max(entry.totalOrders || 0, orders);
		if (!entry.components.has(comp)) entry.components.set(comp, []);
		entry.components.get(comp).push({ ingredient, qtyPer, unit });
	}
	const dishes = [];
	for (const v of map.values()) {
		const components = [];
		for (const [k, list] of v.components.entries())
			components.push({ name: k, items: list });
		dishes.push({
			id: v.id,
			name: v.name,
			category: v.category,
			totalOrders: v.totalOrders,
			components,
			method: v.method,
			prepTime: v.prepTime,
			cookTime: v.cookTime,
		});
	}
	return dishes;
}
// data.js — Data access and business logic for RecipeCard
// Centralizes all IndexedDB and data manipulation logic
// Expects idb.js to be imported for actual DB operations

// Example usage (to be expanded):
// import { getAllDishes, getDishById, saveDishes, getDishSliderValue, saveDishSliderValue } from './idb.js';

// function groupByDish(rows) { ... }
// function applyShopFilters(...) { ... }
// function applyPlanFilters(...) { ... }

// export { groupByDish, applyShopFilters, applyPlanFilters };
