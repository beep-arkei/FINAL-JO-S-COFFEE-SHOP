import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { MenuItem } from '@/lib/data';
import { 
  Coffee, Search, ArrowUpDown, Database, WifiOff, RefreshCw, 
  AlertTriangle, CheckCircle2, AlertCircle, HelpCircle, Loader2, Sparkles 
} from 'lucide-react';

interface MenuPanelProps {
  onAddItem: (item: MenuItem, size: string, price: number) => void;
  showImages?: boolean;
  showTags?: boolean;
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

const MenuPanel = ({ onAddItem, showImages = true, showTags = true }: MenuPanelProps) => {
  const { menu, categories, loading, dbConnected, dbError, refreshAll, addCategory, addMenuItem } = useData();
  const items = menu.filter(i => !i.archived);
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [sizeModal, setSizeModal] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSort, setShowSort] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const applySearch = (items: MenuItem[]) => {
    if (!searchQuery.trim()) return items;
    const terms = searchQuery.trim().toLowerCase().split(/\s+/);
    const include = terms.filter(t => !t.startsWith('-'));
    const exclude = terms.filter(t => t.startsWith('-')).map(t => t.slice(1)).filter(Boolean);
    return items.filter(item => {
      const searchable = [item.name.toLowerCase(), item.category.toLowerCase(), ...(item.tags || []).map(t => t.toLowerCase())];
      return (include.length === 0 || include.every(term => searchable.some(s => s.includes(term)))) && exclude.every(term => !searchable.some(s => s.includes(term)));
    });
  };

