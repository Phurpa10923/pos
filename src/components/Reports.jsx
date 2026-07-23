import React, { useState, useEffect } from 'react';
import { dbFetchSalesByRange } from '../cloudDb';
import { Calendar, Download, RefreshCw, BarChart2, TrendingUp, PieChart, IndianRupee } from 'lucide-react';

export default function Reports({
  sales = [],
  menu = [],
  inventory = [],
  attendance = [],
  addToast,
  onSeedSales,
  restaurantName = ''
}) {
  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportSales, setReportSales] = useState([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Fetch report data on demand directly from Supabase for the selected range
  useEffect(() => {
    async function fetchReportData() {
      setIsLoadingReport(true);
      try {
        let start, end;
        if (reportType === 'daily') {
          start = `${selectedDate}T00:00:00.000Z`;
          end = `${selectedDate}T23:59:59.999Z`;
        } else {
          // get start and end of selected month (YYYY-MM)
          start = `${selectedMonth}-01T00:00:00.000Z`;
          // find last day of the month
          const year = parseInt(selectedMonth.split('-')[0]);
          const month = parseInt(selectedMonth.split('-')[1]);
          const lastDay = new Date(year, month, 0).getDate();
          end = `${selectedMonth}-${lastDay}T23:59:59.999Z`;
        }
        const data = await dbFetchSalesByRange(start, end);
        setReportSales(data);
      } catch (err) {
        console.error('Failed to fetch sales by date range:', err);
        addToast(`Failed to load report data: ${err.message}`, 'error');
      } finally {
        setIsLoadingReport(false);
      }
    }
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, selectedDate, selectedMonth, sales]);

  // Helper date parsing
  const getDailySales = () => reportSales.filter(s => s.timestamp.startsWith(selectedDate));
  
  const getMonthlySales = () => reportSales.filter(s => s.timestamp.startsWith(selectedMonth));

  const currentPeriodSales = reportType === 'daily' ? getDailySales() : getMonthlySales();

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

  // Metrics Calculations
  const totalSalesCount = currentPeriodSales.length;
  const totalRevenue = currentPeriodSales.reduce((sum, s) => sum + s.total, 0);

  // Calculate Profit (Sale price - Cost price of raw materials)
  const totalProfit = currentPeriodSales.reduce((sum, sale) => {
    const saleProfit = sale.items.reduce((itemSum, item) => {
      const menuItem = menu.find(m => m.id === item.productId);
      let cost = 0;
      
      if (menuItem && menuItem.inventoryId) {
        const invItem = inventory.find(inv => inv.id === menuItem.inventoryId);
        if (invItem) {
          cost = (invItem.costPrice || 0) * (menuItem.inventoryQty || 1);
        }
      }
      
      const profitPerUnit = item.price - cost;
      return itemSum + (profitPerUnit * item.quantity);
    }, 0);
    // Subtract discounts proportionally from profit
    const discountRatio = sale.subtotal > 0 ? (sale.subtotal - (sale.subtotal * sale.discount / 100)) / sale.subtotal : 1;
    return sum + (saleProfit * discountRatio);
  }, 0);

  // Payment Breakdown
  const paymentBreakdown = currentPeriodSales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, { Cash: 0, Card: 0, UPI: 0 });

  // Items sold counting
  const itemsSold = currentPeriodSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {});

  const sortedItemsSold = Object.entries(itemsSold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Detailed itemized daily/monthly report calculation
  const itemizedSales = currentPeriodSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      const existing = acc[item.productId];
      const menuItem = menu.find(m => m.id === item.productId);
      
      let costPerUnit = 0;
      if (menuItem && menuItem.inventoryId) {
        const invItem = inventory.find(inv => inv.id === menuItem.inventoryId);
        if (invItem) {
          costPerUnit = (invItem.costPrice || 0) * (menuItem.inventoryQty || 1);
        }
      }
      
      const totalRevenue = item.price * item.quantity;
      const totalCost = costPerUnit * item.quantity;
      const totalProfit = totalRevenue - totalCost;

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += totalRevenue;
        existing.cost += totalCost;
        existing.profit += totalProfit;
      } else {
        acc[item.productId] = {
          productId: item.productId,
          name: item.name,
          category: menuItem ? menuItem.category : 'N/A',
          price: item.price,
          quantity: item.quantity,
          revenue: totalRevenue,
          cost: totalCost,
          profit: totalProfit
        };
      }
    });
    return acc;
  }, {});

  const itemizedSalesList = Object.values(itemizedSales).sort((a, b) => b.revenue - a.revenue);

  // Seed Mock Sales (Last 30 Days)
  const handleSeedSalesHistory = () => {
    const mockSales = [];
    const now = new Date();
    
    // Seed sample menu catalog if empty
    if (menu.length === 0) {
      addToast('Please seed or add menu items first', 'warning');
      return;
    }

    const payMethods = ['Cash', 'Card', 'UPI'];
    
    // Generate sales for last 30 days
    for (let d = 30; d >= 0; d--) {
      const tempDate = new Date();
      tempDate.setDate(now.getDate() - d);
      const dateStr = tempDate.toISOString().split('T')[0];

      // Random number of sales per day (5 to 15)
      const dailyTxn = 5 + Math.floor(Math.random() * 10);
      for (let t = 0; t < dailyTxn; t++) {
        // Random time
        const hour = 9 + Math.floor(Math.random() * 13);
        const min = Math.floor(Math.random() * 60);
        const timestamp = `${dateStr}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00.000Z`;

        // Select 1 to 3 random items
        const itemCount = 1 + Math.floor(Math.random() * 3);
        const selectedItems = [];
        let subtotal = 0;

        for (let i = 0; i < itemCount; i++) {
          const randomProd = menu[Math.floor(Math.random() * menu.length)];
          const qty = 1 + Math.floor(Math.random() * 2);
          
          if (!selectedItems.some(x => x.productId === randomProd.id)) {
            selectedItems.push({
              productId: randomProd.id,
              name: randomProd.name,
              quantity: qty,
              price: randomProd.price
            });
            subtotal += randomProd.price * qty;
          }
        }

        const discount = Math.random() > 0.7 ? 10 : 0;
        const discAmt = (subtotal * discount) / 100;
        const taxable = subtotal - discAmt;
        
        // Seed with varied tax structures
        const taxChoice = Math.random();
        let taxType = 'GST_5';
        let taxRate = 5;
        let taxBreakdown = [];
        
        if (taxChoice > 0.7) {
          taxType = 'GST_12';
          taxRate = 12;
          taxBreakdown = [
            { label: 'CGST (6.0%)', amount: (taxable * 6) / 100 },
            { label: 'SGST (6.0%)', amount: (taxable * 6) / 100 }
          ];
        } else if (taxChoice > 0.4) {
          taxType = 'GST_5';
          taxRate = 5;
          taxBreakdown = [
            { label: 'CGST (2.5%)', amount: (taxable * 2.5) / 100 },
            { label: 'SGST (2.5%)', amount: (taxable * 2.5) / 100 }
          ];
        } else if (taxChoice > 0.1) {
          taxType = 'VAT_10';
          taxRate = 10;
          taxBreakdown = [
            { label: 'VAT (10.0%)', amount: (taxable * 10) / 100 }
          ];
        } else {
          taxType = 'NONE';
          taxRate = 0;
          taxBreakdown = [];
        }

        const taxAmt = (taxable * taxRate) / 100;
        const total = taxable + taxAmt;

        const cashiers = ['Aarav Sharma', 'Neha Nair', 'Rohan Sen'];

        mockSales.push({
          id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp,
          tableName: `Table ${1 + Math.floor(Math.random() * 8)}`,
          items: selectedItems,
          subtotal,
          discount,
          taxType,
          taxRate,
          taxAmount: taxAmt,
          taxBreakdown,
          total,
          paymentMethod: payMethods[Math.floor(Math.random() * payMethods.length)],
          cashier: cashiers[Math.floor(Math.random() * cashiers.length)]
        });
      }
    }

    onSeedSales(mockSales);
    addToast('Mock sales history generated for the last 30 days!');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (currentPeriodSales.length === 0) {
      addToast('No transaction data to export', 'warning');
      return;
    }

    let csvContent = 'Transaction ID,Date,Table,Items,Subtotal (INR),Discount %,Tax Type,Tax Rate %,Tax Amount (INR),CGST (INR),SGST (INR),VAT (INR),Total (INR),Payment Method,Cashier\n';
    currentPeriodSales.forEach(s => {
      const itemSummary = s.items.map(i => `${i.name} (${i.quantity}x)`).join('; ');
      
      const taxRate = s.taxRate || s.tax || 0;
      const taxAmt = s.taxAmount || 0;
      
      let cgst = 0;
      let sgst = 0;
      let vat = 0;
      
      if (s.taxBreakdown && s.taxBreakdown.length > 0) {
        const cgstItem = s.taxBreakdown.find(b => b.label.includes('CGST'));
        const sgstItem = s.taxBreakdown.find(b => b.label.includes('SGST'));
        const vatItem = s.taxBreakdown.find(b => b.label.includes('VAT'));
        if (cgstItem) cgst = cgstItem.amount;
        if (sgstItem) sgst = sgstItem.amount;
        if (vatItem) vat = vatItem.amount;
      } else if (taxRate > 0) {
        if (taxRate === 5) {
          cgst = taxAmt / 2;
          sgst = taxAmt / 2;
        } else {
          vat = taxAmt;
        }
      }
      
      csvContent += `${s.id},"${new Date(s.timestamp).toLocaleString()}",${s.tableName},"${itemSummary}",${s.subtotal},${s.discount},${s.taxType || 'N/A'},${taxRate},${taxAmt.toFixed(2)},${cgst.toFixed(2)},${sgst.toFixed(2)},${vat.toFixed(2)},${s.total.toFixed(2)},${s.paymentMethod},"${s.cashier || 'Admin'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AuraPOS_Report_${reportType === 'daily' ? selectedDate : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report CSV exported');
  };

  // Export Excel
  const handleExportExcel = () => {
    if (currentPeriodSales.length === 0) {
      addToast('No transaction data to export', 'warning');
      return;
    }

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>AuraPOS Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          .number { text-align: right; }
          h2, h3 { font-family: sans-serif; color: #1e293b; }
        </style>
      </head>
      <body>
        <h2>AuraPOS - ${reportType === 'daily' ? 'Daily' : 'Monthly'} Sales Report</h2>
        <p><strong>Report Period:</strong> ${reportType === 'daily' ? selectedDate : selectedMonth}</p>
        <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>
        <br/>
        
        <h3>Summary Metrics</h3>
        <table>
          <tr>
            <th>Total Transactions</th>
            <th>Gross Revenue (₹)</th>
            <th>Estimated Net Profit (₹)</th>
            <th>Average Ticket (₹)</th>
          </tr>
          <tr>
            <td>${totalSalesCount}</td>
            <td>${totalRevenue.toFixed(2)}</td>
            <td>${totalProfit.toFixed(2)}</td>
            <td>${totalSalesCount > 0 ? (totalRevenue / totalSalesCount).toFixed(2) : '0.00'}</td>
          </tr>
        </table>
        
        <h3>Itemized Sales Report</h3>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Quantity Sold</th>
              <th>Price per Unit (₹)</th>
              <th>Gross Revenue (₹)</th>
              <th>Cost Price (₹)</th>
              <th>Net Profit (₹)</th>
            </tr>
          </thead>
          <tbody>
    `;

    itemizedSalesList.forEach(item => {
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td class="number">${item.quantity}</td>
          <td class="number">${item.price.toFixed(2)}</td>
          <td class="number">${item.revenue.toFixed(2)}</td>
          <td class="number">${item.cost.toFixed(2)}</td>
          <td class="number" style="color: ${item.profit >= 0 ? '#10b981' : '#ef4444'}">${item.profit.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <h3>Transaction Details</h3>
        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Date & Time</th>
              <th>Table</th>
              <th>Items Sold</th>
              <th>Subtotal (₹)</th>
              <th>Discount %</th>
              <th>Tax Type</th>
              <th>Tax Amount (₹)</th>
              <th>Total (₹)</th>
              <th>Payment Method</th>
              <th>Cashier</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    currentPeriodSales.forEach(s => {
      const itemSummary = s.items.map(i => `${i.name} (${i.quantity}x)`).join('; ');
      const taxRate = s.taxRate || s.tax || 0;
      const taxAmt = s.taxAmount || 0;
      html += `
        <tr>
          <td>${s.id}</td>
          <td>${new Date(s.timestamp).toLocaleString()}</td>
          <td>${s.tableName}</td>
          <td>${itemSummary}</td>
          <td class="number">${s.subtotal.toFixed(2)}</td>
          <td class="number">${s.discount}%</td>
          <td>${s.taxType || 'N/A'} (${taxRate}%)</td>
          <td class="number">${taxAmt.toFixed(2)}</td>
          <td class="number">${s.total.toFixed(2)}</td>
          <td>${s.paymentMethod}</td>
          <td>${s.cashier || 'Admin'}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        
        <h3>Payment Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    Object.entries(paymentBreakdown).forEach(([method, amount]) => {
      html += `
        <tr>
          <td>${method}</td>
          <td class="number">${amount.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AuraPOS_Report_${reportType === 'daily' ? selectedDate : selectedMonth}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report Excel exported');
  };

  // --- SVG Trend Line Graph for Monthly Mode ---
  // Groups monthly sales by date
  const getMonthlySalesByDay = () => {
    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const dailyRevenueMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyRevenueMap[i] = 0;
    }

    getMonthlySales().forEach(s => {
      const dateNum = new Date(s.timestamp).getDate();
      dailyRevenueMap[dateNum] += s.total;
    });

    return Object.entries(dailyRevenueMap).map(([day, total]) => ({
      day: parseInt(day),
      revenue: total
    }));
  };

  const chartData = getMonthlySalesByDay();
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1000); // minimum scale limit
  const height = 150;
  const width = 500;
  const paddingX = 40;
  const paddingY = 20;

  // Calculate points
  const points = chartData.map(d => {
    const x = paddingX + ((d.day - 1) / (chartData.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.revenue / maxRevenue) * (height - paddingY * 2);
    return `${x},${y}`;
  }).join(' ');

  // Area points (for gradient under line)
  const areaPoints = chartData.length > 0 
    ? `${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Selection Control Panel */}
      <div className="glass-panel reports-top-bar" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${reportType === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('daily')}
          >
            Daily / EOD
          </button>
          <button 
            className={`btn ${reportType === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('monthly')}
          >
            Monthly
          </button>
        </div>

        <div className="report-header-actions">
          {reportType === 'daily' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="date"
                className="input-reset"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="month"
                className="input-reset"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
              />
            </div>
          )}

          {isLoadingReport && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <RefreshCw size={13} className="spin-icon" /> Loading…
            </span>
          )}

          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          
          <button className="btn btn-primary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Export Excel
          </button>

          {sales.length === 0 && (
            <button className="btn btn-accent" onClick={handleSeedSalesHistory}>
              <RefreshCw size={14} /> Seed 30-Day Sales
            </button>
          )}
        </div>
      </div>

      {/* Reports Metrics Summary */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Period Transactions</h3>
            <p>{totalSalesCount}</p>
          </div>
          <div className="stat-icon indigo">
            <BarChart2 size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Gross Revenue</h3>
            <p>₹{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="stat-icon teal">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Estimated Net Profit</h3>
            <p style={{ color: totalProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
              ₹{totalProfit.toFixed(2)}
            </p>
          </div>
          <div className="stat-icon emerald">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <h3>Average Ticket</h3>
            <p>₹{totalSalesCount > 0 ? (totalRevenue / totalSalesCount).toFixed(2) : '0.00'}</p>
          </div>
          <div className="stat-icon coral">
            <PieChart size={24} />
          </div>
        </div>
      </div>

      {/* Graphical Insights */}
      {reportType === 'monthly' && currentPeriodSales.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>
            <TrendingUp size={18} className="text-teal" />
            Revenue Trend Overview (₹)
          </h3>
          <div className="chart-container">
            <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} className="chart-grid-line" />
              <line x1={paddingX} y1={(height - paddingY * 2) / 2 + paddingY} x2={width - paddingX} y2={(height - paddingY * 2) / 2 + paddingY} className="chart-grid-line" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="chart-axis-line" />

              {/* Chart Line & Area */}
              {areaPoints && <polygon points={areaPoints} className="chart-area" />}
              {points && <polyline points={points} className="chart-line" />}

              {/* Data Dot Indicators */}
              {chartData.filter(d => d.revenue > 0).map((d, index) => {
                const x = paddingX + ((d.day - 1) / (chartData.length - 1)) * (width - paddingX * 2);
                const y = height - paddingY - (d.revenue / maxRevenue) * (height - paddingY * 2);
                return (
                  <g key={index}>
                    <circle cx={x} cy={y} r="4" className="chart-dot" />
                    <title>Day {d.day}: ₹{d.revenue.toFixed(2)}</title>
                  </g>
                );
              })}

              {/* Axis Labels */}
              <text x={paddingX} y={height - 6} className="chart-text" textAnchor="middle">1st</text>
              <text x={width / 2} y={height - 6} className="chart-text" textAnchor="middle">15th</text>
              <text x={width - paddingX} y={height - 6} className="chart-text" textAnchor="middle">{chartData.length}th</text>

              <text x={paddingX - 10} y={paddingY + 4} className="chart-text" textAnchor="end">₹{maxRevenue.toFixed(0)}</text>
              <text x={paddingX - 10} y={height - paddingY} className="chart-text" textAnchor="end">0</text>
            </svg>
          </div>
        </div>
      )}

      {/* Details Row: Item breakdown & Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
        
        {/* Top Items & Payment Splits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Payment splits */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Payment Split</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(paymentBreakdown).map(([method, amount]) => {
                const percent = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                return (
                  <div key={method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>
                        {method === 'Cash' ? '💵 Cash' : method === 'Card' ? '💳 Card' : '📱 UPI/Online'}
                      </span>
                      <span>₹{amount.toFixed(2)} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          background: method === 'Cash' ? 'var(--accent-teal)' : method === 'Card' ? 'var(--accent-indigo)' : 'var(--accent-emerald)', 
                          width: `${percent}%`, 
                          height: '100%' 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Top Selling Items</h3>
            {sortedItemsSold.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>No items sold in this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedItemsSold.map(([name, qty]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{name}</span>
                    <span className="badge badge-teal">{qty} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transactions list */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Transactions Log</h3>
          {currentPeriodSales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No completed orders recorded.</p>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Txn ID</th>
                    <th>Table</th>
                    <th>Method</th>
                    <th>Cashier</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPeriodSales.slice().reverse().map(sale => (
                    <tr key={sale.id} onClick={() => { setReceiptData(sale); setShowReceiptModal(true); }} style={{ cursor: 'pointer' }} title="Click to view full receipt">
                      <td style={{ fontWeight: '500' }}>{sale.id}</td>
                      <td>{sale.tableName}</td>
                      <td>
                        <span className={`badge ${sale.paymentMethod.startsWith('Cash') ? 'badge-teal' : sale.paymentMethod.includes('UPI') || sale.paymentMethod.includes('GPay') ? 'badge-emerald' : 'badge-indigo'}`}>
                          {sale.paymentMethod.length > 10 ? sale.paymentMethod.split(' ')[0] : sale.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ textTransform: 'none' }}>
                          {sale.cashier || 'Admin'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{sale.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Itemized Sales Report Table */}
      <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
        <h3 className="section-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Daily Itemized Sales Report Table</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Sorted by gross revenue
          </span>
        </h3>
        {itemizedSalesList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
            No sales recorded for this period.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Product / Item</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Price (₹)</th>
                  <th style={{ textAlign: 'right' }}>Gross Revenue (₹)</th>
                  <th style={{ textAlign: 'right' }}>Wholesale Cost (₹)</th>
                  <th style={{ textAlign: 'right' }}>Net Profit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {itemizedSalesList.map(item => (
                  <tr key={item.productId}>
                    <td style={{ fontWeight: '500' }}>{item.name}</td>
                    <td><span className="badge badge-muted">{item.category}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{item.revenue.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>₹{item.cost.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: item.profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-coral)' }}>
                      ₹{item.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {/* Modal: Receipt Preview & Printing */}
      {showReceiptModal && receiptData && (
        <div className="overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', background: 'var(--bg-secondary)', zIndex: 10001 }}>
            <div className="modal-header">
              <h2>Receipt Details</h2>
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
                <button className="btn btn-secondary" onClick={() => window.print()} style={{ gridColumn: navigator.share ? 'span 2' : 'span 1' }}>
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
    </div>
  );
}
