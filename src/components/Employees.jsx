import React, { useState } from 'react';
import { Clock, Plus, LogIn, LogOut, Calendar, RotateCcw } from 'lucide-react';

export default function Employees({
  employees = [],
  attendance = [],
  onUpdateEmployees,
  onUpdateAttendance,
  addToast,
  currentUser
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'roster'
  
  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Server');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Save or Update employee
  const handleSaveEmployee = (e) => {
    e.preventDefault();
    if (!name.trim() || !role || !phone.trim() || !username.trim() || !password.trim()) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    // Verify unique username
    if (employees.some(emp => emp.username === username.toLowerCase().trim() && (!editingEmployee || emp.id !== editingEmployee.id))) {
      addToast('Username already taken. Please choose another.', 'error');
      return;
    }

    // Check if editing
    let updatedEmployees;
    if (editingEmployee) {
      // Demoting guard for last active manager
      const isOldManager = (editingEmployee.role || '').toLowerCase().trim() === 'manager';
      const isNewManager = role.toLowerCase().trim() === 'manager';
      if (isOldManager && !isNewManager) {
        const managersCount = employees.filter(e => (e.role || '').toLowerCase().trim() === 'manager' && e.status === 'active').length;
        if (managersCount <= 1) {
          addToast('Action denied: Cannot demote the last active Manager account.', 'error');
          return;
        }
      }

      updatedEmployees = employees.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, name, role, phone, username: username.toLowerCase().trim(), password }
          : emp
      );
      addToast('Staff profile updated successfully');
    } else {
      const newEmp = {
        id: `emp_${Date.now()}`,
        name,
        role,
        phone,
        username: username.toLowerCase().trim(),
        password,
        status: 'active'
      };
      updatedEmployees = [...employees, newEmp];
      addToast(`${name} added as ${role}`);
    }

    onUpdateEmployees(updatedEmployees);
    handleCloseModal();
  };

  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setRole(employee.role);
    setPhone(employee.phone);
    setUsername(employee.username);
    setPassword(employee.password);
    setShowAddModal(true);
  };

  const handleDeleteEmployee = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    const isEmpManager = (emp?.role || '').toLowerCase().trim() === 'manager';
    const managersCount = employees.filter(e => (e.role || '').toLowerCase().trim() === 'manager' && e.status === 'active').length;

    if (isEmpManager && managersCount <= 1) {
      addToast('Action denied: Cannot delete the last active Manager account.', 'error');
      return;
    }

    if (confirm('Are you sure you want to permanently delete this employee from the system?')) {
      const updatedEmployees = employees.filter(emp => emp.id !== employeeId);
      onUpdateEmployees(updatedEmployees);
      addToast('Employee deleted from roster', 'info');
    }
  };

  const handleCloseModal = () => {
    setName('');
    setPhone('');
    setUsername('');
    setPassword('');
    setEditingEmployee(null);
    setShowAddModal(false);
  };

  // Clock In Employee
  const handleClockIn = (employee) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const attendanceId = `${selectedDate}_${employee.id}`;
    
    const newEntry = {
      id: attendanceId,
      date: selectedDate,
      employeeId: employee.id,
      employeeName: employee.name,
      clockIn: timeStr,
      clockInRaw: Date.now(),
      clockOut: null,
      clockOutRaw: null,
      duration: null,
      status: 'present'
    };

    const updatedAttendance = [...attendance.filter(a => a.id !== attendanceId), newEntry];
    onUpdateAttendance(updatedAttendance);
    addToast(`${employee.name} clocked in at ${timeStr}`);
  };

  // Clock Out Employee
  const handleClockOut = (employee) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const attendanceId = `${selectedDate}_${employee.id}`;
    const existingLog = attendance.find(a => a.id === attendanceId);

    if (!existingLog) {
      addToast('Cannot clock out: employee has not clocked in yet.', 'error');
      return;
    }

    const clockOutRaw = Date.now();
    const clockInRaw = existingLog.clockInRaw || (clockOutRaw - 8 * 60 * 60 * 1000); // default to 8 hours if missing
    const diffMs = clockOutRaw - clockInRaw;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const durationStr = `${hrs}h ${mins}m`;

    const updatedEntry = {
      ...existingLog,
      clockOut: timeStr,
      clockOutRaw: clockOutRaw,
      duration: durationStr
    };

    const updatedAttendance = attendance.map(a => a.id === attendanceId ? updatedEntry : a);
    onUpdateAttendance(updatedAttendance);
    addToast(`${employee.name} clocked out at ${timeStr} (Worked: ${durationStr})`);
  };

  // Toggle employee active status
  const handleToggleStatus = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    const isEmpManager = (emp?.role || '').toLowerCase().trim() === 'manager';
    const managersCount = employees.filter(e => (e.role || '').toLowerCase().trim() === 'manager' && e.status === 'active').length;

    if (isEmpManager && emp.status === 'active' && managersCount <= 1) {
      addToast('Action denied: Cannot disable the last active Manager account.', 'error');
      return;
    }

    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId 
        ? { ...emp, status: emp.status === 'active' ? 'inactive' : 'active' }
        : emp
    );
    onUpdateEmployees(updatedEmployees);
    addToast('Employee roster updated');
  };

  // Seed sample employees
  const handleSeedEmployees = () => {
    const mockEmployees = [
      { id: 'e1', name: 'Aarav Sharma', role: 'Manager', phone: '9876543210', status: 'active', username: 'admin', password: '123' },
      { id: 'e2', name: 'Priya Patel', role: 'Chef', phone: '8765432109', status: 'active', username: 'priya', password: '123' },
      { id: 'e3', name: 'Rohan Sen', role: 'Server', phone: '7654321098', status: 'active', username: 'rohan', password: '123' },
      { id: 'e4', name: 'Neha Nair', role: 'Cashier', phone: '6543210987', status: 'active', username: 'cashier', password: '123' }
    ];
    onUpdateEmployees(mockEmployees);
    addToast('Roster seeded with sample staff details');
  };

  const isManager = (currentUser?.role || '').toLowerCase().trim() === 'manager';

  if (!isManager) {
    const myEmp = employees.find(e => e.username === currentUser?.username);
    if (!myEmp) {
      return (
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '480px', margin: '40px auto' }}>
          <h3 style={{ color: 'var(--accent-coral)' }}>Profile Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13px' }}>Your active username is not registered in the employee database. Please contact a manager.</p>
        </div>
      );
    }

    const log = attendance.find(a => a.employeeId === myEmp.id && a.date === selectedDate);
    const isClockedIn = log && log.clockIn;
    const isClockedOut = log && log.clockOut;

    return (
      <div style={{ maxWidth: '480px', margin: '20px auto' }}>
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-teal))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', marginBottom: '14px' }}>
              ⏰
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px' }}>Personal Punch Clock</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Hello, <strong>{myEmp.name}</strong> ({myEmp.role})</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
            </div>
            
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shift Status:</span>
              {isClockedOut ? (
                <span className="badge badge-muted">Shift Ended</span>
              ) : isClockedIn ? (
                <span className="badge badge-emerald">On Duty</span>
              ) : (
                <span className="badge badge-amber">Off Duty</span>
              )}
            </div>

            {isClockedIn && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Clock In Time:</span>
                <strong style={{ color: 'var(--accent-teal)' }}>{log.clockIn}</strong>
              </div>
            )}

            {isClockedOut && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Clock Out Time:</span>
                  <strong style={{ color: 'var(--accent-coral)' }}>{log.clockOut}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Work Duration:</span>
                  <span className="badge badge-indigo" style={{ textTransform: 'none', padding: '2px 6px', fontSize: '11px' }}>{log.duration}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {!isClockedIn ? (
              <button className="btn btn-primary btn-full" style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => handleClockIn(myEmp)}>
                <LogIn size={16} /> Punch Clock In
              </button>
            ) : !isClockedOut ? (
              <button className="btn btn-danger btn-full" style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => handleClockOut(myEmp)}>
                <LogOut size={16} /> Punch Clock Out
              </button>
            ) : (
              <button className="btn btn-secondary btn-full" style={{ height: '42px' }} disabled>
                ✓ Today's Shift Completed
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Mobile Tab Swapper */}
      <div className="employee-tabs-header">
        <button 
          className={`filter-tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          📅 Attendance
        </button>
        <button 
          className={`filter-tab ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          👥 Staff Roster
        </button>
      </div>

      <div className="employee-layout-grid">
        {/* Attendance Tracker (Left pane) */}
        <div className={`glass-panel employee-pane-card ${activeTab === 'attendance' ? 'show-mobile' : ''}`} style={{ padding: '24px' }}>
        <div className="section-header">
          <h2 className="section-title">
            <Clock size={20} className="text-teal" />
            Attendance Register
          </h2>
          {/* Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {employees.filter(e => e.status === 'active').length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No active staff found. Add employees or seed sample data.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {employees.filter(e => e.status === 'active').map(emp => {
              const log = attendance.find(a => a.employeeId === emp.id && a.date === selectedDate);
              const isClockedIn = log && log.clockIn;
              const isClockedOut = log && log.clockOut;

              return (
                <div 
                  key={emp.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: '600' }}>{emp.name}</h4>
                    <span className="badge badge-muted" style={{ marginTop: '4px' }}>{emp.role}</span>
                  </div>

                  {/* Duty Time Logs */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isClockedIn && <span>In: <strong>{log.clockIn}</strong></span>}
                      {isClockedOut && <span>Out: <strong>{log.clockOut}</strong></span>}
                    </div>
                    {isClockedOut && log.duration && (
                      <span className="badge badge-indigo" style={{ textTransform: 'none', fontSize: '10px', padding: '2px 6px' }}>
                        Worked: {log.duration}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isClockedIn ? (
                      <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => handleClockIn(emp)}>
                        <LogIn size={14} /> Clock In
                      </button>
                    ) : !isClockedOut ? (
                      <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => handleClockOut(emp)}>
                        <LogOut size={14} /> Clock Out
                      </button>
                    ) : (
                      <span className="badge badge-muted" style={{ padding: '8px 12px' }}>Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

      {/* Roster / Staff List (Right pane) */}
      <div className={`glass-panel employee-pane-card ${activeTab === 'roster' ? 'show-mobile' : ''}`} style={{ padding: '24px', height: 'fit-content' }}>
        <div className="section-header">
          <h2 className="section-title"> Roster Details </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            {employees.length === 0 && (
              <button className="btn btn-secondary" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }} onClick={handleSeedEmployees}>
                <RotateCcw size={14} /> Seed
              </button>
            )}
            <button className="btn btn-primary" style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Roster
            </button>
          </div>
        </div>

        {employees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Roster is empty.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ opacity: emp.status === 'inactive' ? 0.5 : 1 }}>
                    <td style={{ fontWeight: '600' }}>
                      {emp.name}
                      <div style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>Ph: {emp.phone}</div>
                    </td>
                    <td>{emp.role}</td>
                    <td>
                      <span className={`badge ${emp.status === 'active' ? 'badge-emerald' : 'badge-muted'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: 'var(--radius-xs)' }}
                          onClick={() => handleOpenEdit(emp)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: 'var(--radius-xs)' }}
                          onClick={() => handleDeleteEmployee(emp.id)}
                        >
                          Delete
                        </button>
                        <button 
                          className={`btn ${emp.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: 'var(--radius-xs)' }}
                          onClick={() => handleToggleStatus(emp.id)}
                        >
                          {emp.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Modal: Add Employee */}
      {showAddModal && (
        <div className="overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingEmployee ? 'Edit Roster Staff' : 'Add Roster Staff'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Role / Position *</label>
                  <select 
                    className="input-field select-field"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="Manager">💼 Manager</option>
                    <option value="Chef">🧑‍🍳 Chef / Cook</option>
                    <option value="Server">🤵 Server / Waiter</option>
                    <option value="Cashier">💵 Cashier</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="input-field"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="e.g. cashier"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      required
                      className="input-field"
                      placeholder="e.g. pass123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEmployee ? 'Save Changes' : 'Add Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
