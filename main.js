// main.js — CSV upload, parse, store, UI
// main.js — CSV upload, parse, store, UI
import { escapeHtml, slug } from './utils.js';
import { renderDishList, renderPlanBoard } from './render.js';
import { groupByDish, applyPlanFilters } from './data.js';
import { setupPlanEvents } from './events.js';
(function () {
  // Download PLAN CSV button logic
  const downloadPlanCsvBtn = document.getElementById('downloadPlanCsvBtn');
  if (downloadPlanCsvBtn) {
    downloadPlanCsvBtn.addEventListener('click', async () => {
      if (typeof getPlanRows !== 'function' || typeof Papa === 'undefined') return;
      const all = await getPlanRows();
      if (!all || !all.length) return alert('No PLAN data to export.');
      // Flatten for export: one row per ingredient, with live/persistent fields
      const rows = [];
      for (const row of all) {
        const dish = row['DISH'] || row['Dish'] || '';
        const dishId = dish ? slug(dish) : '';
        // Async lookups for persistent fields
        const [status, chef, orders, timeStart, timeEnd] = await Promise.all([
          (typeof window.getDishStatus === 'function' && dishId) ? window.getDishStatus(dishId) : (row['STATUS'] || row['Status'] || row['status'] || ''),
          (typeof window.getDishChef === 'function' && dishId) ? window.getDishChef(dishId) : (row['CHEF'] || row['Chef'] || ''),
          (typeof window.getDishSliderValue === 'function' && dishId) ? window.getDishSliderValue(dishId) : (row['ORDERS'] || row['Orders'] || row['orders'] || ''),
          (typeof window.getDishTimeStart === 'function' && dishId) ? window.getDishTimeStart(dishId) : (row['TIME START'] || row['Time Start'] || ''),
          (typeof window.getDishTimeEnd === 'function' && dishId) ? window.getDishTimeEnd(dishId) : (row['TIME END'] || row['Time End'] || '')
        ]);
        rows.push({
          DISH: dish,
          COMPONENT: row['COMPONENT'] || row['Component'] || '',
          INGREDIENT: row['INGREDIENT'] || row['Ingredient'] || row['ingredient'] || '',
          PRIORITY: row['PRIORITY'] || row['Priority'] || '',
          STATUS: status || '',
          ORDERS: orders || '',
          CHEF: chef || '',
          'TIME START': timeStart || '',
          'TIME END': timeEnd || ''
        });
      }
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plan_export.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  }
  // Download CSV button logic
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', async () => {
      if (typeof getAllDishes !== 'function' || typeof Papa === 'undefined') return;
      const all = await getAllDishes();
      if (!all || !all.length) return alert('No data to export.');
      // Flatten components for CSV export
      const rows = [];
      all.forEach(dish => {
        (dish.components || []).forEach(comp => {
          (comp.items || []).forEach(item => {
            rows.push({
              Name: dish.name,
              Category: dish.category,
              Component: comp.name,
              Ingredient: item.ingredient,
              QtyPer: item.qtyPer,
              Unit: item.unit,
              Orders: dish.totalOrders
            });
          });
        });
      });
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dishes_export.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  }
  // SHOP tab selectors (updated IDs)
  const csvInput = document.getElementById("shopCsvFile");
  const statusEl = document.getElementById("shopStatus");
  const dishList = document.getElementById("dishList");
  const recipeModalEl = document.getElementById("recipeModal");
  let recipeModal = null; // initialize lazily to avoid bootstrap timing issues
  const search = document.getElementById("shopSearch");
  const clearBtn = document.getElementById("clearData");
  const installBtn = document.getElementById("installBtn");
  let deferredPrompt = null;

  // PLAN tab elements
  const planCsvInput = document.getElementById('planCsvFile');
  const planStatusEl = document.getElementById('planStatus');
  const planSearch = document.getElementById('planSearch');
  // Removed unused planTable and planTableBody (legacy PLAN table)
  const planBoard = document.getElementById('planBoard');
  const planBoardEl = planBoard; // Use this for event delegation and rendering
  const clearPlanBtn = document.getElementById('clearPlanData');
  let planRows = [];
  // PLAN status helper
  function setPlanStatus(msg, err){
    if(planStatusEl){
      planStatusEl.textContent = msg || '';
      planStatusEl.style.color = err ? 'crimson' : '';
    }
  }

  // PLAN CSV upload and parsing (with persistence)
  if(planCsvInput){
    planCsvInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      setPlanStatus('Parsing PLAN CSV...');
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results){
          planRows = results.data;
          try {
            await savePlanRows(planRows);
            setPlanStatus('PLAN CSV loaded and saved.');
          } catch (err) {
            setPlanStatus('PLAN CSV loaded, but failed to save: ' + err, true);
          }
          // render with current filters
          if(typeof applyPlanFilters === 'function') applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
        },
        error: function(err){ setPlanStatus('Parse error: '+err, true); }
      });
    });
  }

  // Load PLAN data from IndexedDB on page load
  window.addEventListener('load', async () => {
    if(planBoard) {
      try {
        const loaded = await getPlanRows();
        if(loaded && loaded.length) {
          planRows = loaded;
          if(typeof applyPlanFilters === 'function') applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
          setPlanStatus('Loaded saved PLAN data.');
        }
      } catch (err) {
        setPlanStatus('Could not load saved PLAN data: ' + err, true);
      }
    }
  });

  // Clear PLAN data button
  if(clearPlanBtn){
    clearPlanBtn.addEventListener('click', async () => {
      if(!confirm('Clear all PLAN data?')) return;
      try {
        await clearPlanRows();
  planRows = [];
  renderPlanBoard([]);
        setPlanStatus('PLAN data cleared.');
      } catch (err) {
        setPlanStatus('Failed to clear PLAN data: ' + err, true);
      }
    });
  }

  // PLAN search + priority filter now handled in events.js
  const priorityFilter = document.getElementById('planPriorityFilter');
  setupPlanEvents(planRows, planSearch, priorityFilter);

  // Render PLAN as a 3-column Kanban board grouped by DAY
  function renderPlanBoard(rows){
  const days = ['Sunday', 'Monday', 'Tuesday'];
  const board = document.getElementById('planBoard');
  const planBoardEl = document.getElementById('planBoard');
  if(!board) return;
  board.innerHTML = '';
    if(!rows || !rows.length){
      board.innerHTML = '<div class="col-12 text-center text-muted py-5">No PLAN rows loaded.</div>';
      return;
    }

    // Group rows by the desired day (case-insensitive). Accept short forms (Sun, Mon, Tue).
    const rowsByDay = {};
    for(const d of days) rowsByDay[d] = [];
    for(const r of rows){
      const raw = String(r['DAY'] || r['Day'] || r['day'] || '').trim();
      const low = raw.toLowerCase();
      if(!low) continue;
      for(const d of days){
        const dl = d.toLowerCase();
        if(low === dl || low.startsWith(dl) || low.includes(dl) || low.startsWith(dl.slice(0,3))){
          rowsByDay[d].push(r);
          break;
        }
      }
    }

    // Track sort order for each day
    if (!window.planPrioritySortOrder) window.planPrioritySortOrder = {};
    for(const day of days){
  const col = document.createElement('div');
  col.className = 'col-12';
      // Header
      const header = document.createElement('div');
      header.className = 'd-flex justify-content-between align-items-center mb-3';
      const title = document.createElement('h5'); title.className = 'mb-0';
      title.textContent = day || 'No Day';
      const count = document.createElement('span'); count.className = 'badge bg-secondary';
      count.textContent = (rowsByDay[day] || []).length;
      header.appendChild(title);
      header.appendChild(count);
      col.appendChild(header);

      // Table (wrapped in responsive container)
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-responsive';
      const table = document.createElement('table');
      table.className = 'table table-sm table-bordered align-middle mb-0';
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr>
        <th>Dish</th>
        <th>Component</th>
        <th>Ingredient</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Orders</th>
        <th>Chef</th>
        <th>Time Start</th>
        <th>Time End</th>
      </tr>`;
      table.appendChild(thead);
      const tbody = document.createElement('tbody');

      let items = rowsByDay[day] ? rowsByDay[day].slice() : [];
      // Always sort by PRIORITY: 1 (highest) -> 2 -> 3 (lowest) -> unspecified (bottom)
      const priorityScore = (p) => {
        const v = String(p||'').trim().toLowerCase();
        if(v === '1' || v === 'high') return 1;
        if(v === '2' || v === 'medium') return 2;
        if(v === '3' || v === 'low') return 3;
        return 4;
      };
      items = items.slice().sort((a,b)=> {
        const pa = priorityScore(a['PRIORITY']||a['Priority']||a['priority']);
        const pb = priorityScore(b['PRIORITY']||b['Priority']||b['priority']);
        if(pa !== pb) return pa - pb; // lower score (1) comes first
        // fallback: sort by TIME START if available
        const ta = String(a['TIME START']||a['Time Start']||'');
        const tb = String(b['TIME START']||b['Time Start']||'');
        return ta.localeCompare(tb);
      });

      for(const it of items){
        const tr = document.createElement('tr');
        // Dish (clickable)
        const dishName = String(it['DISH']||'');
        const dishId = dishName ? slug(dishName) : '';
        const dishTd = document.createElement('td');
        dishTd.innerHTML = `<button class="btn btn-link p-0 m-0 open-recipe" data-id="${escapeHtml(dishId)}" style="text-decoration:underline;">${escapeHtml(dishName)}</button>`;
        tr.appendChild(dishTd);
        // Component
        const compTd = document.createElement('td');
        compTd.textContent = it['COMPONENT'] || '';
        tr.appendChild(compTd);
        // Ingredient
        const ingTd = document.createElement('td');
        ingTd.textContent = it['INGREDIENT'] || it['Ingredient'] || it['ingredient'] || '';
        tr.appendChild(ingTd);
        // Priority
        const prTd = document.createElement('td');
        prTd.textContent = it['PRIORITY'] || '';
        tr.appendChild(prTd);
        // Status (async)
        const statusTd = document.createElement('td');
        statusTd.className = 'dish-status-badge-area';
        if (dishId && typeof window.getDishStatus === 'function') {
          window.getDishStatus(dishId).then(status => {
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
            statusTd.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          });
        }
        tr.appendChild(statusTd);
        // Orders (async, live)
        const ordersTd = document.createElement('td');
        ordersTd.className = 'dish-orders-badge-area';
        if (dishId && typeof window.getDishSliderValue === 'function') {
          window.getDishSliderValue(dishId).then(val => {
            const v = (val && !isNaN(val)) ? Number(val) : 1;
            let badgeClass = 'badge ms-0 me-2 bg-primary';
            ordersTd.innerHTML = `<span class=\"${badgeClass}\">${v}</span>`;
          });
        } else {
          ordersTd.textContent = '';
        }
        tr.appendChild(ordersTd);
        // Chef (async, live)
        const chefTd = document.createElement('td');
        chefTd.className = 'dish-chef-badge-area';
        function chefBadgeClass(val) {
          switch(val) {
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
        if (dishId && typeof window.getDishChef === 'function') {
          window.getDishChef(dishId).then(chef => {
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
            const found = chefOptions.find(o => o.value === chef);
            const label = found && found.value ? found.label : '';
            let badgeClass = chefBadgeClass(chef);
            chefTd.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          });
        } else {
          chefTd.textContent = it['CHEF'] || it['Chef'] || '';
        }
        tr.appendChild(chefTd);
        // Time Start (always async, like chef/status)
        const timeStartTd = document.createElement('td');
        timeStartTd.className = 'dish-timestart-badge-area';
        if (dishId && typeof window.getDishTimeStart === 'function') {
          window.getDishTimeStart(dishId).then(val => {
            timeStartTd.textContent = val || '';
          });
        } else {
          timeStartTd.textContent = '';
        }
        tr.appendChild(timeStartTd);
        // Time End (always async, like chef/status)
        const timeEndTd = document.createElement('td');
        timeEndTd.className = 'dish-timeend-badge-area';
        if (dishId && typeof window.getDishTimeEnd === 'function') {
          window.getDishTimeEnd(dishId).then(val => {
            timeEndTd.textContent = val || '';
          });
        } else {
          timeEndTd.textContent = '';
        }
        tr.appendChild(timeEndTd);

        tbody.appendChild(tr);
      }
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  col.appendChild(tableWrapper);
  board.appendChild(col);
    }
  // PLAN board: open recipe modal when clicking dish name
  if (planBoardEl) {
    planBoardEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button.open-recipe[data-id]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (id) openRecipe(id);
    });
  }
  }

  function setStatus(msg, err) {
    statusEl.textContent = msg || "";
    statusEl.style.color = err ? "crimson" : "";
  }

  csvInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("Parsing CSV...");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        setStatus("CSV parsed — grouping data");
        const grouped = groupByDish(results.data);
        saveDishes(grouped)
          .then(() => {
            setStatus("Data saved locally.");
            if (dishList) renderDishList(grouped, dishList, typeof getDishSliderValue !== 'undefined' ? getDishSliderValue : undefined);
            // keep the shop filter selects in sync after an import
            if (typeof populateShopFilters === 'function') populateShopFilters(grouped);
          })
          .catch((err) => {
            console.error(err);
            setStatus("Error saving data: " + err, true);
          });
      },
      error: function (err) {
        setStatus("Parse error: " + err, true);
      },
    });
  });

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all stored dishes?")) return;
    clearAll().then(() => {
      setStatus("Cleared");
      dishList.innerHTML = "";
      // reset any shop filters
      if (typeof populateShopFilters === 'function') populateShopFilters([]);
    });
  });

  search.addEventListener("input", async (e) => {
    const q = e.target.value.trim().toLowerCase();
    const all = await getAllDishes();
    const filtered = all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q)
    );
  if (dishList) renderDishList(filtered, dishList, typeof getDishSliderValue !== 'undefined' ? getDishSliderValue : undefined);
  });

  // modal handled by Bootstrap

  // initial load
  window.addEventListener("load", async () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then(() => console.log("sw registered"));
    }
    const all = await getAllDishes();
    if (all && all.length) {
      if (dishList) renderDishList(all, dishList, typeof getDishSliderValue !== 'undefined' ? getDishSliderValue : undefined);
      // populate shop filter selects from the saved dishes on startup
      if (typeof populateShopFilters === 'function') populateShopFilters(all);
    } else {
      // ensure filters are cleared when no dishes
      if (typeof populateShopFilters === 'function') populateShopFilters([]);
    }
  });

  // PWA install prompt handling
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


  // escapeHtml, slug, and renderDishList are now imported from utils.js and render.js

  // Filters for SHOP
  const filterCategory = document.getElementById('filterCategory');
  const filterComponent = document.getElementById('filterComponent');
  const filterDish = document.getElementById('filterDish');

  function populateShopFilters(dishes){
    if(!dishes) dishes = [];
    const cats = new Set();
    const comps = new Set();
    const names = new Set();
    for(const d of dishes){
      if(d.category) cats.add(d.category);
      names.add(d.name);
      for(const c of d.components||[]) comps.add(c.name);
    }
    // helper to fill select
    function fill(select, items, placeholder){
      if(!select) return;
      const val = select.value || '';
      select.innerHTML = `<option value="">${placeholder}</option>` + [...items].sort().map(i=>`<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
      if(val) select.value = val;
    }
    fill(filterCategory, cats, 'All categories');
    fill(filterComponent, comps, 'All components');
    fill(filterDish, names, 'All dishes');
  }

  

  // Hook filters to re-render
  if(filterCategory) filterCategory.addEventListener('change', async ()=>{
    const all = await getAllDishes(); applyShopFilters(all);
  });
  if(filterComponent) filterComponent.addEventListener('change', async ()=>{
    const all = await getAllDishes(); applyShopFilters(all);
  });
  if(filterDish) filterDish.addEventListener('change', async ()=>{
    const all = await getAllDishes(); applyShopFilters(all);
  });

  async function applyShopFilters(dishes){
    const all = dishes || await getAllDishes();
    const q = search ? search.value.trim().toLowerCase() : '';
    const cat = filterCategory ? filterCategory.value : '';
    const comp = filterComponent ? filterComponent.value : '';
    const name = filterDish ? filterDish.value : '';
    let filtered = all.slice();
    if(cat) filtered = filtered.filter(d=> (d.category||'') === cat);
    if(name) filtered = filtered.filter(d=> d.name === name);
    if(comp) filtered = filtered.filter(d=> (d.components||[]).some(c=> c.name === comp));
    if(q) filtered = filtered.filter(d=> d.name.toLowerCase().includes(q) || (d.category||'').toLowerCase().includes(q));
  if (dishList) renderDishList(filtered, dishList, typeof getDishSliderValue !== 'undefined' ? getDishSliderValue : undefined);
  }

  // Use event delegation for Open buttons so dynamic changes won't break handlers
  dishList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (id) openRecipe(id);
  });

  async function openRecipe(id) {
  // Load status and chef state for this dish
  const status = await (typeof getDishStatus === 'function' ? getDishStatus(id) : '');
  const chef = await (typeof getDishChef === 'function' ? getDishChef(id) : '');
    const d = await getDishById(id);
    if (!d) return setStatus("Dish not found", true);

    // Ensure modal is in document.body and only initialized once
    if (recipeModalEl && recipeModalEl.parentNode !== document.body) {
      document.body.appendChild(recipeModalEl);
    }
    if (!recipeModal && recipeModalEl && window.bootstrap) {
      recipeModal = new bootstrap.Modal(recipeModalEl); // Use default options: backdrop closes modal
    }

    // set modal title
    const modalLabel = document.getElementById("recipeModalLabel");
    if (modalLabel) modalLabel.textContent = d.name;

  // Status dropdown UI
    const statusOptions = [
      { value: '', label: 'No Status' },
      { value: 'not-yet-done', label: 'NOT YET DONE' },
      { value: 'gathered-together', label: 'GATHERED TOGETHER' },
      { value: 'cooking', label: 'COOKING' },
      { value: 'ready-to-plate', label: 'READY TO PLATE' },
      { value: 'plated', label: 'PLATED' },
      { value: 'packed', label: 'PACKED' },
    ];
    // Remove any existing status row to prevent duplicates
    let oldStatusRow = document.getElementById('modal-status-row');
    if (oldStatusRow) oldStatusRow.remove();
    let statusRow = document.createElement('div');
    statusRow.id = 'modal-status-row';
    statusRow.className = 'mb-3 d-flex align-items-center flex-wrap';
    modalLabel.parentNode.insertBefore(statusRow, modalLabel.nextSibling);
    // TIME START/END dropdowns
    const timeOptions = [
      '', '8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
    ];
    const [timeStart, timeEnd] = await Promise.all([
      typeof getDishTimeStart === 'function' ? getDishTimeStart(id) : '',
      typeof getDishTimeEnd === 'function' ? getDishTimeEnd(id) : ''
    ]);
    // Time Start
    const timeStartLabel = document.createElement('span');
    timeStartLabel.className = 'me-2 fw-bold ms-4';
    timeStartLabel.textContent = 'Time Start:';
    statusRow.appendChild(timeStartLabel);
    const timeStartSelect = document.createElement('select');
    timeStartSelect.className = 'form-select form-select-sm w-auto';
    timeOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt || 'None';
      timeStartSelect.appendChild(o);
    });
    timeStartSelect.value = timeStart || '';
    statusRow.appendChild(timeStartSelect);
    // Time End
    const timeEndLabel = document.createElement('span');
    timeEndLabel.className = 'me-2 fw-bold ms-4';
    timeEndLabel.textContent = 'Time End:';
    statusRow.appendChild(timeEndLabel);
    const timeEndSelect = document.createElement('select');
    timeEndSelect.className = 'form-select form-select-sm w-auto';
    timeOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt || 'None';
      timeEndSelect.appendChild(o);
    });
    timeEndSelect.value = timeEnd || '';
    statusRow.appendChild(timeEndSelect);

    // Persist time start/end and update PLAN board live
    timeStartSelect.addEventListener('change', async function() {
      if (typeof saveDishTimeStart === 'function') {
        await saveDishTimeStart(id, this.value);
        // Live update PLAN board if present
        const planBoard = document.getElementById('planBoard');
        if (planBoard && typeof getPlanRows === 'function' && typeof applyPlanFilters === 'function') {
          const loaded = await getPlanRows();
          if (loaded && loaded.length) {
            planRows = loaded;
            applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
          }
        }
      }
      // Update in PLAN table (live)
      const planTableBtns = document.querySelectorAll(`.open-recipe[data-id='${id}']`);
      planTableBtns.forEach(btn => {
        const tr = btn.closest('tr');
        if (tr) {
          const badgeArea = tr.querySelector('.dish-timestart-badge-area');
          if (badgeArea) badgeArea.textContent = this.value;
        }
      });
    });
    timeEndSelect.addEventListener('change', async function() {
      if (typeof saveDishTimeEnd === 'function') {
        await saveDishTimeEnd(id, this.value);
        // Live update PLAN board if present
        const planBoard = document.getElementById('planBoard');
        if (planBoard && typeof getPlanRows === 'function' && typeof applyPlanFilters === 'function') {
          const loaded = await getPlanRows();
          if (loaded && loaded.length) {
            planRows = loaded;
            applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
          }
        }
      }
      // Update in PLAN table (live)
      const planTableBtns = document.querySelectorAll(`.open-recipe[data-id='${id}']`);
      planTableBtns.forEach(btn => {
        const tr = btn.closest('tr');
        if (tr) {
          const badgeArea = tr.querySelector('.dish-timeend-badge-area');
          if (badgeArea) badgeArea.textContent = this.value;
        }
      });
    });
    const statusLabel = document.createElement('span');
    statusLabel.className = 'me-2 fw-bold';
    statusLabel.textContent = 'Status:';
    statusRow.appendChild(statusLabel);
    const statusSelect = document.createElement('select');
    statusSelect.className = 'form-select form-select-sm w-auto';
    statusOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      statusSelect.appendChild(o);
    });
    statusSelect.value = status || '';
    statusRow.appendChild(statusSelect);

    // CHEF dropdown UI (mirrors status logic)
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
    const chefLabel = document.createElement('span');
    chefLabel.className = 'me-2 fw-bold ms-4';
    chefLabel.textContent = 'Chef:';
    statusRow.appendChild(chefLabel);
    const chefSelect = document.createElement('select');
    chefSelect.className = 'form-select form-select-sm w-auto';
    chefOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      chefSelect.appendChild(o);
    });
    chefSelect.value = chef || '';
    statusRow.appendChild(chefSelect);
    // Show current chef as badge
    let chefBadge = document.getElementById('modal-chef-badge');
    if (!chefBadge) {
      chefBadge = document.createElement('span');
      chefBadge.id = 'modal-chef-badge';
      chefBadge.className = 'badge ms-3';
      statusRow.appendChild(chefBadge);
    }
    function chefBadgeClass(val) {
      switch(val) {
        case 'ADAM': return 'badge ms-3 bg-primary';
        case 'EMILY': return 'badge ms-3 bg-success';
        case 'EVA': return 'badge ms-3 bg-warning text-dark';
        case 'PRANAV': return 'badge ms-3 bg-danger';
        case 'CHEF A': return 'badge ms-3 bg-info text-dark';
        case 'CHEF B': return 'badge ms-3 bg-secondary';
        case 'CHEF C': return 'badge ms-3 bg-dark';
        default: return 'badge ms-3 bg-light text-dark';
      }
    }
    function updateChefBadge(val) {
      const found = chefOptions.find(o => o.value === val);
      chefBadge.textContent = found && found.value ? found.label : '';
      chefBadge.className = chefBadgeClass(val);
    }
    updateChefBadge(chefSelect.value);
    chefSelect.addEventListener('change', async function() {
      if (typeof saveDishChef === 'function') {
        await saveDishChef(id, this.value);
        // Live update PLAN board if present
        const planBoard = document.getElementById('planBoard');
        if (planBoard) {
          if (typeof getPlanRows === 'function' && typeof applyPlanFilters === 'function') {
            const loaded = await getPlanRows();
            if (loaded && loaded.length) {
              planRows = loaded;
              applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
            }
          }
        }
      }
      updateChefBadge(this.value);
      // Update in card (legacy)
      const cardBtn = document.querySelector(`button[data-id='${id}']`);
      if (cardBtn) {
        const card = cardBtn.closest('.card');
        if (card) {
          const badgeArea = card.querySelector('.dish-chef-badge-area');
          if (badgeArea) {
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
            const found = chefOptions.find(o => o.value === chefSelect.value);
            const label = found && found.value ? found.label : '';
            let badgeClass = chefBadgeClass(chefSelect.value).replace('ms-3','ms-0');
            badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          }
        }
      }
      // Update in PLAN table (new)
      const planTableBtns = document.querySelectorAll(`.open-recipe[data-id='${id}']`);
      planTableBtns.forEach(btn => {
        const tr = btn.closest('tr');
        if (tr) {
          const badgeArea = tr.querySelector('.dish-chef-badge-area');
          if (badgeArea) {
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
            const found = chefOptions.find(o => o.value === chefSelect.value);
            const label = found && found.value ? found.label : '';
            let badgeClass = chefBadgeClass(chefSelect.value).replace('ms-3','ms-0 me-2');
            badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          }
        }
      });
    });
    // Show current status as badge
    let statusBadge = document.getElementById('modal-status-badge');
    if (!statusBadge) {
      statusBadge = document.createElement('span');
      statusBadge.id = 'modal-status-badge';
      statusBadge.className = 'badge ms-3';
      statusRow.appendChild(statusBadge);
    }
    function updateStatusBadge(val) {
      const found = statusOptions.find(o => o.value === val);
      statusBadge.textContent = found && found.value ? found.label : '';
      statusBadge.className = 'badge ms-3 ' +
        (val === 'not-yet-done' ? 'bg-secondary' :
         val === 'gathered-together' ? 'bg-warning text-dark' :
         val === 'cooking' ? 'bg-primary' :
         val === 'ready-to-plate' ? 'bg-success' :
         val === 'plated' ? 'bg-dark' :
         val === 'packed' ? 'bg-success' : 'bg-light text-dark');
    }
    updateStatusBadge(statusSelect.value);
    statusSelect.addEventListener('change', async function() {
      // Wait for save to complete before updating UI
      if (typeof saveDishStatus === 'function') {
        await saveDishStatus(id, this.value);
        // Live update PLAN board if present
        const planBoard = document.getElementById('planBoard');
        if (planBoard) {
          // Reload planRows from IndexedDB and re-render
          if (typeof getPlanRows === 'function' && typeof applyPlanFilters === 'function') {
            const loaded = await getPlanRows();
            if (loaded && loaded.length) {
              planRows = loaded;
              applyPlanFilters(planRows, planSearch, priorityFilter, renderPlanBoard);
            }
          }
        }
      }
      updateStatusBadge(this.value);
      // Update the status badge in real time in both card and PLAN table
      // Update in card (legacy)
      const cardBtn = document.querySelector(`button[data-id='${id}']`);
      if (cardBtn) {
        const card = cardBtn.closest('.card');
        if (card) {
          const badgeArea = card.querySelector('.dish-status-badge-area');
          if (badgeArea) {
            // Status options and badge color logic must match here
            const statusOptions = [
              { value: '', label: 'No Status' },
              { value: 'not-yet-done', label: 'NOT YET DONE' },
              { value: 'gathered-together', label: 'GATHERED TOGETHER' },
              { value: 'cooking', label: 'COOKING' },
              { value: 'ready-to-plate', label: 'READY TO PLATE' },
              { value: 'plated', label: 'PLATED' },
              { value: 'packed', label: 'PACKED' },
            ];
            const found = statusOptions.find(o => o.value === statusSelect.value);
            const label = found && found.value ? found.label : '';
            let badgeClass = 'badge ms-0 ';
            badgeClass +=
              (statusSelect.value === 'not-yet-done' ? 'bg-secondary' :
               statusSelect.value === 'gathered-together' ? 'bg-warning text-dark' :
               statusSelect.value === 'cooking' ? 'bg-primary' :
               statusSelect.value === 'ready-to-plate' ? 'bg-success' :
               statusSelect.value === 'plated' ? 'bg-dark' :
               statusSelect.value === 'packed' ? 'bg-success' : 'bg-light text-dark');
            badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          }
        }
      }
      // Update in PLAN table (new)
      // Find all table rows with a button[data-id] matching this id
      const planTableBtns = document.querySelectorAll(`.open-recipe[data-id='${id}']`);
      planTableBtns.forEach(btn => {
        const tr = btn.closest('tr');
        if (tr) {
          const badgeArea = tr.querySelector('.dish-status-badge-area');
          if (badgeArea) {
            const statusOptions = [
              { value: '', label: 'No Status' },
              { value: 'not-yet-done', label: 'NOT YET DONE' },
              { value: 'gathered-together', label: 'GATHERED TOGETHER' },
              { value: 'cooking', label: 'COOKING' },
              { value: 'ready-to-plate', label: 'READY TO PLATE' },
              { value: 'plated', label: 'PLATED' },
              { value: 'packed', label: 'PACKED' },
            ];
            const found = statusOptions.find(o => o.value === statusSelect.value);
            const label = found && found.value ? found.label : '';
            let badgeClass = 'badge ms-0 me-2 ';
            badgeClass +=
              (statusSelect.value === 'not-yet-done' ? 'bg-secondary' :
               statusSelect.value === 'gathered-together' ? 'bg-warning text-dark' :
               statusSelect.value === 'cooking' ? 'bg-primary' :
               statusSelect.value === 'ready-to-plate' ? 'bg-success' :
               statusSelect.value === 'plated' ? 'bg-dark' :
               statusSelect.value === 'packed' ? 'bg-success' : 'bg-light text-dark');
            badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          }
        }
      });
    });

    // Get method from methods.js
    let method = (typeof METHODS !== 'undefined' && METHODS[id]) || null;
    // Try slugified dish name if exact id key not present
    if (!method) {
      const slugName = slug(d.name || '');
      if (slugName && typeof METHODS !== 'undefined' && METHODS[slugName]) method = METHODS[slugName];
    }
    // Loose fallback: find a METHODS key that contains the dish name slug or vice versa
    if (!method && typeof METHODS !== 'undefined') {
      const keys = Object.keys(METHODS || {});
      const nameNorm = (d.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const k of keys) {
        if (!k) continue;
        if (k === nameNorm || k.includes(nameNorm) || nameNorm.includes(k)) {
          method = METHODS[k];
          break;
        }
      }
    }
    // Alias lookup: if a METHOD_ALIASES mapping exists, use it to resolve dish id -> method key
    if (!method && typeof METHOD_ALIASES !== 'undefined') {
      try {
        const aliasKey = METHOD_ALIASES[id] || METHOD_ALIASES[d.id] || METHOD_ALIASES[slug(d.name||'')];
        if (aliasKey && typeof METHODS !== 'undefined' && METHODS[aliasKey]) {
          method = METHODS[aliasKey];
          usedMethodKey = aliasKey;
        }
      } catch (e){ /* ignore alias errors */ }
    }
    let usedMethodKey = null;
    if (!method) {
      method = {};
      console.info(`No METHOD found for dish id='${id}' name='${d.name}' — check methods.js keys`);
    } else {
      // try to recover the key used
      for(const k of Object.keys(METHODS||{})){
        if(METHODS[k] === method){ usedMethodKey = k; break; }
      }
    }

    // Update header info
    document.getElementById("prepTimeDisplay").textContent =
      method.prep || "--";
    document.getElementById("cookTimeDisplay").textContent =
      method.cook || "--";

    // Handle images (Bootstrap gallery style)
    const imageContainer = document.getElementById("recipeImages");
    if (imageContainer) {
      if (method.images && method.images.length > 0) {
        imageContainer.classList.remove("d-none");
        // Render images in 3 columns, Bootstrap utility classes only
        const colCount = 3;
        const cols = Array.from({ length: colCount }, () => []);
        method.images.forEach((img, i) => {
          cols[i % colCount].push(img);
        });
        imageContainer.innerHTML = cols
          .map(
            (colImgs) =>
              `<div class="col-lg-4 col-md-6 mb-4 mb-lg-0">` +
              colImgs
                .map(
                  (img) =>
                    `<img src="${img}" class="w-100 shadow-1-strong rounded mb-4" style="object-fit:cover;max-height:220px;" alt="Recipe image">`
                )
                .join("") +
              `</div>`
          )
          .join("");
      } else {
        imageContainer.classList.add("d-none");
        imageContainer.innerHTML = '';
      }
    }

    // Optional slider controls (guarded)
    const mySlider = document.getElementById("mySlider");
    const sliderValueDisplay = document.getElementById("sliderValueDisplay");
    if (mySlider && sliderValueDisplay) {
      // Load persisted slider value for this dish
      getDishSliderValue(id).then(val => {
        const sliderVal = (val && !isNaN(val)) ? Number(val) : 1;
        mySlider.value = sliderVal;
        sliderValueDisplay.textContent = sliderVal;
        updateQuantities();
      });
      // Update the displayed slider value and persist on change
      mySlider.oninput = function () {
        sliderValueDisplay.innerHTML = this.value;
        saveDishSliderValue(id, this.value);
        updateQuantities();
        // Also update the Orders value on the card immediately
        const card = document.querySelector(`button[data-id='${id}']`);
        if (card) {
          const ordersSpan = card.closest('.card').querySelector('.orders-value');
          if (ordersSpan) ordersSpan.textContent = this.value;
        }
        // Also update the Orders badge in PLAN table immediately
        const planTableBtns = document.querySelectorAll(`.open-recipe[data-id='${id}']`);
        planTableBtns.forEach(btn => {
          const tr = btn.closest('tr');
          if (tr) {
            const badgeArea = tr.querySelector('.dish-orders-badge-area');
            if (badgeArea) {
              let badgeClass = 'badge ms-0 me-2 bg-primary';
              badgeArea.innerHTML = `<span class=\"${badgeClass}\">${this.value}</span>`;
            }
          }
        });
      };
    }

    // Populate components/ingredients as Bootstrap checklist
    const componentsArea = document.getElementById("componentsArea");
    componentsArea.innerHTML = "";
    // Load checklist state for this dish
    const checklistState = await (typeof getDishChecklist === 'function' ? getDishChecklist(id) : {});
    for (const comp of d.components || []) {
      const cdiv = document.createElement("div");
      cdiv.className = "mb-3";
      const h = document.createElement("h6");
      h.className = "mb-2 text-secondary fw-bold";
      h.textContent = comp.name;
      cdiv.appendChild(h);
      for (const it of comp.items) {
        const ingKey = `${comp.name}::${it.ingredient}`;
        const checked = checklistState && checklistState[ingKey];
        const formCheck = document.createElement('div');
        formCheck.className = 'form-check mb-1';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        // Make checkbox id unique per modal open by prefixing with dish id
        checkbox.id = `check-${id}-${slug(comp.name)}-${slug(it.ingredient)}`;
        checkbox.checked = !!checked;
        // Store base qty/unit/ingredient for scaling
        checkbox.dataset.baseQty = parseFloat(it.qtyPer) || 0;
        checkbox.dataset.unit = it.unit;
        checkbox.dataset.ingredient = it.ingredient;
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.setAttribute('for', checkbox.id);
        // Store base qty/unit/ingredient for scaling
        label.dataset.baseQty = parseFloat(it.qtyPer) || 0;
        label.dataset.unit = it.unit;
        label.dataset.ingredient = it.ingredient;
        label.textContent = `${it.qtyPer} ${it.unit} ${it.ingredient}`;
        // Apply strikethrough if checked
        if (checkbox.checked) label.classList.add('text-decoration-line-through');
        checkbox.addEventListener('change', async function() {
          checklistState[ingKey] = this.checked;
          if (this.checked) {
            label.classList.add('text-decoration-line-through');
          } else {
            label.classList.remove('text-decoration-line-through');
          }
          if (typeof saveDishChecklist === 'function') await saveDishChecklist(id, checklistState);
        });
        formCheck.appendChild(checkbox);
        formCheck.appendChild(label);
        cdiv.appendChild(formCheck);
      }
      componentsArea.appendChild(cdiv);
    }

    // Populate instructions with strikethrough toggle
    const instructionsList = document.getElementById("instructionsList");
    // Load strikethrough state for this dish
    const instructionsState = await (typeof getDishInstructionsState === 'function' ? getDishInstructionsState(id) : {});
    if (method.instructions && method.instructions.length > 0) {
      instructionsList.innerHTML = '';
      method.instructions.forEach((inst, idx) => {
        const li = document.createElement('li');
        li.className = 'mb-3';
        li.textContent = inst;
        if (instructionsState[idx]) li.style.textDecoration = 'line-through';
        li.addEventListener('click', async function() {
          instructionsState[idx] = !instructionsState[idx];
          li.style.textDecoration = instructionsState[idx] ? 'line-through' : '';
          if (typeof saveDishInstructionsState === 'function') await saveDishInstructionsState(id, instructionsState);
        });
        instructionsList.appendChild(li);
      });
    } else {
      instructionsList.innerHTML = '<li class="mb-3 text-muted">No instructions available yet.</li>';
    }

    // Show which METHODS key provided the instructions (if any)
    const methodSourceEl = document.getElementById('methodSource');
    if(methodSourceEl){
      if(usedMethodKey){ methodSourceEl.style.display = 'block'; methodSourceEl.textContent = `Method source: ${usedMethodKey}`; }
      else if(method.instructions && method.instructions.length) { methodSourceEl.style.display = 'block'; methodSourceEl.textContent = `Method source: (provided inline)`; }
      else { methodSourceEl.style.display = 'none'; methodSourceEl.textContent = ''; }
    }

    // Function to update quantities based on slider
    function updateQuantities() {
      const scale = parseFloat(mySlider.value);
      sliderValueDisplay.textContent = scale;
      // Update all ingredient labels
      const allLabels = componentsArea.querySelectorAll("label.form-check-label");
      allLabels.forEach((label) => {
        const baseQty = parseFloat(label.dataset.baseQty) || 0;
        const unit = label.dataset.unit;
        const ingredient = label.dataset.ingredient;
        const scaledQty = (baseQty * scale).toFixed(2).replace(/\.00$/, "");
        label.textContent = `${scaledQty} ${unit} ${ingredient}`;
      });
    }

    // Slider input event (guarded)
    if (mySlider) {
      mySlider.addEventListener("input", updateQuantities);
      // initialize on load
      updateQuantities();
    }

    // (print/button removed; slider-only behavior remains guarded above)

    // Populate notes
    const notesSection = document.getElementById("notesSection");
    const notesContent = document.getElementById("notesContent");
    if (method.notes) {
      notesSection.classList.remove("d-none");
      notesContent.textContent = method.notes;
    } else {
      notesSection.classList.add("d-none");
    }

    if (recipeModal) {
      recipeModal.show();
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }
})();
