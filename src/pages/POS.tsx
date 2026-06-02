import { useState, useCallback } from 'react';
import MenuPanel from '@/components/pos/MenuPanel';
import CartPanel from '@/components/pos/CartPanel';
import CheckoutModal from '@/components/pos/CheckoutModal';
import CashierTransactions from '@/components/pos/CashierTransactions';
import DbStatus from '@/components/DbStatus';
import { useData } from '@/contexts/DataContext';
import type { MenuItem, OrderItem } from '@/lib/data';
import { LogOut, Settings, ClipboardList, Info, PackageX, Coffee, ImageOff, ImageIcon, Tag } from 'lucide-react';
import logo from '@/assets/logo.png';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface POSProps {
  onAdmin: () => void;
  onCredits: () => void;
}

const POS = ({ onAdmin, onCredits }: POSProps) => {
  const { session, logout, menu, settings, dbConnected, updateMenuItem } = useData();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMyTransactions, setShowMyTransactions] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [adjustmentInput, setAdjustmentInput] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showImages, setShowImages] = useState(true);
  const [showTags, setShowTags] = useState(true);

  const oosItems = menu.filter(i => !i.archived && i.outOfStock);

  const handleAddItem = useCallback((item: MenuItem, size: string, price: number) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.menuItemId === item.id && i.size === size);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [...prev, { menuItemId: item.id, name: item.name, size, price, quantity: 1, customizations: [] }];
    });
  }, []);

  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, updated[index].quantity + delta) };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

  const handleRestock = async (item: MenuItem) => {
    if (confirm(`Restock "${item.name}" and make it available again?`)) {
      await updateMenuItem(item.id, { outOfStock: false });
    }
  };

  const handleLogout = () => logout();

  return (
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[40%] max-w-[400px] pointer-events-none z-0 opacity-90">
        <img src={logo} alt="" className="w-full h-auto" referrerPolicy="no-referrer" />
      </div>

      <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border flex-shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h1 className="font-display text-base font-bold text-foreground leading-tight">{settings.name}</h1>
            <p className="text-xs text-muted-foreground">POS System</p>
          </div>
          <DbStatus connected={dbConnected} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-border mr-1 select-none">
            <span className="text-sm font-semibold text-foreground" id="topbar-username">{session?.username}</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/15 px-2 py-0.5 rounded-full" id="topbar-privilege">{session?.role === 'admin' ? 'Admin' : 'Cashier'}</span>
          </div>
          <button onClick={() => setShowImages(v => !v)}
            className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={showImages ? 'Hide Images' : 'Show Images'}>
            {showImages ? <ImageOff size={18} /> : <ImageIcon size={18} />}
          </button>
          <button onClick={() => setShowTags(v => !v)}
            className={`flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors ${showTags ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            title={showTags ? 'Hide Tags' : 'Show Tags'}>
            <Tag size={18} className={showTags ? '' : 'opacity-40'} />
          </button>
          <button onClick={() => setShowRestock(true)}
            className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
            title="Restock Items">
            <PackageX size={18} />
            <span className="text-xs font-medium">Restock</span>
            {oosItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{oosItems.length}</span>
            )}
          </button>
          <button onClick={() => setShowMyTransactions(true)}
            className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Transactions">
            <ClipboardList size={18} />
            <span className="text-xs font-medium">Transactions</span>
          </button>
          {session?.role === 'admin' && (
            <button onClick={onAdmin} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
              <Settings size={16} /> Open Admin Panel
            </button>
          )}
          <button onClick={onCredits} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Credits">
            <Info size={18} />
          </button>
          <button onClick={() => setShowLogoutDialog(true)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1">
          <MenuPanel onAddItem={handleAddItem} showImages={showImages} showTags={showTags} />
        </div>
        <div className="w-80 lg:w-96">
          <CartPanel items={cart} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem}
            onClearCart={() => { setCart([]); setAdjustmentInput(''); }}
            onCheckout={() => setShowCheckout(true)}
            adjustmentInput={adjustmentInput} onAdjustmentChange={setAdjustmentInput} />
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal items={cart} adjustmentInput={adjustmentInput}
          onClose={() => setShowCheckout(false)}
          onComplete={() => { setCart([]); setAdjustmentInput(''); setShowCheckout(false); }} />
      )}
      {showMyTransactions && <CashierTransactions onClose={() => setShowMyTransactions(false)} />}

      {showRestock && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={() => setShowRestock(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-96 max-h-[60vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-lg font-bold text-foreground">Out of Stock Items</h3>
              <p className="text-sm text-muted-foreground">Click an item to restock it</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {oosItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">All items are in stock!</p>
              ) : (
                <div className="space-y-2">
                  {oosItems.map(item => (
                    <button key={item.id} onClick={() => handleRestock(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-accent text-left transition-colors">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Coffee size={16} className="text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <span className="text-xs text-primary font-medium">Restock</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border">
              <button onClick={() => setShowRestock(false)} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out? Make sure all pending orders are completed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default POS;
