// modal.js — Recipe modal management
import { slug, escapeHtml } from './utils.js';
import {
  getDishById,
  getDishSliderValue,
  saveDishSliderValue,
  getPlanRows,
  getDishStatus,
  getDishChef,
  getDishTimeStart,
  getDishTimeEnd,
  saveDishTimeStart,
  saveDishTimeEnd,
  saveDishChef,
  saveDishStatus,
  getDishChecklist,
  saveDishChecklist,
  getDishInstructionsState,
  saveDishInstructionsState
} from './idb.js';

let recipeModal = null;
let recipeModalEl = document.getElementById('recipeModal');

export async function openRecipe(id) {
  // Load status and chef state for this dish
  const status = await getDishStatus(id);
  const chef = await getDishChef(id);
  const d = await getDishById(id);
  if (!d) {
    setStatus("Dish not found", true);
    return;
  }

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
  getDishTimeStart(id),
  getDishTimeEnd(id)
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

  // Setup time change handlers
  setupTimeHandlers(timeStartSelect, timeEndSelect, id);
  
  // Setup status and chef UI
  setupStatusAndChefUI(statusRow, statusOptions, status, chef, id);
  
  // Handle method data
  setupMethodAndImages(d, id);
  
  // Setup slider and ingredients
  setupSliderAndIngredients(d, id);
  
  // Setup instructions
  setupInstructions(d, id);

  if (recipeModal) {
    recipeModal.show();
  }
}

function setupTimeHandlers(timeStartSelect, timeEndSelect, id) {
  // Persist time start/end and update PLAN board live
  timeStartSelect.addEventListener('change', async function() {
    await saveDishTimeStart(id, this.value);
    await updatePlanBoard();
    await updateTimeInPlanTable(id, 'timestart', this.value);
  });
  
  timeEndSelect.addEventListener('change', async function() {
    await saveDishTimeEnd(id, this.value);
    await updatePlanBoard();
    await updateTimeInPlanTable(id, 'timeend', this.value);
  });
}

function setupStatusAndChefUI(statusRow, statusOptions, status, chef, id) {
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

  // CHEF dropdown UI
  const chefOptions = [
    { value: '', label: 'No Chef' },
    { value: 'ADAM', label: 'ADAM' },
    { value: 'EMILY', label: 'EMILY' },
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
  
  // Setup status and chef badges
  setupStatusAndChefBadges(statusRow, statusSelect, chefSelect, statusOptions, chefOptions, id);
}

function setupStatusAndChefBadges(statusRow, statusSelect, chefSelect, statusOptions, chefOptions, id) {
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
    console.log('🔄 Chef changed to:', this.value);
    await saveDishChef(id, this.value);
    console.log('🔄 Chef saved, updating plan board...');
    await updatePlanBoard();
    console.log('🔄 Plan board update complete');
    updateChefBadge(this.value);
    updateChefInCards(id, this.value, chefBadgeClass, chefOptions);
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
    await saveDishStatus(id, this.value);
    await updatePlanBoard();
    updateStatusBadge(this.value);
    updateStatusInCards(id, this.value, statusOptions);
  });
}

function setupMethodAndImages(d, id) {
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
  document.getElementById("prepTimeDisplay").textContent = method.prep || "--";
  document.getElementById("cookTimeDisplay").textContent = method.cook || "--";

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

  // Show which METHODS key provided the instructions (if any)
  const methodSourceEl = document.getElementById('methodSource');
  if(methodSourceEl){
    if(usedMethodKey){ 
      methodSourceEl.style.display = 'block'; 
      methodSourceEl.textContent = `Method source: ${usedMethodKey}`; 
    } else if(method.instructions && method.instructions.length) { 
      methodSourceEl.style.display = 'block'; 
      methodSourceEl.textContent = `Method source: (provided inline)`; 
    } else { 
      methodSourceEl.style.display = 'none'; 
      methodSourceEl.textContent = ''; 
    }
  }

  return method;
}

function setupSliderAndIngredients(d, id) {
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
      updateOrdersInCards(id, this.value);
    };
  }

  // Populate components/ingredients as Bootstrap checklist
  populateIngredients(d, id);
  
  // Function to update quantities based on slider
  function updateQuantities() {
    const scale = parseFloat(mySlider.value);
    sliderValueDisplay.textContent = scale;
    // Update all ingredient labels
    const componentsArea = document.getElementById("componentsArea");
    const allLabels = componentsArea.querySelectorAll("label.form-check-label");
    allLabels.forEach((label) => {
      const baseQty = parseFloat(label.dataset.baseQty) || 0;
      const unit = label.dataset.unit;
      const ingredient = label.dataset.ingredient;
      const scaledQty = (baseQty * scale).toFixed(2).replace(/\.00$/, "");
      label.textContent = `${scaledQty} ${unit} ${ingredient}`;
    });
  }
}

