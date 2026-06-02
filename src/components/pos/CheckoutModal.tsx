import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { OrderItem, Transaction } from '@/lib/data';
import { parseAdjustment } from '@/lib/data';
import { useData } from '@/contexts/DataContext';
import logo from '@/assets/logo.png';


interface CheckoutModalProps {
  items: OrderItem[];
  adjustmentInput: string;
  onClose: () => void;
  onComplete: () => void;
}

const CheckoutModal = ({ items, adjustmentInput, onClose, onComplete }: CheckoutModalProps) => {
  const { saveTransaction, settings } = useData();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const adjustment = parseAdjustment(adjustmentInput, subtotal);
  const total = Math.max(0, subtotal + adjustment);
  const [cashInput, setCashInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cashRef.current?.focus(); }, []);

  const cash = parseFloat(cashInput) || 0;
  const change = cash - total;
  const numpadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C'];

  const handleNumpad = (key: string) => {
    if (key === 'C') { setCashInput(''); return; }
    if (key === '.' && cashInput.includes('.')) return;
    setCashInput(prev => prev + key);
  };

  const handleQuickAmount = (amt: number) => setCashInput(prev => { const current = parseFloat(prev) || 0; return (current + amt).toString(); });

  const handlePay = async () => {
    if (cash < total || isProcessing) return;
    setIsProcessing(true);
    setPayError(null);
    try {
      const tx = await saveTransaction(items, subtotal, adjustment, adjustmentInput, total, cash, change, customerName.trim() || undefined, specialInstructions.trim() || undefined);
      setTransaction(tx);
      setShowReceipt(true);
    } catch (err: any) {
      setPayError(err?.message || 'Failed to complete payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (showReceipt && transaction) {
    return (
      <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50">
        <div className="bg-card rounded-2xl shadow-xl w-72 max-h-[90vh] overflow-y-auto animate-fade-in">
          <div className="print-receipt px-3 py-2">
            <div className="text-center mb-1">
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-0.5">Receipt</p>
              <img src={logo} alt="Logo" className="w-8 h-8 mx-auto object-contain mb-0.5" referrerPolicy="no-referrer" />
              <h3 className="font-display text-xs font-bold text-foreground">{settings.name}</h3>
              <p className="text-[9px] text-muted-foreground">{transaction.code}</p>
              <p className="text-[9px] text-muted-foreground">{new Date(transaction.timestamp).toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">Cashier: {transaction.cashier}</p>
              {transaction.customerName && <p className="text-[9px] text-muted-foreground">Customer: {transaction.customerName}</p>}
            </div>
            <div className="border-t border-dashed border-border my-1" />
            {transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[10px] py-0.5">
                <div><span className="text-foreground">{item.quantity}x {item.name}</span>{item.size !== 'default' && <span className="text-muted-foreground ml-1">({item.size})</span>}</div>
                <span className="text-foreground font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-border my-1" />
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₱{transaction.subtotal.toFixed(2)}</span></div>
              {transaction.adjustment !== 0 && <div className="flex justify-between text-muted-foreground"><span>Adj. ({transaction.adjustmentInput})</span><span>{transaction.adjustment > 0 ? '+' : ''}₱{transaction.adjustment.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-foreground text-xs"><span>Total</span><span>₱{transaction.total.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Cash</span><span>₱{transaction.cashReceived.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-foreground text-[11px]"><span>Change</span><span>₱{transaction.change.toFixed(2)}</span></div>
            </div>
            {transaction.specialInstructions && (<><div className="border-t border-dashed border-border my-1" /><p className="text-[9px] text-muted-foreground">Note: {transaction.specialInstructions}</p></>)}
            <div className="border-t border-dashed border-border my-1" />
            <p className="text-center text-[9px] text-muted-foreground">Thank you! Please come again.</p>
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <button onClick={() => window.print()} className="flex-1 py-1.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:opacity-90">Print</button>
            <button onClick={onComplete} className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90">New Order</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-96 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="font-display text-xl font-bold text-foreground mb-1">Payment</h3>
          <div className="space-y-2 mb-3">
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name (optional)" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            <input value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Special Instructions (optional)" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
          </div>
          <div className="bg-background rounded-xl p-3 mb-3 border border-border">
            <div className="flex justify-between text-sm text-muted-foreground mb-1"><span>Total Due</span><span className="font-bold text-foreground text-lg">₱{total.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Cash Received</span>
              <input ref={cashRef} value={cashInput} onChange={e => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setCashInput(val); }}
                className="font-bold text-foreground text-lg text-right bg-transparent outline-none w-32" placeholder="₱0.00" />
            </div>
            {cash >= total && <div className="flex justify-between text-sm"><span className="text-[hsl(var(--success))] font-medium">Change</span><span className="font-bold text-[hsl(var(--success))] text-lg">₱{change.toFixed(2)}</span></div>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {numpadKeys.map(key => (<button key={key} onClick={() => handleNumpad(key)} className={`py-2.5 rounded-xl font-bold text-lg transition-all active:scale-95 ${key === 'C' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground hover:bg-secondary'}`}>{key}</button>))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[500, 200, 100, 50].map(amt => (<button key={amt} onClick={() => handleQuickAmount(amt)} className="py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90">₱{amt}</button>))}
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[20, 10, 5, 1].map(amt => (<button key={amt} onClick={() => handleQuickAmount(amt)} className="py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90">₱{amt}</button>))}
          </div>
          {payError && <p className="text-xs text-destructive mb-2">{payError}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Cancel</button>
            <button onClick={handlePay} disabled={cash < total || isProcessing} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
