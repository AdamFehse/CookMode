import { applyPlanFilters, groupByDish, setStatus, setPlanStatus, populateShopFilters } from './data.js';
import { renderPlanBoard, renderDishList } from './render.js';
import { saveDishes, getDishSliderValue } from './idb.js';
import { openRecipe } from './openRecipe.js';
if (typeof window !== 'undefined') window.openRecipe = openRecipe;

// Handles PLAN tab search/filter events
export function setupPlanEvents(planRows, planSearch, priorityFilter) {
	if (planSearch) {
		planSearch.addEventListener('input', () => applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard));
	}
	if (priorityFilter) {
		priorityFilter.addEventListener('change', () => applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard));
	}
}

	// Event delegation for .open-recipe buttons (SHOP and PLAN)
	export function setupModalDelegation() {
		document.addEventListener('click', (e) => {
			const btn = e.target.closest('.open-recipe[data-id]');
			if (!btn) return;
			const id = btn.getAttribute('data-id');
			if (id && typeof window.openRecipe === 'function') {
				window.openRecipe(id);
			}
		});
	}
// Handles CSV upload for SHOP and PLAN
export function setupCsvUploadHandlers() {
	// SHOP CSV
	const shopCsvInput = document.getElementById('shopCsvFile');
	if (shopCsvInput) {
		shopCsvInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;
			setStatus('Parsing CSV...');
			Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: function (results) {
					setStatus('CSV parsed — grouping data');
					const grouped = groupByDish(results.data);
					saveDishes(grouped)
						.then(() => {
							setStatus('Data saved locally.');
							const dishList = document.getElementById('dishList');
							if (dishList && typeof renderDishList === 'function') renderDishList(grouped, dishList, getDishSliderValue);
							if (typeof populateShopFilters === 'function') populateShopFilters(grouped);
							if (typeof window.renderPrepDashboard === 'function') window.renderPrepDashboard();
						})
						.catch((err) => {
							setStatus('Error saving data: ' + err, true);
						});
				},
				error: function (err) {
					setStatus('Parse error: ' + err, true);
				},
			});
		});
	}

	// PLAN CSV
	const planCsvInput = document.getElementById('planCsvFile');
	if (planCsvInput) {
		planCsvInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;
			setPlanStatus('Parsing PLAN CSV...');
			Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: async function (results) {
					const planRows = results.data;
					if (typeof savePlanRows === 'function') {
						try {
							await savePlanRows(planRows);
							setPlanStatus('PLAN CSV loaded and saved.');
						} catch (err) {
							setPlanStatus('PLAN CSV loaded, but failed to save: ' + err, true);
						}
					}
					// Optionally re-render PLAN board if needed
				},
				error: function (err) {
					setPlanStatus('Parse error: ' + err, true);
				},
			});
		});
	}
}