import { renderIngredientChecklist } from './render.js';
async function populateIngredients(d, id) {
  const componentsArea = document.getElementById("componentsArea");
  // Load checklist state for this dish
  const checklistState = await getDishChecklist(id);
  console.log('[MODAL] Loaded checklist state for', id, checklistState);
  // Get slider value for scaling
  let sliderValue = 1;
  const slider = document.getElementById('mySlider');
  if (slider) sliderValue = parseFloat(slider.value) || 1;
  await renderIngredientChecklist({
    container: componentsArea,
    dish: d,
    dishId: id,
    checklistState,
    sliderValue,
    onChecklistChange: async (ingKey, checked, {checkbox, label}) => {
      checklistState[ingKey] = checked;
      if (checked) label.classList.add('text-decoration-line-through');
      else label.classList.remove('text-decoration-line-through');
      console.log('[MODAL] Saving checklist state for', id, checklistState);
      await saveDishChecklist(id, checklistState);
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
    }
  });
}

async function setupInstructions(d, id) {
  // Get method for instructions
  let method = (typeof METHODS !== 'undefined' && METHODS[id]) || {};
  
  // Populate instructions with strikethrough toggle
  const instructionsList = document.getElementById("instructionsList");
  // Load strikethrough state for this dish
  const instructionsState = await getDishInstructionsState(id);
  
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
  await saveDishInstructionsState(id, instructionsState);
      });
      instructionsList.appendChild(li);
    });
  } else {
    instructionsList.innerHTML = '<li class="mb-3 text-muted">No instructions available yet.</li>';
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
}

// Helper functions for updating UI elements
async function updatePlanBoard() {
  const planBoard = document.getElementById('planBoard');
  if (planBoard && typeof applyPlanFilters === 'function') {
    try {
      // Small delay to ensure IndexedDB writes have completed
      await new Promise(resolve => setTimeout(resolve, 50));
      
  const loaded = await getPlanRows();
      if (loaded && loaded.length) {
        window.planRows = loaded;
        const planSearch = document.getElementById('planSearch');
        const priorityFilter = document.getElementById('planFilterPriority');
        const { renderPlanBoard } = await import('./render.js');
        await applyPlanFilters(window.planRows, planSearch, priorityFilter, renderPlanBoard);
      }
    } catch (err) {
      console.error('Error updating plan board:', err);
    }
  }
}

async function updateTimeInPlanTable(id, type, value) {
  // For the new ingredient coordination board, time updates trigger a full refresh
  await updatePlanBoard();
}

function updateChefInCards(id, chefValue, chefBadgeClass, chefOptions) {
  // Update in card (legacy)
  const cardBtn = document.querySelector(`button[data-id='${id}']`);
  if (cardBtn) {
    const card = cardBtn.closest('.card');
    if (card) {
      const badgeArea = card.querySelector('.dish-chef-badge-area');
      if (badgeArea) {
        const found = chefOptions.find(o => o.value === chefValue);
        const label = found && found.value ? found.label : '';
        let badgeClass = chefBadgeClass(chefValue).replace('ms-3','ms-0');
        badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
      }
    }
  }
  
  // For the new ingredient coordination board, chef updates trigger a full refresh
  updatePlanBoard().catch(err => console.error('Error updating plan board:', err));
}

function updateStatusInCards(id, statusValue, statusOptions) {
  // Update in card (legacy)
  const cardBtn = document.querySelector(`button[data-id='${id}']`);
  if (cardBtn) {
    const card = cardBtn.closest('.card');
    if (card) {
      const badgeArea = card.querySelector('.dish-status-badge-area');
      if (badgeArea) {
        const found = statusOptions.find(o => o.value === statusValue);
        const label = found && found.value ? found.label : '';
        let badgeClass = 'badge ms-0 ';
        badgeClass +=
          (statusValue === 'not-yet-done' ? 'bg-secondary' :
           statusValue === 'gathered-together' ? 'bg-warning text-dark' :
           statusValue === 'cooking' ? 'bg-primary' :
           statusValue === 'ready-to-plate' ? 'bg-success' :
           statusValue === 'plated' ? 'bg-dark' :
           statusValue === 'packed' ? 'bg-success' : 'bg-light text-dark');
        badgeArea.innerHTML = label ? `<span class=\"${badgeClass}\">${label}</span>` : '';
      }
    }
  }
  
  // For the new ingredient coordination board, status updates trigger a full refresh
  updatePlanBoard().catch(err => console.error('Error updating plan board:', err));
}

function updateOrdersInCards(id, value) {
  // Also update the Orders value on the card immediately
  const card = document.querySelector(`button[data-id='${id}']`);
  if (card) {
    const ordersSpan = card.closest('.card').querySelector('.orders-value');
    if (ordersSpan) ordersSpan.textContent = value;
  }
  
  // For the new ingredient coordination board, orders updates trigger a full refresh
  updatePlanBoard().catch(err => console.error('Error updating plan board:', err));
}

function setStatus(msg, err) {
  const statusEl = document.getElementById('shopStatus');
  if (statusEl) {
    statusEl.textContent = msg || "";
    statusEl.style.color = err ? "crimson" : "";
  }
}