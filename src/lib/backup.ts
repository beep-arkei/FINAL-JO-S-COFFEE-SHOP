// Backup file format v1 for Jo's Coffee POS
export interface BackupFileV1 {
  schema_version: 1;
  app: 'jos-coffee-pos';
  exported_at: string;
  users_passwords_included: boolean;
  data: {
    categories: any[];
    menu_items: any[];
    transactions: any[];
    order_items: any[];
    app_users: any[];
    store_settings: any | null;
  };
}

export type ValidateResult =
  | { ok: true; file: BackupFileV1 }
  | { ok: false; error: string };

export function validateBackup(input: unknown): ValidateResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Backup is not a JSON object' };
  const f = input as any;
  if (f.schema_version !== 1) return { ok: false, error: `Unsupported schema_version (expected 1, got ${f.schema_version})` };
  if (f.app !== 'jos-coffee-pos') return { ok: false, error: 'Not a Jo\'s Coffee POS backup file' };
  if (!f.data || typeof f.data !== 'object') return { ok: false, error: 'Missing data section' };
  const required = ['categories', 'menu_items', 'transactions', 'order_items', 'app_users'];
  for (const k of required) {
    if (!Array.isArray(f.data[k])) return { ok: false, error: `data.${k} must be an array` };
  }
  return { ok: true, file: f as BackupFileV1 };
}

export function backupCounts(file: BackupFileV1) {
  return {
    categories: file.data.categories.length,
    menu_items: file.data.menu_items.length,
    transactions: file.data.transactions.length,
    order_items: file.data.order_items.length,
    app_users: file.data.app_users.length,
  };
}

export function toSqlValue(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'string') {
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(val)) {
    const escapedElements = val.map(el => {
      if (el === null || el === undefined) return 'NULL';
      const s = typeof el === 'string' ? el : JSON.stringify(el);
      return `'${s.replace(/'/g, "''")}'`;
    });
    return `ARRAY[${escapedElements.join(', ')}]::text[]`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

export function generateSqlFromBackup(backup: any, isTransactionsOnly: boolean = false): string {
  const lines: string[] = [];
  
  lines.push(`-- =========================================================`);
  lines.push(`-- Jo's Coffee POS PostgreSQL Backup Export`);
  lines.push(`-- Exported At: ${backup.exported_at || new Date().toISOString()}`);
  lines.push(`-- Type: ${isTransactionsOnly ? 'Transactions-Only Backup' : 'Complete System Backup'}`);
  lines.push(`-- Schema Version: ${backup.schema_version || 1}`);
  lines.push(`-- =========================================================`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);

  if (isTransactionsOnly) {
    lines.push(`-- Clear existing transactions data safely`);
    lines.push(`DELETE FROM public.order_items;`);
    lines.push(`DELETE FROM public.transactions;`);
    lines.push(``);

    // Transactions
    const txs = backup.data?.transactions || [];
    if (txs.length > 0) {
      lines.push(`-- Inserting transactions (${txs.length} rows)`);
      for (const row of txs) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.transactions (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }

    // Order Items
    const ois = backup.data?.order_items || [];
    if (ois.length > 0) {
      lines.push(`-- Inserting order items (${ois.length} rows)`);
      for (const row of ois) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.order_items (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }
  } else {
    lines.push(`-- Clear all existing data safely adhering to foreign key constraints`);
    lines.push(`DELETE FROM public.order_items;`);
    lines.push(`DELETE FROM public.transactions;`);
    lines.push(`DELETE FROM public.menu_items;`);
    lines.push(`DELETE FROM public.categories;`);
    lines.push(`DELETE FROM public.app_users;`);
    lines.push(`DELETE FROM public.store_settings;`);
    lines.push(``);

    // Categories
    const cats = backup.data?.categories || [];
    if (cats.length > 0) {
      lines.push(`-- Inserting categories (${cats.length} rows)`);
      for (const row of cats) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.categories (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }

    // Menu Items
    const menu = backup.data?.menu_items || [];
    if (menu.length > 0) {
      lines.push(`-- Inserting menu items (${menu.length} rows)`);
      for (const row of menu) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.menu_items (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }

    // Store Settings
    const settings = backup.data?.store_settings;
    if (settings) {
      lines.push(`-- Inserting store settings`);
      const columns = Object.keys(settings);
      const values = columns.map(col => toSqlValue(settings[col]));
      lines.push(`INSERT INTO public.store_settings (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      lines.push(``);
    }

    // App Users
    const users = backup.data?.app_users || [];
    if (users.length > 0) {
      lines.push(`-- Inserting app users (${users.length} rows)`);
      for (const row of users) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.app_users (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }

    // Transactions
    const txs = backup.data?.transactions || [];
    if (txs.length > 0) {
      lines.push(`-- Inserting transactions (${txs.length} rows)`);
      for (const row of txs) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.transactions (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }

    // Order Items
    const ois = backup.data?.order_items || [];
    if (ois.length > 0) {
      lines.push(`-- Inserting order items (${ois.length} rows)`);
      for (const row of ois) {
        const columns = Object.keys(row);
        const values = columns.map(col => toSqlValue(row[col]));
        lines.push(`INSERT INTO public.order_items (${columns.join(', ')}) VALUES (${values.join(', ')});`);
      }
      lines.push(``);
    }
  }

  lines.push(`COMMIT;`);
  return lines.join('\n');
}
