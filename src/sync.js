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

// Conversions from local (camelCase) to remote (snake_case)
function toSnakeCase(item, tableName) {
  const converted = { ...item };
  
  if (tableName === 'inventory') {
    if ('costPrice' in converted) { converted.cost_price = converted.costPrice; delete converted.costPrice; }
    if ('minStock' in converted) { converted.min_stock = converted.minStock; delete converted.minStock; }
  }
  
  if (tableName === 'menu') {
    if ('inventoryId' in converted) { 
      const rawId = converted.inventoryId;
      converted.inventory_id = (rawId && typeof rawId === 'string' && rawId.trim()) ? rawId : null;
      delete converted.inventoryId; 
    }
    if ('inventoryQty' in converted) { converted.inventory_qty = converted.inventoryQty; delete converted.inventoryQty; }
  }
  
  if (tableName === 'sales') {
    if ('tableName' in converted) { converted.table_name = converted.tableName; delete converted.tableName; }
    if ('taxType' in converted) { converted.tax_type = converted.taxType; delete converted.taxType; }
    if ('taxRate' in converted) { converted.tax_rate = converted.taxRate; delete converted.taxRate; }
    if ('taxAmount' in converted) { converted.tax_amount = converted.taxAmount; delete converted.taxAmount; }
    if ('taxBreakdown' in converted) { converted.tax_breakdown = converted.taxBreakdown; delete converted.taxBreakdown; }
    if ('paymentMethod' in converted) { converted.payment_method = converted.paymentMethod; delete converted.paymentMethod; }
    if ('whatsappNumber' in converted) { converted.whatsapp_number = converted.whatsappNumber; delete converted.whatsappNumber; }
    if ('serverName' in converted) { converted.server_name = converted.serverName; delete converted.serverName; }
  }
  
  if (tableName === 'attendance') {
    if ('employeeId' in converted) { converted.employee_id = converted.employeeId; delete converted.employeeId; }
    if ('employeeName' in converted) { converted.employee_name = converted.employeeName; delete converted.employeeName; }
    if ('clockIn' in converted) { converted.clock_in = converted.clockIn; delete converted.clockIn; }
    if ('clockInRaw' in converted) { converted.clock_in_raw = converted.clockInRaw; delete converted.clockInRaw; }
    if ('clockOut' in converted) { converted.clock_out = converted.clockOut; delete converted.clockOut; }
    if ('clockOutRaw' in converted) { converted.clock_out_raw = converted.clockOutRaw; delete converted.clockOutRaw; }
  }
  
  return converted;
}

// Conversions from remote (snake_case) to local (camelCase)
function toCamelCase(item, tableName) {
  const converted = { ...item };
  
  if (tableName === 'inventory') {
    if ('cost_price' in converted) { converted.costPrice = converted.cost_price; delete converted.cost_price; }
    if ('min_stock' in converted) { converted.minStock = converted.min_stock; delete converted.min_stock; }
  }
  
  if (tableName === 'menu') {
    if ('inventory_id' in converted) { converted.inventoryId = converted.inventory_id; delete converted.inventory_id; }
    if ('inventory_qty' in converted) { converted.inventoryQty = converted.inventory_qty; delete converted.inventory_qty; }
  }
  
  if (tableName === 'sales') {
    if ('table_name' in converted) { converted.tableName = converted.table_name; delete converted.table_name; }
    if ('tax_type' in converted) { converted.taxType = converted.tax_type; delete converted.tax_type; }
    if ('tax_rate' in converted) { converted.taxRate = converted.tax_rate; delete converted.tax_rate; }
    if ('tax_amount' in converted) { converted.taxAmount = converted.tax_amount; delete converted.tax_amount; }
    if ('tax_breakdown' in converted) { converted.taxBreakdown = converted.tax_breakdown; delete converted.tax_breakdown; }
    if ('payment_method' in converted) { converted.paymentMethod = converted.payment_method; delete converted.payment_method; }
    if ('whatsapp_number' in converted) { converted.whatsappNumber = converted.whatsapp_number; delete converted.whatsapp_number; }
    if ('server_name' in converted) { converted.serverName = converted.server_name; delete converted.server_name; }
  }
  
  if (tableName === 'attendance') {
    if ('employee_id' in converted) { converted.employeeId = converted.employee_id; delete converted.employee_id; }
    if ('employee_name' in converted) { converted.employeeName = converted.employee_name; delete converted.employee_name; }
    if ('clock_in' in converted) { converted.clockIn = converted.clock_in; delete converted.clock_in; }
    if ('clock_in_raw' in converted) { converted.clockInRaw = converted.clock_in_raw; delete converted.clock_in_raw; }
    if ('clock_out' in converted) { converted.clockOut = converted.clock_out; delete converted.clock_out; }
    if ('clock_out_raw' in converted) { converted.clockOutRaw = converted.clock_out_raw; delete converted.clock_out_raw; }
  }
  
  return converted;
}