  const applySort = (items: MenuItem[]) => [...items].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'price-asc': return Math.min(...(Object.values(a.prices) as number[])) - Math.min(...(Object.values(b.prices) as number[]));
      case 'price-desc': return Math.min(...(Object.values(b.prices) as number[])) - Math.min(...(Object.values(a.prices) as number[]));
      default: return 0;
    }
  });

  const handleRetry = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  let filtered = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);
  filtered = applySearch(filtered);
  filtered = applySort(filtered);

  const handleItemClick = (item: MenuItem) => {
    if (item.outOfStock) return;
    const sizes = Object.keys(item.prices);
    if (sizes.length === 1) onAddItem(item, sizes[0], item.prices[sizes[0]]);
    else setSizeModal(item);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Search and Sort Toolbar */}
      <div className="flex gap-2 px-3 pt-3 flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search items or tags... (use -tag to exclude)" 
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs" 
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowSort(!showSort)} 
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground text-xs"
          >
            <ArrowUpDown size={14} /> Sort
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-36">
              {([['name-asc', 'Name A-Z'], ['name-desc', 'Name Z-A'], ['price-asc', 'Price Low-High'], ['price-desc', 'Price High-Low']] as [SortOption, string][]).map(([val, label]) => (
                <button 
                  key={val} 
                  onClick={() => { setSortBy(val); setShowSort(false); }} 
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-muted ${sortBy === val ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex gap-1.5 p-3 flex-wrap flex-shrink-0 border-b border-border">
        <button 
          onClick={() => setActiveCategory('All')} 
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === 'All' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.name)} 
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat.name ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading || refreshing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-card/20 rounded-2xl m-3 border border-border/60">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl animate-pulse scale-150" />
            <div className="relative w-16 h-16 bg-card border border-border rounded-full shadow-md flex items-center justify-center animate-bounce duration-1000">
              <Coffee size={28} className="text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
              <Loader2 size={12} className="text-primary-foreground animate-spin" />
            </div>
          </div>
          
          <h3 className="font-display text-base font-bold text-foreground mb-1.5 animate-pulse">Connecting to Supabase...</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
            Contacting your live Supabase cloud database to retrieve products, categories, and inventory configurations.
          </p>

          <div className="bg-muted/80 px-4 py-3 rounded-xl border border-border text-[11px] text-muted-foreground max-w-sm text-left space-y-2.5 mb-5 w-full">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Supabase Connection Diagnostics:</span>
            </div>
            
            <p className="leading-normal text-muted-foreground">
              <strong>1. Database Cold Start (Free Tier):</strong> If your database has been inactive, PostgreSQL spins down. Waking the database runtime can take 10 to 30 seconds.
            </p>

            <p className="leading-normal text-muted-foreground">
              <strong>2. Realtime CDC Pool Queue:</strong> Real-time changes subscription handles connections via an Elixir supervisor slot. When subscription requests queue up, the db connection pool can take up to 12 seconds to allocate slots.
            </p>

            <div className="border-t border-border pt-2 text-[10px] space-y-1">
              <p className="font-mono text-[9px] text-muted-foreground/80">
                [Logs info] Connection slot queue timeout target: 10s–12s
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Stuck?</span> Click the button below to bypass active connection streams and force a direct HTTP fetch.
              </p>
            </div>
          </div>

          <div className="space-y-2 w-full max-w-xs">
            <button 
              onClick={handleRetry} 
              disabled={refreshing}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              Force Direct Sync Fetch
            </button>
            <p className="text-[10px] text-muted-foreground">
              Overrides active real-time listening streams.
            </p>
          </div>
        </div>
      ) : menu.length === 0 ? (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-thin">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 animate-fade-in max-w-md mx-auto w-full">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Menu Diagnostic Assistant</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your POS system is connected, but no products are showing up here. Let's trace why.</p>
              </div>
            </div>

            {/* Diagnostic Logs */}
            <div className="border border-border rounded-xl bg-muted/20 text-xs">
              <div className="px-3 py-1.5 bg-muted/45 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                <span>Database Connection Diagnostics</span>
                <span className="text-emerald-600 font-semibold animate-pulse">Live Analysis</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Database size={13} />
                    <span>Supabase Connected</span>
                  </div>
                  {dbConnected ? (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Yes (Active)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <WifiOff size={10} /> No (Offline)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle size={13} />
                    <span>Categories Retrieved</span>
                  </div>
                  {categories.length > 0 ? (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                      Yes ({categories.length} loaded)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">
                      0 Found
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Coffee size={13} />
                    <span>Menu Items Returned</span>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded animate-pulse">
                    0 Records Retrieved
                  </span>
                </div>

                {dbError && (
                  <div className="pt-2 border-t border-border mt-2 text-[11px] text-destructive font-mono break-all bg-destructive/5 p-2 rounded">
                    <span className="font-bold">Error Msg:</span> {dbError}
                  </div>
                )}
              </div>
            </div>

            {/* Remedies */}
            <div className="space-y-4">
              {!dbConnected ? (
                <>
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-left">
                    <p className="font-bold text-destructive mb-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Database Disconnected
                    </p>
                    <p className="leading-relaxed text-muted-foreground">
                      The application could not establish a connection to your Supabase project. This can be caused by incorrect connection secrets in your environment variables, or internet connectivity issues.
                    </p>
                  </div>
                  <button 
                    onClick={handleRetry} 
                    disabled={refreshing}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
                    Retry Connection
                  </button>
                </>
              ) : (
                <>
                  {/* Explanation for why empty list returned but rows are in Supabase */}
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-left space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                      <Sparkles size={14} className="text-amber-500 animate-pulse fill-amber-500" />
                      <span>Why are items showing up empty?</span>
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      If there are records visible in your <span className="font-semibold text-foreground">Supabase Table Editor</span> (e.g. inside <code className="font-mono bg-muted text-foreground px-1 py-0.2 ml-1 rounded">menu_items</code>) but they load as <strong>0 records</strong> in the app, this is due to <span className="font-semibold text-foreground">Row Level Security (RLS) policies</span>.
                    </p>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      By default, PostgreSQL Row Level Security filters out rows silently and returns an empty list with absolutely <strong>no error or HTTP failure</strong> unless there is a specific policy enabling read operations for public users.
                    </p>

                    <div className="pt-2 border-t border-amber-500/10 space-y-1">
                      <p className="font-bold text-foreground">Quick fix in your Supabase console:</p>
                      <ol className="list-decimal pl-4 text-[11px] text-muted-foreground space-y-1">
                        <li>Open your <span className="font-semibold text-foreground">Supabase Dashboard</span> &rarr; <span className="font-semibold text-foreground">Database</span> &rarr; <span className="font-semibold text-foreground">Policies</span>.</li>
                        <li>Find the <code className="font-mono bg-muted text-foreground p-0.5 rounded">menu_items</code> table and click <span className="font-semibold text-foreground">New Policy</span>.</li>
                        <li>Choose the pre-built template: <span className="font-semibold text-foreground">"Enable read access for all users"</span> (or choose target role <code className="font-mono text-[10px]">anon</code> and operation <code className="font-mono text-[10px]">SELECT</code>, returning <code className="font-mono text-[10px]">true</code>).</li>
                        <li>Also apply a similar read policy to the <code className="font-mono bg-muted text-foreground p-0.5 rounded">categories</code> and <code className="font-mono bg-muted text-foreground p-0.5 rounded">store_settings</code> tables.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={handleRetry} 
                      disabled={refreshing}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
                      Verify & Synchronize Live Records
                    </button>

                    <div className="space-y-1.5 border border-border border-dashed rounded-xl p-3 bg-muted/20 text-[11px] text-muted-foreground leading-relaxed text-left">
                      <p className="font-bold text-foreground">Standard Administration Options:</p>
                      <ul className="list-disc pl-3.5 space-y-1 text-[11px]">
                        <li>
                          <strong>Admin Panel Input:</strong> Go to the Admin header panel to manually design product entries yourself.
                        </li>
                        <li>
                          <strong>Import Backup:</strong> Go to <span className="font-semibold text-foreground">Admin &rarr; Data Backup</span> and click <span className="font-semibold text-foreground">Restore Backup</span> with a valid backing configuration JSON.
                        </li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-card/20 rounded-2xl m-3 border border-border/40">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search size={20} className="text-muted-foreground/60" />
          </div>
          <h3 className="font-display text-sm font-semibold text-foreground mb-1">No matching products found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
            There are active products in the database, but none match your search query or category filters.
          </p>
          <div className="flex flex-col gap-1.5 w-full max-w-[180px]">
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="py-1.5 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent text-xs font-semibold transition-all"
              >
                Clear Search Query
              </button>
            )}
            {activeCategory !== 'All' && (
              <button 
                onClick={() => setActiveCategory('All')}
                className="py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold transition-all"
              >
                Reset Category Filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map(item => {
              const sizes = Object.keys(item.prices);
              const minPrice = Math.min(...(Object.values(item.prices) as number[]));
              const isOOS = item.outOfStock;
              return (
                <button 
                  key={item.id} 
                  onClick={() => handleItemClick(item)} 
                  disabled={isOOS}
                  className={`rounded-xl text-left transition-all border border-border relative group flex overflow-hidden ${isOOS ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground' : 'hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-card text-card-foreground'}`}
                >
                  {showImages && (
                    <div className="w-20 h-20 flex-shrink-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Coffee size={20} className="text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 p-2 flex flex-col justify-center min-w-0">
                    <p className="font-semibold text-xs leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">
                      {sizes.length > 1 ? `from ₱${minPrice}` : `₱${minPrice}`}
                    </p>
                    {showTags && item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {item.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1 py-0 rounded bg-secondary text-secondary-foreground font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOOS && (
                    <span className="absolute top-1 right-1 text-[9px] font-bold bg-destructive text-destructive-foreground px-1 py-0.5 rounded">
                      OOS
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sizing Modal */}
      {sizeModal && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={() => setSizeModal(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-1">{sizeModal.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">Select size</p>
            <div className="space-y-2">
              {Object.entries(sizeModal.prices).map(([size, price]) => (
                <button 
                  key={size} 
                  onClick={() => { onAddItem(sizeModal, size, price as number); setSizeModal(null); }}
                  className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  <span className="font-medium text-sm">{size}</span>
                  <span className="font-bold text-sm">₱{price as number}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setSizeModal(null)} 
              className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { MenuPanel };
export default MenuPanel;
