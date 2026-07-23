import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, RotateCcw, AlertTriangle } from 'lucide-react';

export default function Inventory({
  inventory = [],
  onUpdateInventory,
  addToast,
  currentUser
}) {
  const canModify = currentUser?.role === 'Manager' || currentUser?.role === 'Chef';
  const canRestock = currentUser?.role === 'Manager' || currentUser?.role === 'Chef' || currentUser?.role === 'Cashier';
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('kg');
  const [minStock, setMinStock] = useState('5');

  // Filter items
  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCostPrice('');
    setStock('');
    setUnit('kg');
    setMinStock('5');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setCostPrice(item.costPrice.toString());
    setStock(item.stock.toString());
    setUnit(item.unit);
    setMinStock(item.minStock.toString());
    setShowAddModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!name.trim() || !costPrice || !stock || !unit) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    const parsedCost = parseFloat(costPrice);
    const parsedStock = parseFloat(stock);
    const parsedMinStock = parseFloat(minStock) || 0;

    if (parsedCost < 0 || parsedStock < 0 || parsedMinStock < 0) {
      addToast('Values cannot be negative', 'error');
      return;
    }

    let updatedInventory;
    if (editingItem) {
      updatedInventory = inventory.map(i => 
        i.id === editingItem.id 
          ? { ...i, name, costPrice: parsedCost, stock: parsedStock, unit, minStock: parsedMinStock }
          : i
      );
      addToast('Inventory item updated');
    } else {
      const newItem = {
        id: `inv_${Date.now()}`,
        name,
        costPrice: parsedCost,
        stock: parsedStock,
        unit,
        minStock: parsedMinStock
      };
      updatedInventory = [...inventory, newItem];
      addToast('Inventory ingredient added successfully');
    }

    onUpdateInventory(updatedInventory);
    setSelectedIds([]); // clear selection
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId) => {
    if (confirm('Are you sure you want to delete this raw material from stock? It may break menu recipe linkages.')) {
      onUpdateInventory(inventory.filter(i => i.id !== itemId));
      setSelectedIds(selectedIds.filter(id => id !== itemId));
      addToast('Inventory item deleted', 'info');
    }
  };

  // Quick Restock Addition
  const handleQuickRestock = (item, amount) => {
    const updated = inventory.map(i => 
      i.id === item.id 
        ? { ...i, stock: Number((Number(i.stock) + amount).toFixed(3)) }
        : i
    );
    onUpdateInventory(updated);
    addToast(`Restocked +${amount} ${item.unit} to ${item.name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="search-box" style={{ maxWidth: '300px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search raw material stock..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {canModify && selectedIds.length > 0 && (
            <button 
              className="btn btn-danger" 
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected items?`)) {
                  onUpdateInventory(inventory.filter(i => !selectedIds.includes(i.id)));
                  setSelectedIds([]);
                  addToast(`${selectedIds.length} inventory items deleted`);
                }
              }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          {canModify && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} /> Add Wholesale Material
            </button>
          )}
        </div>
      </div>

      {/* Stock List Grid */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {filteredInventory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No raw materials found. Add wholesale goods to configure your store.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {canModify && (
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox"
                        checked={filteredInventory.length > 0 && selectedIds.length === filteredInventory.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredInventory.map(item => item.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                  )}
                  <th>Wholesale Material</th>
                  <th>Wholesale Cost</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Min Limit</th>
                  <th>Status</th>
                  {canRestock && <th>Quick Add</th>}
                  {canModify && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const stockLevel = Number(item.stock);
                  const isOut = stockLevel <= 0;
                  const isLow = stockLevel <= Number(item.minStock);

                  return (
                    <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                      {canModify && (
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, item.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>₹{item.costPrice.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: isOut ? 'var(--accent-coral)' : isLow ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                        {item.stock}
                      </td>
                      <td><span className="badge badge-muted" style={{ textTransform: 'none' }}>{item.unit}</span></td>
                      <td>{item.minStock}</td>
                      <td>
                        {isOut ? (
                          <span className="badge badge-coral">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-amber">Low Stock</span>
                        ) : (
                          <span className="badge badge-emerald">In Stock</span>
                        )}
                      </td>
                      {canRestock && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '3px 8px', fontSize: '11px', borderRadius: 'var(--radius-xs)' }}
                              onClick={() => handleQuickRestock(item, item.unit === 'pcs' || item.unit === 'Loaves' ? 10 : 5)}
                            >
                              +{item.unit === 'pcs' || item.unit === 'Loaves' ? 10 : 5}
                            </button>
                          </div>
                        </td>
                      )}
                      {canModify && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Inventory Item */}
      {showAddModal && (
        <div className="overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Wholesale Stock' : 'Add Raw Material'}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Material Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Whole Milk Pack or Coffee Beans"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Wholesale Cost Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="input-field"
                      placeholder="e.g. 450"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Measurement Unit *</label>
                    <select 
                      className="input-field select-field"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="kg">kg (Kilograms)</option>
                      <option value="Liters">Liters</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="g">g (Grams)</option>
                      <option value="ml">ml (Milliliters)</option>
                      <option value="Loaves">Loaves</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Initial Stock Qty *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      className="input-field"
                      placeholder="e.g. 20"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Low Stock Warning Limit *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      className="input-field"
                      placeholder="e.g. 5"
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
