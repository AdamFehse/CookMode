import { applyPlanFilters } from './data.js';
import { renderPlanBoard } from './render.js';

export function setupPlanEvents(planRows, planSearch, priorityFilter) {
	if(planSearch){
		planSearch.addEventListener('input', ()=>applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard));
	}
	if(priorityFilter){
		priorityFilter.addEventListener('change', ()=>applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard));
	}
}
// events.js — Event wiring for RecipeCard
// Attaches event listeners and handles user interactions
// Expects render and data modules to be imported

// Example usage (to be expanded):
// import { renderDishList } from './render.js';
// import { getAllDishes, getDishSliderValue } from './idb.js';

// function setupShopEvents() {
//   // Attach listeners for CSV upload, search, clear, etc.
// }

// function setupPlanEvents() {
//   // Attach listeners for PLAN tab
// }

// export { setupShopEvents, setupPlanEvents };
