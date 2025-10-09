// shopFilters.js — Handles SHOP tab filters and search
import { renderDishList } from './render.js';
import { escapeHtml } from './utils.js';
import { getDishSliderValue } from './idb.js';

export function setupShopFilters(getAllDishes) {
  const filterCategory = document.getElementById('filterCategory');
  const filterComponent = document.getElementById('filterComponent');
  const filterDish = document.getElementById('filterDish');
  const filterIngredient = document.getElementById('filterIngredient');
  const search = document.getElementById('shopSearch');
  const dishList = document.getElementById('dishList');

  function populateShopFilters(dishes) {
    if (!dishes) dishes = [];
    const cats = new Set();
    const comps = new Set();
    const names = new Set();
    const ingredients = new Set();
    for (const d of dishes) {
      if (d.category) cats.add(d.category);
      names.add(d.name);
      for (const c of d.components || []) {
        comps.add(c.name);
        for (const it of c.items || []) {
          if (it.ingredient) ingredients.add(it.ingredient);
        }
      }
    }
    function fill(select, items, placeholder) {
      if (!select) return;
      const val = select.value || '';
      select.innerHTML = `<option value="">${placeholder}</option>` + [...items].sort().map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
      if (val) select.value = val;
    }
    fill(filterCategory, cats, 'All categories');
    fill(filterComponent, comps, 'All components');
    fill(filterDish, names, 'All dishes');
    fill(filterIngredient, ingredients, 'All ingredients');
  }

  async function applyShopFilters(dishes) {
    const all = dishes || await getAllDishes();
    const q = search ? search.value.trim().toLowerCase() : '';
    const cat = filterCategory ? filterCategory.value : '';
    const comp = filterComponent ? filterComponent.value : '';
    const name = filterDish ? filterDish.value : '';
    const ingredient = filterIngredient ? filterIngredient.value : '';
    let filtered = all.slice();
    if (cat) filtered = filtered.filter(d => (d.category || '') === cat);
    if (name) filtered = filtered.filter(d => d.name === name);
    if (comp) filtered = filtered.filter(d => (d.components || []).some(c => c.name === comp));
    if (ingredient) filtered = filtered.filter(d => (d.components || []).some(c => (c.items || []).some(it => it.ingredient === ingredient)));
    if (q) filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.components || []).some(c => c.name.toLowerCase().includes(q)) ||
      (d.components || []).some(c => (c.items || []).some(it => it.ingredient && it.ingredient.toLowerCase().includes(q)))
    );
  if (dishList) renderDishList(filtered, dishList, getDishSliderValue);
  }

  async function refreshFiltersAndList() {
    const all = await getAllDishes();
    populateShopFilters(all);
    applyShopFilters(all);
  }

  // Hook filters to re-render
  if (filterCategory) filterCategory.addEventListener('change', refreshFiltersAndList);
  if (filterComponent) filterComponent.addEventListener('change', refreshFiltersAndList);
  if (filterDish) filterDish.addEventListener('change', refreshFiltersAndList);
  if (filterIngredient) filterIngredient.addEventListener('change', refreshFiltersAndList);
  if (search) search.addEventListener('input', refreshFiltersAndList);

  // Initial population
  refreshFiltersAndList();
}
