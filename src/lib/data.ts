// Types and utility functions only — all data operations are in DataContext

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryId: string;
  prices: Record<string, number>;
  archived: boolean;
  image?: string;
  outOfStock?: boolean;
  tags?: string[];
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  customizations: string[];
}

export interface Transaction {
  id: string;
  code: string;
  items: OrderItem[];
  subtotal: number;
  adjustment: number;
  adjustmentInput: string;
  total: number;
  cashReceived: number;
  change: number;
  cashier: string;
  timestamp: string;
  status: 'paid' | 'refunded' | 'voided';
  customerName?: string;
  specialInstructions?: string;
  refundedAt?: string;
  refundedBy?: string;
  voided?: boolean;
  voidedAt?: string;
  voidedBy?: string;
}

export interface StoreSettings {
  id: string;
  name: string;
  logo: string;
  locked: boolean;
}

export function generateTransactionId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `JCS-${dateStr}-${rand}`;
}

export function parseAdjustment(input: string, subtotal: number): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed.slice(0, -1));
    if (isNaN(pct)) return 0;
    return subtotal * (pct / 100);
  }
  const val = parseFloat(trimmed);
  return isNaN(val) ? 0 : val;
}
