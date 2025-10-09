import { initializeApp } from './data.js';
import { setupPlanEvents, setupCsvUploadHandlers } from './events.js';
import { setupModalDelegation } from './events.js';
import { setupShopFilters } from './shopFilters.js';
import { renderChefPrepList } from './chefPrep.js';
import { getAllDishes, getDishChef, getDishSliderValue } from './idb.js';
import { renderPrepDashboard } from './prepDashboard.js';

// Main app entry point: initialize app and CSV upload handlers
window.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
  setupCsvUploadHandlers();

  // Setup PLAN tab search/filter events
  const planSearch = document.getElementById('planSearch');
  const priorityFilter = document.getElementById('planFilterPriority');
  // Use window.planRows if available, or pass an empty array
  setupPlanEvents(window.planRows || [], planSearch, priorityFilter);
  setupModalDelegation();

  // Setup SHOP tab filters and search
  setupShopFilters(getAllDishes);

  // Live update chef prep list and dashboard whenever PLAN data, chef, or slider changes
  async function updateChefPrepListAndDashboard() {
    await renderChefPrepList(
      getAllDishes,
      getDishChef,
      getDishSliderValue
    );
    if (typeof renderPrepDashboard === 'function') renderPrepDashboard();
  }
  // Initial render
  updateChefPrepListAndDashboard();
  // Listen for changes to chef or slider values (modal events)
  document.addEventListener('change', (e) => {
    if (e.target && (e.target.classList.contains('form-select') || e.target.id === 'mySlider')) {
      updateChefPrepListAndDashboard();
    }
  });

  // Always refresh PLAN board when PLAN tab is shown
  const planTabBtn = document.getElementById('plan-tab');
  if (planTabBtn) {
    planTabBtn.addEventListener('shown.bs.tab', async () => {
      const { getPlanRows } = await import('./idb.js');
      const { renderPlanBoard } = await import('./render.js');
      const rows = await getPlanRows();
      renderPlanBoard(rows);
    });
  }
});

