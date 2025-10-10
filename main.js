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
  
    // Add Clear Data button handler
    const clearDataBtn = document.getElementById('clearData');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all SHOP data? This cannot be undone.')) {
          const { clearAll, getAllDishes } = await import('./idb.js');
          await clearAll();
          // Optionally re-render the dish list and filters
          const { renderDishList } = await import('./render.js');
          const dishes = await getAllDishes();
          const dishList = document.getElementById('dishList');
          if (dishList && typeof renderDishList === 'function') renderDishList(dishes, dishList);
          // Optionally update filters
          const { populateShopFilters } = await import('./data.js');
          if (typeof populateShopFilters === 'function') populateShopFilters([]);
          // Optionally update dashboard
          if (typeof window.renderPrepDashboard === 'function') window.renderPrepDashboard();
          // Optionally show status
          const shopStatus = document.getElementById('shopStatus');
          if (shopStatus) shopStatus.textContent = 'All SHOP data cleared.';
          // Reset the file input so user can re-upload the same file
          const shopCsvInput = document.getElementById('shopCsvFile');
          if (shopCsvInput) shopCsvInput.value = '';
        }
      });
    }
});

