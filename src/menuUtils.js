// A menu item can consume multiple inventory items per sale (e.g. a combo of
// 1 bun + 1 patty + 1 canned drink). Newer items store this as `ingredients`
// ([{ inventoryId, qty }]); older items only have the single-link
// `inventoryId`/`inventoryQty` fields, which we normalize into the same shape
// here so every consumer (Menu, TablePOS, Reports, App) reads one format.
export function getMenuIngredients(menuItem) {
  if (!menuItem) return [];

  if (Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
    return menuItem.ingredients
      .filter(ing => ing && ing.inventoryId)
      .map(ing => ({ inventoryId: ing.inventoryId, qty: Number(ing.qty) || 1 }));
  }

  if (menuItem.inventoryId) {
    return [{ inventoryId: menuItem.inventoryId, qty: Number(menuItem.inventoryQty) || 1 }];
  }

  return [];
}

// Per-unit raw-ingredient (wholesale) cost of one menu item, summed across every
// inventory item it's linked to. This is what a menu item actually costs the
// business to make — as opposed to `menuItem.price`, the marked-up price charged
// to paying customers. Used to bill staff meals at cost (zero profit) and to
// report ingredient cost/profit per item.
export function getWholesaleCost(menuItem, inventory = []) {
  if (!menuItem) return 0;
  return getMenuIngredients(menuItem).reduce((sum, ing) => {
    const invItem = inventory.find(inv => inv.id === ing.inventoryId);
    return sum + (invItem ? (Number(invItem.costPrice) || 0) * ing.qty : 0);
  }, 0);
}
