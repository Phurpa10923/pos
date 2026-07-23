import React, { useState, useEffect } from 'react';
import { Save, Cloud, RefreshCw, Database, Download, Upload, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getSyncSettings, saveSyncSettings, performCloudSync } from '../sync';
import { db } from '../db';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export default function Settings({ addToast, onReloadDatabase }) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [restaurantId, setRestaurantId] = useState('my_restaurant');
  const [syncStatus, setSyncStatus] = useState('Idle');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [dbStats, setDbStats] = useState({ sales: 0, menu: 0, inventory: 0, employees: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  const [restaurantName, setRestaurantName] = useState(localStorage.getItem('restaurantName') || 'PortablePOS');

  // Load current configuration and compute local stats
  const loadStatsAndSettings = async () => {
    // Load local stats
    try {
      const sales = await db.sales.getAll();
      const menu = await db.menu.getAll();
      const inventory = await db.inventory.getAll();
      const employees = await db.employees.getAll();
      const attendance = await db.attendance.getAll();

      // Count unsynced items
      const unsynced = 
        sales.filter(s => !s.synced).length +
        menu.filter(m => !m.synced).length +
        inventory.filter(i => !i.synced).length +
        employees.filter(e => !e.synced).length +
        attendance.filter(a => !a.synced).length;

      setUnsyncedCount(unsynced);
      setDbStats({
        sales: sales.length,
        menu: menu.length,
        inventory: inventory.length,
        employees: employees.length
      });
    } catch (err) {
      console.error('Failed to query local DB stats:', err);
    }

    // Load settings
    const settings = getSyncSettings();
    setSyncEnabled(settings.enabled);
    setSyncUrl(settings.url);
    setSyncPassword(settings.password);
    setRestaurantId(settings.restaurantId || 'my_restaurant');
    setHasExistingConfig(settings.enabled && !!settings.url);
  };

  useEffect(() => {
    loadStatsAndSettings();
  }, []);

  const handleSaveSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const activeUrl = (SUPABASE_URL || syncUrl).trim();
    const activePassword = (SUPABASE_ANON_KEY || syncPassword).trim();

    if (syncEnabled) {
      if (!activeUrl) {
        addToast('Supabase URL is required', 'warning');
        return;
      }
      if (!activePassword) {
        addToast('Supabase Anon Key is required', 'warning');
        return;
      }
      if (!restaurantId.trim()) {
        addToast('Restaurant ID is required', 'warning');
        return;
      }
    }
    saveSyncSettings(syncEnabled, activeUrl, activePassword, restaurantId);
    addToast('Cloud connection settings updated successfully');
    loadStatsAndSettings();
    if (onReloadDatabase) onReloadDatabase(); // Notify App to refresh badge
  };

  const handleDeleteConnection = () => {
    if (confirm('Are you sure you want to disconnect cloud sync? The app will return to offline-only storage. Local data will remain intact.')) {
      saveSyncSettings(false, '', '', 'my_restaurant');
      setSyncEnabled(false);
      setSyncUrl('');
      setSyncPassword('');
      setRestaurantId('my_restaurant');
      setHasExistingConfig(false);
      addToast('Cloud database disconnected');
      if (onReloadDatabase) onReloadDatabase(); // Notify App to refresh badge
    }
  };

  const handleSyncNow = async () => {
    if (!syncUrl) {
      addToast('Please provide a valid Cloud URL first', 'warning');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('Syncing changes...');

    const result = await performCloudSync(addToast);
    setIsSyncing(false);

    if (result.success) {
      setSyncStatus('Sync completed successfully!');
      addToast(result.count > 0 ? `Synced ${result.count} records to cloud!` : 'Database is fully up to date');
      loadStatsAndSettings();
    } else {
      setSyncStatus(`Sync Failed: ${result.reason}`);
      addToast(`Sync error: ${result.reason}`, 'error');
    }
  };

  // Export full IndexedDB JSON backup file
  const handleExportBackup = async () => {
    try {
      const sales = await db.sales.getAll();
      const menu = await db.menu.getAll();
      const inventory = await db.inventory.getAll();
      const employees = await db.employees.getAll();
      const attendance = await db.attendance.getAll();
      const tables = await db.tables.getAll();

      const backupObj = {
        version: 2,
        timestamp: new Date().toISOString(),
        data: { sales, menu, inventory, employees, attendance, tables }
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AuraPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Local backup file downloaded!');
    } catch (err) {
      addToast('Export failed', 'error');
    }
  };

  // Import JSON backup file
  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.data || !backup.version) {
          throw new Error('Invalid database backup format');
        }

        const d = backup.data;
        if (d.menu) await db.menu.putAll(d.menu);
        if (d.inventory) await db.inventory.putAll(d.inventory);
        if (d.sales) {
          for (const s of d.sales) {
            await db.sales.add(s);
          }
        }
        if (d.employees) {
          for (const emp of d.employees) {
            await db.employees.put(emp);
          }
        }
        if (d.attendance) {
          for (const att of d.attendance) {
            await db.attendance.put(att);
          }
        }
        if (d.tables) await db.tables.putAll(d.tables);

        addToast('Database restored successfully!');
        localStorage.setItem('db_seeded', 'true');
        loadStatsAndSettings();
        if (onReloadDatabase) onReloadDatabase();
      } catch (err) {
        addToast(`Restore failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Full purge
  const handlePurgeDatabase = async () => {
    if (confirm('CRITICAL WARNING: This will completely erase all transactions, employee rosters, menu catalogs, and inventory stocks from this device. Do you want to proceed?')) {
      try {
        await db.sales.clear();
        await db.menu.clear();
        await db.inventory.clear();
        await db.employees.clear();
        await db.attendance.clear();
        
        // reset tables
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

        localStorage.setItem('db_seeded', 'true');
        addToast('Local database wiped successfully', 'info');
        loadStatsAndSettings();
        if (onReloadDatabase) onReloadDatabase();
      } catch (err) {
        addToast('Purge failed', 'error');
      }
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Local DB Registers Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Store Configuration Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            🏬 Store Settings
          </h2>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label>Restaurant / Store Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. My Sweet Diner" 
              value={restaurantName}
              onChange={(e) => {
                const name = e.target.value;
                setRestaurantName(name);
                localStorage.setItem('restaurantName', name);
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              Customize your storefront name. This will be printed at the top of all physical receipts, WhatsApp text shares, and image shares.
            </span>
          </div>
        </div>

        {/* Cloud Synchronization Settings */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Cloud size={22} className="text-teal" /> Cloud Database Connection
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Enable Cloud Sync</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sync data bi-directionally across multiple devices</div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={syncEnabled} 
                  onChange={(e) => {
                    setSyncEnabled(e.target.checked);
                    if (!e.target.checked) {
                      handleDeleteConnection();
                    }
                  }} 
                />
                <span className="slider round"></span>
              </label>
            </div>

            {syncEnabled && (
              <>
                {(!SUPABASE_URL || !SUPABASE_ANON_KEY) && (
                  <>
                    <div className="form-group">
                      <label>Supabase Project URL *</label>
                      <input 
                        type="url" 
                        className="input-field" 
                        placeholder="https://your-project.supabase.co" 
                        value={syncUrl}
                        onChange={(e) => setSyncUrl(e.target.value)}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Found under Settings &gt; API in your Supabase Dashboard</span>
                    </div>

                    <div className="form-group">
                      <label>Supabase Anon Key *</label>
                      <input 
                        type="password" 
                        className="input-field" 
                        placeholder="your-anon-key-jwt" 
                        value={syncPassword}
                        onChange={(e) => setSyncPassword(e.target.value)}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Found under Settings &gt; API &gt; Project API keys in Supabase</span>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Restaurant / Store ID (Tenant ID) *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. delicious_pizza_1" 
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ensure all terminals in your restaurant share the exact same ID.</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 0' }}>
                  <span>Unsynced Local Changes:</span>
                  <span style={{ fontWeight: 'bold', color: unsyncedCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                    {unsyncedCount} records
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={handleSaveSettings} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Save Connection
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleSyncNow} 
                    disabled={isSyncing}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
                
                {syncStatus && (
                  <div style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Status: <strong>{syncStatus}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Local DB Info Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Database size={22} className="text-teal" /> Local Database Registry
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transactions Logged</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-teal)' }}>{dbStats.sales}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Catalog Items</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-indigo)' }}>{dbStats.menu}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wholesale Stock Items</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-emerald)' }}>{dbStats.inventory}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Active Roster</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{dbStats.employees}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-secondary btn-full" onClick={handleExportBackup} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Download size={16} /> Export Local Database Backup (.json)
            </button>

            <label className="btn btn-secondary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
              <Upload size={16} /> Restore Database Snapshot (.json)
              <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
            </label>

            <button className="btn btn-danger btn-full" onClick={handlePurgeDatabase} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
              <Trash2 size={16} /> WIPE LOCAL DATABASE
            </button>
          </div>
        </div>

        {/* Info Tips */}
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> Offline-First Core Architecture
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
            AuraPOS prioritizes local storage for immediate UI rendering and offline reliability.
            All writes are timestamped and committed locally in IndexedDB, so operational flow is never blocked.
            This ensures your billing and inventory data remains secure on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
