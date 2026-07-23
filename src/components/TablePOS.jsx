import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Plus, Minus, Receipt, Check, Trash2, ArrowLeft, PlusCircle } from 'lucide-react';

export default function TablePOS({
  tables = [],
  menu = [],
  inventory = [],
  onUpdateTables,
  onUpdateMenu,
  onUpdateInventory,
  onAddSale,
  addToast,
  currentUser,
  restaurantName = ''
}) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Mobile UI state: 'tables' or 'order'
  const [mobileTab, setMobileTab] = useState('tables');
  const [activeOrderTab, setActiveOrderTab] = useState('menu');
  
  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxType, setTaxType] = useState('GST_5'); // 'NONE', 'GST_5', 'GST_12', 'GST_18', 'VAT_10'
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState(0);
  
  // Add Table state
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  // Auto select/sync table updates
  const activeTable = tables.find(t => t.id === selectedTable?.id);

  // Sync category count and names
  const categories = ['All', ...new Set(menu.map(p => p.category).filter(Boolean))];

  // Filtered Products
  const filteredProducts = menu.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Action: Add new table
  const handleAddTable = () => {
    if (!newTableName.trim()) return;
    const newId = `table_${Date.now()}`;
    const newTable = {
      id: newId,
      name: newTableName,
      status: 'empty',
      currentOrder: [],
      billTotal: 0,
      discount: 0,
      tax: 0
    };
    onUpdateTables([...tables, newTable]);
    setNewTableName('');
    setShowAddTableModal(false);
    addToast('Table created successfully');
  };

  // Action: Delete custom table (only if empty)
  const handleDeleteTable = (tableId, e) => {
    e.stopPropagation();
    const table = tables.find(t => t.id === tableId);
    if (table.status !== 'empty') {
      addToast('Cannot delete an occupied table', 'error');
      return;
    }
    if (confirm(`Delete ${table.name}?`)) {
      onUpdateTables(tables.filter(t => t.id !== tableId));
      if (selectedTable?.id === tableId) {
        setSelectedTable(null);
      }
      addToast('Table deleted');
    }
  };

  // Action: Select Table
  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setMobileTab('order');
    setActiveOrderTab('menu');
  };

  // Action: Add Product to Table's Order
  const handleAddToOrder = (product) => {
    if (!activeTable) {
      addToast('Select a table first', 'warning');
      return;
    }

    // Check linked raw materials stock
    const currentQtyInOrder = activeTable.currentOrder.find(item => item.productId === product.id)?.quantity || 0;
    
    if (product.inventoryId) {
      const rawItem = inventory.find(i => i.id === product.inventoryId);
      if (rawItem) {
        const requiredStock = (currentQtyInOrder + 1) * (product.inventoryQty || 1);
        if (Number(rawItem.stock) < requiredStock) {
          addToast(`Cannot add. Not enough ${rawItem.name} in stock (${rawItem.stock} left).`, 'error');
          return;
        }
      }
    }

    const updatedTables = tables.map(t => {
      if (t.id === activeTable.id) {
        const order = [...t.currentOrder];
        const existingIndex = order.findIndex(item => item.productId === product.id);
        
        if (existingIndex > -1) {
          order[existingIndex].quantity += 1;
        } else {
          order.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
          });
        }
        
        // Recalculate bill status
        const subtotal = order.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
          ...t,
          status: 'live',
          currentOrder: order,
          billTotal: subtotal,
          orderedBy: t.orderedBy || (currentUser ? currentUser.name : 'System')
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);
  };

  // Action: Adjust Quantity in Order
  const handleAdjustQuantity = (productId, delta) => {
    const product = menu.find(p => p.id === productId);
    if (!product) return;

    const updatedTables = tables.map(t => {
      if (t.id === activeTable.id) {
        let order = [...t.currentOrder];
        const index = order.findIndex(item => item.productId === productId);
        
        if (index > -1) {
          const newQty = order[index].quantity + delta;
          if (newQty <= 0) {
            order.splice(index, 1);
          } else {
            // Check inventory stock limits for increments
            if (delta > 0 && product.inventoryId) {
              const rawItem = inventory.find(i => i.id === product.inventoryId);
              if (rawItem) {
                const requiredStock = newQty * (product.inventoryQty || 1);
                if (Number(rawItem.stock) < requiredStock) {
                  addToast(`Cannot increase. Stock limit of ${rawItem.name} reached.`, 'error');
                  return t;
                }
              }
            }
            order[index].quantity = newQty;
          }
        }

         const subtotal = order.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
          ...t,
          status: order.length === 0 ? 'empty' : 'live',
          currentOrder: order,
          billTotal: subtotal,
          orderedBy: order.length === 0 ? null : (t.orderedBy || (currentUser ? currentUser.name : 'System'))
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);
  };

  // Action: Clear whole table order
  const handleClearOrder = () => {
    if (!activeTable) return;
    if (confirm('Clear entire order for this table?')) {
      const updatedTables = tables.map(t => {
        if (t.id === activeTable.id) {
          return {
            ...t,
            status: 'empty',
            currentOrder: [],
            billTotal: 0,
            discount: 0,
            tax: 0,
            orderedBy: null
          };
        }
        return t;
      });
      onUpdateTables(updatedTables);
      addToast('Order cleared');
    }
  };

  // Tax profile details builder
  const getTaxDetails = (type, taxable) => {
    switch(type) {
      case 'GST_5':
        return { label: 'GST 5% (2.5% CGST + 2.5% SGST)', rate: 5, breakdown: [
          { label: 'CGST (2.5%)', amount: (taxable * 2.5) / 100 },
          { label: 'SGST (2.5%)', amount: (taxable * 2.5) / 100 }
        ]};
      case 'GST_12':
        return { label: 'GST 12% (6% CGST + 6% SGST)', rate: 12, breakdown: [
          { label: 'CGST (6.0%)', amount: (taxable * 6.0) / 100 },
          { label: 'SGST (6.0%)', amount: (taxable * 6.0) / 100 }
        ]};
      case 'GST_18':
        return { label: 'GST 18% (9% CGST + 9% SGST)', rate: 18, breakdown: [
          { label: 'CGST (9.0%)', amount: (taxable * 9.0) / 100 },
          { label: 'SGST (9.0%)', amount: (taxable * 9.0) / 100 }
        ]};
      case 'VAT_10':
        return { label: 'VAT 10%', rate: 10, breakdown: [
          { label: 'VAT (10%)', amount: (taxable * 10) / 100 }
        ]};
      default:
        return { label: 'No Tax', rate: 0, breakdown: [] };
    }
  };

  // Calculations for active order totals
  const subtotal = activeTable?.currentOrder.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  
  const taxDetails = getTaxDetails(taxType, taxableAmount);
  const taxAmount = (taxableAmount * taxDetails.rate) / 100;
  const finalTotal = taxableAmount + taxAmount;

  // Action: Click Checkout
  const handleCheckoutClick = () => {
    if (!activeTable || activeTable.currentOrder.length === 0) return;

    const userRole = (currentUser?.role || '').toLowerCase().trim();
    const hasPrivilege = userRole === 'manager' || userRole === 'cashier';
    if (!hasPrivilege) {
      addToast('Permission Denied: Only Cashiers and Managers can checkout bills.', 'error');
      return;
    }

    setDiscountPercent(activeTable.discount || 0);
    setTaxType(activeTable.taxType || 'GST_5');
    setPaymentMethod('Cash');
    setSplitCashAmount(0);
    setSplitUpiAmount(0);
    setShowPaymentModal(true);
  };

  // Action: Complete Payment and close bill
  const handleCompletePayment = () => {
    if (!activeTable) return;

    // 1. Decrement raw inventory quantities based on order consumption
    const updatedInventory = inventory.map(invItem => {
      let totalQtyToDeduct = 0;
      
      activeTable.currentOrder.forEach(orderedItem => {
        const menuItem = menu.find(m => m.id === orderedItem.productId);
        if (menuItem && menuItem.inventoryId === invItem.id) {
          totalQtyToDeduct += orderedItem.quantity * (menuItem.inventoryQty || 1);
        }
      });
      
      if (totalQtyToDeduct > 0) {
        return {
          ...invItem,
          stock: Math.max(0, Number((Number(invItem.stock) - totalQtyToDeduct).toFixed(3)))
        };
      }
      return invItem;
    });

    // 2. Create Sale Record (tracking active cashier user)
    const saleId = `TXN-${Date.now().toString().slice(-6)}`;
    const finalPaymentMethod = paymentMethod === 'Split'
      ? `Split (Cash: ₹${splitCashAmount.toFixed(2)}, UPI: ₹${splitUpiAmount.toFixed(2)})`
      : paymentMethod;

    const newSale = {
      id: saleId,
      timestamp: new Date().toISOString(),
      tableName: activeTable.name,
      items: activeTable.currentOrder.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: subtotal,
      discount: discountPercent,
      taxType: taxType,
      taxRate: taxDetails.rate,
      taxAmount: taxAmount,
      taxBreakdown: taxDetails.breakdown,
      total: finalTotal,
      paymentMethod: finalPaymentMethod,
      cashier: currentUser ? currentUser.name : 'Admin',
      server_name: activeTable.orderedBy || (currentUser ? currentUser.name : 'System'),
      whatsappNumber: whatsappNumber || ''
    };

    // 3. Reset the Table Status
    const updatedTables = tables.map(t => {
      if (t.id === activeTable.id) {
        return {
          ...t,
          status: 'empty',
          currentOrder: [],
          billTotal: 0,
          discount: 0,
          taxType: 'GST_5',
          tax: 0,
          orderedBy: null
        };
      }
      return t;
    });

    onUpdateInventory(updatedInventory);
    onUpdateTables(updatedTables);
    onAddSale(newSale);

    // Save state for receipt printing
    setReceiptData(newSale);
    setShowPaymentModal(false);
    setShowReceiptModal(true);
    setSplitCashAmount(0);
    setSplitUpiAmount(0);

    addToast(`Bill closed for ${activeTable.name}. Transaction saved!`);
  };

  // Action: Save intermediate Bill details (billed stage before final checkout)
  const handleMarkBilled = () => {
    if (!activeTable) return;
    const updatedTables = tables.map(t => {
      if (t.id === activeTable.id) {
        return {
          ...t,
          status: 'billed',
          discount: discountPercent,
          taxType: taxType,
          tax: taxDetails.rate
        };
      }
      return t;
    });
    onUpdateTables(updatedTables);
    addToast(`${activeTable.name} marked as billed`);
  };

  // Receipt printable trigger
  const handlePrint = () => {
    window.print();
  };

  const generateReceiptImageBlob = (data) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const storeName = restaurantName || 'PortablePOS';
      
      const width = 400;
      const itemHeight = 25;
      const headerHeight = 180;
      const footerHeight = 180;
      const height = headerHeight + (data.items.length * itemHeight) + footerHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Text color & settings
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      
      // Header
      ctx.font = 'bold 20px monospace';
      ctx.fillText(storeName.toUpperCase(), width / 2, 45);
      
      ctx.font = '12px monospace';
      ctx.fillText('OFFLINE RECEIPT', width / 2, 65);
      
      ctx.textAlign = 'left';
      ctx.font = '12px monospace';
      let y = 95;
      ctx.fillText(`Bill ID: ${data.id}`, 20, y); y += 20;
      ctx.fillText(`Date: ${new Date(data.timestamp).toLocaleDateString()}`, 20, y); y += 20;
      ctx.fillText(`Time: ${new Date(data.timestamp).toLocaleTimeString()}`, 20, y); y += 20;
      ctx.fillText(`Table: ${data.tableName}`, 20, y); y += 20;
      ctx.fillText(`Server: ${data.server_name || 'System'}`, 20, y); y += 20;
      ctx.fillText(`Cashier: ${data.cashier || 'Admin'}`, 20, y); y += 20;
      
      ctx.fillText('------------------------------------------', 20, y); y += 20;
      
      // Column headers
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Item Description', 20, y);
      ctx.textAlign = 'right';
      ctx.fillText('Amount', width - 20, y);
      ctx.textAlign = 'left';
      ctx.font = '12px monospace';
      y += 20;
      ctx.fillText('------------------------------------------', 20, y); y += 20;
      
      // Items
      data.items.forEach(item => {
        ctx.fillText(`${item.name} x ${item.quantity}`, 20, y);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${(item.price * item.quantity).toFixed(2)}`, width - 20, y);
        ctx.textAlign = 'left';
        y += itemHeight;
      });
      
      ctx.fillText('------------------------------------------', 20, y); y += 20;
      
      // Totals
      ctx.fillText(`Subtotal:`, 20, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${data.subtotal.toFixed(2)}`, width - 20, y);
      ctx.textAlign = 'left';
      y += 20;
      
      if (data.discount > 0) {
        ctx.fillText(`Discount (${data.discount}%):`, 20, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-₹${((data.subtotal * data.discount) / 100).toFixed(2)}`, width - 20, y);
        ctx.textAlign = 'left';
        y += 20;
      }
      
      if (data.taxBreakdown && data.taxBreakdown.length > 0) {
        data.taxBreakdown.forEach(taxItem => {
          ctx.fillText(`${taxItem.label}:`, 20, y);
          ctx.textAlign = 'right';
          ctx.fillText(`₹${taxItem.amount.toFixed(2)}`, width - 20, y);
          ctx.textAlign = 'left';
          y += 20;
        });
      } else if (data.tax > 0) {
        ctx.fillText(`Tax (${data.tax}%):`, 20, y);
        ctx.textAlign = 'right';
        ctx.fillText(`₹${(((data.subtotal - (data.subtotal * data.discount) / 100) * data.tax) / 100).toFixed(2)}`, width - 20, y);
        ctx.textAlign = 'left';
        y += 20;
      }
      
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Grand Total:`, 20, y);
      ctx.textAlign = 'right';
      ctx.fillText(`₹${data.total.toFixed(2)}`, width - 20, y);
      ctx.textAlign = 'left';
      y += 30;
      
      ctx.textAlign = 'center';
      ctx.font = 'italic 12px monospace';
      ctx.fillText('Thank you for your visit!', width / 2, y); y += 20;
      ctx.fillText('Powered by PortablePOS', width / 2, y);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const handleDownloadReceiptImage = async () => {
    if (!receiptData) return;
    const blob = await generateReceiptImageBlob(receiptData);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bill-${receiptData.id}.png`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Receipt downloaded as PNG image');
  };

  const handleShareReceiptImage = async () => {
    if (!receiptData) return;
    try {
      const storeName = restaurantName || 'PortablePOS';
      const blob = await generateReceiptImageBlob(receiptData);
      const file = new File([blob], `Bill-${receiptData.id}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill ${receiptData.id}`,
          text: `Here is your e-bill from ${storeName} for ₹${receiptData.total.toFixed(2)}`
        });
        addToast('Shared successfully');
      } else {
        handleDownloadReceiptImage();
      }
    } catch (err) {
      console.error('Sharing failed:', err);
      handleDownloadReceiptImage();
    }
  };

  return (
    <div className="pos-layout">
      {/* Tables Grid View (Left side) */}
      <div className="tables-pane" style={{ display: mobileTab === 'tables' ? 'flex' : 'none', flex: 1 }}>
        <div className="filter-bar">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '18px' }}>Tables Map</span>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowAddTableModal(true)}>
              <PlusCircle size={16} /> Add Table
            </button>
          </div>
        </div>

        <div className="tables-grid">
          {tables.map(table => (
            <div
              key={table.id}
              className={`table-card ${table.status} ${selectedTable?.id === table.id ? 'active' : ''}`}
              onClick={() => handleSelectTable(table)}
            >
              {table.status === 'empty' && (
                <button 
                  className="close-btn" 
                  style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22 }}
                  onClick={(e) => handleDeleteTable(table.id, e)}
                >
                  ×
                </button>
              )}
              <div className="table-num">{table.name}</div>
              <div className="table-status">{table.status}</div>
              {table.status !== 'empty' && (
                <div className="table-amount">₹{(table.billTotal || 0).toFixed(2)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Ordering view controller */}
      {mobileTab === 'order' && (
        <div className="mobile-order-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setMobileTab('tables')} style={{ padding: '6px 12px' }}>
                <ArrowLeft size={16} /> Back to Map
              </button>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{activeTable?.name}</h3>
            </div>
            
            {/* Tab switch buttons */}
            <div className="order-toggle-tabs">
              <button 
                type="button"
                className={`filter-tab ${activeOrderTab === 'menu' ? 'active' : ''}`} 
                onClick={() => setActiveOrderTab('menu')}
              >
                Menu Catalog
              </button>
              <button 
                type="button"
                className={`filter-tab ${activeOrderTab === 'cart' ? 'active' : ''}`} 
                onClick={() => setActiveOrderTab('cart')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Cart
                {activeTable?.currentOrder.length > 0 && (
                  <span className="cart-count-badge">
                    {activeTable.currentOrder.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Menu and Ticket Overlay Split */}
      {activeTable ? (
        <div className={`pos-split ${mobileTab === 'order' ? 'mobile-show' : 'mobile-hide'}`}>
          {/* Catalog / Products (Menu selection) */}
          <div className={`catalog-pane ${activeOrderTab === 'menu' ? 'show-mobile' : 'hide-mobile'}`}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="input-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="categories-scroll">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="products-grid">
              {filteredProducts.map(prod => {
                const rawItem = prod.inventoryId ? inventory.find(i => i.id === prod.inventoryId) : null;
                const orderQty = activeTable.currentOrder.find(item => item.productId === prod.id)?.quantity || 0;
                
                let isOutOfStock = false;
                let stockLeftDisplay = 'Direct';
                let isLow = false;
                
                if (rawItem) {
                  const neededPerUnit = prod.inventoryQty || 1;
                  const availableUnits = Math.floor(Number(rawItem.stock) / neededPerUnit);
                  isOutOfStock = availableUnits <= 0;
                  isLow = Number(rawItem.stock) <= Number(rawItem.minStock);
                  stockLeftDisplay = `${availableUnits - orderQty} left`;
                }

                return (
                  <div
                    key={prod.id}
                    className="product-item-card"
                    onClick={() => !isOutOfStock && handleAddToOrder(prod)}
                    style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="product-item-name">{prod.name}</div>
                    <div className="product-item-bottom">
                      <span className="product-item-price">₹{prod.price}</span>
                      <span className={`product-item-stock ${isOutOfStock ? 'out' : isLow ? 'low' : ''}`}>
                        {isOutOfStock ? 'Out' : stockLeftDisplay}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket Pane (Order Summary / Checkout) */}
          <div className={`glass-panel ticket-pane ${activeOrderTab === 'cart' ? 'show-mobile' : 'hide-mobile'}`}>
            <div className="ticket-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} className="text-teal" />
                <span style={{ fontWeight: '600' }}>{activeTable.name} Bill</span>
              </div>
              <span className={`badge ${activeTable.status === 'billed' ? 'badge-coral' : 'badge-indigo'}`}>
                {activeTable.status}
              </span>
            </div>

            <div className="ticket-items">
              {activeTable.currentOrder.length === 0 ? (
                <div className="empty-ticket">
                  <ShoppingBag size={48} style={{ opacity: 0.2 }} />
                  <p>Add items from the menu to start drafting the bill.</p>
                </div>
              ) : (
                activeTable.currentOrder.map(item => (
                  <div key={item.productId} className="ticket-item">
                    <div className="ticket-item-info">
                      <div className="ticket-item-name">{item.name}</div>
                      <div className="ticket-item-sub">₹{item.price} each</div>
                    </div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => handleAdjustQuantity(item.productId, -1)}>
                        <Minus size={12} />
                      </button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => handleAdjustQuantity(item.productId, 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="ticket-item-price">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {activeTable.currentOrder.length > 0 && (
              <>
                <div className="ticket-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {activeTable.status === 'billed' && (
                    <>
                      <div className="summary-row">
                        <span>Discount ({activeTable.discount || 0}%)</span>
                        <span>-₹{((subtotal * (activeTable.discount || 0)) / 100).toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Tax ({activeTable.tax || 5}%)</span>
                        <span>₹{(((subtotal - (subtotal * (activeTable.discount || 0)) / 100) * (activeTable.tax || 5)) / 100).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>
                      ₹{activeTable.status === 'billed' 
                        ? (subtotal - (subtotal * activeTable.discount)/100 + ((subtotal - (subtotal * activeTable.discount)/100)*activeTable.tax)/100).toFixed(2)
                        : subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="ticket-actions">
                  <button className="btn btn-secondary" onClick={handleClearOrder}>
                    <Trash2 size={16} /> Reset
                  </button>
                  {activeTable.status === 'billed' ? (
                    <button className="btn btn-primary" onClick={handleCheckoutClick}>
                      <Check size={16} /> Pay & Close
                    </button>
                  ) : (
                    <button className="btn btn-accent" onClick={handleCheckoutClick}>
                      <Receipt size={16} /> Bill Table
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: window.innerWidth > 900 ? 'flex' : 'none', flex: 1, alignItems: 'center', justifyItems: 'center', height: '100%' }}>
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', margin: 'auto', maxWidth: '400px' }}>
            <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3>No Table Selected</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
              Select a dining table from the map layout on the left to begin drafting order bills.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Add New Table */}
      {showAddTableModal && (
        <div className="overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2>Add New Table</h2>
              <button className="close-btn" onClick={() => setShowAddTableModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Table Name/No.</label>
                <input
                  type="text"
                  placeholder="e.g. Table 15 or Balcony 2"
                  className="input-field"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddTableModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTable}>Create Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Checkout / Billing Details */}
      {showPaymentModal && (
        <div className="overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Billing Calculations</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Item Subtotal:</span>
                  <span style={{ fontWeight: '600' }}>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                  />
                </div>
                <div className="form-group">
                  <label>Tax Structure</label>
                  <select 
                    className="input-field select-field"
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value)}
                  >
                    <option value="GST_5">GST 5% (2.5% CGST + 2.5% SGST)</option>
                    <option value="GST_12">GST 12% (6% CGST + 6% SGST)</option>
                    <option value="GST_18">GST 18% (9% CGST + 9% SGST)</option>
                    <option value="VAT_10">VAT 10%</option>
                    <option value="NONE">No Tax</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select 
                  className="input-field select-field" 
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value === 'Split') {
                      setSplitCashAmount(finalTotal);
                      setSplitUpiAmount(0);
                    }
                  }}
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI/Online</option>
                  <option value="Card">💳 Card</option>
                  <option value="Split">🔀 Split (Cash + UPI)</option>
                </select>
              </div>

              {paymentMethod === 'Split' && (
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Cash Portion (₹)</label>
                      <input
                        type="number"
                        min="0"
                        max={finalTotal}
                        step="0.01"
                        className="input-field"
                        value={splitCashAmount}
                        onChange={(e) => {
                          const cashVal = Math.max(0, Math.min(finalTotal, parseFloat(e.target.value) || 0));
                          setSplitCashAmount(cashVal);
                          setSplitUpiAmount(Number((finalTotal - cashVal).toFixed(2)));
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>UPI / GPay Portion (₹)</label>
                      <input
                        type="number"
                        min="0"
                        max={finalTotal}
                        step="0.01"
                        className="input-field"
                        value={splitUpiAmount}
                        onChange={(e) => {
                          const upiVal = Math.max(0, Math.min(finalTotal, parseFloat(e.target.value) || 0));
                          setSplitUpiAmount(upiVal);
                          setSplitCashAmount(Number((finalTotal - upiVal).toFixed(2)));
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Split: ₹{splitCashAmount.toFixed(2)} (Cash) + ₹{splitUpiAmount.toFixed(2)} (UPI) = ₹{finalTotal.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="form-group">
                <label>WhatsApp Number (Optional)</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="e.g. 919876543210 (with country code)"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Provide customer's WhatsApp number to share this e-bill.
                </span>
              </div>

              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>Grand Payable:</span>
                <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-teal)' }}>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  handleMarkBilled();
                  setShowPaymentModal(false);
                }}
              >
                Draft Bill
              </button>
              <button className="btn btn-primary" onClick={handleCompletePayment}>
                Pay & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receipt Preview & Printing */}
      {showReceiptModal && receiptData && (
        <div className="overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', background: 'var(--bg-secondary)' }}>
            <div className="modal-header">
              <h2>Receipt Generated</h2>
              <button className="close-btn" onClick={() => setShowReceiptModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="receipt-preview">
                <div className="receipt-header">
                  <h3>{(restaurantName || 'PortablePOS').toUpperCase()}</h3>
                  <p>Date: {new Date(receiptData.timestamp).toLocaleDateString()}</p>
                  <p>Time: {new Date(receiptData.timestamp).toLocaleTimeString()}</p>
                  <p>Bill ID: {receiptData.id}</p>
                  <p>Table: {receiptData.tableName}</p>
                  <p>Server: {receiptData.server_name || 'System'} | Cashier: {receiptData.cashier || 'Admin'}</p>
                </div>
                
                <div className="receipt-items">
                  {receiptData.items.map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <span>{item.name} x {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="receipt-totals">
                  <div className="receipt-total-row">
                    <span>Subtotal:</span>
                    <span>₹{receiptData.subtotal.toFixed(2)}</span>
                  </div>
                  {receiptData.discount > 0 && (
                    <div className="receipt-total-row">
                      <span>Discount ({receiptData.discount}%):</span>
                      <span>-₹{((receiptData.subtotal * receiptData.discount) / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {receiptData.taxBreakdown && receiptData.taxBreakdown.length > 0 ? (
                    receiptData.taxBreakdown.map((taxItem, idx) => (
                      <div key={idx} className="receipt-total-row">
                        <span>{taxItem.label}:</span>
                        <span>₹{taxItem.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    receiptData.tax > 0 && (
                      <div className="receipt-total-row">
                        <span>Tax ({receiptData.tax}%):</span>
                        <span>₹{(((receiptData.subtotal - (receiptData.subtotal * receiptData.discount) / 100) * receiptData.tax) / 100).toFixed(2)}</span>
                      </div>
                    )
                  )}
                  <div className="receipt-total-row grand">
                    <span>Paid Total ({receiptData.paymentMethod}):</span>
                    <span>₹{receiptData.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="receipt-footer">
                  <p>Thank You For Your Visit!</p>
                  <p>{restaurantName || 'PortablePOS'}</p>
                </div>
              </div>

              {/* WhatsApp E-bill Sharing Box */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-emerald)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💚 Send E-Bill via WhatsApp
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="e.g. 919876543210"
                    value={whatsappNumber || receiptData.whatsappNumber || ''}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                    style={{ flex: 1, height: '38px', background: 'rgba(0,0,0,0.2)' }}
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      const phoneNum = whatsappNumber || receiptData.whatsappNumber;
                      if (!phoneNum) {
                        addToast('Please enter a WhatsApp number', 'warning');
                        return;
                      }
                      const cleanPhone = phoneNum.replace(/\D/g, '');
                      const itemsText = receiptData.items.map(item => `${item.name} x ${item.quantity} : ₹${(item.price * item.quantity).toFixed(2)}`).join('\n');
                      const discountText = receiptData.discount > 0 ? `Discount (${receiptData.discount}%): -₹${((receiptData.subtotal * receiptData.discount) / 100).toFixed(2)}\n` : '';
                      let taxText = '';
                      if (receiptData.taxBreakdown && receiptData.taxBreakdown.length > 0) {
                        taxText = receiptData.taxBreakdown.map(taxItem => `${taxItem.label}: ₹${taxItem.amount.toFixed(2)}`).join('\n') + '\n';
                      } else if (receiptData.tax > 0) {
                        taxText = `Tax (${receiptData.tax}%): ₹${(((receiptData.subtotal - (receiptData.subtotal * receiptData.discount) / 100) * receiptData.tax) / 100).toFixed(2)}\n`;
                      }
                      const storeName = restaurantName || 'PortablePOS';
                      const message = `*--- ${storeName.toUpperCase()} E-BILL ---*\n*Bill ID:* ${receiptData.id}\n*Date:* ${new Date(receiptData.timestamp).toLocaleDateString()}\n*Time:* ${new Date(receiptData.timestamp).toLocaleTimeString()}\n*Table:* ${receiptData.tableName}\n-------------------------------------\n${itemsText}\n-------------------------------------\n*Subtotal:* ₹${receiptData.subtotal.toFixed(2)}\n${discountText}${taxText}*Grand Total:* ₹${receiptData.total.toFixed(2)}\n*Payment:* ${receiptData.paymentMethod}\n*Server:* ${receiptData.server_name || 'System'}\n*Cashier:* ${receiptData.cashier || 'Admin'}\n-------------------------------------\nThank you for your visit!\nPowered by ${storeName}.`;

                      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
                      window.open(url, '_blank');
                      addToast('Redirecting to WhatsApp...');
                    }}
                    style={{ height: '38px', padding: '0 16px', background: 'var(--accent-emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
            <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                <button className="btn btn-secondary" onClick={() => handleDownloadReceiptImage()}>
                  💾 Save Bill Image
                </button>
                {navigator.share && (
                  <button className="btn btn-secondary" onClick={() => handleShareReceiptImage()}>
                    📤 Share Bill Image
                  </button>
                )}
                <button className="btn btn-secondary" onClick={handlePrint} style={{ gridColumn: navigator.share ? 'span 2' : 'span 1' }}>
                  🖨️ Print Receipt
                </button>
              </div>
              <button className="btn btn-primary btn-full" onClick={() => { setShowReceiptModal(false); setWhatsappNumber(''); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
