// Minimal IndexedDB helper
const DB_NAME = 'recipecard-db';
const DB_VERSION = 2;
const STORE_DISH = 'dishes';
const STORE_PLAN = 'planRows';

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_DISH)){
        const store = db.createObjectStore(STORE_DISH, { keyPath: 'id' });
        store.createIndex('byName', 'name', { unique: false });
      }
      if(!db.objectStoreNames.contains(STORE_PLAN)){
        db.createObjectStore(STORE_PLAN, { keyPath: 'rowid', autoIncrement: true });
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
// PLAN persistence helpers
async function savePlanRows(rows){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readwrite');
    const store = tx.objectStore(STORE_PLAN);
    store.clear();
    for(const row of rows){
      store.put(row);
    }
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function getPlanRows(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readonly');
    const store = tx.objectStore(STORE_PLAN);
    const req = store.getAll();
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function clearPlanRows(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAN, 'readwrite');
    tx.objectStore(STORE_PLAN).clear();
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function saveDishes(dishes){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_DISH,'readwrite');
    const store = tx.objectStore(STORE_DISH);
    store.clear();
    for(const d of dishes){
      store.put(d);
    }
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function getAllDishes(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_DISH,'readonly');
    const store = tx.objectStore(STORE_DISH);
    const req = store.getAll();
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function getDishById(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_DISH,'readonly');
    const store = tx.objectStore(STORE_DISH);
    const req = store.get(id);
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

// Save method and optional metadata (prepTime, cookTime). Accepts either a string (method) or an object { method, prepTime, cookTime }
async function saveMethodForDish(id, methodText){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_DISH,'readwrite');
    const store = tx.objectStore(STORE_DISH);
    const req = store.get(id);
    req.onsuccess = ()=>{
      const record = req.result || { id, name: 'Unknown', components: [], totalOrders: 0 };
      if(typeof methodText === 'string'){
        record.method = methodText;
      } else if(methodText && typeof methodText === 'object'){
        if('method' in methodText) record.method = methodText.method;
        if('prepTime' in methodText) record.prepTime = methodText.prepTime;
        if('cookTime' in methodText) record.cookTime = methodText.cookTime;
      }
      store.put(record);
    };
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}

async function clearAll(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_DISH,'readwrite');
    tx.objectStore(STORE_DISH).clear();
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
