// ============================================================
// Xignis App — Core Database Types (Infinity Model v2)
// ============================================================

// ---- Enums ----
export type UserRole = 'super_admin' | 'owner' | 'admin' | 'member' | 'viewer';
export type ItemStatus = 'available' | 'checked_out' | 'maintenance' | 'retired';
export type TransactionType = 'checkout' | 'checkin' | 'transfer';
export type TransactionStatus = 'active' | 'returned' | 'overdue' | 'cancelled';
export type ConditionGrade = 'excellent' | 'good' | 'fair' | 'poor';
export type MaintenanceType = 'repair' | 'calibration' | 'cleaning' | 'inspection';
export type FieldType = 'string' | 'number' | 'boolean' | 'select' | 'date' | 'url' | 'textarea';

// ---- Schema Field Definition ----
export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  sort_order: number;
  options?: string[];       // For 'select' type
  min?: number;             // For 'number' type
  max?: number;             // For 'number' type
  placeholder?: string;
  default_value?: string | number | boolean;
}

// ---- Organization ----
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrgSettings;
  created_at: string;
}

export interface OrgSettings {
  default_loan_days: number;
  require_approval: boolean;
  allow_self_checkout: boolean;
  max_items_per_checkout: number;
  overdue_notification_days: number[];
}

// ---- Users ----
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  joined_at: string;
  user?: UserProfile;
}

// ---- Categories (Infinite Tree) ----
export interface Category {
  id: string;
  org_id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
  item_count?: number;
}

export interface CategorySchema {
  id: string;
  category_id: string;
  fields: SchemaField[];
  version: number;
  updated_at: string;
}

// ---- Items ----
export interface Item {
  id: string;
  org_id: string;
  category_id: string;
  name: string;
  sku: string;
  status: ItemStatus;
  serial_number: string | null;
  quantity: number;
  quantity_available: number;
  attributes: Record<string, string | number | boolean>;
  qr_code: string | null;
  notes: string | null;
  is_consumable: boolean;
  acquired_at: string | null;
  created_at: string;
  category?: Category;
  images?: ItemImage[];
}

export interface ItemImage {
  id: string;
  item_id: string;
  url: string;
  path: string;
  is_primary: boolean;
  created_at?: string | null;
}

// ---- Transactions (Loans) ----
export interface Transaction {
  id: string;
  org_id: string;
  user_id: string;
  loan_code: string | null;
  approved_by?: string | null;
  type?: TransactionType;
  status: TransactionStatus;
  due_date: string | null;
  checked_out_at?: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  user?: UserProfile;
  approver?: UserProfile;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_id: string;
  quantity: number;
  condition_out: ConditionGrade | null;
  condition_in: ConditionGrade | null;
  notes?: string | null;
  item?: Item;
}

// ---- Maintenance ----
export interface MaintenanceLog {
  id: string;
  item_id: string;
  performed_by: string;
  type: MaintenanceType;
  description: string;
  cost: number | null;
  performed_at: string;
  next_due: string | null;
  performer?: UserProfile;
}

// ---- Audit ----
export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user?: UserProfile;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  total_items: number;
  available_items: number;
  checked_out_items: number;
  maintenance_items: number;
  active_loans: number;
  overdue_loans: number;
  total_categories: number;
  total_members: number;
}
