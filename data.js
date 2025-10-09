// data.js — Data access and business logic
// Centralizes all IndexedDB and data manipulation logic

import { slug } from './utils.js';
import { renderDishList } from './render.js';
import { getAllDishes, getDishSliderValue, getPlanRows } from './idb.js';

// Global state
export let planRows = [];

// Initialize application
export async function initializeApp() {
  // Service worker registration
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("sw registered"));
  }

  // Load initial data
  const all = await getAllDishes();
  const dishList = document.getElementById('dishList');
  if (all && all.length) {
  if (dishList) renderDishList(all, dishList, getDishSliderValue);
    // populate shop filter selects from the saved dishes on startup
    if (typeof populateShopFilters === 'function') populateShopFilters(all);
  } else {
    // ensure filters are cleared when no dishes
    if (typeof populateShopFilters === 'function') populateShopFilters([]);
  }

  // Load PLAN data
  const planBoard = document.getElementById('planBoard');
  if(planBoard) {
    try {
  const loaded = await getPlanRows();
      if(loaded && loaded.length) {
        planRows = loaded;
        if(typeof applyPlanFilters === 'function') {
          const planSearch = document.getElementById('planSearch');
          const priorityFilter = document.getElementById('planFilterPriority');
          const { renderPlanBoard } = await import('./render.js');
          await applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
        }
        setPlanStatus('Loaded saved PLAN data.');
      } else {
        setPlanStatus('No PLAN data found. Upload a CSV to get started.');
      }
    } catch (err) {
      setPlanStatus('Could not load saved PLAN data: ' + err, true);
    }
  }

  // Set up PWA install prompt
  setupPWAInstall();
}

// Group CSV rows by dish
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

// PLAN filter logic
export async function applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard) {
	const q = planSearch ? planSearch.value.trim().toLowerCase() : '';
	const p = priorityFilter ? priorityFilter.value : '';
	let filtered = planRows || [];
	if(p) filtered = filtered.filter(r => String(r['PRIORITY']||'').toLowerCase() === p.toLowerCase());
	if(q) filtered = filtered.filter(row => Object.values(row).some(val => String(val||'').toLowerCase().includes(q)));
	await renderPlanBoard(filtered);
}

// Shop filter logic
export async function filterAndRenderShop() {
  const all = await getAllDishes();
  let filtered = all;
  const search = document.getElementById('shopSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterComponent = document.getElementById('filterComponent'); 
  const filterIngredient = document.getElementById('filterIngredient');
  const filterDish = document.getElementById('filterDish');
  const dishList = document.getElementById('dishList');
  
  const q = search ? search.value.trim().toLowerCase() : '';
  if (filterCategory && filterCategory.value) {
    filtered = filtered.filter(d => (d.category || '') === filterCategory.value);
  }
  if (filterDish && filterDish.value) {
    filtered = filtered.filter(d => d.name === filterDish.value);
  }
  if (filterComponent && filterComponent.value) {
    filtered = filtered.filter(d => (d.components || []).some(c => c.name === filterComponent.value));
  }
  if (filterIngredient && filterIngredient.value) {
    filtered = filtered.filter(d => (d.components || []).some(c => 
      (c.items || []).some(item => item.ingredient === filterIngredient.value)
    ));
  }
  if (q) {
    filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q));
  }
  if (dishList) renderDishList(filtered, dishList, getDishSliderValue);
}

// Populate shop filter dropdowns
export function populateShopFilters(dishes) {
  const filterCategory = document.getElementById('filterCategory');
  const filterComponent = document.getElementById('filterComponent');
  const filterIngredient = document.getElementById('filterIngredient');
  const filterDish = document.getElementById('filterDish');

  if (filterCategory) {
    const categories = [...new Set(dishes.map(d => d.category).filter(Boolean))].sort();
    filterCategory.innerHTML = '<option value="">All categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      filterCategory.appendChild(option);
    });
  }

  if (filterComponent) {
    const components = [...new Set(dishes.flatMap(d => d.components || []).map(c => c.name).filter(Boolean))].sort();
    filterComponent.innerHTML = '<option value="">All components</option>';
    components.forEach(comp => {
      const option = document.createElement('option');
      option.value = comp;
      option.textContent = comp;
      filterComponent.appendChild(option);
    });
  }

  if (filterIngredient) {
    const ingredients = [...new Set(
      dishes.flatMap(d => d.components || [])
        .flatMap(c => c.items || [])
        .map(item => item.ingredient)
        .filter(Boolean)
    )].sort();
    filterIngredient.innerHTML = '<option value="">All ingredients</option>';
    ingredients.forEach(ingredient => {
      const option = document.createElement('option');
      option.value = ingredient;
      option.textContent = ingredient;
      filterIngredient.appendChild(option);
    });
  }

  if (filterDish) {
    const dishNames = dishes.map(d => d.name).filter(Boolean).sort();
    filterDish.innerHTML = '<option value="">All dishes</option>';
    dishNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      filterDish.appendChild(option);
    });
  }
}

// Status management functions
export function setStatus(msg, err) {
  const statusEl = document.getElementById('shopStatus');
  if (statusEl) {
    statusEl.textContent = msg || "";
    statusEl.style.color = err ? "crimson" : "";
  }
}

export function setPlanStatus(msg, err) {
  const statusEl = document.getElementById('planStatus');
  if (statusEl) {
    statusEl.textContent = msg || "";
    statusEl.style.color = err ? "crimson" : "";
  }
}

// PWA install functionality
function setupPWAInstall() {
  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = "inline-block";
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setStatus("App installed");
      } else {
        setStatus("Install dismissed");
      }
      installBtn.style.display = "none";
      deferredPrompt = null;
    });
  }

  window.addEventListener("appinstalled", () => {
    setStatus("App installed");
  });
}
