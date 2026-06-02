import React, { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import type { MenuItem, Category } from '@/lib/data';
import { Plus, Edit2, Archive, ArchiveRestore, Trash2, Image, Coffee, Search, ArrowUp, ArrowDown, ArrowUpDown, Tag, FolderPlus, FolderMinus, Pencil, XCircle, Loader2 } from 'lucide-react';

type SortColumn = 'name' | 'category' | 'price' | 'tags' | 'status' | null;
type SortDir = 'asc' | 'desc' | null;

const MenuManagement = ({ onDirtyStateChange }: { onDirtyStateChange?: (dirty: boolean) => void }) => {
  const { menu, categories, addMenuItem, updateMenuItem, deleteMenuItem, addCategory, removeCategory, renameCategory } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [isFormDirty, setIsFormDirty] = useState(false);

  React.useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isFormDirty);
    }
  }, [isFormDirty, onDirtyStateChange]);

  React.useEffect(() => {
    return () => {
      if (onDirtyStateChange) {
        onDirtyStateChange(false);
      }
    };
  }, [onDirtyStateChange]);

  const dropdownValue = sortColumn && sortDir
    ? sortColumn === 'name' ? (sortDir === 'asc' ? 'name-asc' : 'name-desc')
    : sortColumn === 'price' ? (sortDir === 'asc' ? 'price-asc' : 'price-desc')
    : sortColumn === 'category' ? 'category' : ''
    : '';

  const handleColumnSort = (col: SortColumn) => {
    if (sortColumn === col) { if (sortDir === 'asc') setSortDir('desc'); else { setSortColumn(null); setSortDir(null); } }
    else { setSortColumn(col); setSortDir('asc'); }
  };

  const handleDropdownSort = (val: string) => {
    switch (val) {
      case 'name-asc': setSortColumn('name'); setSortDir('asc'); break;
      case 'name-desc': setSortColumn('name'); setSortDir('desc'); break;
      case 'price-asc': setSortColumn('price'); setSortDir('asc'); break;
      case 'price-desc': setSortColumn('price'); setSortDir('desc'); break;
      case 'category': setSortColumn('category'); setSortDir('asc'); break;
      default: setSortColumn(null); setSortDir(null);
    }
  };

  const applySearch = (items: MenuItem[]) => {
    if (!searchQuery.trim()) return items;
    const terms = searchQuery.trim().toLowerCase().split(/\s+/);
    const include = terms.filter(t => !t.startsWith('-'));
    const exclude = terms.filter(t => t.startsWith('-')).map(t => t.slice(1)).filter(Boolean);
    return items.filter(item => {
      const searchable = [item.name.toLowerCase(), item.category.toLowerCase(), ...(item.tags || []).map(t => t.toLowerCase())];
      const matchesInclude = include.length === 0 || include.every(term => searchable.some(s => s.includes(term)));
      const matchesExclude = exclude.every(term => !searchable.some(s => s.includes(term)));
      return matchesInclude && matchesExclude;
    });
  };

  const applySort = (items: MenuItem[]) => {
    if (!sortColumn || !sortDir) return items;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (sortColumn) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'category': return dir * a.category.localeCompare(b.category);
        case 'price': return dir * (Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices)));
        case 'tags': return dir * ((a.tags || []).join(',').localeCompare((b.tags || []).join(',')));
        case 'status': { const sa = a.archived ? 2 : a.outOfStock ? 1 : 0; const sb = b.archived ? 2 : b.outOfStock ? 1 : 0; return dir * (sa - sb); }
        default: return 0;
      }
    });
  };

  let filtered = menu.filter(i => { if (!showArchived && i.archived) return false; if (filterCat !== 'All' && i.category !== filterCat) return false; return true; });
  filtered = applySearch(filtered);
  filtered = applySort(filtered);

  const handleSave = async (item: MenuItem) => {
    if (isNew) await addMenuItem(item);
    else await updateMenuItem(item.id, item);
    setEditing(null); setIsNew(false);
  };

  const handleArchive = async (id: string, archived: boolean) => { await updateMenuItem(id, { archived }); };
  const handleDelete = async (id: string) => {
    const item = menu.find(i => i.id === id);
    if (!confirm(`Are you sure you want to delete "${item?.name || 'this item'}"? This action cannot be undone.`)) return;
    await deleteMenuItem(id);
  };
  const handleToggleOOS = async (id: string, outOfStock: boolean) => { await updateMenuItem(id, { outOfStock }); };
  const handleImageUpload = (id: string) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { updateMenuItem(id, { image: reader.result as string }); }; reader.readAsDataURL(file); };
    input.click();
  };
  const handleDeleteImage = async (id: string) => { if (!confirm("Remove this item's image?")) return; await updateMenuItem(id, { image: undefined }); };

  const newItem = () => {
    setIsNew(true);
    setEditing({ id: '', code: `item-${Date.now()}`, name: '', category: categories[0]?.name || 'Coffee', categoryId: categories[0]?.id || '', prices: { default: 0 }, archived: false, tags: [] });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown size={12} className="text-muted-foreground/40" />;
    if (sortDir === 'asc') return <ArrowUp size={12} className="text-primary" />;
    return <ArrowDown size={12} className="text-primary" />;
  };

  const sortableHeader = (label: string, column: SortColumn, extraClass: string = '') => (
    <th className={`text-left px-4 py-3 font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors ${extraClass}`} onClick={() => handleColumnSort(column)}>
      <span className="inline-flex items-center gap-1">{label}<SortIcon column={column} /></span>
    </th>
  );

  const handleCloseEditModal = () => {
    setEditing(null);
    setIsNew(false);
    setIsFormDirty(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="font-display text-2xl font-bold text-foreground">Menu Management</h2><p className="text-muted-foreground text-sm">Add, edit, or archive menu items</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryManager(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90"><FolderPlus size={16} /> Categories</button>
          <button onClick={newItem} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Plus size={16} /> Add Item</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items, tags... (use -tag to exclude)" className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
        </div>
        <select value={dropdownValue} onChange={e => handleDropdownSort(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
          <option value="">Default</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="price-asc">Price Low-High</option><option value="price-desc">Price High-Low</option><option value="category">Category</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCat('All')} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filterCat === 'All' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setFilterCat(c.name)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filterCat === c.name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{c.name}</button>
        ))}
        <label className="flex items-center gap-2 ml-auto text-sm text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" /> Show archived</label>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead><tr className="border-b border-border bg-muted">
            <th className="text-left px-4 py-3 font-semibold text-foreground w-16">Image</th>
            {sortableHeader('Name', 'name', 'w-1/4')}
            {sortableHeader('Category', 'category', 'w-32')}
            <th className="text-left px-4 py-3 font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors w-44" onClick={() => handleColumnSort('price')}><span className="inline-flex items-center gap-1">Prices<SortIcon column="price" /></span></th>
            {sortableHeader('Tags', 'tags', 'w-36')}
            <th className="text-left px-4 py-3 font-semibold text-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors w-28" onClick={() => handleColumnSort('status')}><span className="inline-flex items-center gap-1">Status<SortIcon column="status" /></span></th>
            <th className="text-center px-4 py-3 font-semibold text-foreground w-60">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className={`border-b border-border last:border-0 ${item.archived ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3"><button onClick={() => handleImageUpload(item.id)} className="w-10 h-10 rounded-lg border border-border overflow-hidden flex items-center justify-center bg-muted hover:opacity-80">{item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <Coffee size={16} className="text-muted-foreground" />}</button></td>
                <td className="px-4 py-3 font-medium text-foreground truncate">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground truncate">{item.category}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{Object.entries(item.prices).map(([s, p]) => <span key={s} className="mr-1.5">{s === 'default' ? '' : `${s}: `}₱{p as number}</span>)}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(item.tags || []).map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{tag}</span>)}</div></td>
                <td className="px-4 py-3"><div className="flex flex-col gap-1"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-block w-fit whitespace-nowrap ${item.archived ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground'}`}>{item.archived ? 'Archived' : 'Active'}</span>{item.outOfStock && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive inline-block w-fit whitespace-nowrap">Out of Stock</span>}</div></td>
                <td className="px-4 py-3"><div className="flex justify-center gap-1">
                  <button onClick={() => handleImageUpload(item.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Upload Image"><Image size={14} /></button>
                  {item.image && <button onClick={() => handleDeleteImage(item.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive" title="Remove Image"><XCircle size={14} /></button>}
                  <button onClick={() => handleToggleOOS(item.id, !item.outOfStock)} className={`p-1.5 rounded-lg hover:bg-muted text-xs font-medium ${item.outOfStock ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Toggle Out of Stock">{item.outOfStock ? '✓ Stock' : 'OOS'}</button>
                  <button onClick={() => { setEditing(item); setIsNew(false); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                  <button onClick={() => handleArchive(item.id, !item.archived)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">{item.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditItemModal 
          item={editing} 
          categories={categories} 
          onSave={handleSave} 
          onClose={handleCloseEditModal} 
          isNew={isNew} 
          onDirtyChange={setIsFormDirty}
        />
      )}
      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
};

function CategoryManager({ onClose }: { onClose: () => void }) {
  const { categories, addCategory, removeCategory, renameCategory, menu } = useData();
  const [newCat, setNewCat] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async () => { if (!newCat.trim()) return; await addCategory(newCat.trim()); setNewCat(''); };
  const handleDelete = async (cat: Category) => {
    const itemCount = menu.filter(i => i.categoryId === cat.id).length;
    if (!confirm(`Delete category "${cat.name}"?${itemCount > 0 ? ` This will also delete ${itemCount} item(s) in this category.` : ''}`)) return;
    await removeCategory(cat.id);
  };
  const handleRename = async (cat: Category) => {
    if (!editValue.trim() || editValue.trim() === cat.name) { setEditingCat(null); return; }
    await renameCategory(cat.id, editValue.trim()); setEditingCat(null);
  };

  return (
    <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-96 max-h-[70vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border"><h3 className="font-display text-lg font-bold text-foreground">Manage Categories</h3></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              {editingCat === cat.id ? (
                <>
                  <input value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename(cat)} className="flex-1 px-2 py-1 rounded border border-input bg-background text-foreground text-sm" autoFocus />
                  <button onClick={() => handleRename(cat)} className="text-xs text-primary font-medium">Save</button>
                  <button onClick={() => setEditingCat(null)} className="text-xs text-muted-foreground">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-foreground">{cat.name}</span>
                  <button onClick={() => { setEditingCat(cat.id); setEditValue(cat.name); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                  <button onClick={() => handleDelete(cat)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"><FolderMinus size={12} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="New category name" className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Add</button>
          </div>
          <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground">Close</button>
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ item, categories, onSave, onClose, isNew, onDirtyChange }: { item: MenuItem; categories: Category[]; onSave: (i: MenuItem) => Promise<void> | void; onClose: () => void; isNew: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId || categories[0]?.id || '');
  const [newCategory, setNewCategory] = useState('');
  const [hasSizes, setHasSizes] = useState(Object.keys(item.prices).length > 1 || !item.prices['default']);
  const [prices, setPrices] = useState<Record<string, number | string>>(item.prices);
  const [singlePrice, setSinglePrice] = useState<number | string>(item.prices['default'] !== undefined ? item.prices['default'] : '');
  const [image, setImage] = useState<string | undefined>(item.image);
  const [tagsInput, setTagsInput] = useState((item.tags || []).join(', '));
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { addCategory: addCat } = useData();

  const isDirty = 
    name.trim() !== (item.name || '').trim() ||
    newCategory.trim() !== '' ||
    tagsInput !== (item.tags || []).join(', ') ||
    image !== item.image ||
    JSON.stringify(prices) !== JSON.stringify(item.prices) ||
    singlePrice !== (item.prices['default'] !== undefined ? item.prices['default'] : '');

  React.useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit?";
        return "Are you sure you want to exit?";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setImage(reader.result as string); reader.readAsDataURL(file); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let finalCatId = categoryId;
      let finalCatName = categories.find(c => c.id === categoryId)?.name || '';
      if (newCategory.trim()) {
        const newCat = await addCat(newCategory.trim());
        finalCatId = newCat.id;
        finalCatName = newCat.name;
      }
      const finalPrices: Record<string, number> = {};
      if (hasSizes) {
        Object.entries(prices).forEach(([sz, pr]) => {
          const val = pr === '' || pr === null || pr === undefined ? 0 : (typeof pr === 'string' ? parseFloat(pr) : (pr as number));
          finalPrices[sz] = isNaN(val) ? 0 : val;
        });
      } else {
        const val = singlePrice === '' || singlePrice === null || singlePrice === undefined ? 0 : (typeof singlePrice === 'string' ? parseFloat(singlePrice) : (singlePrice as number));
        finalPrices['default'] = isNaN(val) ? 0 : val;
      }
      if (Object.values(finalPrices).some(p => p < 0 || isNaN(p))) { setSubmitting(false); return; }
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await onSave({ ...item, name: name.trim(), category: finalCatName, categoryId: finalCatId, prices: finalPrices, image, tags });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  const addSize = () => setPrices(prev => ({ ...prev, '': '' }));

  return (
    <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-[480px] max-h-[80vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="font-display text-xl font-bold text-foreground">{isNew ? 'Add Item' : 'Edit Item'}</h3>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Image</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                {image ? <img src={image} alt="Preview" className="w-full h-full object-cover" /> : <Coffee size={24} className="text-muted-foreground" />}
              </button>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-primary font-medium">{image ? 'Change Image' : 'Upload Image'}</button>
                {image && <button type="button" onClick={() => setImage(undefined)} className="text-sm text-destructive font-medium ml-3">Remove</button>}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
          <div><label className="text-sm font-medium text-foreground block mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" required /></div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm mt-2" placeholder="Or enter new category..." />
          </div>
          <div><label className="text-sm font-medium text-foreground block mb-1">Tags (comma separated)</label><input value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="e.g. caffeinated, sugar free, decaf" /></div>
          <div>
            <label className="flex items-center gap-2 text-sm text-foreground mb-2"><input type="checkbox" checked={hasSizes} onChange={e => setHasSizes(e.target.checked)} className="rounded" /> Has multiple sizes</label>
            {hasSizes ? (
              <div className="space-y-2">
                {Object.entries(prices).map(([size, price], idx) => (
                  <div key={idx} className="flex gap-2">
                    <input value={size} onChange={e => { const entries = Object.entries(prices); entries[idx] = [e.target.value, price]; setPrices(Object.fromEntries(entries)); }} className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Size name" />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                      <input 
                        type="number" 
                        value={price === null || price === undefined ? '' : price} 
                        onChange={e => { 
                          const entries = Object.entries(prices); 
                          entries[idx] = [size, e.target.value === '' ? '' : parseFloat(e.target.value)]; 
                          setPrices(Object.fromEntries(entries)); 
                        }} 
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" 
                        placeholder="0.00"
                        min="0" 
                        step="any"
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addSize} className="text-sm text-primary font-medium">+ Add size</button>
              </div>
            ) : (
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                <input 
                  type="number" 
                  value={singlePrice === null || singlePrice === undefined ? '' : singlePrice} 
                  onChange={e => setSinglePrice(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" 
                  placeholder="0.00" 
                  min="0" 
                  step="any"
                />
              </div>
            )}
          </div>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MenuManagement;
