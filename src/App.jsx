import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TablePOS from './components/TablePOS';
import MenuCatalog from './components/Menu';
import Inventory from './components/Inventory';
import Employees from './components/Employees';
import Reports from './components/Reports';
import SettingsTab from './components/Settings';

import {
  dbFetchAll,
  dbUpsert,
  dbDelete,
  dbFetchSalesByRange,
  dbFetchRestaurant,
  verifyRestaurantActive,
  fetchEmployeesByRestaurantId,
  dbUpdateRestaurantName,
  startRealtimeSync,
  getRestaurantId,
  setRestaurantId as persistRestaurantId,
  clearRestaurantId
} from './cloudDb';

import {
  LayoutDashboard,
  Coffee,
  Warehouse,
  Users,
  FileText,
  Menu as MenuIcon,
  X,
  BookOpen,
  LogOut,
  Lock,
  Settings as SettingsIcon,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

// Diffs previousArray vs nextArray by id and issues one dbUpsert per added/changed
// item and one dbDelete per removed item, all in parallel. Returns the list of
// { id, action, error } failures so the caller can roll back just those items.
async function syncArrayDiff(tableName, previousArray, nextArray) {
  const prevById = new Map(previousArray.map(item => [item.id, item]));
  const nextIds = new Set(nextArray.map(item => item.id));
  const removedIds = [...prevById.keys()].filter(id => !nextIds.has(id));
  const upsertItems = nextArray.filter(item => {
    const old = prevById.get(item.id);
    return !old || JSON.stringify(old) !== JSON.stringify(item);
  });

  const jobs = [
    ...removedIds.map(id =>
      dbDelete(tableName, id).catch(error => { throw { id, action: 'delete', error }; })
    ),
    ...upsertItems.map(item =>
      dbUpsert(tableName, item).catch(error => { throw { id: item.id, action: 'upsert', error }; })
    )
  ];

  const results = await Promise.allSettled(jobs);
  return results.filter(r => r.status === 'rejected').map(r => r.reason);
}

// Rolls back just the items that failed to save: changed items revert to their
// previous value, failed deletes are re-inserted.
function reconcileAfterFailures(setState, previousArray, failures) {
  const failedIds = new Set(failures.map(f => f.id));
  setState(current => {
    const rolledBack = current.map(item => {
      if (!failedIds.has(item.id)) return item;
      const prevItem = previousArray.find(p => p.id === item.id);
      return prevItem || item;
    });
    const failedDeleteIds = failures.filter(f => f.action === 'delete').map(f => f.id);
    const missingDeletes = failedDeleteIds
      .filter(id => !rolledBack.some(item => item.id === id))
      .map(id => previousArray.find(p => p.id === id))
      .filter(Boolean);
    return [...rolledBack, ...missingDeletes];
  });
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // User Session State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Persist session state changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Tenant (restaurant) identity — the only other localStorage value kept
  const [restaurantId, setRestaurantId] = useState(() => getRestaurantId());
  const [restaurantIdInput, setRestaurantIdInput] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const linkRestaurant = (id) => {
    persistRestaurantId(id);
    setRestaurantId(id);
  };

  const unlinkRestaurant = () => {
    clearRestaurantId();
    setRestaurantId('');
    setRestaurantName('');
    setCurrentUser(null);
  };

  // Profile settings states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Data States
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // Data loading / error state (there's no local cache, so every view depends on this)
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [savingCount, setSavingCount] = useState(0);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Toast trigger helper
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Sync network state
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      addToast('Online mode restored');
    };
    const goOffline = () => {
      setIsOnline(false);
      addToast('You are offline — changes cannot be saved until reconnected', 'warning');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Loads every data domain directly from Supabase. No local seeding — an empty
  // result set means the restaurant hasn't added that data yet, and each view
  // renders its own empty state.
  const loadAllData = async () => {
    setDataError(null);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [menuData, inventoryData, employeesData, attendanceData, tablesData, salesData, restaurantRecord] = await Promise.all([
        dbFetchAll('menu'),
        dbFetchAll('inventory'),
        dbFetchAll('employees'),
        dbFetchAll('attendance'),
        dbFetchAll('tables'),
        dbFetchSalesByRange(thirtyDaysAgo.toISOString(), new Date().toISOString()),
        dbFetchRestaurant(restaurantId)
      ]);

      setMenu(menuData);
      setInventory(inventoryData);
      setEmployees(employeesData);
      setAttendance(attendanceData);
      setTables(tablesData);
      setSales(salesData);
      if (restaurantRecord) setRestaurantName(restaurantRecord.name);

      if (currentUser) {
        const found = employeesData.find(emp => emp.id === currentUser.id);
        if (!found || found.status !== 'active') {
          setCurrentUser(null);
          addToast('Session expired or account disabled.', 'warning');
        }
      }
    } catch (err) {
      console.error('Failed to load restaurant data:', err);
      setDataError(err.message || 'Failed to load restaurant data');
    } finally {
      setInitialLoadDone(true);
    }
  };

  useEffect(() => {
    if (currentUser && restaurantId) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, restaurantId]);

  // Enforce role-based routing checks when user session state changes
  useEffect(() => {
    if (currentUser) {
      const allowedViews = {
        manager: ['dashboard', 'pos', 'menu', 'inventory', 'employees', 'reports', 'settings'],
        cashier: ['dashboard', 'pos', 'inventory', 'employees'],
        server: ['pos'],
        chef: ['inventory', 'employees']
      };

      const roleKey = (currentUser.role || 'server').toLowerCase().trim();
      const allowedList = allowedViews[roleKey] || ['pos'];
      if (!allowedList.includes(view)) {
        setView(allowedList[0]);
      }
    }
  }, [currentUser]);

  // Realtime push (Supabase WebSocket) + a lightweight fallback poll in case the
  // socket silently drops. Each trigger re-fetches only the affected table.
  useEffect(() => {
    if (!currentUser || !restaurantId) return;

    const refetchTable = async (tableName) => {
      try {
        if (tableName === 'menu') setMenu(await dbFetchAll('menu'));
        else if (tableName === 'inventory') setInventory(await dbFetchAll('inventory'));
        else if (tableName === 'employees') setEmployees(await dbFetchAll('employees'));
        else if (tableName === 'attendance') setAttendance(await dbFetchAll('attendance'));
        else if (tableName === 'tables') setTables(await dbFetchAll('tables'));
        else if (tableName === 'sales') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          setSales(await dbFetchSalesByRange(thirtyDaysAgo.toISOString(), new Date().toISOString()));
        }
      } catch (err) {
        console.warn(`[PortablePOS Realtime] refetch failed for ${tableName}:`, err);
      }
    };

    const stopRealtime = startRealtimeSync((tableName) => {
      console.log(`[PortablePOS Realtime] Remote update detected, refetching: ${tableName}`);
      refetchTable(tableName);
    });

    const interval = setInterval(() => {
      ['menu', 'inventory', 'employees', 'attendance', 'sales', 'tables'].forEach(refetchTable);
    }, 60000);

    return () => {
      clearInterval(interval);
      if (stopRealtime) stopRealtime();
    };
  }, [currentUser, restaurantId, isOnline]);

  // --- Login Handler ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const u = loginUser.trim().toLowerCase();
    const p = loginPass.trim();
    const targetRestaurantId = restaurantId || restaurantIdInput.trim();

    if (!targetRestaurantId) {
      addToast('Restaurant ID is required', 'warning');
      return;
    }
    if (!isOnline) {
      addToast('Internet connection required to log in', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const restaurant = await verifyRestaurantActive(targetRestaurantId);
      if (!restaurant) {
        addToast('Invalid or suspended Restaurant ID. Contact support.', 'error');
        return;
      }

      const remoteEmployees = await fetchEmployeesByRestaurantId(targetRestaurantId);
      const matched = remoteEmployees.find(emp => emp.username === u && emp.password === p && emp.status === 'active');
      if (!matched) {
        addToast('Invalid username or password', 'error');
        return;
      }

      linkRestaurant(targetRestaurantId);
      setRestaurantName(restaurant.name);
      setCurrentUser({ name: matched.name, username: matched.username, role: matched.role, id: matched.id });
      addToast(`Welcome back, ${matched.name}!`);

      // Auto-Clock-In: fetch today's attendance fresh (rather than trusting
      // possibly-stale local state) so we don't duplicate an entry already
      // created from another device.
      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceId = `${todayStr}_${matched.id}`;
      try {
        const freshAttendance = await dbFetchAll('attendance');
        setAttendance(freshAttendance);
        if (!freshAttendance.some(a => a.id === attendanceId)) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          handleUpdateAttendance([...freshAttendance, {
            id: attendanceId,
            date: todayStr,
            employeeId: matched.id,
            employeeName: matched.name,
            clockIn: timeStr,
            clockInRaw: Date.now(),
            clockOut: null,
            clockOutRaw: null,
            duration: null,
            status: 'present'
          }]);
        }
      } catch (err) {
        console.warn('Failed to check/auto clock-in:', err);
      }

      setLoginUser('');
      setLoginPass('');
    } catch (err) {
      addToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateProfile = async (updatedProfile) => {
    const usernameConflict = employees.some(
      emp => emp.username === updatedProfile.username.toLowerCase().trim() && emp.id !== updatedProfile.id
    );
    if (usernameConflict) {
      addToast('Username already taken by another staff member', 'error');
      return false;
    }

    const currentEmployee = employees.find(e => e.id === updatedProfile.id);
    const mergedProfile = {
      ...currentEmployee,
      ...updatedProfile,
      username: updatedProfile.username.toLowerCase().trim()
    };
    const previousEmployees = employees;
    setEmployees(employees.map(emp => (emp.id === updatedProfile.id ? mergedProfile : emp)));
    setSavingCount(c => c + 1);
    try {
      await dbUpsert('employees', mergedProfile);
      setCurrentUser({
        ...currentUser,
        name: mergedProfile.name,
        username: mergedProfile.username,
        id: mergedProfile.id
      });
      addToast('Profile updated successfully');
      return true;
    } catch (err) {
      setEmployees(previousEmployees);
      addToast(`Failed to update profile: ${err.message}`, 'error');
      return false;
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleOpenProfileModal = () => {
    const matchedEmployee = employees.find(emp => emp.username === currentUser.username) || {
      id: currentUser.id || 'emp_admin',
      name: currentUser.name,
      username: currentUser.username,
      phone: '9876543210',
      password: 'admin123'
    };

    setProfileName(matchedEmployee.name);
    setProfilePhone(matchedEmployee.phone || '');
    setProfileUsername(matchedEmployee.username);
    setProfilePassword(matchedEmployee.password || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim() || !profileUsername.trim() || !profilePassword.trim()) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    const targetId = currentUser.id || employees.find(emp => emp.username === currentUser.username)?.id || 'emp_admin';

    const success = await handleUpdateProfile({
      id: targetId,
      name: profileName,
      phone: profilePhone,
      username: profileUsername,
      password: profilePassword
    });

    if (success) {
      setShowProfileModal(false);
    }
  };

  const handleUpdateRestaurantName = async (name) => {
    const previous = restaurantName;
    setRestaurantName(name);
    setSavingCount(c => c + 1);
    try {
      await dbUpdateRestaurantName(restaurantId, name);
      addToast('Store name updated');
      return true;
    } catch (err) {
      setRestaurantName(previous);
      addToast(`Failed to update store name: ${err.message}`, 'error');
      return false;
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  // --- POS Database Actions (all write directly to Supabase) ---

  const handleUpdateTables = async (updatedTables) => {
    const previous = tables;
    setTables(updatedTables);
    setSavingCount(c => c + 1);
    try {
      const failures = await syncArrayDiff('tables', previous, updatedTables);
      if (failures.length > 0) {
        reconcileAfterFailures(setTables, previous, failures);
        failures.forEach(f => addToast(`Failed to save table update: ${f.error.message}`, 'error'));
      }
    } catch (err) {
      setTables(previous);
      addToast(`Failed to save table changes: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleUpdateMenu = async (updatedMenu) => {
    const previous = menu;
    setMenu(updatedMenu);
    setSavingCount(c => c + 1);
    try {
      const failures = await syncArrayDiff('menu', previous, updatedMenu);
      if (failures.length > 0) {
        reconcileAfterFailures(setMenu, previous, failures);
        failures.forEach(f => addToast(`Failed to save menu item: ${f.error.message}`, 'error'));
      }
    } catch (err) {
      setMenu(previous);
      addToast(`Failed to save menu changes: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleUpdateInventory = async (updatedInventory) => {
    const previous = inventory;
    setInventory(updatedInventory);
    setSavingCount(c => c + 1);
    try {
      const failures = await syncArrayDiff('inventory', previous, updatedInventory);
      if (failures.length > 0) {
        reconcileAfterFailures(setInventory, previous, failures);
        failures.forEach(f => addToast(`Failed to save inventory item: ${f.error.message}`, 'error'));
      }
    } catch (err) {
      setInventory(previous);
      addToast(`Failed to save inventory changes: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleAddSale = async (newSale) => {
    setSales(prev => [...prev, newSale]);
    setSavingCount(c => c + 1);
    try {
      await dbUpsert('sales', newSale);
    } catch (err) {
      setSales(prev => prev.filter(s => s.id !== newSale.id));
      addToast(`Failed to save sale: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleSeedSales = async (seededSales) => {
    const previous = sales;
    setSales(seededSales);
    setSavingCount(c => c + 1);
    try {
      const results = await Promise.allSettled(seededSales.map(s => dbUpsert('sales', s)));
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        addToast(`${failedCount} demo sale(s) failed to save to cloud`, 'error');
      }
    } catch (err) {
      setSales(previous);
      addToast(`Failed to seed demo sales: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  // Corrects a saved bill's items and reconciles the linked inventory stock
  // for the difference between the original and edited quantities.
  const handleEditSale = async (originalSale, updatedSale) => {
    const previous = sales;
    setSales(prev => prev.map(s => (s.id === updatedSale.id ? updatedSale : s)));
    setSavingCount(c => c + 1);
    try {
      await dbUpsert('sales', updatedSale);

      const qtyDeltaByProduct = new Map();
      originalSale.items.forEach(item => {
        qtyDeltaByProduct.set(item.productId, (qtyDeltaByProduct.get(item.productId) || 0) - item.quantity);
      });
      updatedSale.items.forEach(item => {
        qtyDeltaByProduct.set(item.productId, (qtyDeltaByProduct.get(item.productId) || 0) + item.quantity);
      });

      let hasInventoryChanges = false;
      const updatedInventory = inventory.map(invItem => {
        let totalDelta = 0;
        qtyDeltaByProduct.forEach((deltaQty, productId) => {
          if (deltaQty === 0) return;
          const menuItem = menu.find(m => m.id === productId);
          if (menuItem && menuItem.inventoryId === invItem.id) {
            totalDelta += deltaQty * (menuItem.inventoryQty || 1);
          }
        });
        if (totalDelta !== 0) {
          hasInventoryChanges = true;
          return {
            ...invItem,
            stock: Math.max(0, Number((Number(invItem.stock) - totalDelta).toFixed(3)))
          };
        }
        return invItem;
      });

      if (hasInventoryChanges) {
        await handleUpdateInventory(updatedInventory);
      }

      addToast('Bill updated successfully');
      return true;
    } catch (err) {
      setSales(previous);
      addToast(`Failed to update bill: ${err.message}`, 'error');
      return false;
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleUpdateEmployees = async (updatedEmployees) => {
    const previous = employees;
    setEmployees(updatedEmployees);

    const idsToKeep = updatedEmployees.map(e => e.id);
    if (currentUser && currentUser.id && !idsToKeep.includes(currentUser.id)) {
      setCurrentUser(null);
      setView('dashboard');
      addToast('Your staff profile was deleted. Session logged out.', 'warning');
    } else if (currentUser) {
      const updatedSelf = updatedEmployees.find(e => e.id === currentUser.id);
      if (updatedSelf) {
        if (updatedSelf.status === 'inactive') {
          setCurrentUser(null);
          setView('dashboard');
          addToast('Your staff account was disabled. Session logged out.', 'warning');
        } else {
          setCurrentUser({
            id: updatedSelf.id,
            name: updatedSelf.name,
            username: updatedSelf.username,
            role: updatedSelf.role
          });
        }
      }
    }

    setSavingCount(c => c + 1);
    try {
      const failures = await syncArrayDiff('employees', previous, updatedEmployees);
      if (failures.length > 0) {
        reconcileAfterFailures(setEmployees, previous, failures);
        failures.forEach(f => addToast(`Failed to save employee update: ${f.error.message}`, 'error'));
      }
    } catch (err) {
      setEmployees(previous);
      addToast(`Failed to save employee changes: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  const handleUpdateAttendance = async (updatedAttendance) => {
    const previous = attendance;
    setAttendance(updatedAttendance);
    setSavingCount(c => c + 1);
    try {
      const failures = await syncArrayDiff('attendance', previous, updatedAttendance);
      if (failures.length > 0) {
        reconcileAfterFailures(setAttendance, previous, failures);
        failures.forEach(f => addToast(`Failed to save attendance record: ${f.error.message}`, 'error'));
      }
    } catch (err) {
      setAttendance(previous);
      addToast(`Failed to save attendance changes: ${err.message}`, 'error');
    } finally {
      setSavingCount(c => c - 1);
    }
  };

  // Navigations mapping
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Billing', icon: Coffee },
    { id: 'menu', label: 'Menu Catalog', icon: BookOpen },
    { id: 'inventory', label: 'Inventory Stock', icon: Warehouse },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  const activeNavItem = navItems.find(item => item.id === view);

  // Render Login overlay if no active session
  if (!currentUser) {
    return (
      <div className="overlay" style={{ background: '#090d16', zIndex: 9999 }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-teal))', display: 'inline-flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px', boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)' }}>
              <Lock size={24} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '0.5px' }}>PortablePOS Security</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
              {restaurantId ? 'Enter credentials to start your shift' : 'Connect your restaurant to get started'}
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!restaurantId && (
              <div className="form-group">
                <label>Restaurant ID</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. delicious_deli"
                  value={restaurantIdInput}
                  onChange={(e) => setRestaurantIdInput(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. admin or cashier"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isVerifying} style={{ marginTop: '6px', height: '42px' }}>
              {isVerifying ? 'Connecting…' : 'Verify & Unlock'}
            </button>
          </form>

          {restaurantId && (
            <div style={{ marginTop: '16px' }}>
              <button
                className="btn btn-secondary btn-full"
                onClick={unlinkRestaurant}
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                Not your restaurant? Switch
              </button>
            </div>
          )}
        </div>

        {/* Toast overlay inside login screen */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : ''}`}>
              {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✓'}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // First data load after login — nothing has been fetched from Supabase yet
  if (!initialLoadDone) {
    return (
      <div className="full-screen-status">
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin-icon" style={{ color: 'var(--accent-teal)' }} />
          <p style={{ marginTop: '14px', fontSize: '14px' }}>Loading your restaurant data…</p>
        </div>
      </div>
    );
  }

  // Initial load failed — no data to show, give a clear retry path
  if (dataError) {
    return (
      <div className="full-screen-status">
        <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '30px', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--accent-coral)', marginBottom: '14px' }} />
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Couldn't load your data</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>{dataError}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={loadAllData}>Retry</button>
            <button className="btn btn-secondary" onClick={unlinkRestaurant}>Switch Restaurant</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar (Desktop navigation) */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">POS</div>
          <span className="logo-text">PortablePOS</span>
          {sidebarOpen && (
            <button className="close-btn" style={{ marginLeft: 'auto' }} onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-menu">
          {navItems.filter(item => {
            const allowedViews = {
              manager: ['dashboard', 'pos', 'menu', 'inventory', 'employees', 'reports', 'settings'],
              cashier: ['dashboard', 'pos', 'inventory', 'employees'],
              server: ['pos'],
              chef: ['inventory', 'employees']
            };
            const role = (currentUser?.role || 'server').toLowerCase().trim();
            return (allowedViews[role] || ['pos']).includes(item.id);
          }).map(item => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`menu-item ${view === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setView(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="status-badge" style={{
            background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: isOnline ? 'var(--accent-emerald)' : 'var(--accent-coral)',
            borderColor: isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'
          }}>
            <span className="status-indicator" style={{
              background: isOnline ? 'var(--accent-emerald)' : 'var(--accent-coral)',
              boxShadow: isOnline ? '0 0 10px var(--accent-emerald)' : '0 0 10px var(--accent-coral)'
            }}></span>
            {isOnline ? 'Online' : 'Offline — Reconnecting'}
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <main className="main-content">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <MenuIcon size={20} />
            </button>
            <h1 className="header-title">{activeNavItem?.label}</h1>
          </div>

          <div className="header-actions">
            {savingCount > 0 && (
              <span className="status-badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo)', borderColor: 'rgba(99,102,241,0.2)' }}>
                <RefreshCw size={12} className="spin-icon" /> Saving…
              </span>
            )}

            {/* Active User Display and Logout trigger */}
            <div className="user-profile-badge">
              <span className="user-profile-name" onClick={handleOpenProfileModal} title="Click to edit profile">👤 {currentUser.name}</span>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setView('dashboard');
                  addToast('Session logged out successfully');
                }}
                className="logout-btn"
              >
                <LogOut size={13} /> <span>Log Out</span>
              </button>
            </div>

            <span className="header-date">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Dynamic Inner Panel View Routing */}
        <div className="content-body">
          {view === 'dashboard' && (
            <Dashboard
              sales={sales}
              products={menu} // fallback for legacy metrics naming
              inventory={inventory}
              tables={tables}
              attendance={attendance}
              employees={employees}
              setView={setView}
            />
          )}

          {view === 'pos' && (
            <TablePOS
              tables={tables}
              menu={menu}
              inventory={inventory}
              onUpdateTables={handleUpdateTables}
              onUpdateMenu={handleUpdateMenu}
              onUpdateInventory={handleUpdateInventory}
              onAddSale={handleAddSale}
              addToast={addToast}
              currentUser={currentUser}
              restaurantName={restaurantName}
            />
          )}

          {view === 'menu' && (
            <MenuCatalog
              menu={menu}
              inventory={inventory}
              onUpdateMenu={handleUpdateMenu}
              onUpdateInventory={handleUpdateInventory}
              addToast={addToast}
            />
          )}

          {view === 'inventory' && (
            <Inventory
              inventory={inventory}
              onUpdateInventory={handleUpdateInventory}
              addToast={addToast}
              currentUser={currentUser}
            />
          )}

          {view === 'employees' && (
            <Employees
              employees={employees}
              attendance={attendance}
              onUpdateEmployees={handleUpdateEmployees}
              onUpdateAttendance={handleUpdateAttendance}
              addToast={addToast}
              currentUser={currentUser}
            />
          )}

          {view === 'reports' && (
            <Reports
              sales={sales}
              products={menu} // Profit calculates based on menu items sold
              inventory={inventory}
              attendance={attendance}
              addToast={addToast}
              onSeedSales={handleSeedSales}
              onEditSale={handleEditSale}
              restaurantName={restaurantName}
            />
          )}

          {view === 'settings' && (
            <SettingsTab
              addToast={addToast}
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              onUpdateRestaurantName={handleUpdateRestaurantName}
              onSwitchRestaurant={unlinkRestaurant}
              isOnline={isOnline}
              menu={menu}
              inventory={inventory}
              employees={employees}
              sales={sales}
            />
          )}
        </div>
      </main>

      {/* Modal: Edit User Profile */}
      {showProfileModal && (
        <div className="overlay" style={{ zIndex: 10000 }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Edit Profile Info</h2>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. John Doe"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    placeholder="e.g. 9876543210"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. jdoe"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    className="input-field"
                    placeholder="••••••••"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast Overlay Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : ''}`}>
            {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✓'}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
