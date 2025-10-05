// main.js — CSV upload, parse, store, UI
// main.js — CSV upload, parse, store, UI
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
  const planTable = document.getElementById('planTable');
  const planTableBody = planTable ? planTable.querySelector('tbody') : null;
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
    // check for the kanban board container (we removed the old table)
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

  // PLAN search + priority filter
  const priorityFilter = document.getElementById('planPriorityFilter');
  function applyPlanFilters(){
    const q = planSearch ? planSearch.value.trim().toLowerCase() : '';
    const p = priorityFilter ? priorityFilter.value : '';
    let filtered = planRows || [];
    if(p) filtered = filtered.filter(r => String(r['PRIORITY']||'').toLowerCase() === p.toLowerCase());
    if(q) filtered = filtered.filter(row => Object.values(row).some(val => String(val||'').toLowerCase().includes(q)));
    renderPlanBoard(filtered);
  }

  if(planSearch){
    planSearch.addEventListener('input', applyPlanFilters);
  }
  if(priorityFilter){
    priorityFilter.addEventListener('change', applyPlanFilters);
  }

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
            renderDishList(grouped);
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
    renderDishList(filtered);
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
    if (all && all.length) renderDishList(all);
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

  function groupByDish(rows) {
    // expected columns: '# OF ORDERS', 'CATEGORY','DISH','COMPONENT','INGREDIENT','QUANTITY PER SERVING','UNIT', ...
    const map = new Map();
    for (const r of rows) {
      const name = (r["DISH"] || r["Dish"] || r["dish"] || "").trim();
      if (!name) continue;
      const cat = r["CATEGORY"] || r["Category"] || r["category"] || "";
      // Important: orders belongs to the dish level, but each ingredient row may repeat the same order count.
      // We'll take the maximum orders seen for that dish (or sum only if you have per-ingredient orders differently).
      const orders =
        Number(r["# OF ORDERS"] || r["Orders"] || r["orders"] || 0) || 0;
      const comp = (
        r["COMPONENT"] ||
        r["Component"] ||
        r["component"] ||
        "Main"
      ).trim();
      const ingredient = (
        r["INGREDIENT"] ||
        r["Ingredient"] ||
        r["ingredient"] ||
        ""
      ).trim();
      const qtyPer =
        r["QUANTITY PER SERVING"] ||
        r["Quantity per serving"] ||
        r["QUANTITY PER SERVING"] ||
        "";
      const unit = r["UNIT"] || r["Unit"] || r["unit"] || "";

      if (!map.has(name)) {
        map.set(name, {
          id: slug(name),
          name,
          category: cat,
          totalOrders: 0,
          components: new Map(),
          method: "",
        });
      }
      const entry = map.get(name);
      // Use max to avoid summing the same order count across ingredient rows
      entry.totalOrders = Math.max(entry.totalOrders || 0, orders);
      if (!entry.components.has(comp)) entry.components.set(comp, []);
      entry.components.get(comp).push({ ingredient, qtyPer, unit });
    }

    // convert components map to array
    const dishes = [];
    for (const v of map.values()) {
      const components = [];
      for (const [k, list] of v.components.entries())
        components.push({ name: k, items: list });
      dishes.push({
        id: v.id,
        name: v.name,
        category: v.category,
        totalOrders: v.totalOrders,
        components,
        method: v.method,
        prepTime: v.prepTime,
        cookTime: v.cookTime,
      });
    }
    return dishes;
  }

  function slug(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function renderDishList(dishes) {
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
          <h3 class="h5 mb-1">${escapeHtml(d.name)}</h3>
          <div class="text-muted small">${escapeHtml(d.category || "")}</div>
          <div class="small text-monospace text-muted mt-1">slug: <code>${escapeHtml(
            d.id
          )}</code>
          </div>
        </div>
        <div class="mt-3 d-flex justify-content-between align-items-center">
          <div class="text-muted">Orders: <strong>${
            d.totalOrders
          }</strong></div>
          <button data-id="${
            d.id
          }" class="btn btn-sm btn-outline-primary open-recipe">Open</button>
        </div>`;
      col.appendChild(card);
      dishList.appendChild(col);
    }
    // ensure dishList is focusable for delegation
    dishList.tabIndex = -1;
  }

  // Use event delegation for Open buttons so dynamic changes won't break handlers
  dishList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (id) openRecipe(id);
  });

  async function openRecipe(id) {
    const d = await getDishById(id);
    if (!d) return setStatus("Dish not found", true);

    // lazy init modal
    if (!recipeModal && recipeModalEl && window.bootstrap) {
      recipeModal = new bootstrap.Modal(recipeModalEl);
    }

    // set modal title
    const modalLabel = document.getElementById("recipeModalLabel");
    if (modalLabel) modalLabel.textContent = d.name;

    // Get method from methods.js
    const method = METHODS[id] || {};

    // Update header info
    document.getElementById("prepTimeDisplay").textContent =
      method.prep || "--";
    document.getElementById("cookTimeDisplay").textContent =
      method.cook || "--";
    document.getElementById("ordersDisplay").textContent = d.totalOrders || 0;

    // Handle images (simple grid) — optional
    const imageContainer = document.getElementById("recipeImages");
    if (imageContainer) {
      if (method.images && method.images.length > 0) {
        imageContainer.classList.remove("d-none");
        imageContainer.innerHTML = method.images
          .map(
            (img) => `
          <div class="col-6 col-md-4">
            <img 
              src="${img}" 
              class="img-fluid rounded" 
              alt="Recipe image" 
              style="object-fit: cover; max-height: 200px; width: 100%;"
            >
          </div>
        `
          )
          .join("");
      } else {
        imageContainer.classList.add("d-none");
      }
    }

    // Optional slider/button controls (guarded)
    const mySlider = document.getElementById("mySlider");
    const sliderValueDisplay = document.getElementById("sliderValueDisplay");
    const myButton = document.getElementById("myButton");
    if (mySlider && sliderValueDisplay) {
      // Update the displayed slider value when the slider changes
      mySlider.oninput = function () {
        sliderValueDisplay.innerHTML = this.value;
      };
    }
    if (myButton && mySlider) {
      myButton.addEventListener("click", function () {
        const currentValue = mySlider.value;
        alert(`Button clicked! Slider value is: ${currentValue}`);
        const scaledqtyValue = document.getElementById("componentsArea");
      });
    }

    // Populate components/ingredients
    const componentsArea = document.getElementById("componentsArea");
    componentsArea.innerHTML = "";
    for (const comp of d.components || []) {
      const cdiv = document.createElement("div");
      cdiv.className = "mb-3";
      const h = document.createElement("h6");
      h.className = "mb-2 text-secondary fw-bold";
      h.textContent = comp.name;
      cdiv.appendChild(h);
      const ul = document.createElement("ul");
      ul.className = "list-unstyled small mb-0";

      for (const it of comp.items) {
        const li = document.createElement("li");
        li.className = "mb-1";
        li.dataset.qty = parseFloat(it.qtyPer) || 0;
        li.dataset.unit = it.unit;
        li.dataset.ingredient = it.ingredient;
        li.textContent = `${it.qtyPer} ${it.unit} ${it.ingredient}`;
        ul.appendChild(li);
      }

      cdiv.appendChild(ul);
      componentsArea.appendChild(cdiv);
    }

    // Populate instructions
    const instructionsList = document.getElementById("instructionsList");
    if (method.instructions && method.instructions.length > 0) {
      instructionsList.innerHTML = method.instructions
        .map((inst) => `<li class="mb-3">${escapeHtml(inst)}</li>`)
        .join("");
    } else {
      instructionsList.innerHTML =
        '<li class="mb-3 text-muted">No instructions available yet.</li>';
    }

    // Function to update quantities based on slider
    function updateQuantities() {
      const scale = parseFloat(mySlider.value);
      sliderValueDisplay.textContent = scale;

      const allItems = componentsArea.querySelectorAll("li[data-qty]");
      allItems.forEach((li) => {
        const baseQty = parseFloat(li.dataset.qty) || 0;
        const unit = li.dataset.unit;
        const ingredient = li.dataset.ingredient;
        const scaledQty = (baseQty * scale).toFixed(2).replace(/\.00$/, "");
        li.textContent = `${scaledQty} ${unit} ${ingredient}`;
      });
    }

    // Slider input event (guarded)
    if (mySlider) {
      mySlider.addEventListener("input", updateQuantities);
      // initialize on load
      updateQuantities();
    }

    // Button click example (guarded)
    const myButtonEl = document.getElementById("myButton");
    if(myButtonEl && mySlider){
      myButtonEl.addEventListener("click", () => {
        alert(`Slider value is: ${mySlider.value}`);
      });
    }

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
