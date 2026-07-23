import { db } from './db';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Helper to check sync status from localStorage settings
export function getSyncSettings() {
  const hasCentralDb = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
  const restaurantId = localStorage.getItem('restaurant_id') || '';
  
  return {
    enabled: localStorage.getItem('cloud_sync_enabled') === 'true' || (hasCentralDb && !!restaurantId),
    url: localStorage.getItem('cloud_sync_url') || SUPABASE_URL || '',
    password: localStorage.getItem('cloud_sync_password') || SUPABASE_ANON_KEY || '',
    restaurantId: restaurantId
  };
}

export function saveSyncSettings(enabled, url, password, restaurantId) {
  localStorage.setItem('cloud_sync_enabled', enabled ? 'true' : 'false');
  localStorage.setItem('cloud_sync_url', url);
  localStorage.setItem('cloud_sync_password', password);
  localStorage.setItem('restaurant_id', restaurantId);
}

// REST helper to upload items to Supabase using standard PostgREST bulk upsert
async function uploadTable(tableName, items, settings) {
  if (items.length === 0) return true;

  // Map items to inject restaurant_id for multi-tenant separation
  const payload = items.map(item => ({
    ...item,
    restaurant_id: settings.restaurantId,
    synced: true
  }));

  const url = `${settings.url}/rest/v1/${tableName}?on_conflict=id`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': settings.password,
      'Authorization': `Bearer ${settings.password}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload to ${tableName} failed: ${response.statusText} (${errorText})`);
  }
  return true;
}

// REST helper to download items from Supabase matching the current Restaurant ID
async function downloadTable(tableName, settings) {
  const url = `${settings.url}/rest/v1/${tableName}?restaurant_id=eq.${encodeURIComponent(settings.restaurantId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': settings.password,
      'Authorization': `Bearer ${settings.password}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Download from ${tableName} failed: ${response.statusText} (${errorText})`);
  }

  const remoteData = await response.json();
  // Mark remote items as synced locally
  return remoteData.map(item => ({
    ...item,
    synced: true
  }));
}

// Universal Sync Engine
export async function performCloudSync(addToast) {
  const settings = getSyncSettings();
  if (!settings.enabled || !settings.url || !settings.password) {
    return { success: false, reason: 'Sync disabled or unconfigured' };
  }
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

    // 2. Upload local offline actions to Supabase
    if (unsyncedMenu.length > 0) await uploadTable('menu', unsyncedMenu, settings);
    if (unsyncedInventory.length > 0) await uploadTable('inventory', unsyncedInventory, settings);
    if (unsyncedSales.length > 0) await uploadTable('sales', unsyncedSales, settings);
    if (unsyncedEmployees.length > 0) await uploadTable('employees', unsyncedEmployees, settings);
    if (unsyncedAttendance.length > 0) await uploadTable('attendance', unsyncedAttendance, settings);

    // 3. Mark successfully uploaded items as synced locally in IndexedDB
    const markSynced = (list) => list.map(item => ({ ...item, synced: true }));
    if (unsyncedMenu.length > 0) await db.menu.putAll(markSynced(unsyncedMenu));
    if (unsyncedInventory.length > 0) await db.inventory.putAll(markSynced(unsyncedInventory));
    if (unsyncedSales.length > 0) await db.sales.putAll(markSynced(unsyncedSales));
    if (unsyncedEmployees.length > 0) await db.employees.putAll(markSynced(unsyncedEmployees));
    if (unsyncedAttendance.length > 0) await db.attendance.putAll(markSynced(unsyncedAttendance));

    // 4. Download updates from Supabase to sync other devices' modifications
    const remoteMenu = await downloadTable('menu', settings);
    const remoteInventory = await downloadTable('inventory', settings);
    const remoteSales = await downloadTable('sales', settings);
    const remoteEmployees = await downloadTable('employees', settings);
    const remoteAttendance = await downloadTable('attendance', settings);

    // 5. Upsert downloaded items into local IndexedDB
    if (remoteMenu.length > 0) await db.menu.putAll(remoteMenu);
    if (remoteInventory.length > 0) await db.inventory.putAll(remoteInventory);
    if (remoteSales.length > 0) await db.sales.putAll(remoteSales);
    if (remoteEmployees.length > 0) await db.employees.putAll(remoteEmployees);
    if (remoteAttendance.length > 0) await db.attendance.putAll(remoteAttendance);

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
