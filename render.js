// Shared utility to create ingredient checklist HTML
export function createIngredientChecklistHTML({
  dish,
  dishId,
  checklistState = {},
  sliderValue = 1,
  disabled = false,
  checkboxPrefix = 'check',
  onChecklistChange = null,
  showComponentHeaders = true
}) {
  // Returns a DOM fragment containing the checklist
  const fragment = document.createDocumentFragment();
  for (const comp of dish.components || []) {
    const cdiv = document.createElement('div');
    cdiv.className = 'mb-3';
    if (showComponentHeaders && comp.name) {
      const h = document.createElement('h6');
      h.className = 'mb-2 text-secondary fw-bold';
      h.textContent = comp.name;
      cdiv.appendChild(h);
    }
    for (const it of comp.items) {
      const ingKey = `${comp.name}::${it.ingredient}`;
      const checked = checklistState && checklistState[ingKey];
      const formCheck = document.createElement('div');
      formCheck.className = 'form-check mb-1';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'form-check-input';
      checkbox.id = `${checkboxPrefix}-${dishId}-${slug(comp.name)}-${slug(it.ingredient)}`;
      checkbox.checked = !!checked;
      checkbox.disabled = !!disabled;
      checkbox.dataset.baseQty = parseFloat(it.qtyPer) || 0;
      checkbox.dataset.unit = it.unit;
      checkbox.dataset.ingredient = it.ingredient;
      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.setAttribute('for', checkbox.id);
      label.dataset.baseQty = parseFloat(it.qtyPer) || 0;
      label.dataset.unit = it.unit;
      label.dataset.ingredient = it.ingredient;
      const scaledQty = (parseFloat(it.qtyPer) * sliderValue).toFixed(2).replace(/\.00$/, '');
      label.textContent = `${scaledQty} ${it.unit} ${it.ingredient}`;
      if (checkbox.checked) label.classList.add('text-decoration-line-through');
      if (onChecklistChange && !disabled) {
        checkbox.addEventListener('change', async function() {
          await onChecklistChange(ingKey, this.checked, {checkbox, label});
        });
      }
      formCheck.appendChild(checkbox);
      formCheck.appendChild(label);
      cdiv.appendChild(formCheck);
    }
    fragment.appendChild(cdiv);
  }
  return fragment;
}
// render.js — Rendering functions for RecipeCard
// Handles all UI rendering logic

import { escapeHtml, slug } from './utils.js';
import { getDishChecklist, saveDishChecklist } from './idb.js';
import { getDishStatus, getDishChef } from './idb.js';

// Render dish list as cards
export function renderDishList(dishes, dishList, getDishSliderValue) {
  dishList.innerHTML = "";
  if (!dishes || !dishes.length) {
    dishList.innerHTML = "<p>No dishes yet. Upload a CSV to get started.</p>";
    return;
  }
  dishes.sort((a, b) => a.name.localeCompare(b.name));
  for (const d of dishes) {
    const col = document.createElement("div");
    col.className = "col";
    const card = document.createElement("div");
    card.className = "card h-100 p-3";
    card.innerHTML = `<div>
        <h3 class=\"h5 mb-1\">${escapeHtml(d.name)}</h3>
        <div class=\"text-muted small\">${escapeHtml(d.category || "")}</div>
        <div class=\"small text-monospace text-muted mt-1\">slug: <code>${escapeHtml(d.id)}</code></div>
      </div>
      <div class=\"mt-3 d-flex justify-content-between align-items-center\">
        <div class=\"text-muted\">Orders: <span class=\"orders-value\">...</span></div>
        <button data-id=\"${d.id}\" class=\"btn btn-sm btn-outline-primary open-recipe\">Open</button>
      </div>
      <div class=\"dish-status-badge-area mt-2\"></div>
      <div class=\"dish-chef-badge-area mt-2\"></div>`;
    col.appendChild(card);
    dishList.appendChild(col);
    
    // Fetch and update the slider value for this dish
    if (typeof getDishSliderValue === 'function') {
      getDishSliderValue(d.id).then(val => {
        const v = (val && !isNaN(val)) ? Number(val) : 1;
        const ordersSpan = card.querySelector('.orders-value');
        if (ordersSpan) ordersSpan.textContent = v;
      });
    }
    
    // Fetch and show the status badge for this dish
    getDishStatus(d.id).then(status => {
      const badgeArea = card.querySelector('.dish-status-badge-area');
      if (!badgeArea) return;
      renderStatusBadge(badgeArea, status);
    });

    // Fetch and show the chef badge for this dish
    getDishChef(d.id).then(chef => {
      const badgeArea = card.querySelector('.dish-chef-badge-area');
      if (!badgeArea) return;
      renderChefBadge(badgeArea, chef);
    });
  }
  dishList.tabIndex = -1;
}

