const DB_NAME = 'PortablePOS_DB';
const DB_VERSION = 2;

// Helper to open connection
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject(e.target.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Store 1: Menu (Retail items we sell to customers)
      if (!db.objectStoreNames.contains('menu')) {
        db.createObjectStore('menu', { keyPath: 'id' });
      }
      
      // Store 2: Inventory (Wholesale items/raw ingredients we buy)
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('employees')) {
        db.createObjectStore('employees', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('attendance')) {
        const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

// Generic transaction helper
function transaction(storeName, mode, callback) {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      
      tx.oncomplete = () => resolve(result);
      tx.onerror = (e) => reject(e.target.error);
    });
  });
}

export const db = {
  // MENU STORE (Retail catalog items)
  menu: {
    getAll: () => transaction('menu', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    put: (item) => transaction('menu', 'readwrite', (store) => {
      const enriched = { ...item, synced: item.synced === true };
      store.put(enriched);
      return enriched;
    }),
    delete: (id) => transaction('menu', 'readwrite', (store) => {
      store.delete(id);
      return id;
    }),
    putAll: (items) => transaction('menu', 'readwrite', (store) => {
      const enriched = items.map(i => ({ ...i, synced: i.synced === true }));
      enriched.forEach(i => store.put(i));
      return enriched;
    })
  },

  // INVENTORY STORE (Wholesale raw ingredients/supplies)
  inventory: {
    getAll: () => transaction('inventory', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    put: (item) => transaction('inventory', 'readwrite', (store) => {
      const enriched = { ...item, synced: item.synced === true };
      store.put(enriched);
      return enriched;
    }),
    delete: (id) => transaction('inventory', 'readwrite', (store) => {
      store.delete(id);
      return id;
    }),
    putAll: (items) => transaction('inventory', 'readwrite', (store) => {
      const enriched = items.map(i => ({ ...i, synced: i.synced === true }));
      enriched.forEach(i => store.put(i));
      return enriched;
    })
  },

  // TABLES STORE (Local view state only — no cloud sync needed)
  tables: {
    getAll: () => transaction('tables', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    put: (table) => transaction('tables', 'readwrite', (store) => {
      store.put(table);
      return table;
    }),
    delete: (id) => transaction('tables', 'readwrite', (store) => {
      store.delete(id);
      return id;
    }),
    putAll: (tables) => transaction('tables', 'readwrite', (store) => {
      tables.forEach(t => store.put(t));
      return tables;
    })
  },

  // SALES STORE
  sales: {
    getAll: () => transaction('sales', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    getByDateRange: (startIso, endIso) => transaction('sales', 'readonly', (store) => {
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startIso, endIso);
      const req = index.getAll(range);
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    add: (sale) => transaction('sales', 'readwrite', (store) => {
      const enriched = { ...sale, synced: sale.synced === true };
      store.add(enriched);
      return enriched;
    }),
    delete: (id) => transaction('sales', 'readwrite', (store) => {
      store.delete(id);
      return id;
    }),
    clear: () => transaction('sales', 'readwrite', (store) => {
      store.clear();
      return true;
    }),
    putAll: (sales) => transaction('sales', 'readwrite', (store) => {
      const enriched = sales.map(s => ({ ...s, synced: s.synced === true }));
      enriched.forEach(s => store.put(s));
      return enriched;
    })
  },

  // EMPLOYEES STORE
  employees: {
    getAll: () => transaction('employees', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    put: (employee) => transaction('employees', 'readwrite', (store) => {
      const enriched = { ...employee, synced: employee.synced === true };
      store.put(enriched);
      return enriched;
    }),
    delete: (id) => transaction('employees', 'readwrite', (store) => {
      store.delete(id);
      return id;
    }),
    clear: () => transaction('employees', 'readwrite', (store) => {
      store.clear();
      return true;
    }),
    putAll: (employees) => transaction('employees', 'readwrite', (store) => {
      const enriched = employees.map(e => ({ ...e, synced: e.synced === true }));
      enriched.forEach(e => store.put(e));
      return enriched;
    })
  },

  // ATTENDANCE STORE
  attendance: {
    getAll: () => transaction('attendance', 'readonly', (store) => {
      const req = store.getAll();
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    put: (entry) => transaction('attendance', 'readwrite', (store) => {
      const enriched = { ...entry, synced: entry.synced === true };
      store.put(enriched);
      return enriched;
    }),
    getByDate: (date) => transaction('attendance', 'readonly', (store) => {
      const index = store.index('date');
      const req = index.getAll(IDBKeyRange.only(date));
      return new Promise((resolve) => req.onsuccess = () => resolve(req.result));
    }),
    clear: () => transaction('attendance', 'readwrite', (store) => {
      store.clear();
      return true;
    }),
    putAll: (entries) => transaction('attendance', 'readwrite', (store) => {
      const enriched = entries.map(e => ({ ...e, synced: e.synced === true }));
      enriched.forEach(e => store.put(e));
      return enriched;
    })
  }
};