// REST helper to upload items to Supabase using standard PostgREST bulk upsert
async function uploadTable(tableName, items, settings) {
  if (items.length === 0) return true;

  // Map items to inject restaurant_id and convert keys to snake_case
  const payload = items.map(item => {
    const snaked = toSnakeCase(item, tableName);
    return {
      ...snaked,
      restaurant_id: settings.restaurantId,
      synced: true
    };
  });

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
  // Mark remote items as synced locally and convert keys to camelCase
  return remoteData.map(item => {
    const cameled = toCamelCase(item, tableName);
    return {
      ...cameled,
      synced: true
    };
  });
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

    // 0. Sync deletions first to clear them from remote database
    const deletedRecords = await db.deleted_records.getAll();
    for (const record of deletedRecords) {
      try {
        const deleteResponse = await fetch(`${settings.url}/rest/v1/${record.table}?id=eq.${encodeURIComponent(record.recordId)}&restaurant_id=eq.${encodeURIComponent(settings.restaurantId)}`, {
          method: 'DELETE',
          headers: {
            'apikey': settings.password,
            'Authorization': `Bearer ${settings.password}`
          }
        });
        if (deleteResponse.ok) {
          await db.deleted_records.delete(record.id);
        }
      } catch (err) {
        console.warn(`[PortablePOS Sync] Failed to delete record ${record.recordId} on remote:`, err);
      }
    }

    const unsyncedMenu = localMenu.filter(item => !item.synced);
    const unsyncedInventory = localInventory.filter(item => !item.synced);
    const unsyncedSales = localSales.filter(item => !item.synced);
    const unsyncedEmployees = localEmployees.filter(item => !item.synced);
    const unsyncedAttendance = localAttendance.filter(item => !item.synced);

    // 2. Upload local offline actions to Supabase (Upload dependencies first)
    if (unsyncedInventory.length > 0) await uploadTable('inventory', unsyncedInventory, settings);
    if (unsyncedMenu.length > 0) await uploadTable('menu', unsyncedMenu, settings);
    if (unsyncedSales.length > 0) await uploadTable('sales', unsyncedSales, settings);
    if (unsyncedEmployees.length > 0) await uploadTable('employees', unsyncedEmployees, settings);
    if (unsyncedAttendance.length > 0) await uploadTable('attendance', unsyncedAttendance, settings);

    // 3. Mark successfully uploaded items as synced locally in IndexedDB
    const markSynced = (list) => list.map(item => ({ ...item, synced: true }));
    if (unsyncedInventory.length > 0) await db.inventory.putAll(markSynced(unsyncedInventory));
    if (unsyncedMenu.length > 0) await db.menu.putAll(markSynced(unsyncedMenu));
    if (unsyncedSales.length > 0) await db.sales.putAll(markSynced(unsyncedSales));
    if (unsyncedEmployees.length > 0) await db.employees.putAll(markSynced(unsyncedEmployees));
    if (unsyncedAttendance.length > 0) await db.attendance.putAll(markSynced(unsyncedAttendance));

    // 4. Download updates from Supabase to sync other devices' modifications
    const remoteInventory = await downloadTable('inventory', settings);
    const remoteMenu = await downloadTable('menu', settings);
    const remoteSales = await downloadTable('sales', settings);
    const remoteEmployees = await downloadTable('employees', settings);
    const remoteAttendance = await downloadTable('attendance', settings);

    // 5. Upsert downloaded items into local IndexedDB
    if (remoteInventory.length > 0) await db.inventory.putAll(remoteInventory);
    if (remoteMenu.length > 0) await db.menu.putAll(remoteMenu);
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

// Establishes a lightweight Phoenix Channel WebSocket connection to Supabase Realtime
// listening for Postgres changes on the restaurant's partitioned data.
export function startRealtimeSync(onUpdate) {
  const settings = getSyncSettings();
  if (!settings.enabled || !settings.url || !settings.password || !settings.restaurantId) {
    return () => {};
  }

  // Extract project ref from URL: https://xxxx.supabase.co -> xxxx
  const match = settings.url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return () => {};
  const projectRef = match[1];

  const wsUrl = `wss://${projectRef}.supabase.co/realtime/v1/websocket?apikey=${settings.password}&vsn=1.0.0`;
  let socket = null;
  let heartbeatInterval = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    if (socket) {
      try { socket.close(); } catch (e) {}
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[PortablePOS Realtime] Connected to Supabase Realtime WebSocket');
      
      // Join the Postgres changes channel for this specific restaurant ID
      socket.send(JSON.stringify({
        topic: 'realtime:public',
        event: 'phx_join',
        payload: {
          config: {
            postgres_changes: [
              { event: '*', schema: 'public', table: 'menu', filter: `restaurant_id=eq.${settings.restaurantId}` },
              { event: '*', schema: 'public', table: 'inventory', filter: `restaurant_id=eq.${settings.restaurantId}` },
              { event: '*', schema: 'public', table: 'employees', filter: `restaurant_id=eq.${settings.restaurantId}` },
              { event: '*', schema: 'public', table: 'attendance', filter: `restaurant_id=eq.${settings.restaurantId}` },
              { event: '*', schema: 'public', table: 'sales', filter: `restaurant_id=eq.${settings.restaurantId}` }
            ]
          }
        },
        ref: '1'
      }));

      // Phoenix heartbeat every 30 seconds to keep connection alive
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: 'hb_' + Date.now()
          }));
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'postgres_changes') {
          console.log('[PortablePOS Realtime] Remote database update detected in:', msg.payload?.table);
          onUpdate(msg.payload?.table);
        }
      } catch (err) {
        console.error('[PortablePOS Realtime] Error parsing socket payload:', err);
      }
    };

    socket.onclose = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (!isClosed) {
        console.log('[PortablePOS Realtime] WebSocket closed. Reconnecting in 5 seconds...');
        setTimeout(connect, 5000);
      }
    };

    socket.onerror = (err) => {
      console.error('[PortablePOS Realtime] WebSocket error:', err);
    };
  }

  connect();

  return () => {
    isClosed = true;
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (socket) {
      try { socket.close(); } catch (e) {}
    }
  };
}
