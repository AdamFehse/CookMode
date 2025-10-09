// Expose for global use
if (typeof window !== 'undefined') window.renderChefPrepList = () => {
  import('./idb.js').then(({ getAllDishes, getDishChef, getDishSliderValue }) => {
    import('./chefPrep.js').then(({ renderChefPrepList }) => {
      renderChefPrepList(getAllDishes, getDishChef, getDishSliderValue);
    });
  });
};
// chefPrep.js — Live shared chef ingredient prep list
import { slug } from './utils.js';


export async function renderChefPrepList(getAllDishes, getDishChef, getDishSliderValue) {
  const chefPrepList = document.getElementById('chefPrepList');
  if (!chefPrepList) return;
  chefPrepList.innerHTML = '<div class="text-muted small">Loading chef prep list...</div>';

  const dishes = await getAllDishes();
  if (!dishes || !dishes.length) {
    chefPrepList.innerHTML = '<div class="text-muted">No SHOP data loaded.</div>';
    return;
  }

  // Render a live checklist for each chef's ingredients, synced with modal/PLAN
  import('./idb.js').then(async ({ getDishChecklist, saveDishChecklist }) => {
    // Group by chef, then by dish, then by component/item
    const chefDishes = {};
    for (const dish of dishes) {
      const dishId = dish.id;
      let chef = '';
      if (typeof getDishChef === 'function') chef = await getDishChef(dishId) || '';
      let orders = 1;
      if (typeof getDishSliderValue === 'function') {
        const v = await getDishSliderValue(dishId);
        orders = (v && !isNaN(v)) ? Number(v) : 1;
      }
      if (!chef) continue;
      if (!chefDishes[chef]) chefDishes[chef] = [];
      chefDishes[chef].push({ dish, dishId, orders });
    }
    if (Object.keys(chefDishes).length === 0) {
      chefPrepList.innerHTML = '<div class="text-muted">No chef assignments found.</div>';
      return;
    }
    chefPrepList.innerHTML = '';
    const { createIngredientChecklistHTML } = await import('./render.js');
    const row = document.createElement('div');
    row.className = 'row row-cols-1 row-cols-md-3 g-3';
    for (const [chef, dishList] of Object.entries(chefDishes)) {
      const col = document.createElement('div');
      col.className = 'col';
      const card = document.createElement('div');
      card.className = 'mb-3 card h-100';
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      const chefTitle = document.createElement('h6');
      chefTitle.className = 'fw-bold text-primary mb-1';
      chefTitle.textContent = `👨‍🍳 ${chef}`;
      cardBody.appendChild(chefTitle);
      for (const { dish, dishId, orders } of dishList) {
        const dishDiv = document.createElement('div');
        dishDiv.className = 'mb-2';
        const dishTitle = document.createElement('div');
        dishTitle.className = 'fw-bold small mb-1';
        dishTitle.textContent = dish.name;
        dishDiv.appendChild(dishTitle);
        const checklistState = await getDishChecklist(dishId);
        // Use shared checklist renderer
        const checklist = createIngredientChecklistHTML({
          dish,
          dishId,
          checklistState,
          sliderValue: orders,
          checkboxPrefix: 'chefprep-check',
          onChecklistChange: async (ingKey, checked, {checkbox, label}) => {
            const checklist = await getDishChecklist(dishId);
            checklist[ingKey] = checked;
            await saveDishChecklist(dishId, checklist);
            // Update label style
            if (label) {
              if (checked) label.classList.add('text-decoration-line-through');
              else label.classList.remove('text-decoration-line-through');
            }
            // Also update PLAN board if present
            const planBoard = document.getElementById('planBoard');
            if (planBoard) {
              setTimeout(() => {
                import('./render.js').then(({ renderPlanBoard }) => {
                  import('./idb.js').then(({ getPlanRows }) => {
                    getPlanRows().then(rows => renderPlanBoard(rows));
                  });
                });
              }, 100);
            }
            // Also update modal if open
            // (This logic may need to be improved for full sync)
            // Also update the Ingredient Dashboard live
            if (typeof window.renderPrepDashboard === 'function') {
              window.renderPrepDashboard();
            }
          }
        });
        dishDiv.appendChild(checklist);
        cardBody.appendChild(dishDiv);
      }
      card.appendChild(cardBody);
      col.appendChild(card);
      row.appendChild(col);
    }
    chefPrepList.appendChild(row);
  });
}