// Shared ingredient checklist renderer
export async function renderIngredientChecklist({
  container,
  dish,
  dishId,
  checklistState,
  onChecklistChange,
  sliderValue = 1
}) {
  // dish: {components: [...]}, dishId: string, checklistState: object, container: DOM node
  container.innerHTML = '';
  container.appendChild(createIngredientChecklistHTML({
    dish,
    dishId,
    checklistState,
    sliderValue,
    onChecklistChange: async (ingKey, checked, {checkbox, label}) => {
      if (onChecklistChange) await onChecklistChange(ingKey, checked, {checkbox, label});
      if (typeof window.renderPrepDashboard === 'function') {
        window.renderPrepDashboard();
      }
    }
  }));
}

// Render PLAN as ingredient coordination board organized by DAY
export async function renderPlanBoard(rows) {
  const days = ['Sunday', 'Monday', 'Tuesday'];
  const board = document.getElementById('planBoard');
  if (!board) return;
  board.innerHTML = '';
  // Add dashboard area for summed ingredient needs
  let dashboardDiv = document.getElementById('prepDashboard');
  if (!dashboardDiv) {
    dashboardDiv = document.createElement('div');
    dashboardDiv.id = 'prepDashboard';
    dashboardDiv.className = 'mb-4';
    board.appendChild(dashboardDiv);
  }
  import('./prepDashboard.js').then(({ renderPrepDashboard }) => {
    renderPrepDashboard('prepDashboard');
  });
  
  if (!rows || !rows.length) {
    board.innerHTML = '<div class="col-12 text-center text-muted py-5">No PLAN rows loaded.</div>';
    return;
  }

  // Group rows by day first (case-insensitive). Accept short forms (Sun, Mon, Tue).
  const rowsByDay = {};
  for (const d of days) rowsByDay[d] = [];
  for (const r of rows) {
    const raw = String(r['DAY'] || r['Day'] || r['day'] || '').trim();
    const low = raw.toLowerCase();
    if (!low) continue;
    for (const d of days) {
      const dl = d.toLowerCase();
      if (low === dl || low.startsWith(dl) || low.includes(dl) || low.startsWith(dl.slice(0, 3))) {
        rowsByDay[d].push(r);
        break;
      }
    }
  }

  // No batch prep header; keep board clean for Kanban columns only

  // Create each day's coordination board
  for (const day of days) {
    const dayRows = rowsByDay[day] || [];
    if (dayRows.length === 0) continue; // Skip days with no data
    
    // Create day section
    const daySection = document.createElement('div');
    daySection.className = 'col-12 mb-4';
    
    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'd-flex justify-content-between align-items-center mb-3';
    dayHeader.innerHTML = `
      <h6 class="mb-0 text-primary">${day}</h6>
      <span class="badge bg-secondary">${dayRows.length} items</span>
    `;
    daySection.appendChild(dayHeader);
    
    // Process ingredients for this day - get real chef assignments
    const ingredientGroups = {};
    const dishAssignments = {};
    
    // Process all rows and get real chef assignments asynchronously
    const dishChefPromises = [];
    const dishesToProcess = new Set();
    
    for (const row of dayRows) {
      const ingredient = row['INGREDIENT'] || row['Ingredient'] || row['ingredient'] || '';
      const dish = row['DISH'] || row['Dish'] || row['dish'] || '';
      const csvChef = row['CHEF'] || row['Chef'] || row['chef'] || '';
      const component = row['COMPONENT'] || row['Component'] || row['component'] || '';
      const priority = row['PRIORITY'] || row['Priority'] || row['priority'] || '';
      
      if (!ingredient || !dish) continue;
      
      dishesToProcess.add(dish);
      
      if (!ingredientGroups[ingredient]) {
        ingredientGroups[ingredient] = {
          ingredient,
          dishes: [],
          chefs: new Set(),
          totalQuantity: 0,
          highestPriority: 999,
          assignedChef: null
        };
      }
      
      ingredientGroups[ingredient].dishes.push({
        dish,
        chef: csvChef, // temporary, will be updated below
        component,
        priority: parseInt(priority) || 999,
        quantity: row['QUANTITY PER SERVING'] || row['Quantity per serving'] || '',
        unit: row['UNIT'] || row['Unit'] || row['unit'] || ''
      });
      
      ingredientGroups[ingredient].highestPriority = Math.min(
        ingredientGroups[ingredient].highestPriority, 
        parseInt(priority) || 999
      );
    }
    
    // Get real chef assignments for all dishes
    const dishChefMap = {};
    if (typeof window.getDishChef === 'function') {
      for (const dish of dishesToProcess) {
        const dishId = slug(dish);
        try {
          const actualChef = await window.getDishChef(dishId);
          dishChefMap[dish] = actualChef || '';
        } catch (e) {
          dishChefMap[dish] = '';
        }
      }
    }
    
    // Update ingredient groups and dish assignments with real chef data
    for (const [ingredient, group] of Object.entries(ingredientGroups)) {
      group.chefs.clear(); // Clear and rebuild with real data
      for (const dishInfo of group.dishes) {
        const realChef = dishChefMap[dishInfo.dish] || dishInfo.chef || '';
        dishInfo.chef = realChef;
        if (realChef && realChef.trim()) {
          group.chefs.add(realChef);
        }
        // Update dish assignments
        if (!dishAssignments[dishInfo.dish]) {
          dishAssignments[dishInfo.dish] = realChef;
        }
      }
    }

    // Create day's coordination columns
    const dayCoordination = document.createElement('div');
    dayCoordination.className = 'row';
    dayCoordination.innerHTML = `
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-warning text-dark">
            <h6 class="mb-0">🤝 SHARED PREP - ${day}</h6>
          </div>
          <div class="card-body" id="sharedPrepArea-${day.toLowerCase()}">
            <!-- Shared ingredients will go here -->
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-info text-white">
            <h6 class="mb-0">👨‍🍳 CHEF ASSIGNMENTS - ${day}</h6>
          </div>
          <div class="card-body" id="chefAssignmentsArea-${day.toLowerCase()}">
            <!-- Chef assignments will go here -->
          </div>
        </div>
      </div>
    `;
    
    daySection.appendChild(dayCoordination);
    board.appendChild(daySection);

    // Instead of grouping by ingredient, show each dish with its full checklist (like the modal)
    const sharedPrepArea = document.getElementById(`sharedPrepArea-${day.toLowerCase()}`);
    sharedPrepArea.innerHTML = '';
    // Get all unique dishes for this day
    const dishesForDay = Array.from(new Set(dayRows.map(r => r['DISH'] || r['Dish'] || r['dish'] || '').filter(Boolean)));
    for (const dishName of dishesForDay) {
      const dishId = slug(dishName);
      let dishObj = null;
      try {
        const { getDishById, getDishChecklist } = await import('./idb.js');
        dishObj = await getDishById(dishId);
        if (!dishObj) continue;
        const checklistState = await getDishChecklist(dishId);
        // Card for this dish
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">${escapeHtml(dishObj.name)}</h5>
              <button class="btn btn-sm btn-outline-primary open-recipe" data-id="${dishId}">Open</button>
            </div>
            <div class="ingredient-checklist-area" data-dish-id="${dishId}"></div>
          </div>
        `;
        sharedPrepArea.appendChild(card);
        const checklistArea = card.querySelector('.ingredient-checklist-area');
        checklistArea.setAttribute('data-dish-id', dishId);
        // Use shared checklist renderer (read-only)
        const { createIngredientChecklistHTML } = await import('./render.js');
        checklistArea.appendChild(createIngredientChecklistHTML({
          dish: dishObj,
          dishId,
          checklistState,
          sliderValue: 1,
          disabled: true,
          checkboxPrefix: 'plan-check',
          showComponentHeaders: true
        }));
      } catch (e) {
        // skip if not found
        continue;
      }
    }

    // Populate chef assignments for this day
    const chefAssignmentsArea = document.getElementById(`chefAssignmentsArea-${day.toLowerCase()}`);
    const chefGroups = {};
    const unassignedDishes = [];
    
    Object.entries(dishAssignments).forEach(([dish, chef]) => {
      if (!dish) return;
      if (chef && chef.trim()) {
        if (!chefGroups[chef]) chefGroups[chef] = [];
        chefGroups[chef].push(dish);
      } else {
        unassignedDishes.push(dish);
      }
    });

    console.log('🐛', day, 'chef groups:', chefGroups);
    console.log('🐛', day, 'unassigned dishes:', unassignedDishes);

    if (Object.keys(chefGroups).length === 0 && unassignedDishes.length === 0) {
      chefAssignmentsArea.innerHTML = '<p class="text-muted small">No dishes found</p>';
    } else {
      chefAssignmentsArea.innerHTML = '';
      
      // Show assigned chefs
      Object.entries(chefGroups).forEach(([chef, dishes]) => {
        const chefCard = document.createElement('div');
        chefCard.className = 'card mb-2';
        chefCard.innerHTML = `
          <div class="card-body p-2">
            <h6 class="mb-1">${getChefEmoji(chef)} ${escapeHtml(chef)}</h6>
            <small class="text-muted">${dishes.length} dish(es)</small>
            <div class="mt-1">
              ${dishes.map(dish => 
                `<button class="btn btn-link p-0 open-recipe badge bg-light text-dark me-1" data-id="${escapeHtml(slug(dish))}" style="text-decoration:none;">${escapeHtml(dish)}</button>`
              ).join('')}
            </div>
          </div>
        `;
        chefAssignmentsArea.appendChild(chefCard);
      });
      
      // Show unassigned dishes
      if (unassignedDishes.length > 0) {
        const unassignedCard = document.createElement('div');
        unassignedCard.className = 'card mb-2 border-warning';
        unassignedCard.innerHTML = `
          <div class="card-body p-2">
            <h6 class="mb-1">⚠️ Unassigned Dishes</h6>
            <small class="text-muted">${unassignedDishes.length} dish(es) need chef assignment</small>
            <div class="mt-1">
              ${unassignedDishes.map(dish => 
                `<button class="btn btn-link p-0 open-recipe badge bg-warning text-dark me-1" data-id="${escapeHtml(slug(dish))}" style="text-decoration:none;">${escapeHtml(dish)}</button>`
              ).join('')}
            </div>
          </div>
        `;
        chefAssignmentsArea.appendChild(unassignedCard);
      }
    }
  }
}

// Helper function for chef emojis
function getChefEmoji(chef) {
  const badges = {
    'ADAM': '🟦',
    'EMILY': '🟩', 
    'EVA': '🟨',
    'PRANAV': '🟥',
    'CHEF A': '🟪',
    'CHEF B': '⬛',
    'CHEF C': '⬜'
  };
  return badges[chef] || '👨‍🍳';
}

// Helper function to render status badges consistently
function renderStatusBadge(container, status) {
  const statusOptions = [
    { value: '', label: 'No Status' },
    { value: 'not-yet-done', label: 'NOT YET DONE' },
    { value: 'gathered-together', label: 'GATHERED TOGETHER' },
    { value: 'cooking', label: 'COOKING' },
    { value: 'ready-to-plate', label: 'READY TO PLATE' },
    { value: 'plated', label: 'PLATED' },
    { value: 'packed', label: 'PACKED' },
  ];
  
  const found = statusOptions.find(o => o.value === status);
  const label = found && found.value ? found.label : '';
  let badgeClass = 'badge ms-0 me-2 ';
  badgeClass +=
    (status === 'not-yet-done' ? 'bg-secondary' :
     status === 'gathered-together' ? 'bg-warning text-dark' :
     status === 'cooking' ? 'bg-primary' :
     status === 'ready-to-plate' ? 'bg-success' :
     status === 'plated' ? 'bg-dark' :
     status === 'packed' ? 'bg-success' : 'bg-light text-dark');
  container.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
}

// Helper function to render chef badges consistently
function renderChefBadge(container, chef) {
  const chefOptions = [
    { value: '', label: 'No Chef' },
    { value: 'ADAM', label: 'ADAM' },
    { value: 'EMILY', label: 'EMILY' },
    { value: 'EVA', label: 'EVA' },
    { value: 'PRANAV', label: 'PRANAV' },
    { value: 'CHEF A', label: 'CHEF A' },
    { value: 'CHEF B', label: 'CHEF B' },
    { value: 'CHEF C', label: 'CHEF C' },
  ];
  
  function chefBadgeClass(val) {
    switch (val) {
      case 'ADAM': return 'badge ms-0 me-2 bg-primary';
      case 'EMILY': return 'badge ms-0 me-2 bg-success';
      case 'EVA': return 'badge ms-0 me-2 bg-warning text-dark';
      case 'PRANAV': return 'badge ms-0 me-2 bg-danger';
      case 'CHEF A': return 'badge ms-0 me-2 bg-info text-dark';
      case 'CHEF B': return 'badge ms-0 me-2 bg-secondary';
      case 'CHEF C': return 'badge ms-0 me-2 bg-dark';
      default: return 'badge ms-0 me-2 bg-light text-dark';
    }
  }
  
  const found = chefOptions.find(o => o.value === chef);
  const label = found && found.value ? found.label : '';
  let badgeClass = chefBadgeClass(chef);
  container.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
}

// Global function for ingredient assignment (now with day-specific keys)
window.assignIngredientPrep = async function(assignmentKey, chef) {
  if (!chef) return;
  // Extract day and ingredient from the key (format: "Sunday-onions")
  const [day, ingredient] = assignmentKey.includes('-') ? assignmentKey.split('-', 2) : ['', assignmentKey];
  const displayText = day ? `${chef} will prep all ${ingredient} for ${day}` : `${chef} will prep all ${ingredient}`;
  // Show success message
  const toast = document.createElement('div');
  toast.className = 'alert alert-success alert-dismissible fade show position-fixed';
  toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  toast.innerHTML = `
    <strong>✅ Assigned!</strong> ${displayText}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
  // Save assignment to localStorage for persistence (using day-specific keys)
  const assignments = JSON.parse(localStorage.getItem('ingredientAssignments') || '{}');
  assignments[assignmentKey] = chef;
  localStorage.setItem('ingredientAssignments', JSON.stringify(assignments));
  console.log(`Assigned ${assignmentKey} prep to ${chef}`);

  // Re-render the plan board so UI updates immediately
  if (typeof window.getPlanRows === 'function') {
    const rows = await window.getPlanRows();
    // Try to use the global renderPlanBoard if available
    if (typeof window.renderPlanBoard === 'function') {
      window.renderPlanBoard(rows);
    } else {
      // Fallback: dynamic import
      const { renderPlanBoard } = await import('./render.js');
      renderPlanBoard(rows);
    }
  }
};
