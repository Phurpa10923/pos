import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, RotateCcw, Link2 } from 'lucide-react';

export default function Menu({
  menu = [],
  inventory = [],
  onUpdateMenu,
  onUpdateInventory,
  addToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [price, setPrice] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [inventoryQty, setInventoryQty] = useState('1');

  // Filter items
  const filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCategory('Beverages');
    setPrice('');
    setInventoryId(inventory[0]?.id || '');
    setInventoryQty('1');
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setInventoryId(item.inventoryId || '');
    setInventoryQty((item.inventoryQty || 1).toString());
    setShowAddModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedQty = parseFloat(inventoryQty) || 1;

    if (parsedPrice < 0 || parsedQty <= 0) {
      addToast('Price and consumption quantity must be positive', 'error');
      return;
    }

    let updatedMenu;
    if (editingItem) {
      updatedMenu = menu.map(m => 
        m.id === editingItem.id 
          ? { ...m, name, category, price: parsedPrice, inventoryId, inventoryQty: parsedQty }
          : m
      );
      addToast('Menu item updated');
    } else {
      const newItem = {
        id: `menu_${Date.now()}`,
        name,
        category,
        price: parsedPrice,
        inventoryId,
        inventoryQty: parsedQty
      };
      updatedMenu = [...menu, newItem];
      addToast('Menu item added successfully');
    }

    onUpdateMenu(updatedMenu);
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId) => {
    if (confirm('Delete this item from the active menu?')) {
      onUpdateMenu(menu.filter(m => m.id !== itemId));
      addToast('Menu item deleted', 'info');
    }
  };

  // Seed both Menu (retail) and Inventory (wholesale) together
  const handleSeedMenu = () => {
    const mockInventory = [
      { id: 'inv_coffee_beans', name: 'Coffee Beans', costPrice: 450, stock: 15.0, unit: 'kg', minStock: 2.0 },
      { id: 'inv_milk', name: 'Whole Milk', costPrice: 60, stock: 45.0, unit: 'L', minStock: 5.0 },
      { id: 'inv_sugar', name: 'Sugar', costPrice: 45, stock: 20.0, unit: 'kg', minStock: 2.0 },
      { id: 'inv_paper_cups', name: 'Paper Cups', costPrice: 2, stock: 300.0, unit: 'pcs', minStock: 20.0 },
      { id: 'inv_tea_leaves', name: 'Tea Leaves', costPrice: 300, stock: 10.0, unit: 'kg', minStock: 1.0 },
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

    const mockMenu = [
      { id: 'menu_espresso', name: 'Espresso Coffee', category: 'Beverages', price: 80, inventoryId: 'inv_coffee_beans', inventoryQty: 0.02 },
      { id: 'menu_cappuccino', name: 'Cappuccino Coffee', category: 'Beverages', price: 120, inventoryId: 'inv_milk', inventoryQty: 0.25 },
      { id: 'menu_latte', name: 'Cafe Latte', category: 'Beverages', price: 140, inventoryId: 'inv_milk', inventoryQty: 0.2 },
      { id: 'menu_black_tea', name: 'Black Tea', category: 'Beverages', price: 40, inventoryId: 'inv_tea_leaves', inventoryQty: 0.01 },
      { id: 'menu_sweet_tea', name: 'Sweet Tea', category: 'Beverages', price: 50, inventoryId: 'inv_sugar', inventoryQty: 0.05 },
      { id: 'menu_chocolate_muffin', name: 'Chocolate Muffin', category: 'Bakery', price: 90, inventoryId: 'inv_paper_cups', inventoryQty: 1.0 },
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

    onUpdateInventory(mockInventory);
    onUpdateMenu(mockMenu);
    addToast('Sample Menu and Wholesale Inventory seeded successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Seed Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="search-box" style={{ maxWidth: '300px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search menu catalog..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {menu.length === 0 && (
            <button className="btn btn-secondary" onClick={handleSeedMenu}>
              <RotateCcw size={16} /> Seed Menu & Wholesale
            </button>
          )}
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Menu Catalog Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {filteredMenu.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No retail menu items found. Add menu items or seed sample data.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Customer Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenu.map(item => {
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td><span className="badge badge-muted">{item.category}</span></td>
                      <td style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>₹{item.price.toFixed(2)}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Menu Item */}
      {showAddModal && (
        <div className="overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Menu Catalog Item' : 'Add New Menu Item'}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Item Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Caramel Macchiato"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Category *</label>
                    <select 
                      className="input-field select-field"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Beverages">☕ Beverages</option>
                      <option value="Snacks">🍔 Snacks</option>
                      <option value="Desserts">🍰 Desserts</option>
                      <option value="Mains">🍛 Mains</option>
                      <option value="Combos">🍱 Combos</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Retail Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="input-field"
                      placeholder="e.g. 150"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
