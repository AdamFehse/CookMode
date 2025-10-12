import { createIngredientChecklistHTML } from './render.js';
// render.js — Dashboard ingredient summary for all chef prep
// Sums up all ingredients in the Shared Chef Prep List

import { getAllDishes, getDishChecklist, getDishSliderValue, getDishChef, saveDishChecklist } from './idb.js';
import { escapeHtml } from './utils.js';

export async function renderPrepDashboard(containerId = 'prepDashboard') {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Save scroll position
  const scrollY = window.scrollY;
  container.innerHTML = '<div class="text-muted small">Loading ingredient summary...</div>';
  const dishes = await getAllDishes();
  if (!dishes || !dishes.length) {
    container.innerHTML = '<div class="text-muted">No dishes loaded.</div>';
    return;
  }
  // Only include dishes assigned to a chef
  const chefAssignedDishes = [];
  for (const dish of dishes) {
    const chef = await getDishChef(dish.id);
    if (chef) chefAssignedDishes.push(dish);
  }
  if (!chefAssignedDishes.length) {
    container.innerHTML = '<div class="text-muted">No dishes assigned to a chef.</div>';
    return;
  }
  // Gather and sum all ingredients from assigned dishes, and track which are checked
  const ingredientTotals = {};
  const ingredientChecked = {};
  const ingredientRefs = {};
  let totalIngredients = 0, assignedIngredients = 0, completedIngredients = 0;
  for (const dish of chefAssignedDishes) {
    const dishId = dish.id;
    let orders = 1;
    if (typeof getDishSliderValue === 'function') {
      const v = await getDishSliderValue(dishId);
      orders = (v && !isNaN(v)) ? Number(v) : 1;
    }
    const checklist = await getDishChecklist(dishId);
    for (const comp of dish.components || []) {
      for (const it of comp.items || []) {
        const ingKey = `${comp.name}::${it.ingredient}`;
        const ingredient = it.ingredient;
        const qtyPer = parseFloat(it.qtyPer) || 0;
        const unit = it.unit || '';
        if (!ingredient || !qtyPer) continue;
        if (!ingredientTotals[ingredient]) ingredientTotals[ingredient] = { total: 0, unit };
        ingredientTotals[ingredient].total += qtyPer * orders;
        // Track checked state (checked only if ALL instances are checked)
        if (!(ingredient in ingredientChecked)) ingredientChecked[ingredient] = true;
        if (!checklist || !checklist[ingKey]) ingredientChecked[ingredient] = false;
        // Track all refs for this ingredient
        if (!ingredientRefs[ingredient]) ingredientRefs[ingredient] = [];
        ingredientRefs[ingredient].push({ dishId, ingKey });
      }
    }
  }
  // Calculate dashboard stats
  totalIngredients = Object.keys(ingredientTotals).length;
  assignedIngredients = Object.values(ingredientChecked).filter(Boolean).length;
  completedIngredients = assignedIngredients; // For now, same as assigned

  // --- DASHBOARD HEADER CARDS ---
  const summaryRow = document.createElement('div');
  summaryRow.className = 'row g-3 mb-3';
  summaryRow.innerHTML = `
    <div class="col-md-4">
      <div class="card text-bg-primary h-100">
        <div class="card-body text-center">
          <div class="fs-2 fw-bold">${totalIngredients}</div>
          <div class="small">Total Ingredients</div>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card text-bg-success h-100">
        <div class="card-body text-center">
          <div class="fs-2 fw-bold">${assignedIngredients}</div>
          <div class="small">Assigned/Needed</div>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card text-bg-secondary h-100">
        <div class="card-body text-center">
          <div class="fs-2 fw-bold">${completedIngredients}</div>
          <div class="small">Completed (All Checked)</div>
        </div>
      </div>
    </div>
  `;

  // --- INGREDIENT GRID ---
  let dashboardCard = document.createElement('div');
  dashboardCard.className = 'card mb-3';
  dashboardCard.innerHTML = '<div class="card-header bg-success text-white">🧮 Ingredient Dashboard: Total Needed (assigned only)</div>';
  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';
  // Responsive grid for ingredients
  const grid = document.createElement('div');
  grid.className = 'row row-cols-1 row-cols-sm-2 row-cols-md-3 g-2';
  const sorted = Object.entries(ingredientTotals).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [ingredient, info] of sorted) {
    const col = document.createElement('div');
    col.className = 'col';
    // Use shared checklist renderer for a single ingredient (simulate a dish with one component/item)
    const fakeDish = { components: [{ name: '', items: [{ ingredient, qtyPer: info.total, unit: info.unit }] }] };
    const fakeChecklist = { [`::${ingredient}`]: ingredientChecked[ingredient] };
    const checklist = createIngredientChecklistHTML({
      dish: fakeDish,
      dishId: 'dashboard',
      checklistState: fakeChecklist,
      sliderValue: 1,
      checkboxPrefix: `dashboard-check-${ingredient}`,
      showComponentHeaders: false,
      onChecklistChange: async (ingKey, checked, {checkbox, label}) => {
        const refs = ingredientRefs[ingredient] || [];
        for (const { dishId, ingKey } of refs) {
          const checklist = await getDishChecklist(dishId);
          checklist[ingKey] = checked;
          await saveDishChecklist(dishId, checklist);
        }
        // Update other UIs as before
        if (typeof window.renderChefPrepList === 'function') window.renderChefPrepList();
        // Live update dashboard summary cards
        if (typeof window.renderPrepDashboard === 'function') window.renderPrepDashboard();
        // Modal and PLAN board update as before
      }
    });
    // Add a badge and progress bar for each ingredient
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge rounded-pill ms-2 ${ingredientChecked[ingredient] ? 'bg-success' : 'bg-warning text-dark'}`;
    statusBadge.textContent = ingredientChecked[ingredient] ? 'Ready' : 'Needed';
    col.appendChild(checklist);
    col.appendChild(statusBadge);
    grid.appendChild(col);
  }
  cardBody.appendChild(grid);
  dashboardCard.appendChild(cardBody);
  container.innerHTML = '';
  container.appendChild(summaryRow);
  container.appendChild(dashboardCard);
  // Restore scroll position
  window.scrollTo({ top: scrollY });
}


// Expose for global use
if (typeof window !== 'undefined') window.renderPrepDashboard = renderPrepDashboard;

// Auto-render on load
renderPrepDashboard();
