import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const RESTAURANT_ID_KEY = 'restaurant_id';

// --- Tenant/session helpers (the only localStorage this module touches) ---
export function getRestaurantId() {
  return localStorage.getItem(RESTAURANT_ID_KEY) || '';
}

export function setRestaurantId(id) {
  localStorage.setItem(RESTAURANT_ID_KEY, id);
}

export function clearRestaurantId() {
  localStorage.removeItem(RESTAURANT_ID_KEY);
}

export function isOnline() {
  return navigator.onLine;
}

function authHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

// Convert local camelCase to remote snake_case
function toSnakeCase(item, tableName) {
  const converted = { ...item };

  if (tableName === 'inventory') {
    if ('costPrice' in converted) { converted.cost_price = Number(converted.costPrice); delete converted.costPrice; }
    if ('minStock' in converted) { converted.min_stock = Number(converted.minStock); delete converted.minStock; }
    if ('stock' in converted) { converted.stock = Number(converted.stock); }
  }

  if (tableName === 'menu') {
    if ('inventoryId' in converted) {
      const rawId = converted.inventoryId;
      converted.inventory_id = (rawId && typeof rawId === 'string' && rawId.trim()) ? rawId : null;
      delete converted.inventoryId;
    }
    if ('inventoryQty' in converted) { converted.inventory_qty = Number(converted.inventoryQty); delete converted.inventoryQty; }
    if ('price' in converted) { converted.price = Number(converted.price); }
  }

  if (tableName === 'sales') {
    if ('tableName' in converted) { converted.table_name = converted.tableName; delete converted.tableName; }
    if ('taxType' in converted) { converted.tax_type = converted.taxType; delete converted.taxType; }
    if ('taxRate' in converted) { converted.tax_rate = Number(converted.taxRate); delete converted.taxRate; }
    if ('taxAmount' in converted) { converted.tax_amount = Number(converted.taxAmount); delete converted.taxAmount; }
    if ('taxBreakdown' in converted) { converted.tax_breakdown = converted.taxBreakdown; delete converted.taxBreakdown; }
    if ('paymentMethod' in converted) { converted.payment_method = converted.paymentMethod; delete converted.paymentMethod; }
    if ('whatsappNumber' in converted) { converted.whatsapp_number = converted.whatsappNumber; delete converted.whatsappNumber; }
    if ('serverName' in converted) { converted.server_name = converted.serverName; delete converted.serverName; }
    if ('billTotal' in converted) { converted.bill_total = Number(converted.billTotal); delete converted.billTotal; }
    if ('subtotal' in converted) { converted.subtotal = Number(converted.subtotal); }
    if ('discount' in converted) { converted.discount = Number(converted.discount); }
  }

  if (tableName === 'attendance') {
    if ('employeeId' in converted) { converted.employee_id = converted.employeeId; delete converted.employeeId; }
    if ('employeeName' in converted) { converted.employee_name = converted.employeeName; delete converted.employeeName; }
    if ('clockIn' in converted) { converted.clock_in = converted.clockIn; delete converted.clockIn; }
    if ('clockInRaw' in converted) { converted.clock_in_raw = converted.clockInRaw; delete converted.clockInRaw; }
    if ('clockOut' in converted) { converted.clock_out = converted.clockOut; delete converted.clockOut; }
    if ('clockOutRaw' in converted) { converted.clock_out_raw = converted.clockOutRaw; delete converted.clockOutRaw; }
  }

  if (tableName === 'tables') {
    if ('currentOrder' in converted) { converted.current_order = converted.currentOrder; delete converted.currentOrder; }
    if ('billTotal' in converted) { converted.bill_total = Number(converted.billTotal); delete converted.billTotal; }
    if ('orderedBy' in converted) { converted.ordered_by = converted.orderedBy; delete converted.orderedBy; }
    if ('discount' in converted) { converted.discount = Number(converted.discount); }
    if ('tax' in converted) { converted.tax = Number(converted.tax); }
  }

  return converted;
}

