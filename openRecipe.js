// openRecipe.js — Handles opening the recipe modal for a dish by id
// This is extracted for modularity and global access


import { slug } from './utils.js';
import {
  getDishById,
  getDishSliderValue,
  saveDishSliderValue,
  getDishStatus,
  getDishChef,
  getDishTimeStart,
  getDishTimeEnd,
  saveDishTimeStart,
  saveDishTimeEnd,
  saveDishChef,
  saveDishStatus,
  getDishChecklist,
  saveDishChecklist
} from './idb.js';

export async function openRecipe(id) {
  // Load status and chef state for this dish
  const status = await getDishStatus(id);
  const chef = await getDishChef(id);
  const d = await getDishById(id);
  if (!d) return;

  // Ensure modal is in document.body and only initialized once
  const recipeModalEl = document.getElementById('recipeModal');
  let recipeModal = null;
  if (recipeModalEl && recipeModalEl.parentNode !== document.body) {
    document.body.appendChild(recipeModalEl);
  }
  if (!recipeModal && recipeModalEl && window.bootstrap) {
    recipeModal = new bootstrap.Modal(recipeModalEl);
  }

  // set modal title
  const modalLabel = document.getElementById('recipeModalLabel');
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

  // Persist time start/end and update PLAN board live
  timeStartSelect.addEventListener('change', async function() {
    await saveDishTimeStart(id, this.value);
  });
  timeEndSelect.addEventListener('change', async function() {
    await saveDishTimeEnd(id, this.value);
  });

  // Status dropdown
  const statusLabel = document.createElement('span');
  statusLabel.className = 'me-2 fw-bold ms-4';
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
    await saveDishChef(id, this.value);
    updateChefBadge(this.value);
    // Update the card's chef badge in real time
    const cardBtn = document.querySelector(`button[data-id='${id}']`);
    if (cardBtn) {
      const card = cardBtn.closest('.card');
      if (card) {
        const badgeArea = card.querySelector('.dish-chef-badge-area');
        if (badgeArea) {
          // Find the chef label for the badge
          const found = chefOptions.find(o => o.value === this.value);
          const label = found && found.value ? found.label : '';
          let badgeClass = chefBadgeClass(this.value).replace('ms-3','ms-0 me-2');
          badgeArea.innerHTML = label ? `<span class="${badgeClass}">${label}</span>` : '';
        }
      }
    }
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
    updateStatusBadge(this.value);
    // Update the card's status badge in real time
    const cardBtn = document.querySelector(`button[data-id='${id}']`);
    if (cardBtn) {
      const card = cardBtn.closest('.card');
      if (card) {
        const badgeArea = card.querySelector('.dish-status-badge-area');
        if (badgeArea) {
          const found = statusOptions.find(o => o.value === this.value);
          const label = found && found.value ? found.label : '';
          let badgeClass = 'badge ms-0 ';
          badgeClass +=
            (this.value === 'not-yet-done' ? 'bg-secondary' :
             this.value === 'gathered-together' ? 'bg-warning text-dark' :
             this.value === 'cooking' ? 'bg-primary' :
             this.value === 'ready-to-plate' ? 'bg-danger' :
             this.value === 'plated' ? 'bg-dark' :
             this.value === 'packed' ? 'bg-success' : 'bg-light text-dark');
          badgeArea.innerHTML = label ? `<span class="${badgeClass}">${label}</span>` : '';
        }
      }
    }
  });

  // Optional slider controls (guarded)
  const mySlider = document.getElementById("mySlider");
  const sliderValueDisplay = document.getElementById("sliderValueDisplay");
  let initialSliderVal = 1;
  if (mySlider && sliderValueDisplay) {
    await getDishSliderValue(id).then(val => {
      initialSliderVal = (val && !isNaN(val)) ? Number(val) : 1;
      mySlider.value = initialSliderVal;
      sliderValueDisplay.textContent = initialSliderVal;
    });
  }

  // Populate components/ingredients as Bootstrap checklist
  const componentsArea = document.getElementById("componentsArea");
  componentsArea.innerHTML = "";
  const checklistState = await getDishChecklist(id);
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
      checkbox.id = `check-${id}-${slug(comp.name)}-${slug(it.ingredient)}`;
      checkbox.checked = !!checked;
      checkbox.dataset.baseQty = parseFloat(it.qtyPer) || 0;
      checkbox.dataset.unit = it.unit;
      checkbox.dataset.ingredient = it.ingredient;
      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.setAttribute('for', checkbox.id);
      label.dataset.baseQty = parseFloat(it.qtyPer) || 0;
      label.dataset.unit = it.unit;
      label.dataset.ingredient = it.ingredient;
      label.textContent = `${it.qtyPer} ${it.unit} ${it.ingredient}`;
      if (checkbox.checked) label.classList.add('text-decoration-line-through');
      checkbox.addEventListener('change', async function() {
        checklistState[ingKey] = this.checked;
        if (this.checked) {
          label.classList.add('text-decoration-line-through');
        } else {
          label.classList.remove('text-decoration-line-through');
        }
  await saveDishChecklist(id, checklistState);
      });
      formCheck.appendChild(checkbox);
      formCheck.appendChild(label);
      cdiv.appendChild(formCheck);
    }
    componentsArea.appendChild(cdiv);
  }

  // Function to update quantities based on slider
  function updateQuantities() {
    if (!mySlider) return;
    const scale = parseFloat(mySlider.value);
    sliderValueDisplay.textContent = scale;
    const allLabels = componentsArea.querySelectorAll("label.form-check-label");
    allLabels.forEach((label) => {
      const baseQty = parseFloat(label.dataset.baseQty) || 0;
      const unit = label.dataset.unit;
      const ingredient = label.dataset.ingredient;
      const scaledQty = (baseQty * scale).toFixed(2).replace(/\.00$/, "");
      label.textContent = `${scaledQty} ${unit} ${ingredient}`;
    });
  }

  // Attach slider event after ingredients are rendered
  if (mySlider && sliderValueDisplay) {
    mySlider.value = initialSliderVal;
    sliderValueDisplay.textContent = initialSliderVal;
    mySlider.oninput = function () {
      sliderValueDisplay.innerHTML = this.value;
      saveDishSliderValue(id, this.value);
      updateQuantities();
      // Update the card's orders-value span
      const cardBtn = document.querySelector(`button[data-id='${id}']`);
      if (cardBtn) {
        const card = cardBtn.closest('.card');
        if (card) {
          const ordersSpan = card.querySelector('.orders-value');
          if (ordersSpan) ordersSpan.textContent = this.value;
        }
      }
    };
    updateQuantities();
  }

  // Instructions and notes logic omitted for brevity, but can be added as needed

  if (recipeModal) {
    recipeModal.show();
  }
}
