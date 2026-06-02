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