// Convert remote snake_case to local camelCase
function toCamelCase(item, tableName) {
  const converted = { ...item };

  if (tableName === 'inventory') {
    if ('cost_price' in converted) { converted.costPrice = Number(converted.cost_price); delete converted.cost_price; }
    if ('min_stock' in converted) { converted.minStock = Number(converted.min_stock); delete converted.min_stock; }
    if ('stock' in converted) { converted.stock = Number(converted.stock); }
  }

  if (tableName === 'menu') {
    if ('inventory_id' in converted) { converted.inventoryId = converted.inventory_id; delete converted.inventory_id; }
    if ('inventory_qty' in converted) { converted.inventoryQty = Number(converted.inventory_qty); delete converted.inventory_qty; }
    if ('price' in converted) { converted.price = Number(converted.price); }
  }

  if (tableName === 'sales') {
    if ('table_name' in converted) { converted.tableName = converted.table_name; delete converted.table_name; }
    if ('tax_type' in converted) { converted.taxType = converted.tax_type; delete converted.tax_type; }
    if ('tax_rate' in converted) { converted.taxRate = Number(converted.tax_rate); delete converted.tax_rate; }
    if ('tax_amount' in converted) { converted.taxAmount = Number(converted.tax_amount); delete converted.tax_amount; }
    if ('tax_breakdown' in converted) { converted.taxBreakdown = converted.tax_breakdown; delete converted.tax_breakdown; }
    if ('payment_method' in converted) { converted.paymentMethod = converted.payment_method; delete converted.payment_method; }
    if ('whatsapp_number' in converted) { converted.whatsappNumber = converted.whatsapp_number; delete converted.whatsapp_number; }
    if ('server_name' in converted) { converted.serverName = converted.server_name; delete converted.server_name; }
    if ('bill_total' in converted) { converted.billTotal = Number(converted.bill_total); delete converted.bill_total; }
    if ('subtotal' in converted) { converted.subtotal = Number(converted.subtotal); }
    if ('discount' in converted) { converted.discount = Number(converted.discount); }
  }

  if (tableName === 'attendance') {
    if ('employee_id' in converted) { converted.employeeId = converted.employee_id; delete converted.employee_id; }
    if ('employee_name' in converted) { converted.employeeName = converted.employee_name; delete converted.employee_name; }
    if ('clock_in' in converted) { converted.clockIn = converted.clock_in; delete converted.clock_in; }
    if ('clock_in_raw' in converted) { converted.clockInRaw = converted.clock_in_raw; delete converted.clock_in_raw; }
    if ('clock_out' in converted) { converted.clockOut = converted.clock_out; delete converted.clock_out; }
    if ('clock_out_raw' in converted) { converted.clockOutRaw = converted.clock_out_raw; delete converted.clock_out_raw; }
  }

  if (tableName === 'tables') {
    if ('current_order' in converted) { converted.currentOrder = converted.current_order; delete converted.current_order; }
    if ('bill_total' in converted) { converted.billTotal = Number(converted.bill_total); delete converted.bill_total; }
    if ('ordered_by' in converted) { converted.orderedBy = converted.ordered_by; delete converted.ordered_by; }
    if ('discount' in converted) { converted.discount = Number(converted.discount); }
    if ('tax' in converted) { converted.tax = Number(converted.tax); }
  }

  return converted;
}

