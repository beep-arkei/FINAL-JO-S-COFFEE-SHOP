import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Transaction, MenuItem } from '@/lib/data';
import { X, Plus, Minus, Search, Trash2, ArrowLeftRight, HelpCircle, AlertCircle, ShoppingBag, Receipt } from 'lucide-react';

interface ExchangeDialogProps {
  transaction: Transaction;
  onClose: () => void;
}

interface SelectedReturn {
  menu_item_code: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

interface SelectedNew {
  menu_item_code: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  customizations?: string[];
}

const ExchangeDialog = ({ transaction, onClose }: ExchangeDialogProps) => {
  const { menu, processExchange, session } = useData();

  // Active non-archived menu items for new selection
  const activeMenuItems = useMemo(() => {
    return menu.filter(item => !item.archived && !item.outOfStock);
  }, [menu]);

  // Return selection state (initially unselected or prefilled with 0 returned)
  const [returnItems, setReturnItems] = useState<SelectedReturn[]>(() => {
    return transaction.items.map(item => ({
      menu_item_code: item.menuItemId, // in schema, MenuItem uses 'code' column mapped as menuItemId in UI
      name: item.name,
      size: item.size,
      price: item.price,
      quantity: 1,
      maxQuantity: item.quantity,
    }));
  });

  // Keep track of which original items are checked for return
  const [checkedReturnIdxs, setCheckedReturnIdxs] = useState<Record<number, boolean>>({});

  // New items state
  const [newItems, setNewItems] = useState<SelectedNew[]>([]);

  // Search state for finding new items
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeModalItem, setSizeModalItem] = useState<MenuItem | null>(null);

  // Exchange info
  const [customerName, setCustomerName] = useState(transaction.customerName || '');
  const [notes, setNotes] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashReceivedInput, setCashReceivedInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [successMSG, setSuccessMSG] = useState<string | null>(null);

