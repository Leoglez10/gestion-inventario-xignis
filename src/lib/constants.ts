export const APP_NAME = 'Xignis App';
export const APP_VERSION = '0.1.0';

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  available: { bg: '#dafbe1', text: '#1a7f37', dot: '#1a7f37' },
  checked_out: { bg: '#ddf4ff', text: '#0969da', dot: '#0969da' },
  maintenance: { bg: '#fff8c5', text: '#9a6700', dot: '#9a6700' },
  retired: { bg: '#ffebe9', text: '#cf222e', dot: '#cf222e' },
};

export const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  checked_out: 'Prestado',
  maintenance: 'Mantenimiento',
  retired: 'Dado de baja',
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  returned: 'Devuelto',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export const TRANSACTION_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#ddf4ff', text: '#0969da' },
  returned: { bg: '#dafbe1', text: '#1a7f37' },
  overdue: { bg: '#ffebe9', text: '#cf222e' },
  cancelled: { bg: '#f6f8fa', text: '#57606a' },
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin general',
  owner: 'Direccion',
  admin: 'Admin inventario',
  member: 'Operador',
  viewer: 'Solo lectura',
};

export const ADMIN_ROLES = ['super_admin', 'owner', 'admin'];

export const isAdminRole = (role: string | null | undefined) =>
  !!role && ADMIN_ROLES.includes(role);

export const FIELD_TYPE_LABELS: Record<string, string> = {
  string: 'Texto',
  number: 'Número',
  boolean: 'Sí/No',
  select: 'Selección',
  date: 'Fecha',
  url: 'URL',
  textarea: 'Texto largo',
};
