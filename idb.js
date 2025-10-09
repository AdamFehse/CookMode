
// --- IndexedDB constants and openDB helper ---
const DB_NAME = 'recipecard-db';
const DB_VERSION = 3;
const STORE_DISH = 'dish';
const STORE_PLAN = 'plan';
const STORE_SETTINGS = 'settings';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_DISH)) {
        const store = db.createObjectStore(STORE_DISH, { keyPath: 'id' });
        store.createIndex('byName', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PLAN)) {
        db.createObjectStore(STORE_PLAN, { keyPath: 'rowid', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}

// --- Dish and settings helpers ---
export async function saveDishTimeStart(id, timeStart) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.timeStart = timeStart;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishTimeStart(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.timeStart ? req.result.timeStart : '');
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishTimeEnd(id, timeEnd) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.timeEnd = timeEnd;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishTimeEnd(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.timeEnd ? req.result.timeEnd : '');
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishChef(id, chef) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.chef = chef;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishChef(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.chef ? req.result.chef : '');
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishStatus(id, status) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.status = status;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishStatus(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.status ? req.result.status : '');
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishChecklist(id, checklist) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.checklist = checklist;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishChecklist(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.checklist ? req.result.checklist : {});
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishInstructionsState(id, instructionsState) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.instructionsState = instructionsState;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishInstructionsState(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => resolve(req.result && req.result.instructionsState ? req.result.instructionsState : {});
    req.onerror = () => reject(req.error);
  });
}

export async function saveDishSliderValue(id, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      const record = req.result ? { ...req.result } : { id };
      record.slider = value;
      tx.objectStore(STORE_SETTINGS).put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDishSliderValue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get(id);
    req.onsuccess = () => {
      if (req.result && typeof req.result.slider !== 'undefined' && req.result.slider !== null) {
        resolve(req.result.slider);
      } else {
        resolve(1);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// --- PLAN persistence helpers ---
export async function savePlanRows(rows) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readwrite');
    const store = tx.objectStore(STORE_PLAN);
    store.clear();
    for (const row of rows) {
      store.put(row);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPlanRows() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readonly');
    const store = tx.objectStore(STORE_PLAN);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPlanRows() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readwrite');
    tx.objectStore(STORE_PLAN).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Dish store helpers ---
export async function saveDishes(dishes) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISH, 'readwrite');
    const store = tx.objectStore(STORE_DISH);
    store.clear();
    for (const d of dishes) {
      store.put(d);
    }
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function getAllDishes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISH, 'readonly');
    const store = tx.objectStore(STORE_DISH);
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error);
    };
  });
}

export async function getDishById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISH, 'readonly');
    const store = tx.objectStore(STORE_DISH);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMethodForDish(id, methodText) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISH, 'readwrite');
    const store = tx.objectStore(STORE_DISH);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result || { id, name: 'Unknown', components: [], totalOrders: 0 };
      if (typeof methodText === 'string') {
        record.method = methodText;
      } else if (methodText && typeof methodText === 'object') {
        if ('method' in methodText) record.method = methodText.method;
        if ('prepTime' in methodText) record.prepTime = methodText.prepTime;
        if ('cookTime' in methodText) record.cookTime = methodText.cookTime;
      }
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DISH, 'readwrite');
    tx.objectStore(STORE_DISH).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

