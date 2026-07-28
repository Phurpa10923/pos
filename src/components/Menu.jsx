import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, RotateCcw, Link2 } from 'lucide-react';
import { getMenuIngredients } from '../menuUtils';

const BLANK_INGREDIENT_ROW = { inventoryId: '', qty: '1' };

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
  const [selectedIds, setSelectedIds] = useState([]);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [price, setPrice] = useState('');
  const [ingredients, setIngredients] = useState([{ ...BLANK_INGREDIENT_ROW }]);

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
    setIngredients([{ ...BLANK_INGREDIENT_ROW }]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    const existingIngredients = getMenuIngredients(item);
    setIngredients(
      existingIngredients.length > 0
        ? existingIngredients.map(ing => ({ inventoryId: ing.inventoryId, qty: ing.qty.toString() }))
        : [{ ...BLANK_INGREDIENT_ROW }]
    );
    setShowAddModal(true);
  };

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { ...BLANK_INGREDIENT_ROW }]);
  };

  const handleRemoveIngredientRow = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    setIngredients(ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      addToast('Please fill all required fields', 'warning');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (parsedPrice < 0) {
      addToast('Price must be positive', 'error');
      return;
    }

    const cleanedIngredients = ingredients
      .filter(ing => ing.inventoryId)
      .map(ing => ({ inventoryId: ing.inventoryId, qty: parseFloat(ing.qty) || 1 }));

    if (cleanedIngredients.some(ing => ing.qty <= 0)) {
      addToast('Ingredient quantities must be positive', 'error');
      return;
    }

    let updatedMenu;
    if (editingItem) {
      updatedMenu = menu.map(m =>
        m.id === editingItem.id
          ? { ...m, name, category, price: parsedPrice, ingredients: cleanedIngredients, inventoryId: null, inventoryQty: null }
          : m
      );
      addToast('Menu item updated');
    } else {
      const newItem = {
        id: `menu_${Date.now()}`,
        name,
        category,
        price: parsedPrice,
        ingredients: cleanedIngredients
      };
      updatedMenu = [...menu, newItem];
      addToast('Menu item added successfully');
    }

    onUpdateMenu(updatedMenu);
    setSelectedIds([]); // clear selection
    setShowAddModal(false);
  };

  const handleDeleteItem = (itemId) => {
    if (confirm('Delete this item from the active menu?')) {
      onUpdateMenu(menu.filter(m => m.id !== itemId));
      setSelectedIds(selectedIds.filter(id => id !== itemId));
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
      { id: 'inv_orange_juice', name: 'Fresh Orange Juice Stock', costPrice: 40, stock: 40.0, unit: 'L', minStock: 8.0 },
      { id: 'inv_burger_bun', name: 'Burger Buns', costPrice: 15, stock: 100.0, unit: 'pcs', minStock: 20.0 },
      { id: 'inv_beef_patty', name: 'Beef Patty', costPrice: 60, stock: 80.0, unit: 'pcs', minStock: 15.0 }
    ];

    const mockMenu = [
      { id: 'menu_espresso', name: 'Espresso Coffee', category: 'Beverages', price: 80, ingredients: [{ inventoryId: 'inv_coffee_beans', qty: 0.02 }] },
      { id: 'menu_cappuccino', name: 'Cappuccino Coffee', category: 'Beverages', price: 120, ingredients: [{ inventoryId: 'inv_milk', qty: 0.25 }] },
      { id: 'menu_latte', name: 'Cafe Latte', category: 'Beverages', price: 140, ingredients: [{ inventoryId: 'inv_milk', qty: 0.2 }] },
      { id: 'menu_black_tea', name: 'Black Tea', category: 'Beverages', price: 40, ingredients: [{ inventoryId: 'inv_tea_leaves', qty: 0.01 }] },
      { id: 'menu_sweet_tea', name: 'Sweet Tea', category: 'Beverages', price: 50, ingredients: [{ inventoryId: 'inv_sugar', qty: 0.05 }] },
      { id: 'menu_chocolate_muffin', name: 'Chocolate Muffin', category: 'Bakery', price: 90, ingredients: [{ inventoryId: 'inv_paper_cups', qty: 1.0 }] },
      { id: 'menu_cola', name: 'Coca-Cola Can (330ml)', category: 'Drinks', price: 60, ingredients: [{ inventoryId: 'inv_cola', qty: 1.0 }] },
      { id: 'menu_sprite', name: 'Sprite Can (330ml)', category: 'Drinks', price: 60, ingredients: [{ inventoryId: 'inv_sprite', qty: 1.0 }] },
      { id: 'menu_fanta', name: 'Fanta Orange Can (330ml)', category: 'Drinks', price: 60, ingredients: [{ inventoryId: 'inv_fanta', qty: 1.0 }] },
      { id: 'menu_redbull', name: 'Red Bull Energy Can', category: 'Drinks', price: 160, ingredients: [{ inventoryId: 'inv_redbull', qty: 1.0 }] },
      { id: 'menu_water', name: 'Bottled Mineral Water', category: 'Drinks', price: 20, ingredients: [{ inventoryId: 'inv_water', qty: 1.0 }] },
      { id: 'menu_tonic', name: 'Schweppes Tonic Water', category: 'Drinks', price: 80, ingredients: [{ inventoryId: 'inv_tonic', qty: 1.0 }] },
      { id: 'menu_beer_bud', name: 'Budweiser Beer Bottle', category: 'Drinks', price: 220, ingredients: [{ inventoryId: 'inv_beer_bud', qty: 1.0 }] },
      { id: 'menu_beer_hein', name: 'Heineken Beer Bottle', category: 'Drinks', price: 250, ingredients: [{ inventoryId: 'inv_beer_hein', qty: 1.0 }] },
      { id: 'menu_orange_juice', name: 'Fresh Orange Juice Glass', category: 'Drinks', price: 90, ingredients: [{ inventoryId: 'inv_orange_juice', qty: 0.3 }] },
      {
        id: 'menu_combo_burger',
        name: 'Classic Burger + Coke Combo',
        category: 'Combos',
        price: 220,
        ingredients: [
          { inventoryId: 'inv_burger_bun', qty: 1 },
          { inventoryId: 'inv_beef_patty', qty: 1 },
          { inventoryId: 'inv_cola', qty: 1 }
        ]
      }
    ];

    onUpdateInventory(mockInventory);
    onUpdateMenu(mockMenu);
    setSelectedIds([]);
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
          {selectedIds.length > 0 && (
            <button 
              className="btn btn-danger" 
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected menu items?`)) {
                  onUpdateMenu(menu.filter(m => !selectedIds.includes(m.id)));
                  setSelectedIds([]);
                  addToast(`${selectedIds.length} menu items deleted`);
                }
              }}
            >
              <Trash2 size={16} /> Delete Selected ({selectedIds.length})
            </button>
          )}
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
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox"
                      checked={filteredMenu.length > 0 && selectedIds.length === filteredMenu.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredMenu.map(item => item.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Linked Inventory</th>
                  <th>Customer Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMenu.map(item => {
                  const itemIngredients = getMenuIngredients(item);
                  return (
                    <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? 'rgba(239, 68, 68, 0.05)' : '' }}>
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
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td><span className="badge badge-muted">{item.category}</span></td>
                      <td>
                        {itemIngredients.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not linked</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {itemIngredients.map((ing, idx) => {
                              const linkedInv = inventory.find(inv => inv.id === ing.inventoryId);
                              return linkedInv ? (
                                <span key={idx} className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Link2 size={11} /> {linkedInv.name} ({ing.qty} {linkedInv.unit}/sale)
                                </span>
                              ) : (
                                <span key={idx} className="badge badge-coral">Linked item missing</span>
                              );
                            })}
                          </div>
                        )}
                      </td>
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

                <div className="form-group">
                  <label>Inventory Ingredients (optional)</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                    Link one or more wholesale inventory items this menu item consumes per sale — e.g. a combo of 1 bun + 1 patty + 1 canned drink. Stock is deducted automatically at checkout, and it'll show as "Out of Stock" on the POS screen once any linked ingredient runs out.
                  </span>
                  {ingredients.map((ing, idx) => {
                    const invItem = inventory.find(inv => inv.id === ing.inventoryId);
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <select
                          className="input-field select-field"
                          value={ing.inventoryId}
                          onChange={(e) => handleIngredientChange(idx, 'inventoryId', e.target.value)}
                        >
                          <option value="">No link (unlimited / untracked stock)</option>
                          {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} — {inv.stock} {inv.unit} in stock</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="input-field"
                          placeholder={invItem ? `Qty (${invItem.unit})` : 'Qty/sale'}
                          value={ing.qty}
                          onChange={(e) => handleIngredientChange(idx, 'qty', e.target.value)}
                          disabled={!ing.inventoryId}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleRemoveIngredientRow(idx)}
                          disabled={ingredients.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-secondary" onClick={handleAddIngredientRow}>
                    <Plus size={14} /> Add Ingredient
                  </button>
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
