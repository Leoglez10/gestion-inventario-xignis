import type {
  Category, CategorySchema, Item, Transaction, TransactionItem,
  UserProfile, OrgMember, Organization, DashboardStats, SchemaField,
} from '../types/database';
import { v4 as uuid } from 'uuid';

// ---- Organization ----
export const mockOrg: Organization = {
  id: uuid(), name: 'Cinelab Productions', slug: 'cinelab',
  settings: { default_loan_days: 7, require_approval: false, allow_self_checkout: true, max_items_per_checkout: 10, overdue_notification_days: [1, 3, 7] },
  created_at: '2025-01-15T10:00:00Z',
};

// ---- Users ----
export const mockUsers: UserProfile[] = [
  { id: 'u1', email: 'carlos@cinelab.com', full_name: 'Carlos Mendoza', avatar_url: null, created_at: '2025-01-15T10:00:00Z' },
  { id: 'u2', email: 'ana@cinelab.com', full_name: 'Ana Ríos', avatar_url: null, created_at: '2025-02-10T08:00:00Z' },
  { id: 'u3', email: 'pedro@cinelab.com', full_name: 'Pedro Vásquez', avatar_url: null, created_at: '2025-03-01T09:00:00Z' },
  { id: 'u4', email: 'sofia@cinelab.com', full_name: 'Sofía Delgado', avatar_url: null, created_at: '2025-03-20T14:00:00Z' },
];

export const mockMembers: OrgMember[] = [
  { id: 'm1', org_id: mockOrg.id, user_id: 'u1', role: 'owner', is_active: true, joined_at: '2025-01-15T10:00:00Z', user: mockUsers[0] },
  { id: 'm2', org_id: mockOrg.id, user_id: 'u2', role: 'admin', is_active: true, joined_at: '2025-02-10T08:00:00Z', user: mockUsers[1] },
  { id: 'm3', org_id: mockOrg.id, user_id: 'u3', role: 'member', is_active: true, joined_at: '2025-03-01T09:00:00Z', user: mockUsers[2] },
  { id: 'm4', org_id: mockOrg.id, user_id: 'u4', role: 'viewer', is_active: true, joined_at: '2025-03-20T14:00:00Z', user: mockUsers[3] },
];

// ---- Categories ----
export const mockCategories: Category[] = [
  { id: 'cat-cameras', org_id: mockOrg.id, parent_id: null, name: 'Cámaras', icon: 'device-camera', description: 'Cuerpos de cámara', sort_order: 1, is_active: true, item_count: 4 },
  { id: 'cat-lenses', org_id: mockOrg.id, parent_id: null, name: 'Lentes', icon: 'eye', description: 'Objetivos y lentes', sort_order: 2, is_active: true, item_count: 3 },
  { id: 'cat-drones', org_id: mockOrg.id, parent_id: null, name: 'Drones', icon: 'rocket', description: 'Drones y UAVs', sort_order: 3, is_active: true, item_count: 2 },
  { id: 'cat-audio', org_id: mockOrg.id, parent_id: null, name: 'Audio', icon: 'unmute', description: 'Equipos de audio', sort_order: 4, is_active: true, item_count: 3 },
  { id: 'cat-lighting', org_id: mockOrg.id, parent_id: null, name: 'Iluminación', icon: 'sun', description: 'Luces y accesorios', sort_order: 5, is_active: true, item_count: 2 },
  { id: 'cat-batteries', org_id: mockOrg.id, parent_id: 'cat-cameras', name: 'Baterías', icon: 'zap', description: 'Baterías y cargadores', sort_order: 1, is_active: true, item_count: 2 },
];

// ---- Schemas ----
const cameraFields: SchemaField[] = [
  { key: 'resolution', label: 'Resolución', type: 'select', options: ['4K', '6K', '8K', '12K'], required: true, sort_order: 1 },
  { key: 'sensor_size', label: 'Sensor', type: 'string', required: false, sort_order: 2 },
  { key: 'mount', label: 'Montura', type: 'select', options: ['E-Mount', 'RF', 'L-Mount', 'PL', 'EF'], required: true, sort_order: 3 },
  { key: 'weight_g', label: 'Peso (g)', type: 'number', min: 0, max: 10000, required: false, sort_order: 4 },
];

