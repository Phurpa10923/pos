import React from 'react';
import { IndianRupee, Layers, Users, TrendingUp, AlertTriangle, Coffee } from 'lucide-react';

export default function Dashboard({ 
  sales = [], 
  products = [], 
  inventory = [],
  tables = [], 
  attendance = [], 
  employees = [],
  setView 
}) {
  
  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  
  const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  
  const activeTablesCount = tables.filter(t => t.status === 'live' || t.status === 'billed').length;
  
  const lowStockItems = inventory.filter(p => Number(p.stock) <= Number(p.minStock));
  
  const activeEmployeesCount = attendance.filter(a => a.date === todayStr && a.clockIn && !a.clockOut).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Today's Sales</h3>
            <p>₹{todayRevenue.toFixed(2)}</p>
          </div>
          <div className="stat-icon teal">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Active Tables</h3>
            <p>{activeTablesCount}</p>
          </div>
          <div className="stat-icon indigo">
            <Layers size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Low Stock Alerts</h3>
            <p>{lowStockItems.length}</p>
          </div>
          <div className="stat-icon coral">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Present Staff</h3>
            <p>{activeEmployeesCount}</p>
          </div>
          <div className="stat-icon emerald">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="dashboard-details">
        {/* Left Side: Tables Quick Glance & Stock Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Tables List */}
          <div className="glass-panel detail-section">
            <div className="section-header">
              <h2 className="section-title">
                <Coffee size={20} className="text-teal" />
                Live Tables Overview
              </h2>
              <button className="btn btn-secondary" onClick={() => setView('pos')}>View POS</button>
            </div>
            
            {tables.filter(t => t.status !== 'empty').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                All tables are currently unoccupied.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {tables.filter(t => t.status !== 'empty').map(table => (
                  <div 
                    key={table.id} 
                    className={`table-card ${table.status}`} 
                    onClick={() => setView('pos')}
                    style={{ padding: '14px 10px', fontSize: '13px' }}
                  >
                    <div className="table-num">{table.name}</div>
                    <div className="table-status">{table.status}</div>
                    <div className="table-amount">₹{(table.billTotal || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="glass-panel detail-section">
            <div className="section-header">
              <h2 className="section-title" style={{ color: 'var(--accent-coral)' }}>
                <AlertTriangle size={20} />
                Critical Inventory Warning
              </h2>
              <button className="btn btn-secondary" onClick={() => setView('inventory')}>Manage Stock</button>
            </div>

            {lowStockItems.length === 0 ? (
              <p style={{ color: 'var(--accent-emerald)', fontSize: '14px', textAlign: 'center', padding: '20px 0', fontWeight: '500' }}>
                ✓ All items are well stocked.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Unit</th>
                      <th>Stock Count</th>
                      <th>Min Limit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.slice(0, 5).map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '500' }}>{item.name}</td>
                        <td><span className="badge badge-muted" style={{ textTransform: 'none' }}>{item.unit}</span></td>
                        <td style={{ color: item.stock === 0 ? 'var(--accent-coral)' : 'var(--accent-amber)', fontWeight: 'bold' }}>
                          {item.stock}
                        </td>
                        <td>{item.minStock}</td>
                        <td>
                          <span className={`badge ${item.stock === 0 ? 'badge-coral' : 'badge-amber'}`}>
                            {item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Staff / Attendance Glance */}
        <div className="glass-panel detail-section" style={{ height: 'fit-content' }}>
          <div className="section-header">
            <h2 className="section-title">
              <Users size={20} />
              Today's Staff Log
            </h2>
            <button className="btn btn-secondary" onClick={() => setView('employees')}>Attendance</button>
          </div>

          {employees.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              No employees registered.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {employees.map(emp => {
                const log = attendance.find(a => a.employeeId === emp.id && a.date === todayStr);
                return (
                  <div 
                    key={emp.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{emp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.role}</div>
                    </div>
                    <div>
                      {log && log.clockIn ? (
                        log.clockOut ? (
                          <span className="badge badge-muted">Left ({log.clockOut}){log.duration && ` • ${log.duration}`}</span>
                        ) : (
                          <span className="badge badge-emerald">On Duty ({log.clockIn})</span>
                        )
                      ) : (
                        <span className="badge badge-coral">Absent</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
