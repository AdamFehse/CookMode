// Render PLAN as a 3-column Kanban board grouped by DAY
import { escapeHtml } from './utils.js';
export function renderPlanBoard(rows) {
  const board = document.getElementById('planBoard');
  if(!board) return;
  board.innerHTML = '';
  if(!rows || !rows.length){
    board.innerHTML = '<div class="col-12 text-center text-muted py-5">No PLAN rows loaded.</div>';
    return;
  }
  const desired = ['Sunday','Monday','Tuesday'];
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
      if(pb !== pa) return pb - pa;
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
      // Add chef badge area for live update
      const chefBadgeArea = document.createElement('div');
      chefBadgeArea.className = 'dish-chef-badge-area mt-2';
      // Show chef badge if present
      const chefVal = it['CHEF']||it['Chef']||'';
      if (chefVal) {
        chefBadgeArea.innerHTML = `<span class="badge bg-info text-dark">${escapeHtml(chefVal)}</span>`;
      }
      item.appendChild(chefBadgeArea);
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


export function renderDishList(dishes, dishList, getDishSliderValue) {
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
        <h3 class=\"h5 mb-1\">${escapeHtml(d.name)}</h3>
        <div class=\"text-muted small\">${escapeHtml(d.category || "")}</div>
        <div class=\"small text-monospace text-muted mt-1\">slug: <code>${escapeHtml(d.id)}</code></div>
      </div>
      <div class=\"mt-3 d-flex justify-content-between align-items-center\">
        <div class=\"text-muted\">Orders: <span class=\"orders-value\">...</span></div>
        <button data-id=\"${d.id}\" class=\"btn btn-sm btn-outline-primary open-recipe\">Open</button>
      </div>
      <div class=\"dish-status-badge-area mt-2\"></div>`;
    col.appendChild(card);
    dishList.appendChild(col);
    // Fetch and update the slider value for this dish
    if (typeof getDishSliderValue === 'function') {
      getDishSliderValue(d.id).then(val => {
        const v = (val && !isNaN(val)) ? Number(val) : 1;
        const ordersSpan = card.querySelector('.orders-value');
        if (ordersSpan) ordersSpan.textContent = v;
      });
    }
    // Fetch and show the status badge for this dish
    if (typeof window.getDishStatus === 'function') {
      window.getDishStatus(d.id).then(status => {
        const badgeArea = card.querySelector('.dish-status-badge-area');
        if (!badgeArea) return;
        // Status options and badge color logic must match main.js
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
        let badgeClass = 'badge ms-0 ';
        badgeClass +=
          (status === 'not-yet-done' ? 'bg-secondary' :
           status === 'gathered-together' ? 'bg-warning text-dark' :
           status === 'cooking' ? 'bg-primary' :
           status === 'ready-to-plate' ? 'bg-success' :
           status === 'plated' ? 'bg-dark' :
           status === 'packed' ? 'bg-success' : 'bg-light text-dark');
        badgeArea.innerHTML = label ? `<span class="${badgeClass}">${label}</span>` : '';
      });
    }
  }
  dishList.tabIndex = -1;
}

// Additional render functions (e.g., renderPlanBoard) would go here