  // Math calculations
  const totalReturned = useMemo(() => {
    return returnItems.reduce((sum, item, idx) => {
      if (checkedReturnIdxs[idx]) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);
  }, [returnItems, checkedReturnIdxs]);

  const totalNew = useMemo(() => {
    return newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [newItems]);

  const costDifference = totalNew - totalReturned;

  const changeDue = useMemo(() => {
    if (costDifference <= 0) return 0;
    return Math.max(0, cashReceived - costDifference);
  }, [costDifference, cashReceived]);

  // Filter products based on search
  const filteredNewMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return activeMenuItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [activeMenuItems, searchQuery]);

  // Handle Return Quantities
  const updateReturnQty = (index: number, diff: number) => {
    setReturnItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const nextQS = item.quantity + diff;
        const valid = Math.max(1, Math.min(item.maxQuantity, nextQS));
        return { ...item, quantity: valid };
      }
      return item;
    }));
  };

  const handleToggleCheck = (index: number) => {
    setCheckedReturnIdxs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Add Item to Swap
  const handleAddNewItem = (menuItem: MenuItem, size: string, price: number) => {
    setNewItems(prev => {
      const existingIdx = prev.findIndex(i => i.menu_item_code === menuItem.code && i.size === size);
      if (existingIdx > -1) {
        return prev.map((item, idx) => 
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, {
          menu_item_code: menuItem.code,
          name: menuItem.name,
          size: size,
          price: price,
          quantity: 1,
          customizations: [],
        }];
      }
    });
    setSearchQuery('');
  };

  const selectMenuItem = (menuItem: MenuItem) => {
    const sizes = Object.keys(menuItem.prices);
    if (sizes.length > 1) {
      setSizeModalItem(menuItem);
    } else {
      const singleSize = sizes[0] || 'default';
      const singlePrice = (menuItem.prices[singleSize] || 0) as number;
      handleAddNewItem(menuItem, singleSize, singlePrice);
    }
  };

  const removeNewItem = (index: number) => {
    setNewItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateNewItemQty = (index: number, diff: number) => {
    setNewItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const nextQty = item.quantity + diff;
        return { ...item, quantity: Math.max(1, nextQty) };
      }
      return item;
    }));
  };

  const handleCashInput = (val: string) => {
    setCashReceivedInput(val);
    const parsed = parseFloat(val);
    setCashReceived(isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  const handleSubmit = async () => {
    setErrorMSG(null);
    setSuccessMSG(null);

    // Filter for actual items selected for return
    const actualReturns = returnItems
      .filter((_, idx) => checkedReturnIdxs[idx])
      .map(item => ({
        menu_item_code: item.menu_item_code,
        quantity: item.quantity,
        price: item.price
      }));

    if (actualReturns.length === 0) {
      setErrorMSG('Please select at least one item to return.');
      return;
    }

    if (newItems.length === 0) {
      setErrorMSG('Please select at least one new item for the swap.');
      return;
    }

    if (costDifference > 0 && cashReceived < costDifference) {
      setErrorMSG(`Insufficient payment. Customer still owes ₱${costDifference.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await processExchange({
        originalTransactionId: transaction.id,
        returnedItems: actualReturns,
        newItems: newItems,
        cashReceived: costDifference > 0 ? cashReceived : 0,
        customerName: customerName || undefined,
        notes: notes.trim() || undefined
      });

      if (response.success) {
        setSuccessMSG(`Exchange processed successfully! Exchange Code: ${response.exchange_code || 'N/A'}`);
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setErrorMSG(response.error || 'Failed to process exchange.');
      }
    } catch (err: any) {
      setErrorMSG(err?.message || 'Exchange request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-[100] p-4 font-sans" onClick={e => e.stopPropagation()}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-card-foreground">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Process Item Exchange</h3>
              <p className="text-xs text-muted-foreground">Exchanging items on past Order {transaction.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LEFT SIDE: SELECT ITEMS TO RETURN */}
          <div className="flex flex-col gap-4 border-r border-border/80 pr-0 md:pr-6">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Receipt size={16} className="text-muted-foreground" />
                Select Items to Return
              </h4>
              <p className="text-xs text-muted-foreground">Check the items being returned and specify quantity.</p>
            </div>

            <div className="flex-1 space-y-2 border border-border bg-muted/10 rounded-xl p-3 max-h-[220px] overflow-y-auto">
              {returnItems.map((item, index) => {
                const isChecked = !!checkedReturnIdxs[index];
                return (
                  <div key={index} className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${isChecked ? 'bg-blue-500/5 border-blue-500/30' : 'bg-background border-border/50'}`}>
                    <div className="flex items-center gap-2 px-1 min-w-0 flex-1">
                      <input 
                        type="checkbox" 
                        id={`return-${index}`} 
                        checked={isChecked}
                        onChange={() => handleToggleCheck(index)}
                        className="rounded border-input text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor={`return-${index}`} className="text-xs font-semibold cursor-pointer select-none leading-snug truncate">
                        {item.name} {item.size && item.size !== 'default' ? `(${item.size})` : ''}
                        <span className="block text-[10px] text-muted-foreground font-normal">₱{item.price.toFixed(2)} each (Bought {item.maxQuantity})</span>
                      </label>
                    </div>

                    {isChecked && (
                      <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden ml-2 shadow-sm">
                        <button 
                          onClick={() => updateReturnQty(index, -1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-muted-foreground hover:bg-muted enabled:active:bg-muted/80 disabled:opacity-30"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 font-bold text-xs min-w-[20px] text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateReturnQty(index, +1)}
                          disabled={item.quantity >= item.maxQuantity}
                          className="px-2 py-1 text-muted-foreground hover:bg-muted enabled:active:bg-muted/80 disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* NEW ITEM SEARCH */}
            <div className="space-y-3">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <ShoppingBag size={16} className="text-muted-foreground" />
                  Search New Items
                </h4>
                <p className="text-xs text-muted-foreground">Find coffee, waffle, sides or other drinks to swap for.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type product name or tag (e.g., cold)..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              {searchQuery && (
                <div className="border border-border bg-background rounded-xl overflow-hidden shadow-lg max-h-[140px] overflow-y-auto divide-y divide-border">
                  {filteredNewMenuItems.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">No matching active menu items.</div>
                  ) : filteredNewMenuItems.map(item => (
                    <button 
                      key={item.id} 
                      type="button"
                      onClick={() => selectMenuItem(item)}
                      className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-muted text-xs transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{item.name}</span>
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-[9px] text-primary/80">{item.tags.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground font-medium">₱{Math.min(...Object.values(item.prices) as number[])}+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: NEW SWAP BASKET & MATHS */}
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                New Items to Add
              </h4>
              <p className="text-xs text-muted-foreground">Items selected for the incoming exchange.</p>
            </div>

            <div className="flex-1 space-y-2 border border-border bg-muted/10 rounded-xl p-3 max-h-[180px] overflow-y-auto">
              {newItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center h-full">
                  <div className="p-2 bg-muted rounded-full mb-1">
                    <ShoppingBag size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Swap basket is currently empty</span>
                  <span className="text-[10px] text-muted-foreground/60">Search and tap menu items above to add.</span>
                </div>
              ) : newItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/80">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="font-semibold text-xs text-foreground truncate block leading-tight">
                      {item.name} {item.size && item.size !== 'default' ? `(${item.size})` : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground">₱{item.price.toFixed(2)} each</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden shadow-sm">
                      <button 
                        type="button"
                        onClick={() => updateNewItemQty(index, -1)}
                        className="px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="px-1.5 font-bold text-xs min-w-[16px] text-center">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateNewItemQty(index, +1)}
                        className="px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => removeNewItem(index)}
                      className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CUSTOMER INFO & NOTES */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Optional Name"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Notes / Reason</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={e => setNotes}
                  className="hidden" // hidden input for backup matching context
                />
                <textarea 
                  rows={1}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Broken packaging, changed flavor"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs leading-tight resize-none"
                />
              </div>
            </div>

            {/* MATHEMATICAL SUMMARY CARD */}
            <div className="bg-muted/40 rounded-2xl p-4 border border-border text-xs space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Value of Returned Items ({returnItems.filter((_, idx) => checkedReturnIdxs[idx]).reduce((s, x) => s + x.quantity, 0)} items)</span>
                <span className="font-semibold text-foreground">₱{totalReturned.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Value of New Swap Items ({newItems.reduce((s, x) => s + x.quantity, 0)} items)</span>
                <span className="font-semibold text-foreground">₱{totalNew.toFixed(2)}</span>
              </div>
              <div className="border-t border-border border-dashed my-1.5" />
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Cost Difference (New - Return)</span>
                <span className={`font-bold text-sm ${costDifference > 0 ? 'text-amber-500' : costDifference < 0 ? 'text-green-500' : 'text-foreground'}`}>
                  {costDifference > 0 ? `+₱${costDifference.toFixed(2)}` : costDifference < 0 ? `-₱${Math.abs(costDifference).toFixed(2)}` : '₱0.00'}
                </span>
              </div>

              {costDifference > 0 ? (
                <div className="space-y-2 pt-2 border-t border-border border-dashed mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-600 flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      Additional Money to Collect
                    </span>
                    <span className="font-bold text-amber-600">₱{costDifference.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Cash Tendered by Customer</span>
                    <input 
                      type="number"
                      step="any"
                      min={costDifference}
                      value={cashReceivedInput}
                      onChange={e => handleCashInput(e.target.value)}
                      placeholder={`Min ₱${costDifference}`}
                      className="w-28 px-2 py-1 bg-background border border-border rounded-lg text-xs text-right font-bold w-32 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  {cashReceived >= costDifference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calculated Change Back</span>
                      <span className="font-bold text-green-600">₱{changeDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ) : costDifference < 0 ? (
                <div className="pt-2 border-t border-border border-dashed mt-2 flex justify-between items-center">
                  <span className="font-semibold text-green-600 flex items-center gap-1.5">
                    <AlertCircle size={13} className="animate-pulse" />
                    Refund Amount to Give Back
                  </span>
                  <span className="font-bold text-green-600 text-sm animate-pulse">₱{Math.abs(costDifference).toFixed(2)}</span>
                </div>
              ) : (
                <div className="pt-2 border-t border-border border-dashed mt-2 text-center text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  Perfect Swap (No Cash Adjustment Needed)
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {errorMSG && (
          <div className="px-6 py-2.5 bg-destructive/10 text-destructive font-semibold text-xs flex items-center gap-2 border-t border-destructive/20 animate-fade-in">
            <AlertCircle size={14} />
            <span>{errorMSG}</span>
          </div>
        )}

        {successMSG && (
          <div className="px-6 py-2.5 bg-green-500/10 text-green-600 font-semibold text-xs flex items-center gap-2 border-t border-green-500/20 animate-fade-in">
            <AlertCircle size={14} />
            <span>{successMSG}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4.5 bg-muted/20 border-t border-border flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground max-w-sm font-medium">
            Exchanges create an audit trail and transaction adjustments. Processed by Admin/Cashier <span className="underline">{session?.username}</span>.
          </p>
          <div className="flex gap-2.5">
            <button 
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4.5 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-accent text-xs font-semibold"
            >
              Cancel
            </button>
            <button 
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Processing Swap...' : 'Confirm Exchange'}
            </button>
          </div>
        </div>

      </div>

      {/* SIZING MODAL FOR NEW ITEM ADDITIONS */}
      {sizeModalItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]" onClick={() => setSizeModalItem(null)}>
          <div className="bg-card rounded-2xl p-5 w-72 border border-border shadow-xl animate-fade-in text-card-foreground" onClick={e => e.stopPropagation()}>
            <h4 className="font-display text-sm font-bold text-foreground mb-1">{sizeModalItem.name}</h4>
            <p className="text-muted-foreground text-[11px] mb-3">Select size to add to swap</p>
            <div className="space-y-1.5">
              {Object.entries(sizeModalItem.prices).map(([sz, pr]) => (
                <button 
                  key={sz}
                  onClick={() => {
                    handleAddNewItem(sizeModalItem, sz, pr as number);
                    setSizeModalItem(null);
                  }}
                  className="w-full flex justify-between items-center px-4.5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground text-xs font-semibold transition-colors"
                >
                  <span>{sz}</span>
                  <span className="font-bold">₱{(pr as number).toFixed(2)}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setSizeModalItem(null)}
              className="mt-4 w-full text-center text-xs text-muted-foreground font-medium hover:text-foreground py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExchangeDialog;