const lensFields: SchemaField[] = [
  { key: 'focal_length', label: 'Distancia focal', type: 'string', required: true, sort_order: 1 },
  { key: 'aperture', label: 'Apertura máx.', type: 'string', required: true, sort_order: 2 },
  { key: 'mount', label: 'Montura', type: 'select', options: ['E-Mount', 'RF', 'L-Mount', 'PL', 'EF'], required: true, sort_order: 3 },
  { key: 'is_stabilized', label: 'Estabilizado', type: 'boolean', required: false, sort_order: 4 },
];

const droneFields: SchemaField[] = [
  { key: 'flight_time', label: 'Tiempo de vuelo (min)', type: 'number', required: true, sort_order: 1 },
  { key: 'range_km', label: 'Rango (km)', type: 'number', required: true, sort_order: 2 },
  { key: 'has_gps', label: 'GPS', type: 'boolean', required: false, sort_order: 3 },
  { key: 'camera_resolution', label: 'Resolución cámara', type: 'select', options: ['4K', '5.4K', '8K'], required: true, sort_order: 4 },
];

export const mockSchemas: CategorySchema[] = [
  { id: 'sch1', category_id: 'cat-cameras', fields: cameraFields, version: 1, updated_at: '2025-01-20T10:00:00Z' },
  { id: 'sch2', category_id: 'cat-lenses', fields: lensFields, version: 1, updated_at: '2025-01-20T10:00:00Z' },
  { id: 'sch3', category_id: 'cat-drones', fields: droneFields, version: 1, updated_at: '2025-01-20T10:00:00Z' },
];

