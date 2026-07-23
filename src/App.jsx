import React, { useState, useEffect } from 'react';
import { db } from './db';
import Dashboard from './components/Dashboard';
import TablePOS from './components/TablePOS';
import MenuCatalog from './components/Menu';
import Inventory from './components/Inventory';
import Employees from './components/Employees';
import Reports from './components/Reports';
import SettingsTab from './components/Settings';

import { getSyncSettings, performCloudSync } from './sync';

import { 
  LayoutDashboard, 
  Coffee, 
  Warehouse, 
  Users, 
  FileText, 
  Menu as MenuIcon, 
  X,
  Wifi,
  WifiOff,
  BookOpen,
  LogOut,
  Lock,
  Settings as SettingsIcon
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // User Session State
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
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
      addToast('Working offline — Data is fully secured locally', 'warning');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const [syncConfig, setSyncConfig] = useState({ enabled: false, url: '' });

  // Fetch initial data from IndexedDB
  const handleReloadDatabase = async () => {
    // Reload Sync Configuration details
    const settings = getSyncSettings();
    setSyncConfig(settings);

    try {
      const loadedMenu = await db.menu.getAll();
      let finalMenu = loadedMenu;
      if (loadedMenu.length === 0) {
        const defaultMenu = [
          { id: 'menu_espresso', name: 'Espresso Coffee', category: 'Beverages', price: 80, inventoryId: 'inv_coffee_beans', inventoryQty: 0.02 },
          { id: 'menu_cappuccino', name: 'Cappuccino Coffee', category: 'Beverages', price: 120, inventoryId: 'inv_milk', inventoryQty: 0.25 },
          { id: 'menu_latte', name: 'Cafe Latte', category: 'Beverages', price: 140, inventoryId: 'inv_milk', inventoryQty: 0.2 },
          { id: 'menu_black_tea', name: 'Black Tea', category: 'Beverages', price: 40, inventoryId: 'inv_tea_leaves', inventoryQty: 0.01 },
          { id: 'menu_sweet_tea', name: 'Sweet Tea', category: 'Beverages', price: 50, inventoryId: 'inv_sugar', inventoryQty: 0.05 },
          { id: 'menu_chocolate_muffin', name: 'Chocolate Muffin', category: 'Bakery', price: 90, inventoryId: 'inv_paper_cups', inventoryQty: 1.0 },
          
          // Restaurant Finished Goods / Drinks
          { id: 'menu_cola', name: 'Coca-Cola Can (330ml)', category: 'Drinks', price: 60, inventoryId: 'inv_cola', inventoryQty: 1.0 },
          { id: 'menu_sprite', name: 'Sprite Can (330ml)', category: 'Drinks', price: 60, inventoryId: 'inv_sprite', inventoryQty: 1.0 },
          { id: 'menu_fanta', name: 'Fanta Orange Can (330ml)', category: 'Drinks', price: 60, inventoryId: 'inv_fanta', inventoryQty: 1.0 },
          { id: 'menu_redbull', name: 'Red Bull Energy Can', category: 'Drinks', price: 160, inventoryId: 'inv_redbull', inventoryQty: 1.0 },
          { id: 'menu_water', name: 'Bottled Mineral Water', category: 'Drinks', price: 20, inventoryId: 'inv_water', inventoryQty: 1.0 },
          { id: 'menu_tonic', name: 'Schweppes Tonic Water', category: 'Drinks', price: 80, inventoryId: 'inv_tonic', inventoryQty: 1.0 },
          { id: 'menu_beer_bud', name: 'Budweiser Beer Bottle', category: 'Drinks', price: 220, inventoryId: 'inv_beer_bud', inventoryQty: 1.0 },
          { id: 'menu_beer_hein', name: 'Heineken Beer Bottle', category: 'Drinks', price: 250, inventoryId: 'inv_beer_hein', inventoryQty: 1.0 },
          { id: 'menu_orange_juice', name: 'Fresh Orange Juice Glass', category: 'Drinks', price: 90, inventoryId: 'inv_orange_juice', inventoryQty: 0.3 }
        ];
        await db.menu.putAll(defaultMenu);
        finalMenu = defaultMenu;
      }
      setMenu(finalMenu);

      const loadedInventory = await db.inventory.getAll();
      let finalInventory = loadedInventory;
      if (loadedInventory.length === 0) {
        const defaultInventory = [
          { id: 'inv_coffee_beans', name: 'Coffee Beans', costPrice: 450, stock: 15.0, unit: 'kg', minStock: 2.0 },
          { id: 'inv_milk', name: 'Whole Milk', costPrice: 60, stock: 45.0, unit: 'L', minStock: 5.0 },
          { id: 'inv_sugar', name: 'Sugar', costPrice: 45, stock: 20.0, unit: 'kg', minStock: 2.0 },
          { id: 'inv_paper_cups', name: 'Paper Cups', costPrice: 2, stock: 300.0, unit: 'pcs', minStock: 20.0 },
          { id: 'inv_tea_leaves', name: 'Tea Leaves', costPrice: 300, stock: 10.0, unit: 'kg', minStock: 1.0 },
          
          // Restaurant Finished Goods / Drinks
          { id: 'inv_cola', name: 'Coca-Cola Cans', costPrice: 40, stock: 120.0, unit: 'pcs', minStock: 24.0 },
          { id: 'inv_sprite', name: 'Sprite Cans', costPrice: 40, stock: 100.0, unit: 'pcs', minStock: 24.0 },
          { id: 'inv_fanta', name: 'Fanta Orange Cans', costPrice: 40, stock: 100.0, unit: 'pcs', minStock: 24.0 },
          { id: 'inv_redbull', name: 'Red Bull Energy Cans', costPrice: 110, stock: 60.0, unit: 'pcs', minStock: 12.0 },
          { id: 'inv_water', name: 'Bottled Mineral Water', costPrice: 12, stock: 200.0, unit: 'pcs', minStock: 30.0 },
          { id: 'inv_tonic', name: 'Schweppes Tonic Water', costPrice: 50, stock: 50.0, unit: 'pcs', minStock: 10.0 },
          { id: 'inv_beer_bud', name: 'Budweiser Beer Bottles', costPrice: 140, stock: 80.0, unit: 'pcs', minStock: 12.0 },
          { id: 'inv_beer_hein', name: 'Heineken Beer Bottles', costPrice: 160, stock: 80.0, unit: 'pcs', minStock: 12.0 },
          { id: 'inv_orange_juice', name: 'Fresh Orange Juice Stock', costPrice: 40, stock: 40.0, unit: 'L', minStock: 8.0 }
        ];
        await db.inventory.putAll(defaultInventory);
        finalInventory = defaultInventory;
      }
      setInventory(finalInventory);

      const loadedEmployees = await db.employees.getAll();
      let finalEmployees = loadedEmployees;
      if (loadedEmployees.length === 0) {
        const defaultEmployees = [
          { id: 'emp_admin', name: 'Admin Manager', role: 'Manager', phone: '9876543210', username: 'admin', password: 'admin123', status: 'active' },
          { id: 'emp_jane', name: 'Jane Smith', role: 'Cashier', phone: '9876543211', username: 'jane', password: 'jane123', status: 'active' },
          { id: 'emp_bob', name: 'Bob Jones', role: 'Server', phone: '9876543212', username: 'bob', password: 'bob123', status: 'active' },
          { id: 'emp_remy', name: 'Chef Remy', role: 'Chef', phone: '9876543213', username: 'remy', password: 'remy123', status: 'active' }
        ];
        await db.employees.putAll(defaultEmployees);
        finalEmployees = defaultEmployees;
      }
      setEmployees(finalEmployees);

      const loadedAttendance = await db.attendance.getAll();
      setAttendance(loadedAttendance);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const loadedSales = await db.sales.getByDateRange(thirtyDaysAgo.toISOString(), new Date().toISOString());
      setSales(loadedSales);

      let loadedTables = await db.tables.getAll();
      if (loadedTables.length === 0) {
        const defaultTables = Array.from({ length: 8 }, (_, i) => ({
          id: `table_${i + 1}`,
          name: `Table ${i + 1}`,
          status: 'empty',
          currentOrder: [],
          billTotal: 0,
          discount: 0,
          tax: 0
        }));
        await db.tables.putAll(defaultTables);
        loadedTables = defaultTables;
      }
      setTables(loadedTables);
    } catch (err) {
      console.error('Failed to load database registers:', err);
    }
  };

  useEffect(() => {
    handleReloadDatabase();

    // Request persistent storage protection to prevent browser auto-eviction
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then((persisted) => {
        if (!persisted) {
          navigator.storage.persist().then((granted) => {
            if (granted) {
              console.log('[PortablePOS] Persistent storage access granted by browser.');
            } else {
              console.log('[PortablePOS] Persistent storage access denied. Browser may evict data under storage pressure.');
            }
          });
        } else {
          console.log('[PortablePOS] Storage is already persisted.');
        }
      });
    }
  }, []);

  // Enforce role-based routing checks when user session state changes
  useEffect(() => {
    if (currentUser) {
      const allowedViews = {
        Manager: ['dashboard', 'pos', 'menu', 'inventory', 'employees', 'reports', 'settings'],
        Cashier: ['dashboard', 'pos', 'inventory', 'employees'],
        Server: ['pos', 'employees'],
        Chef: ['inventory', 'employees']
      };
      
      const allowedList = allowedViews[currentUser.role] || ['pos', 'employees'];
      if (!allowedList.includes(view)) {
        setView(allowedList[0]);
      }
    }
  }, [currentUser]);

  // Background Cloud Sync Loop (Runs silently every 30 seconds if online)
  useEffect(() => {
    const settings = getSyncSettings();
    if (!settings.enabled || !isOnline) return;

    const interval = setInterval(async () => {
      try {
        const result = await performCloudSync();
        if (result.success && result.count > 0) {
          console.log(`[AuraPOS Sync] Auto-synced ${result.count} records to cloud database.`);
          
          // Silently reload local state in background to sync flags
          const loadedMenu = await db.menu.getAll();
          setMenu(loadedMenu);
          const loadedInventory = await db.inventory.getAll();
          setInventory(loadedInventory);
          const loadedEmployees = await db.employees.getAll();
          setEmployees(loadedEmployees);
          const loadedAttendance = await db.attendance.getAll();
          setAttendance(loadedAttendance);
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const loadedSales = await db.sales.getByDateRange(thirtyDaysAgo.toISOString(), new Date().toISOString());
          setSales(loadedSales);
        }
      } catch (err) {
        console.error('[PortablePOS Sync] Background sync failed:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // --- Login Handler ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const u = loginUser.trim().toLowerCase();
    const p = loginPass.trim();

    // Default Fallback Account
    if (u === 'admin' && p === 'admin123') {
      setCurrentUser({ name: 'System Manager', username: 'admin', role: 'Manager' });
      addToast('Logged in as Administrator');
      setLoginUser('');
      setLoginPass('');
      return;
    }

    // Lookup credentials in active employees table
    const matched = employees.find(emp => emp.username === u && emp.password === p && emp.status === 'active');
    if (matched) {
      setCurrentUser({ name: matched.name, username: matched.username, role: matched.role, id: matched.id });
      addToast(`Welcome back, ${matched.name}!`);
      
      // Auto-Clock In employee on login if not already clocked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const attendanceId = `${todayStr}_${matched.id}`;
      const alreadyClocked = attendance.some(a => a.id === attendanceId);
      
      if (!alreadyClocked) {
        const newEntry = {
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
        };
        handleUpdateAttendance([...attendance, newEntry]);
      }
      
      setLoginUser('');
      setLoginPass('');
    } else {
      addToast('Invalid username or password', 'error');
    }
  };

  const handleUpdateProfile = async (updatedProfile) => {
    // Check if username already exists in other accounts
    const usernameConflict = employees.some(
      emp => emp.username === updatedProfile.username.toLowerCase().trim() && emp.id !== updatedProfile.id
    );
    if (usernameConflict) {
      addToast('Username already taken by another staff member', 'error');
      return false;
    }

    // Update employees array
    const updatedEmployees = employees.map(emp => 
      emp.id === updatedProfile.id ? { ...emp, ...updatedProfile } : emp
    );
    setEmployees(updatedEmployees);
    await db.employees.put({ ...employees.find(e => e.id === updatedProfile.id), ...updatedProfile });

    // Update currentUser state
    setCurrentUser({
      ...currentUser,
      name: updatedProfile.name,
      username: updatedProfile.username.toLowerCase().trim(),
      id: updatedProfile.id
    });
    
    addToast('Profile updated successfully');
    return true;
  };

  const handleOpenProfileModal = () => {
    // Find the corresponding database record for the current user
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

  // --- POS Database Actions ---

  const handleUpdateTables = async (updatedTables) => {
    setTables(updatedTables);
    await db.tables.putAll(updatedTables);
  };

  const handleUpdateMenu = async (updatedMenu) => {
    setMenu(updatedMenu);
    await db.menu.putAll(updatedMenu);
  };

  const handleUpdateInventory = async (updatedInventory) => {
    setInventory(updatedInventory);
    await db.inventory.putAll(updatedInventory);
  };

  const handleAddSale = async (newSale) => {
    setSales(prev => [...prev, newSale]);
    await db.sales.add(newSale);
  };

  const handleSeedSales = async (seededSales) => {
    setSales(seededSales);
    for (const sale of seededSales) {
      await db.sales.add(sale);
    }
  };

  const handleUpdateEmployees = async (updatedEmployees) => {
    setEmployees(updatedEmployees);
    const currentList = await db.employees.getAll();
    const idsToKeep = updatedEmployees.map(e => e.id);
    for (const item of currentList) {
      if (!idsToKeep.includes(item.id)) {
        await db.employees.delete(item.id);
      }
    }
    for (const item of updatedEmployees) {
      await db.employees.put(item);
    }
  };

  const handleUpdateAttendance = async (updatedAttendance) => {
    setAttendance(updatedAttendance);
    for (const entry of updatedAttendance) {
      await db.attendance.put(entry);
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
        <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-teal))', display: 'inline-flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px', boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)' }}>
              <Lock size={24} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '0.5px' }}>PortablePOS Security</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>Enter credentials to start your shift</p>
          </div>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '10px', height: '42px' }}>
              Verify & Unlock
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            Default Fallback: <code>admin</code> / <code>admin123</code>
          </div>
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
              Manager: ['dashboard', 'pos', 'menu', 'inventory', 'employees', 'reports', 'settings'],
              Cashier: ['dashboard', 'pos', 'inventory', 'employees'],
              Server: ['pos', 'employees'],
              Chef: ['inventory', 'employees']
            };
            const role = currentUser?.role || 'Server';
            return (allowedViews[role] || ['pos', 'employees']).includes(item.id);
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
                  
                  // Reload sync configuration to refresh badge status immediately
                  const settings = getSyncSettings();
                  setSyncConfig(settings);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {syncConfig.enabled && syncConfig.url ? (
            <div className="status-badge" style={{ background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isOnline ? 'var(--accent-emerald)' : 'var(--accent-amber)', borderColor: isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }}>
              <span className="status-indicator" style={{ background: isOnline ? 'var(--accent-emerald)' : 'var(--accent-amber)', boxShadow: isOnline ? '0 0 10px var(--accent-emerald)' : '0 0 10px var(--accent-amber)' }}></span>
              {isOnline ? 'Cloud Synced' : 'Offline - Sync Pending'}
            </div>
          ) : (
            <div className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderColor: 'rgba(99,102,241,0.2)' }}>
              <span className="status-indicator" style={{ background: 'var(--accent-indigo)', boxShadow: '0 0 10px var(--accent-indigo)' }}></span>
              Local Only
            </div>
          )}
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
            />
          )}

          {view === 'settings' && (
            <SettingsTab
              addToast={addToast}
              onReloadDatabase={handleReloadDatabase}
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
