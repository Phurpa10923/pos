import React, { useState, useEffect } from 'react';
import { Cloud, Database, ShieldCheck, LogOut } from 'lucide-react';

export default function Settings({
  addToast,
  restaurantId,
  restaurantName = '',
  onUpdateRestaurantName,
  onSwitchRestaurant,
  isOnline = navigator.onLine,
  menu = [],
  inventory = [],
  employees = [],
  sales = []
}) {
  const [draftName, setDraftName] = useState(restaurantName);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    setDraftName(restaurantName);
  }, [restaurantName]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!draftName.trim()) {
      addToast('Store name cannot be empty', 'warning');
      return;
    }
    setIsSavingName(true);
    try {
      await onUpdateRestaurantName(draftName.trim());
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSwitchRestaurant = () => {
    if (confirm('Switch restaurant? You will be logged out and need to reconnect with a Restaurant ID.')) {
      onSwitchRestaurant();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Store Configuration Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          🏬 Store Settings
        </h2>
        <form onSubmit={handleSaveName} className="form-group" style={{ marginBottom: '0' }}>
          <label>Restaurant / Store Name</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. My Sweet Diner"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSavingName || draftName.trim() === restaurantName}
              style={{ whiteSpace: 'nowrap' }}
            >
              {isSavingName ? 'Saving…' : 'Save'}
            </button>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
            Customize your storefront name. This will be printed at the top of all physical receipts, WhatsApp text shares, and image shares.
          </span>
        </form>
      </div>

      {/* Cloud Database Info Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Database size={22} className="text-teal" /> Cloud Database Registry
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transactions Logged (30d)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-teal)' }}>{sales.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Catalog Items</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-indigo)' }}>{menu.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wholesale Stock Items</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-emerald)' }}>{inventory.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Active Roster</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{employees.length}</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cloud size={13} /> Connection Info
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Network Connection:</span>
            <span style={{ fontWeight: 'bold', color: isOnline ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Restaurant ID:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {restaurantId || '(none)'}
            </span>
          </div>
        </div>
      </div>

      {/* Switch Restaurant */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 className="section-title" style={{ marginBottom: '12px' }}>Switch Restaurant</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
          Disconnect this device from "{restaurantName || restaurantId}" and log in to a different restaurant.
        </p>
        <button
          className="btn btn-danger btn-full"
          onClick={handleSwitchRestaurant}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <LogOut size={16} /> Switch Restaurant
        </button>
      </div>

      {/* Info Tips */}
      <div className="glass-panel" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} /> Cloud-Native Architecture
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
          Every change you make — menu items, inventory, staff, orders — is saved directly to your restaurant's
          secure cloud database in real time. There is no local copy on this device, so an internet connection
          is required, but your data is always safely backed up and instantly available across every device
          connected to this restaurant.
        </p>
      </div>
    </div>
  );
}
