// main.js — CSV upload, parse, store, UI
// main.js — CSV upload, parse, store, UI
import { escapeHtml, slug } from './utils.js';
import { renderDishList, renderPlanBoard } from './render.js';
import { groupByDish, applyPlanFilters } from './data.js';
import { setupPlanEvents } from './events.js';
(function () {
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
          if(typeof applyPlanFilters === 'function') applyPlanFilters();
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
          if(typeof applyPlanFilters === 'function') applyPlanFilters();
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
    const board = document.getElementById('planBoard');
    if(!board) return;
    board.innerHTML = '';
    if(!rows || !rows.length){
      board.innerHTML = '<div class="col-12 text-center text-muted py-5">No PLAN rows loaded.</div>';
      return;
    }

    // Fixed 3-day view: Sunday, Monday, Tuesday
    const desired = ['Sunday','Monday','Tuesday'];
    // Group rows by the desired day (case-insensitive). Accept short forms (Sun, Mon, Tue).
    const rowsByDay = {};
    for(const d of desired) rowsByDay[d] = [];
    for(const r of rows){
      const raw = String(r['DAY'] || r['Day'] || r['day'] || '').trim();
      const low = raw.toLowerCase();
      if(!low) continue;
      for(const d of desired){
        const dl = d.toLowerCase();
        if(low === dl || low.startsWith(dl) || low.includes(dl) || low.startsWith(dl.slice(0,3))){
          rowsByDay[d].push(r);
          break;
        }
      }
    }
    const days = desired.slice();

    // Build columns
    for(const day of days){
      const col = document.createElement('div');
      col.className = 'col-12 col-md-4';
      const card = document.createElement('div');
      card.className = 'card h-100';
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body d-flex flex-column';
      const header = document.createElement('div');
      header.className = 'd-flex justify-content-between align-items-center mb-3';
      const title = document.createElement('h5'); title.className = 'mb-0';
      title.textContent = day || 'No Day';
  const count = document.createElement('span'); count.className = 'badge bg-secondary';
  count.textContent = (rowsByDay[day] || []).length;
      header.appendChild(title); header.appendChild(count);
      cardBody.appendChild(header);

      const list = document.createElement('div'); list.className = 'd-flex flex-column gap-2';
  let items = rowsByDay[day] ? rowsByDay[day].slice() : [];
      // sort by PRIORITY: High -> Medium -> Low -> unspecified
      const priorityScore = (p) => {
        const v = String(p||'').toLowerCase();
        if(v === 'high') return 3;
        if(v === 'medium') return 2;
        if(v === 'low') return 1;
        return 0;
      };
      items = items.slice().sort((a,b)=> {
        const pa = priorityScore(a['PRIORITY']||a['Priority']||a['priority']);
        const pb = priorityScore(b['PRIORITY']||b['Priority']||b['priority']);
        if(pb !== pa) return pb - pa; // descending
        // fallback: sort by TIME START if available
        const ta = String(a['TIME START']||a['Time Start']||'');
        const tb = String(b['TIME START']||b['Time Start']||'');
        return ta.localeCompare(tb);
      });
      for(const it of items){
        const item = document.createElement('div');
        item.className = 'p-2 border rounded bg-white shadow-sm';
        const top = document.createElement('div'); top.className = 'd-flex justify-content-between align-items-start gap-2';
        const left = document.createElement('div');
        left.innerHTML = `<div class="fw-bold">${escapeHtml(it['TASK']||it['Task']||'')}</div><div class="small text-muted">${escapeHtml(it['DISH']||'')} — ${escapeHtml(it['COMPONENT']||'')}</div>`;
        const right = document.createElement('div');
        const pr = String(it['PRIORITY']||'').toLowerCase();
        const prClass = pr === 'high' ? 'bg-danger' : pr === 'medium' ? 'bg-warning text-dark' : 'bg-success';
        right.innerHTML = `<span class="badge ${prClass} ms-2">${escapeHtml(it['PRIORITY']||'')}</span>`;
        top.appendChild(left); top.appendChild(right);
        item.appendChild(top);

        const meta = document.createElement('div'); meta.className = 'mt-2 small text-muted';
        meta.textContent = `Chef: ${it['CHEF']||it['Chef']||''} • ${it['TIME START']||''}–${it['TIME END']||''}`;
        item.appendChild(meta);
        list.appendChild(item);
      }

      cardBody.appendChild(list);
      card.appendChild(cardBody);
      col.appendChild(card);
      board.appendChild(col);
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
  // Load status state for this dish
  const status = await (typeof getDishStatus === 'function' ? getDishStatus(id) : '');
    const d = await getDishById(id);
    if (!d) return setStatus("Dish not found", true);

    // lazy init modal
    if (!recipeModal && recipeModalEl && window.bootstrap) {
      recipeModal = new bootstrap.Modal(recipeModalEl);
    }

    // set modal title
    const modalLabel = document.getElementById("recipeModalLabel");
    if (modalLabel) modalLabel.textContent = d.name;

    // Status dropdown UI
    const statusOptions = [
      { value: '', label: 'No Status' },
      { value: 'not-yet-done', label: 'NOT YET DONE' },
      { value: 'prepped', label: 'PREPPED' },
      { value: 'gathered-together', label: 'GATHERED TOGETHER' },
      { value: 'cooking', label: 'COOKING' },
      { value: 'ready-to-plate', label: 'READY TO PLATE' },
      { value: 'plated', label: 'PLATED' },
      { value: 'packed', label: 'PACKED' },
    ];
    let statusRow = document.getElementById('modal-status-row');
    if (!statusRow) {
      statusRow = document.createElement('div');
      statusRow.id = 'modal-status-row';
      statusRow.className = 'mb-3 d-flex align-items-center';
      modalLabel.parentNode.insertBefore(statusRow, modalLabel.nextSibling);
    } else {
      statusRow.innerHTML = '';
    }
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
         val === 'prepped' ? 'bg-info text-dark' :
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
      }
      updateStatusBadge(this.value);
      // Update the card's status badge in real time
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
              { value: 'prepped', label: 'PREPPED' },
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
               statusSelect.value === 'prepped' ? 'bg-info text-dark' :
               statusSelect.value === 'gathered-together' ? 'bg-warning text-dark' :
               statusSelect.value === 'cooking' ? 'bg-primary' :
               statusSelect.value === 'ready-to-plate' ? 'bg-success' :
               statusSelect.value === 'plated' ? 'bg-dark' :
               statusSelect.value === 'packed' ? 'bg-success' : 'bg-light text-dark');
            badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
          }
        }
      }
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
        checkbox.id = `check-${slug(comp.name)}-${slug(it.ingredient)}`;
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
