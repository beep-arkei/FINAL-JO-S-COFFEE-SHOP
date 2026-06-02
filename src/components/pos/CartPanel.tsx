import { Trash2, Minus, Plus, X } from 'lucide-react';
import type { OrderItem } from '@/lib/data';
import { parseAdjustment } from '@/lib/data';

interface CartPanelProps {
  items: OrderItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  adjustmentInput: string;
  onAdjustmentChange: (val: string) => void;
}

const CartPanel = ({ items, onUpdateQuantity, onRemoveItem, onClearCart, onCheckout, adjustmentInput, onAdjustmentChange }: CartPanelProps) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const adjustment = parseAdjustment(adjustmentInput, subtotal);
  const total = Math.max(0, subtotal + adjustment);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-display text-lg font-bold text-foreground">Current Order</h2>
        {items.length > 0 && (
          <button onClick={onClearCart} className="text-destructive hover:opacity-80 text-xs font-medium flex items-center gap-1">
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No items yet</p>
            <p className="text-xs mt-1">Tap menu items to add</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="bg-background rounded-xl p-3 border border-border animate-fade-in">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{item.name}</p>
                  {item.size !== 'default' && (
                    <p className="text-xs text-muted-foreground">{item.size}</p>
                  )}
                  {item.customizations.length > 0 && (
                    <p className="text-xs text-muted-foreground">{item.customizations.join(', ')}</p>
                  )}
                </div>
                <button onClick={() => onRemoveItem(idx)} className="text-muted-foreground hover:text-destructive p-0.5">
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(idx, -1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-secondary"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold w-6 text-center text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(idx, 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-secondary"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="font-bold text-sm text-foreground">₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span>
        </div>
        {/* Adjust price field */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Adjust Price</label>
          <input
            value={adjustmentInput}
            onChange={e => onAdjustmentChange(e.target.value)}
            placeholder="e.g. -10 or 5%"
            className="flex-1 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs"
          />
        </div>
        {adjustment !== 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Adjustment</span>
            <span className={adjustment > 0 ? 'text-foreground' : 'text-destructive'}>
              {adjustment > 0 ? '+' : ''}₱{adjustment.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-foreground font-display">
          <span>Total</span><span>₱{total.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          Checkout
        </button>
      </div>
    </div>
  );
};

export default CartPanel;
