// Shared tax profile calculator used by the POS billing screen and the
// Reports bill-editing flow, so both compute totals identically.
export function getTaxDetails(type, taxableAmount) {
  switch (type) {
    case 'GST_5':
      return { label: 'GST 5% (2.5% CGST + 2.5% SGST)', rate: 5, breakdown: [
        { label: 'CGST (2.5%)', amount: (taxableAmount * 2.5) / 100 },
        { label: 'SGST (2.5%)', amount: (taxableAmount * 2.5) / 100 }
      ]};
    case 'GST_12':
      return { label: 'GST 12% (6% CGST + 6% SGST)', rate: 12, breakdown: [
        { label: 'CGST (6.0%)', amount: (taxableAmount * 6.0) / 100 },
        { label: 'SGST (6.0%)', amount: (taxableAmount * 6.0) / 100 }
      ]};
    case 'GST_18':
      return { label: 'GST 18% (9% CGST + 9% SGST)', rate: 18, breakdown: [
        { label: 'CGST (9.0%)', amount: (taxableAmount * 9.0) / 100 },
        { label: 'SGST (9.0%)', amount: (taxableAmount * 9.0) / 100 }
      ]};
    case 'VAT_10':
      return { label: 'VAT 10%', rate: 10, breakdown: [
        { label: 'VAT (10%)', amount: (taxableAmount * 10) / 100 }
      ]};
    default:
      return { label: 'No Tax', rate: 0, breakdown: [] };
  }
}
