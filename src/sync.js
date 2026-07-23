import { db } from './db';

// Helper to check sync status from localStorage settings
export function getSyncSettings() {
  return {
    enabled: localStorage.getItem('cloud_sync_enabled') === 'true',
    url: localStorage.getItem('cloud_sync_url') || '',
    password: localStorage.getItem('cloud_sync_password') || ''
  };
}

export function saveSyncSettings(enabled, url, password) {
  localStorage.setItem('cloud_sync_enabled', enabled ? 'true' : 'false');
  localStorage.setItem('cloud_sync_url', url);
  localStorage.setItem('cloud_sync_password', password);
}

// Universal Sync Engine
export async function performCloudSync(addToast) {
  const settings = getSyncSettings();
  if (!settings.enabled || !settings.url) return { success: false, reason: 'Sync disabled' };
  if (!navigator.onLine) return { success: false, reason: 'No internet connection' };

  try {
    // 1. Gather all local unsynced records
    const localMenu = await db.menu.getAll();
    const localInventory = await db.inventory.getAll();
    const localSales = await db.sales.getAll();
    const localEmployees = await db.employees.getAll();
    const localAttendance = await db.attendance.getAll();

    const unsyncedMenu = localMenu.filter(item => !item.synced);
    const unsyncedInventory = localInventory.filter(item => !item.synced);
    const unsyncedSales = localSales.filter(item => !item.synced);
    const unsyncedEmployees = localEmployees.filter(item => !item.synced);
    const unsyncedAttendance = localAttendance.filter(item => !item.synced);

    // If nothing to sync, report success
    if (
      unsyncedMenu.length === 0 &&
      unsyncedInventory.length === 0 &&
      unsyncedSales.length === 0 &&
      unsyncedEmployees.length === 0 &&
      unsyncedAttendance.length === 0
    ) {
      return { success: true, count: 0 };
    }

    // 2. Prepare payload
    const payload = {
      timestamp: new Date().toISOString(),
      changes: {
        menu: unsyncedMenu,
        inventory: unsyncedInventory,
        sales: unsyncedSales,
        employees: unsyncedEmployees,
        attendance: unsyncedAttendance
      }
    };

    // 3. POST request to user cloud database url
    const response = await fetch(settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.password}`,
        'X-AuraPOS-Sync': 'true'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed: Invalid sync password/token.');
      }
      throw new Error(`Sync server responded with status: ${response.status}`);
    }

    // 4. Mark successfully synced items in IndexedDB
    const markSynced = (list) => list.map(item => ({ ...item, synced: true }));

    if (unsyncedMenu.length > 0) {
      await db.menu.putAll(markSynced(unsyncedMenu));
    }
    if (unsyncedInventory.length > 0) {
      await db.inventory.putAll(markSynced(unsyncedInventory));
    }
    if (unsyncedSales.length > 0) {
      await db.sales.putAll(markSynced(unsyncedSales));
    }
    if (unsyncedEmployees.length > 0) {
      await db.employees.putAll(markSynced(unsyncedEmployees));
    }
    if (unsyncedAttendance.length > 0) {
      await db.attendance.putAll(markSynced(unsyncedAttendance));
    }

    const totalCount = 
      unsyncedMenu.length + 
      unsyncedInventory.length + 
      unsyncedSales.length + 
      unsyncedEmployees.length + 
      unsyncedAttendance.length;

    return { success: true, count: totalCount };

  } catch (error) {
    console.error('Cloud Sync failed:', error);
    return { success: false, reason: error.message };
  }
}