// --- Generic tenant-scoped CRUD (direct to Supabase, no local mirror) ---
export async function dbFetchAll(tableName) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const restaurantId = getRestaurantId();
  if (!restaurantId) return [];

  const url = `${SUPABASE_URL}/rest/v1/${tableName}?restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    if (response.status === 404 && tableName === 'tables') {
      return []; // Return empty list gracefully if tables migration not run yet
    }
    const text = await response.text();
    throw new Error(`Failed to load ${tableName} from cloud: ${text}`);
  }

  const list = await response.json();
  return list.map(item => toCamelCase(item, tableName));
}

export async function dbUpsert(tableName, item) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const restaurantId = getRestaurantId();
  if (!restaurantId) throw new Error('No restaurant connected');

  const snaked = toSnakeCase(item, tableName);
  const payload = {
    ...snaked,
    restaurant_id: restaurantId
  };

  const url = `${SUPABASE_URL}/rest/v1/${tableName}?on_conflict=id`;
  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    if (response.status === 404 && tableName === 'tables') {
      console.warn('[PortablePOS Cloud] Tables endpoint not created yet. Skipping remote upsert.');
      return item;
    }
    const text = await response.text();
    throw new Error(`Failed to save ${tableName} to cloud: ${text}`);
  }

  return item;
}

export async function dbDelete(tableName, itemId) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const restaurantId = getRestaurantId();
  if (!restaurantId) throw new Error('No restaurant connected');

  const url = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${encodeURIComponent(itemId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders()
  });

  if (!response.ok) {
    if (response.status === 404 && tableName === 'tables') {
      return itemId;
    }
    const text = await response.text();
    throw new Error(`Failed to delete ${tableName} from cloud: ${text}`);
  }

  return itemId;
}

// --- Scoped sales query (Dashboard/Reports date-range views) ---
export async function dbFetchSalesByRange(startIso, endIso) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const restaurantId = getRestaurantId();
  if (!restaurantId) return [];

  const url = `${SUPABASE_URL}/rest/v1/sales?restaurant_id=eq.${encodeURIComponent(restaurantId)}&timestamp=gte.${encodeURIComponent(startIso)}&timestamp=lte.${encodeURIComponent(endIso)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load sales from cloud: ${text}`);
  }

  const list = await response.json();
  return list.map(item => toCamelCase(item, 'sales'));
}

// --- Restaurant (tenant) record lookups, by explicit id — usable before login ---
export async function dbFetchRestaurant(restaurantId) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  if (!restaurantId) return null;

  const url = `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to look up restaurant: ${text}`);
  }

  const list = await response.json();
  return list[0] || null;
}

export async function verifyRestaurantActive(restaurantId) {
  const restaurant = await dbFetchRestaurant(restaurantId);
  if (!restaurant || restaurant.status !== 'active') return null;
  return restaurant;
}

export async function dbUpdateRestaurantName(restaurantId, name) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const url = `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update restaurant name: ${text}`);
  }

  const list = await response.json();
  return list[0] || { id: restaurantId, name };
}

// --- Employee roster lookup by explicit restaurant id (login flow, before session exists) ---
export async function fetchEmployeesByRestaurantId(restaurantId) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  const url = `${SUPABASE_URL}/rest/v1/employees?restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load employee roster: ${text}`);
  }

  const list = await response.json();
  return list.map(item => toCamelCase(item, 'employees'));
}

// --- Realtime: lightweight Phoenix Channel WebSocket to Supabase Postgres Changes ---
// On any change to a subscribed table, calls onTableChange(tableName) so the caller
// can re-fetch just that one table directly from Supabase (no local mirror to reconcile).
export function startRealtimeSync(onTableChange) {
  const restaurantId = getRestaurantId();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !restaurantId) {
    return () => {};
  }

  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return () => {};
  const projectRef = match[1];

  const wsUrl = `wss://${projectRef}.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
  let socket = null;
  let heartbeatInterval = null;
  let isClosed = false;

  function connect() {
    if (isClosed) return;
    if (socket) {
      try { socket.close(); } catch {}
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[PortablePOS Realtime] Connected to Supabase Realtime WebSocket');

      socket.send(JSON.stringify({
        topic: 'realtime:public',
        event: 'phx_join',
        payload: {
          config: {
            postgres_changes: [
              { event: '*', schema: 'public', table: 'menu', filter: `restaurant_id=eq.${restaurantId}` },
              { event: '*', schema: 'public', table: 'inventory', filter: `restaurant_id=eq.${restaurantId}` },
              { event: '*', schema: 'public', table: 'employees', filter: `restaurant_id=eq.${restaurantId}` },
              { event: '*', schema: 'public', table: 'attendance', filter: `restaurant_id=eq.${restaurantId}` },
              { event: '*', schema: 'public', table: 'sales', filter: `restaurant_id=eq.${restaurantId}` },
              { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }
            ]
          }
        },
        ref: '1'
      }));

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
          onTableChange(msg.payload?.table);
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
      try { socket.close(); } catch {}
    }
  };
}
