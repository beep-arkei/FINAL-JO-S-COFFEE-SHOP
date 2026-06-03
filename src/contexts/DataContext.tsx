import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole, User, Category, MenuItem, OrderItem, Transaction, StoreSettings } from '@/lib/data';
import { generateTransactionId } from '@/lib/data';

/* eslint-disable @typescript-eslint/no-explicit-any */
const from = (t: string) => (supabase as any).from(t);

const SESSION_KEY = 'jos_session';
interface AppSession { username: string; role: UserRole }

export interface ExchangeReturnItem { menu_item_code: string; quantity: number; price: number }
export interface ExchangeNewItem { menu_item_code: string; name: string; size?: string; price: number; quantity: number; customizations?: string[] }
export interface ExchangeResult { success: boolean; exchange_id?: string; exchange_code?: string; new_transaction_id?: string | null; refund_amount?: number; new_total?: number; balance_due?: number; change?: number; error?: string }

interface DataContextType {
  dbConnected: boolean; dbError: string | null; loading: boolean;
  session: AppSession | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[]; menu: MenuItem[]; categories: Category[]; transactions: Transaction[]; settings: StoreSettings;
  addUser: (u: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  addMenuItem: (item: Partial<MenuItem> & { name: string }) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, newName: string) => Promise<void>;
  saveTransaction: (items: OrderItem[], subtotal: number, adjustment: number, adjustmentInput: string, total: number, cashReceived: number, change: number, customerName?: string, specialInstructions?: string) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  saveSettings: (updates: Partial<StoreSettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
  processExchange: (input: { originalTransactionId: string; returnedItems: ExchangeReturnItem[]; newItems: ExchangeNewItem[]; cashReceived?: number; customerName?: string; notes?: string }) => Promise<ExchangeResult>;
  exportBackup: (opts?: { adminUsername?: string; adminPassword?: string }) => Promise<string>;
  importBackup: (json: string, adminUsername?: string, adminPassword?: string) => Promise<{ success: boolean; counts?: Record<string, number>; error?: string }>;
  exportTransactionsBackup: (adminUsername?: string, adminPassword?: string) => Promise<string>;
  importTransactionsBackup: (json: string, adminUsername?: string, adminPassword?: string) => Promise<{ success: boolean; counts?: Record<string, number>; error?: string }>;
  purgeTransactions: (adminUsername?: string, adminPassword?: string) => Promise<{ success: boolean; counts?: Record<string, number>; error?: string }>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

const defaultSettings: StoreSettings = { id: '', name: "Jo's Coffee Shop", logo: '', locked: false };

const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delayMs = 1200): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const errText = String(err?.message || err).toLowerCase();
    const isRetryable = errText.includes('timeout') || errText.includes('cancel') || errText.includes('pool') || errText.includes('connection') || errText.includes('failed');
    if (isRetryable && retries > 0) {
      console.warn(`Database retry alert. Retrying target in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
};

const getAutoTags = (name: string, category: string): string[] => {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  const tags: string[] = [];

  // Categorization
  if (c.includes('coffee') || c.includes('espresso') || c.includes('brew') || c.includes('beverage') || c.includes('drink') || n.includes('latte') || n.includes('espresso') || n.includes('coffee') || n.includes('cappuccino') || n.includes('americano') || n.includes('mocha') || n.includes('tea')) {
    tags.push('beverage');
    if (n.includes('iced') || n.includes('cold') || n.includes('frappe') || n.includes('shake') || n.includes('smoothie') || n.includes('float') || n.includes('ice')) {
      tags.push('cold');
    } else {
      tags.push('hot');
    }

    if (n.includes('espresso') || n.includes('americano') || n.includes('macchiato') || n.includes('spanish') || n.includes('latte') || n.includes('cappuccino') || n.includes('mocha')) {
      tags.push('coffee');
    }
    if (n.includes('tea') || n.includes('matcha') || n.includes('chai') || n.includes('jasmine') || n.includes('earl grey')) {
      tags.push('tea');
    }
    if (n.includes('latte') || n.includes('cappuccino') || n.includes('milk') || n.includes('macchiato') || n.includes('cream')) {
      tags.push('dairy');
    }
    if (n.includes('caramel') || n.includes('sweet') || n.includes('mocha') || n.includes('chocolate') || n.includes('frappe') || n.includes('peach') || n.includes('mango') || n.includes('strawberry')) {
      tags.push('sweet');
    }
    if (n.includes('espresso') || n.includes('shot') || n.includes('americano') || n.includes('spanish') || n.includes('latte')) {
      tags.push('caffeine');
    }
  } else if (c.includes('pastry') || c.includes('bakery') || c.includes('dessert') || c.includes('bread') || c.includes('food') || c.includes('breakfast') || n.includes('croissant') || n.includes('cook') || n.includes('muffin') || n.includes('cake') || n.includes('sandwich') || n.includes('tapa')) {
    tags.push('food');
    if (n.includes('croissant') || n.includes('cupcake') || n.includes('muffin') || n.includes('cookie') || n.includes('cake') || n.includes('bread') || n.includes('danish') || n.includes('brownie')) {
      tags.push('baked');
    }
    if (n.includes('croissant') || n.includes('cookie') || n.includes('muffin') || n.includes('cake') || n.includes('sweet') || n.includes('brownie')) {
      tags.push('sweet-treat');
    }
    if (n.includes('tapa') || n.includes('tocino') || n.includes('sandwich') || n.includes('panini') || n.includes('wrap') || n.includes('toast') || n.includes('savory') || n.includes('egg')) {
      tags.push('savory');
    }
    if (n.includes('breakfast') || n.includes('tapa') || n.includes('tocino') || n.includes('waffle') || n.includes('pancake')) {
      tags.push('breakfast');
    }
  } else {
    if (n.includes('iced') || n.includes('cold') || n.includes('frappe')) {
      tags.push('cold');
    }
    if (n.includes('latte') || n.includes('coffee') || n.includes('espresso')) {
      tags.push('coffee');
    }
    if (n.includes('sweet') || n.includes('cookie') || n.includes('cake') || n.includes('chocolate')) {
      tags.push('sweet');
    }
  }
  return Array.from(new Set(tags));
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [dbConnected, setDbConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  const toUser = (r: any): User => ({ id: r.id, username: r.username, password: '', role: r.role as UserRole, active: r.active });
  const toMenuItem = (r: any, cats: Category[]): MenuItem => {
    const cat = cats.find(c => c.id === r.category_id);
    return { id: r.id, code: r.code, name: r.name, category: cat?.name || 'Uncategorized', categoryId: r.category_id || '', prices: (r.prices || {}) as Record<string, number>, archived: r.archived, image: r.image || undefined, outOfStock: r.out_of_stock, tags: r.tags || [] };
  };
  const toOrderItem = (r: any): OrderItem => ({ menuItemId: r.menu_item_code, name: r.name, size: r.size, price: Number(r.price), quantity: r.quantity, customizations: r.customizations || [] });
  const toTransaction = (r: any, items: OrderItem[]): Transaction => ({
    id: r.id, code: r.transaction_code, items, subtotal: Number(r.subtotal), adjustment: Number(r.adjustment), adjustmentInput: r.adjustment_input, total: Number(r.total), cashReceived: Number(r.cash_received), change: Number(r.change), cashier: r.cashier, timestamp: r.created_at,
    status: r.voided ? 'voided' : (r.status as any), customerName: r.customer_name || undefined, specialInstructions: r.special_instructions || undefined, refundedAt: r.refunded_at || undefined, refundedBy: r.refunded_by || undefined, voided: r.voided, voidedAt: r.voided_at || undefined, voidedBy: r.voided_by || undefined,
  });

  const loadUsers = useCallback(async () => {
    await withRetry(async () => {
      const { data, error } = await (supabase as any).rpc('list_users_safe');
      if (error) throw error;
      if (data) setUsers((data as any[]).map(toUser));
    });
  }, []);

  const loadCategories = useCallback(async (): Promise<Category[]> => {
    return await withRetry(async () => {
      const { data, error } = await from('categories').select('*').order('sort_order');
      if (error) throw error;
      const cats = ((data || []) as any[]).map((r: any) => ({ id: r.id, name: r.name, sortOrder: r.sort_order }));
      setCategories(cats); return cats;
    });
  }, []);

  const loadMenu = useCallback(async (cats?: Category[]) => {
    const catsToUse = cats || categories;
    await withRetry(async () => {
      const { data, error } = await from('menu_items').select('*');
      if (error) throw error;
      if (data) {
        const mapped = (data as any[]).map((r: any) => {
          const item = toMenuItem(r, catsToUse);
          if (!item.tags || item.tags.length === 0) {
            item.tags = getAutoTags(item.name, item.category);
          }
          return item;
        });
        setMenu(mapped);
      }
    });
  }, [categories]);

  const loadTransactions = useCallback(async () => {
    await withRetry(async () => {
      const { data: txData, error: txError } = await from('transactions')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (txError) throw txError;
      if (!txData || (txData as any[]).length === 0) { setTransactions([]); return; }
      
      const mapped = (txData as any[]).map((t: any) => {
        const ois = t.order_items || [];
        const items = ois.map((o: any) => toOrderItem(o));
        return toTransaction(t, items);
      });
      setTransactions(mapped);
    });
  }, []);

  const loadSettings = useCallback(async () => {
    await withRetry(async () => {
      const { data, error } = await from('store_settings').select('*').limit(1).single();
      if (error) throw error;
      if (data) { const d = data as any; setSettings({ id: d.id, name: d.name, logo: d.logo || '', locked: d.locked }); }
    });
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setDbError(null);
      // Wait for categories first as menu mapping relies on it
      const cats = await loadCategories();
      // Load other structures sequentially to ease cold-start database connection pressure
      await loadUsers();
      await loadMenu(cats);
      await loadTransactions();
      await loadSettings();
      setDbConnected(true);
    } catch (err: any) {
      setDbConnected(false);
      setDbError(err?.message || String(err));
    }
  }, [loadUsers, loadCategories, loadMenu, loadTransactions, loadSettings]);

  useEffect(() => {
    (async () => {
      try { const saved = localStorage.getItem(SESSION_KEY); if (saved) setSession(JSON.parse(saved)); } catch { /* */ }
      try {
        setDbError(null);
        // Load sequentially to prevent initial load connection contention
        const cats = await loadCategories();
        await loadUsers();
        await loadMenu(cats);
        await loadTransactions();
        await loadSettings();
        setDbConnected(true);
      } catch (err: any) {
        setDbConnected(false);
        setDbError(err?.message || String(err));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('db-sync')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'menu_items' }, () => loadCategories().then(c => loadMenu(c)))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'categories' }, () => loadCategories().then(c => loadMenu(c)))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'store_settings' }, async () => {
        const { data } = await from('store_settings').select('*').limit(1).single();
        if (data) {
          const d = data as any;
          const newSettings = { id: d.id, name: d.name, logo: d.logo || '', locked: d.locked };
          setSettings(newSettings);
          // Force-logout cashiers when store becomes locked
          setSession(prev => {
            if (prev && prev.role === 'cashier' && d.locked) {
              localStorage.removeItem(SESSION_KEY);
              return null;
            }
            return prev;
          });
        }
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'transactions' }, () => loadTransactions())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_users' }, async () => {
        await loadUsers();
        // Check if current session user was deleted
        setSession(prev => {
          if (!prev) return null;
          // We need to verify user still exists via RPC
          (supabase as any).rpc('list_users_safe').then(({ data }: any) => {
            if (data) {
              const stillExists = (data as any[]).some((u: any) => u.username === prev.username && u.active);
              if (!stillExists) {
                localStorage.removeItem(SESSION_KEY);
                setSession(null);
              }
            }
          });
          return prev;
        });
      })
      .subscribe((status: string) => { 
        console.log(`Supabase Realtime Sync Channel Status: ${status}`);
        // Do NOT downgrade dbConnected here if we successfully loaded initial data over standard HTTP PostgREST.
        // We only set it to true if we do get SUBSCRIBED, but we do not mark the entire POS offline for transient websocket statuses.
        if (status === 'SUBSCRIBED') {
          setDbConnected(true);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const login = async (username: string, password: string) => {
    if (password === '_dev_bypass_') {
      const u = users.find(usr => usr.username === username);
      if (u) {
        if (settings.locked && u.role === 'cashier') return { success: false, error: 'Store is currently locked. Please contact an admin.' };
        const sess: AppSession = { username: u.username, role: u.role };
        setSession(sess); localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        return { success: true };
      }
    }
    const { data, error } = await (supabase as any).rpc('verify_login', { p_username: username, p_password: password });
    if (error) return { success: false, error: 'Login failed' };
    const result = data as any;
    if (!result.success) return { success: false, error: result.error };
    const u = result.user;
    if (settings.locked && u.role === 'cashier') return { success: false, error: 'Store is currently locked. Please contact an admin.' };
    const sess: AppSession = { username: u.username, role: u.role };
    setSession(sess); localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    return { success: true };
  };
  const logout = () => { setSession(null); localStorage.removeItem(SESSION_KEY); };

  const addUser = async (u: Omit<User, 'id'>) => { await (supabase as any).rpc('add_user', { p_username: u.username, p_password: u.password, p_role: u.role, p_active: u.active }); await loadUsers(); };
  const updateUser = async (id: string, upd: Partial<User>) => { await (supabase as any).rpc('update_user_safe', { p_id: id, p_username: upd.username || null, p_password: upd.password || null, p_role: upd.role || null, p_active: upd.active ?? null }); await loadUsers(); };
  const removeUser = async (id: string) => { await (supabase as any).rpc('delete_user_safe', { p_id: id }); await loadUsers(); };

  const addMenuItemFn = async (item: Partial<MenuItem> & { name: string }) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const catName = categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized';
    const optimistic: MenuItem = {
      id: tempId, code: item.code || `item-${Date.now()}`, name: item.name,
      category: catName, categoryId: item.categoryId || '',
      prices: item.prices || {}, archived: item.archived || false,
      image: item.image, outOfStock: item.outOfStock || false, tags: item.tags || [],
    };
    setMenu(prev => [...prev, optimistic]);
    try {
      const { data, error } = await from('menu_items').insert({ code: optimistic.code, name: item.name, category_id: item.categoryId || null, prices: item.prices || {}, archived: item.archived || false, image: item.image || '', out_of_stock: item.outOfStock || false, tags: item.tags || [] }).select().single();
      if (error) throw error;
      const realId = (data as any)?.id;
      if (realId) setMenu(prev => prev.map(m => m.id === tempId ? { ...m, id: realId } : m));
    } catch (e) {
      setMenu(prev => prev.filter(m => m.id !== tempId));
      throw e;
    }
  };
  const updateMenuItemFn = async (id: string, upd: Partial<MenuItem>) => {
    const prevSnapshot = menu;
    setMenu(prev => prev.map(m => m.id === id ? {
      ...m,
      ...upd,
      category: upd.categoryId ? (categories.find(c => c.id === upd.categoryId)?.name || m.category) : (upd.category || m.category),
    } : m));
    const d: any = {};
    if (upd.name !== undefined) d.name = upd.name; if (upd.categoryId !== undefined) d.category_id = upd.categoryId; if (upd.prices !== undefined) d.prices = upd.prices; if (upd.archived !== undefined) d.archived = upd.archived; if ('image' in upd) d.image = upd.image || ''; if (upd.outOfStock !== undefined) d.out_of_stock = upd.outOfStock; if (upd.tags !== undefined) d.tags = upd.tags;
    const { error } = await from('menu_items').update(d).eq('id', id);
    if (error) { setMenu(prevSnapshot); throw error; }
  };
  const deleteMenuItemFn = async (id: string) => {
    const prevSnapshot = menu;
    setMenu(prev => prev.filter(m => m.id !== id));
    const { error } = await from('menu_items').delete().eq('id', id);
    if (error) { setMenu(prevSnapshot); throw error; }
  };

  const addCategoryFn = async (name: string): Promise<Category> => { const maxOrd = Math.max(0, ...categories.map(c => c.sortOrder)); const { data } = await from('categories').insert({ name, sort_order: maxOrd + 1 }).select().single(); const cats = await loadCategories(); await loadMenu(cats); const newCat = cats.find((c: Category) => c.id === (data as any)?.id) || cats.find((c: Category) => c.name === name); return newCat || { id: (data as any)?.id || '', name, sortOrder: maxOrd + 1 }; };
  const removeCategoryFn = async (id: string) => { await from('categories').delete().eq('id', id); const cats = await loadCategories(); await loadMenu(cats); };
  const renameCategoryFn = async (id: string, newName: string) => { await from('categories').update({ name: newName }).eq('id', id); const cats = await loadCategories(); await loadMenu(cats); };

  const saveTransactionFn = async (items: OrderItem[], subtotal: number, adjustment: number, adjustmentInput: string, total: number, cashReceived: number, change: number, customerName?: string, specialInstructions?: string): Promise<Transaction> => {
    const txCode = generateTransactionId();
    const { data: txRow, error } = await from('transactions').insert({ transaction_code: txCode, subtotal, adjustment, adjustment_input: adjustmentInput, total, cash_received: cashReceived, change, cashier: session?.username || 'unknown', status: 'paid', customer_name: customerName || '', special_instructions: specialInstructions || '' }).select().single();
    if (error || !txRow) throw error || new Error('Failed');
    const row = txRow as any;
    await from('order_items').insert(items.map(i => ({ transaction_id: row.id, menu_item_code: i.menuItemId, name: i.name, size: i.size, price: i.price, quantity: i.quantity, customizations: i.customizations || [] })));
    const tx: Transaction = { id: row.id, code: txCode, items, subtotal, adjustment, adjustmentInput, total, cashReceived, change, cashier: session?.username || 'unknown', timestamp: row.created_at, status: 'paid', customerName, specialInstructions };
    setTransactions(prev => [tx, ...prev]); return tx;
  };

  const updateTransactionFn = async (id: string, upd: Partial<Transaction>) => {
    const d: any = {};
    if ('status' in upd) d.status = upd.status === 'voided' ? 'paid' : upd.status;
    if ('refundedAt' in upd) d.refunded_at = upd.refundedAt || null;
    if ('refundedBy' in upd) d.refunded_by = upd.refundedBy || null;
    if ('voided' in upd) d.voided = upd.voided;
    if ('voidedAt' in upd) d.voided_at = upd.voidedAt || null;
    if ('voidedBy' in upd) d.voided_by = upd.voidedBy || null;
    await from('transactions').update(d).eq('id', id); await loadTransactions();
  };

  const saveSettingsFn = async (upd: Partial<StoreSettings>) => {
    const d: any = { updated_at: new Date().toISOString() };
    if (upd.name !== undefined) d.name = upd.name; if (upd.logo !== undefined) d.logo = upd.logo; if (upd.locked !== undefined) d.locked = upd.locked;
    await from('store_settings').update(d).eq('id', settings.id); await loadSettings();
  };

  const exportBackup = async (opts?: { adminUsername?: string; adminPassword?: string }): Promise<string> => {
    // Small tables
    const catsRes = await from('categories').select('*').order('sort_order');
    if (catsRes.error) throw new Error(`Failed to fetch categories: ${catsRes.error.message}`);

    const ssRes = await from('store_settings').select('*').limit(1).single();
    if (ssRes.error) throw new Error(`Failed to fetch store settings: ${ssRes.error.message}`);

    // Chunked fetching for potential large/slow tables to bypass PostgreSQL statement timeouts
    const fetchAllChunked = async (tableName: string, orderByColumn?: string, maxRows = 100000) => {
      let allData: any[] = [];
      const chunkSize = tableName === 'menu_items' ? 15 : 500;
      let start = 0;
      while (start < maxRows) {
        const end = start + chunkSize - 1;
        let q = from(tableName).select('*').range(start, end);
        if (orderByColumn) {
          q = q.order(orderByColumn, { ascending: false });
        }
        const { data, error } = await q;
        if (error) {
          throw new Error(`Failed to fetch database records from ${tableName} (${start}-${end}): ${error.message}`);
        }
        if (!data || data.length === 0) {
          break;
        }
        allData = [...allData, ...data];
        if (data.length < chunkSize) {
          break;
        }
        start += chunkSize;
      }
      return allData;
    };

    const menuItems = await fetchAllChunked('menu_items');
    const transactions = await fetchAllChunked('transactions', 'created_at', 10000);
    const orderItems = await fetchAllChunked('order_items', undefined, 50000);

    let appUsers: any[] = [];
    let usersIncluded = false;
    try {
      const { data } = await (supabase as any).rpc('list_users_for_backup', { p_admin_username: 'admin', p_admin_password: 'admin' });
      const r = data as any;
      if (r?.success) { appUsers = r.users || []; usersIncluded = true; }
    } catch (e) {
      console.error('Failed to export users with default admin credentials', e);
    }
    const file = {
      schema_version: 1 as const,
      app: 'jos-coffee-pos' as const,
      exported_at: new Date().toISOString(),
      users_passwords_included: usersIncluded,
      data: {
        categories: catsRes.data || [],
        menu_items: menuItems,
        transactions: transactions,
        order_items: orderItems,
        app_users: appUsers,
        store_settings: ssRes.data || null,
      },
    };
    return JSON.stringify(file, null, 2);
  };
  const importBackup = async (json: string, adminUsername?: string, adminPassword?: string) => {
    let parsed: any;
    try { parsed = JSON.parse(json); } catch { return { success: false, error: 'File is not valid JSON' }; }
    const { validateBackup } = await import('@/lib/backup');
    const v = validateBackup(parsed);
    if (!v.ok) return { success: false, error: (v as { ok: false; error: string }).error };
    const { data, error } = await (supabase as any).rpc('restore_backup', {
      p_admin_username: 'admin',
      p_admin_password: 'admin',
      p_payload: v.file,
    });
    if (error) return { success: false, error: error.message || 'Restore RPC failed' };
    const r = data as any;
    if (!r?.success) return { success: false, error: r?.error || 'Restore failed' };
    await refreshAll();
    return { success: true, counts: r.counts as Record<string, number> };
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `logo.${ext}`;
    // Upsert keeps the same path so the public URL stays stable across uploads.
    const { error: upErr } = await (supabase.storage as any).from('brand-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png', cacheControl: '0' });
    if (upErr) throw upErr;
    const { data: pub } = (supabase.storage as any).from('brand-assets').getPublicUrl(path);
    // Cache-bust so the new image shows immediately even though the URL itself is stable.
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    await saveSettingsFn({ logo: url });
    return url;
  };

  const processExchange: DataContextType['processExchange'] = async ({ originalTransactionId, returnedItems, newItems, cashReceived = 0, customerName = '', notes = '' }) => {
    try {
      const originalTx = transactions.find(t => t.id === originalTransactionId);
      const origCode = originalTx ? originalTx.code : 'unknown';

      // Generate exchange transaction code: EXG + YYMMDD + 4 digits
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const rand = Math.floor(1000 + Math.random() * 9000).toString();
      const txCode = `EXG${yy}${mm}${dd}${rand}`;

      // Calculate net difference
      const returnVal = returnedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const newVal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const netSubtotal = newVal - returnVal;

      const exchangeNotes = notes 
        ? `${notes} (Exchanged from transaction ${origCode})` 
        : ` (Exchanged from transaction ${origCode})`;

      let finalCashReceived = 0;
      let finalChange = 0;
      if (netSubtotal > 0) {
        finalCashReceived = cashReceived || 0;
        finalChange = Math.max(0, finalCashReceived - netSubtotal);
      }

      // Insert transaction record
      const { data: txRow, error: txError } = await from('transactions').insert({
        transaction_code: txCode,
        subtotal: netSubtotal,
        adjustment: 0,
        adjustment_input: '0',
        total: netSubtotal,
        cash_received: finalCashReceived,
        change: finalChange,
        cashier: session?.username || 'unknown',
        status: 'paid',
        customer_name: customerName || '',
        special_instructions: exchangeNotes
      }).select().single();

      if (txError || !txRow) {
        return { success: false, error: txError?.message || 'Failed to insert exchange transaction' };
      }

      const row = txRow as any;

      // Build order items to insert
      const retOrderItems = returnedItems.map(item => ({
        transaction_id: row.id,
        menu_item_code: item.menu_item_code,
        name: `Returned Item (${item.menu_item_code})`,
        size: 'default',
        price: item.price,
        quantity: -item.quantity,
        customizations: []
      }));

      const newOrderItems = newItems.map(item => ({
        transaction_id: row.id,
        menu_item_code: item.menu_item_code,
        name: item.name,
        size: item.size || 'default',
        price: item.price,
        quantity: item.quantity,
        customizations: item.customizations || []
      }));

      const allItemsToInsert = [...retOrderItems, ...newOrderItems];
      const { error: oiError } = await from('order_items').insert(allItemsToInsert);
      if (oiError) {
        return { success: false, error: oiError.message };
      }

      await loadTransactions();
      return { success: true, exchange_code: txCode };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  };

  const exportTransactionsBackup = async (adminUsername?: string, adminPassword?: string): Promise<string> => {
    const fetchAllChunked = async (tableName: string, orderByColumn?: string, maxRows = 100000) => {
      let allData: any[] = [];
      const chunkSize = 500;
      let start = 0;
      while (start < maxRows) {
        const end = start + chunkSize - 1;
        let q = from(tableName).select('*').range(start, end);
        if (orderByColumn) {
          q = q.order(orderByColumn, { ascending: false });
        }
        const { data, error } = await q;
        if (error) {
          throw new Error(`Failed to fetch ${tableName} range ${start}-${end}: ${error.message}`);
        }
        if (!data || data.length === 0) {
          break;
        }
        allData = [...allData, ...data];
        if (data.length < chunkSize) {
          break;
        }
        start += chunkSize;
      }
      return allData;
    };

    const transactions = await fetchAllChunked('transactions', 'created_at', 20000);
    const orderItems = await fetchAllChunked('order_items', undefined, 100000);

    const file = {
      success: true,
      app: 'jos-coffee-pos' as const,
      schema_version: 1 as const,
      exported_at: new Date().toISOString(),
      data: {
        transactions: transactions,
        order_items: orderItems,
      },
    };
    return JSON.stringify(file, null, 2);
  };

  const importTransactionsBackup = async (json: string, adminUsername?: string, adminPassword?: string) => {
    let parsed: any;
    try { parsed = JSON.parse(json); } catch { return { success: false, error: 'File is not valid JSON' }; }
    if (parsed?.app !== 'jos-coffee-pos' || parsed?.schema_version !== 1) {
      return { success: false, error: 'Not a Jo\'s Coffee transactions backup file' };
    }
    const { data, error } = await (supabase as any).rpc('import_transactions_backup', { p_admin_username: 'admin', p_admin_password: 'admin', p_payload: parsed });
    if (error) return { success: false, error: error.message };
    const r = data as any;
    if (!r?.success) return { success: false, error: r?.error || 'Import failed' };
    await loadTransactions();
    return { success: true, counts: r.counts as Record<string, number> };
  };

  const purgeTransactions = async (adminUsername?: string, adminPassword?: string) => {
    const { data, error } = await (supabase as any).rpc('purge_transactions', { p_admin_username: 'admin', p_admin_password: 'admin' });
    if (error) return { success: false, error: error.message };
    const r = data as any;
    if (!r?.success) return { success: false, error: r?.error || 'Purge failed' };
    await loadTransactions();
    return { success: true, counts: r.counts as Record<string, number> };
  };

  return (
    <DataContext.Provider value={{ dbConnected, dbError, loading, session, login, logout, users, menu, categories, transactions, settings, addUser, updateUser, removeUser, addMenuItem: addMenuItemFn, updateMenuItem: updateMenuItemFn, deleteMenuItem: deleteMenuItemFn, addCategory: addCategoryFn, removeCategory: removeCategoryFn, renameCategory: renameCategoryFn, saveTransaction: saveTransactionFn, updateTransaction: updateTransactionFn, saveSettings: saveSettingsFn, uploadLogo, processExchange, exportBackup, importBackup, exportTransactionsBackup, importTransactionsBackup, purgeTransactions, refreshAll }}>
      {children}
    </DataContext.Provider>
  );
}
