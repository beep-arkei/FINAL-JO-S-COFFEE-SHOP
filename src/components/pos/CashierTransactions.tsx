import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Transaction } from '@/lib/data';
import { X, Eye, RotateCcw, Ban, Undo2 } from 'lucide-react';

const CashierTransactions = ({ onClose }: { onClose: () => void }) => {
  const { session, transactions, updateTransaction } = useData();
  const myTx = session?.role === 'admin' ? transactions : transactions.filter(t => t.cashier === session?.username);
  const [viewing, setViewing] = useState<Transaction | null>(null);

  const handleRefund = async (tx: Transaction) => {
    if (!confirm(`Refund transaction ${tx.code}?`)) return;
    await updateTransaction(tx.id, { status: 'refunded', refundedAt: new Date().toISOString(), refundedBy: session?.username });
  };
  const handleUnrefund = async (tx: Transaction) => {
    if (!confirm(`Undo refund for ${tx.code}?`)) return;
    await updateTransaction(tx.id, { status: 'paid', refundedAt: undefined, refundedBy: undefined });
  };
  const handleVoid = async (tx: Transaction) => {
    if (!confirm(`Void transaction ${tx.code}? It will be excluded from reports.`)) return;
    await updateTransaction(tx.id, { voided: true, voidedAt: new Date().toISOString(), voidedBy: session?.username });
  };
  const handleUnvoid = async (tx: Transaction) => {
    if (!confirm(`Undo void for ${tx.code}?`)) return;
    await updateTransaction(tx.id, { voided: false, voidedAt: undefined, voidedBy: undefined });
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-[600px] max-h-[85vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display text-lg font-bold text-foreground">{session?.role === 'admin' ? 'All Transactions' : 'My Transactions'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {myTx.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">No transactions yet</p> : myTx.map(tx => (
            <div key={tx.id} className={`bg-background rounded-xl border border-border p-3 ${tx.status !== 'paid' ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm text-foreground">{tx.code}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString()}</p>
                  {tx.customerName && <p className="text-xs text-muted-foreground">Customer: {tx.customerName}</p>}
                  <p className="text-xs text-muted-foreground">Cashier: {tx.cashier}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-foreground">₱{tx.total.toFixed(2)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tx.status === 'refunded' ? 'bg-destructive/10 text-destructive' : tx.status === 'voided' ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground'}`}>
                    {tx.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <button onClick={() => setViewing(tx)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs"><Eye size={12} /> View Details</button>
                {tx.status === 'paid' && <button onClick={() => handleRefund(tx)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs"><RotateCcw size={12} /> Refund</button>}
                {tx.status === 'refunded' && <button onClick={() => handleUnrefund(tx)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent text-accent-foreground text-xs"><Undo2 size={12} /> Undo Refund</button>}
                {session?.role === 'admin' && tx.status !== 'voided' && <button onClick={() => handleVoid(tx)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs"><Ban size={12} /> Void</button>}
                {tx.status === 'voided' && <button onClick={() => handleUnvoid(tx)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent text-accent-foreground text-xs"><Undo2 size={12} /> Undo Void</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-[60]" onClick={() => setViewing(null)}>
          <div className="bg-card rounded-2xl shadow-xl w-80 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <h4 className="font-display text-sm font-bold text-foreground">Order Details</h4>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Transaction: {viewing.code}</p>
              <p className="text-xs text-muted-foreground">{new Date(viewing.timestamp).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Cashier: {viewing.cashier}</p>
              {viewing.customerName && <p className="text-xs text-muted-foreground">Customer: {viewing.customerName}</p>}
              {viewing.specialInstructions && <p className="text-xs text-muted-foreground">Note: {viewing.specialInstructions}</p>}
              {viewing.status === 'refunded' && <p className="text-xs text-destructive">Refunded at {new Date(viewing.refundedAt!).toLocaleString()} by {viewing.refundedBy}</p>}
              {viewing.status === 'voided' && <p className="text-xs text-muted-foreground">Voided at {new Date(viewing.voidedAt!).toLocaleString()} by {viewing.voidedBy}</p>}
              <div className="border-t border-dashed border-border my-2" />
              {viewing.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs"><span className="text-foreground">{item.quantity}x {item.name} {item.size !== 'default' ? `(${item.size})` : ''}</span><span className="font-medium text-foreground">₱{(item.price * item.quantity).toFixed(2)}</span></div>
              ))}
              <div className="border-t border-dashed border-border my-2" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>₱{viewing.subtotal.toFixed(2)}</span></div>
              {viewing.adjustment !== 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Adjustment ({viewing.adjustmentInput})</span><span>{viewing.adjustment > 0 ? '+' : ''}₱{viewing.adjustment.toFixed(2)}</span></div>}
              <div className="flex justify-between text-sm font-bold text-foreground"><span>Total</span><span>₱{viewing.total.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Cash</span><span>₱{viewing.cashReceived.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs font-bold text-foreground"><span>Change</span><span>₱{viewing.change.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierTransactions;