// ---- Items ----
export const mockItems: Item[] = [
  { id: 'i1', org_id: mockOrg.id, category_id: 'cat-cameras', name: 'Sony A7 IV', sku: 'CAM-001', status: 'available', serial_number: 'SN-A7IV-001', quantity: 1, quantity_available: 1, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-01-20', created_at: '2025-01-20', attributes: { resolution: '4K', sensor_size: 'Full Frame 33MP', mount: 'E-Mount', weight_g: 659 } },
  { id: 'i2', org_id: mockOrg.id, category_id: 'cat-cameras', name: 'Sony FX6', sku: 'CAM-002', status: 'checked_out', serial_number: 'SN-FX6-001', quantity: 1, quantity_available: 0, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-02-15', created_at: '2025-02-15', attributes: { resolution: '4K', sensor_size: 'Full Frame 10.2MP', mount: 'E-Mount', weight_g: 890 } },
  { id: 'i3', org_id: mockOrg.id, category_id: 'cat-cameras', name: 'RED Komodo 6K', sku: 'CAM-003', status: 'available', serial_number: 'SN-RED-001', quantity: 1, quantity_available: 1, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-03-01', created_at: '2025-03-01', attributes: { resolution: '6K', sensor_size: 'S35', mount: 'RF', weight_g: 1010 } },
  { id: 'i4', org_id: mockOrg.id, category_id: 'cat-cameras', name: 'Blackmagic Pocket 6K Pro', sku: 'CAM-004', status: 'maintenance', serial_number: 'SN-BMP-001', quantity: 1, quantity_available: 0, is_consumable: false, qr_code: null, notes: 'Sensor cleaning scheduled', acquired_at: '2025-01-25', created_at: '2025-01-25', attributes: { resolution: '6K', sensor_size: 'S35', mount: 'EF', weight_g: 1238 } },
  { id: 'i5', org_id: mockOrg.id, category_id: 'cat-lenses', name: 'Sony 24-70mm f/2.8 GM II', sku: 'LEN-001', status: 'available', serial_number: 'SN-2470-001', quantity: 1, quantity_available: 1, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-01-20', created_at: '2025-01-20', attributes: { focal_length: '24-70mm', aperture: 'f/2.8', mount: 'E-Mount', is_stabilized: false } },
  { id: 'i6', org_id: mockOrg.id, category_id: 'cat-lenses', name: 'Sony 70-200mm f/2.8 GM II', sku: 'LEN-002', status: 'checked_out', serial_number: 'SN-70200-001', quantity: 1, quantity_available: 0, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-02-01', created_at: '2025-02-01', attributes: { focal_length: '70-200mm', aperture: 'f/2.8', mount: 'E-Mount', is_stabilized: true } },
  { id: 'i7', org_id: mockOrg.id, category_id: 'cat-lenses', name: 'Canon RF 50mm f/1.2L', sku: 'LEN-003', status: 'available', serial_number: 'SN-RF50-001', quantity: 1, quantity_available: 1, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-03-10', created_at: '2025-03-10', attributes: { focal_length: '50mm', aperture: 'f/1.2', mount: 'RF', is_stabilized: false } },
  { id: 'i8', org_id: mockOrg.id, category_id: 'cat-drones', name: 'DJI Mavic 3 Pro', sku: 'DRN-001', status: 'available', serial_number: 'SN-MAV3-001', quantity: 1, quantity_available: 1, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-02-20', created_at: '2025-02-20', attributes: { flight_time: 43, range_km: 28, has_gps: true, camera_resolution: '5.4K' } },
  { id: 'i9', org_id: mockOrg.id, category_id: 'cat-drones', name: 'DJI Inspire 3', sku: 'DRN-002', status: 'checked_out', serial_number: 'SN-INS3-001', quantity: 1, quantity_available: 0, is_consumable: false, qr_code: null, notes: null, acquired_at: '2025-04-01', created_at: '2025-04-01', attributes: { flight_time: 28, range_km: 15, has_gps: true, camera_resolution: '8K' } },
  { id: 'i10', org_id: mockOrg.id, category_id: 'cat-batteries', name: 'Sony NP-FZ100', sku: 'BAT-001', status: 'available', serial_number: null, quantity: 20, quantity_available: 14, is_consumable: true, qr_code: null, notes: null, acquired_at: '2025-01-20', created_at: '2025-01-20', attributes: {} },
  { id: 'i11', org_id: mockOrg.id, category_id: 'cat-batteries', name: 'Anton Bauer Titon 150 V-Mount', sku: 'BAT-002', status: 'available', serial_number: null, quantity: 8, quantity_available: 5, is_consumable: true, qr_code: null, notes: null, acquired_at: '2025-02-01', created_at: '2025-02-01', attributes: {} },
];

// ---- Transactions ----
export const mockTransactions: Transaction[] = [
  {
    id: 't1', org_id: mockOrg.id, user_id: 'u3', approved_by: 'u2', type: 'checkout', status: 'active',
    due_date: '2026-05-05T18:00:00Z', returned_at: null, notes: 'Producción documental campo', created_at: '2026-04-28T09:00:00Z',
    user: mockUsers[2], approver: mockUsers[1],
    items: [
      { id: 'ti1', transaction_id: 't1', item_id: 'i2', quantity: 1, condition_out: 'excellent', condition_in: null, notes: null, item: mockItems[1] },
      { id: 'ti2', transaction_id: 't1', item_id: 'i6', quantity: 1, condition_out: 'good', condition_in: null, notes: null, item: mockItems[5] },
    ],
  },
  {
    id: 't2', org_id: mockOrg.id, user_id: 'u4', approved_by: 'u1', type: 'checkout', status: 'active',
    due_date: '2026-05-03T18:00:00Z', returned_at: null, notes: 'Grabación aérea comercial', created_at: '2026-04-27T14:00:00Z',
    user: mockUsers[3], approver: mockUsers[0],
    items: [
      { id: 'ti3', transaction_id: 't2', item_id: 'i9', quantity: 1, condition_out: 'excellent', condition_in: null, notes: null, item: mockItems[8] },
    ],
  },
  {
    id: 't3', org_id: mockOrg.id, user_id: 'u2', approved_by: 'u1', type: 'checkout', status: 'returned',
    due_date: '2026-04-25T18:00:00Z', returned_at: '2026-04-24T16:30:00Z', notes: 'Sesión fotográfica evento', created_at: '2026-04-20T08:00:00Z',
    user: mockUsers[1], approver: mockUsers[0],
    items: [
      { id: 'ti4', transaction_id: 't3', item_id: 'i1', quantity: 1, condition_out: 'excellent', condition_in: 'excellent', notes: null, item: mockItems[0] },
      { id: 'ti5', transaction_id: 't3', item_id: 'i5', quantity: 1, condition_out: 'good', condition_in: 'good', notes: null, item: mockItems[4] },
    ],
  },
];

// ---- Dashboard Stats ----
export const mockDashboardStats: DashboardStats = {
  total_items: 11, available_items: 6, checked_out_items: 3, maintenance_items: 1,
  active_loans: 2, overdue_loans: 0, total_categories: 6, total_members: 4,
};
