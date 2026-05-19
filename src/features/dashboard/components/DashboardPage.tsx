import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageIcon, ArrowSwitchIcon, AlertIcon, PeopleIcon,
  CheckCircleIcon, ToolsIcon, GraphIcon, GearIcon, XIcon,
  PlusIcon, ClockIcon, GraphBarHorizontalIcon,
} from '@primer/octicons-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../../../lib/store';
import { useAuthStore } from '../../../lib/authStore';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { format, subMonths, startOfMonth, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

// ---- Widget definitions ----
type WidgetId =
  | 'total' | 'available' | 'checked_out' | 'maintenance'
  | 'active_loans' | 'overdue' | 'categories' | 'members'
  | 'quick_actions' | 'activity'
  | 'distribution_chart' | 'loans_chart';

interface WidgetDef {
  id: WidgetId;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  accent: string;
  getValue: (stats: ReturnType<typeof computeStats>) => number | null;
  linkTo: string;
  linkLabel: string;
}

const computeStats = (items: any[], transactions: any[], categories: any[], members: any[]) => ({
  total_items: items.length,
  available_items: items.filter(i => i.status === 'available').length,
  checked_out_items: items.filter(i => i.status === 'checked_out').length,
  maintenance_items: items.filter(i => i.status === 'maintenance').length,
  active_loans: transactions.filter(t => t.status === 'active').length,
  overdue_loans: transactions.filter(t => t.status === 'overdue').length,
  total_categories: categories.length,
  total_members: members.length,
});

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'total', title: 'Total equipos', icon: <PackageIcon size={20} />, color: '#0969da', bgColor: '#ddf4ff', accent: '#0969da', getValue: s => s.total_items, linkTo: '/inventory', linkLabel: 'Ver inventario' },
  { id: 'available', title: 'Disponibles', icon: <CheckCircleIcon size={20} />, color: '#1a7f37', bgColor: '#dafbe1', accent: '#1a7f37', getValue: s => s.available_items, linkTo: '/inventory?status=available', linkLabel: 'Ver disponibles' },
  { id: 'checked_out', title: 'Prestados', icon: <ArrowSwitchIcon size={20} />, color: '#0969da', bgColor: '#ddf4ff', accent: '#0969da', getValue: s => s.checked_out_items, linkTo: '/inventory?status=checked_out', linkLabel: 'Ver prestados' },
  { id: 'maintenance', title: 'Mantenimiento', icon: <ToolsIcon size={20} />, color: '#9a6700', bgColor: '#fff8c5', accent: '#9a6700', getValue: s => s.maintenance_items, linkTo: '/inventory?status=maintenance', linkLabel: 'Ver mantenimiento' },
  { id: 'active_loans', title: 'Préstamos activos', icon: <ArrowSwitchIcon size={20} />, color: '#8250df', bgColor: '#fbefff', accent: '#8250df', getValue: s => s.active_loans, linkTo: '/loans?status=active', linkLabel: 'Ver activos' },
  { id: 'overdue', title: 'Vencidos', icon: <AlertIcon size={20} />, color: '#cf222e', bgColor: '#ffebe9', accent: '#cf222e', getValue: s => s.overdue_loans, linkTo: '/loans?status=overdue', linkLabel: 'Ver vencidos' },
  { id: 'categories', title: 'Categorías', icon: <GraphIcon size={20} />, color: '#0969da', bgColor: '#ddf4ff', accent: '#0969da', getValue: s => s.total_categories, linkTo: '/settings', linkLabel: 'Gestionar' },
  { id: 'members', title: 'Miembros', icon: <PeopleIcon size={20} />, color: '#1a7f37', bgColor: '#dafbe1', accent: '#1a7f37', getValue: s => s.total_members, linkTo: '/members', linkLabel: 'Ver miembros' },
];

const DEFAULT_VISIBLE: WidgetId[] = ['total', 'available', 'checked_out', 'maintenance', 'active_loans', 'overdue', 'categories', 'members', 'distribution_chart', 'loans_chart'];

const getStorageKey = (userId: string) => `xignis_dashboard_${userId}`;

const loadWidgetConfig = (userId: string): WidgetId[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_VISIBLE;
};

const saveWidgetConfig = (userId: string, widgets: WidgetId[]) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(widgets));
  } catch {}
};

// ---- Status colors for donut ----
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: '#2da44e' },
  checked_out: { label: 'Prestado', color: '#0969da' },
  maintenance: { label: 'Mantenimiento', color: '#d4a72c' },
  retired: { label: 'Dado de baja', color: '#cf222e' },
};

// ---- Custom tooltip for charts ----
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#1f2328', color: '#f0f6fc', padding: '8px 12px',
      borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      {label && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color || p.fill, display: 'inline-block' }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ---- Stat Card component ----
interface StatCardProps {
  def: WidgetDef;
  value: number;
  isMobile: boolean;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ def, value, isMobile, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      backgroundColor: '#fff',
      border: '1px solid #d0d7de',
      borderRadius: '10px',
      padding: isMobile ? '14px' : '18px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'left',
      transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
      borderLeft: `3px solid ${def.accent}`,
      width: '100%',
      minHeight: '44px',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = def.accent;
      e.currentTarget.style.boxShadow = `0 2px 8px ${def.bgColor}`;
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#d0d7de';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'none';
    }}
    onFocus={e => { e.currentTarget.style.outline = `2px solid ${def.accent}`; e.currentTarget.style.outlineOffset = '2px'; }}
    onBlur={e => { e.currentTarget.style.outline = 'none'; }}
    aria-label={`${def.title}: ${value}. ${def.linkLabel}`}
  >
    <div>
      <div style={{ fontSize: '12px', color: '#656d76', marginBottom: '4px', fontWeight: 500 }}>{def.title}</div>
      <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 700, color: '#1f2328', lineHeight: 1.2 }}>{value}</div>
    </div>
    <div style={{
      width: '40px', height: '40px', borderRadius: '10px', backgroundColor: def.bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: def.color, flexShrink: 0,
    }}>
      {def.icon}
    </div>
  </button>
);

// ---- Donut Chart Widget ----
const DistributionChart: React.FC<{ items: any[]; isMobile: boolean }> = ({ items, isMobile }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({
        name: STATUS_CONFIG[status]?.label ?? status,
        value,
        color: STATUS_CONFIG[status]?.color ?? '#8b949e',
        status,
      }));
  }, [items]);

  const total = items.length;

  return (
    <div style={{
      backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px',
      padding: isMobile ? '16px' : '20px',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', marginBottom: '16px' }}>
        Distribución de inventario
      </div>
      {total === 0 ? (
        <div style={{ textAlign: 'center', color: '#656d76', fontSize: '13px', padding: '24px 0' }}>
          Sin datos de inventario
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '24px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ position: 'relative', width: isMobile ? 160 : 180, height: isMobile ? 160 : 180, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 45 : 55}
                  outerRadius={isMobile ? 70 : 80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 700, color: '#1f2328', lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: '10px', color: '#656d76' }}>total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {data.map(d => (
              <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: d.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: '#1f2328' }}>{d.name}</span>
                <span style={{ fontWeight: 600, color: '#1f2328' }}>{d.value}</span>
                <span style={{ color: '#8b949e', fontSize: '11px', width: '36px', textAlign: 'right' }}>
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Bar Chart Widget (loans per month) ----
const LoansPerMonthChart: React.FC<{ transactions: any[]; isMobile: boolean }> = ({ transactions, isMobile }) => {
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: es }),
        count: 0,
      });
    }
    for (const t of transactions) {
      const created = new Date(t.created_at);
      if (!isAfter(created, subMonths(now, 6))) continue;
      const key = format(created, 'yyyy-MM');
      const month = months.find(m => m.key === key);
      if (month) month.count++;
    }
    return months.map(m => ({ name: m.label, Préstamos: m.count }));
  }, [transactions]);

  return (
    <div style={{
      backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px',
      padding: isMobile ? '16px' : '20px',
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', marginBottom: '16px' }}>
        Préstamos por mes
      </div>
      <div style={{ width: '100%', height: isMobile ? 180 : 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#656d76' }}
              axisLine={{ stroke: '#d0d7de' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#656d76' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(9,105,218,0.06)' }} />
            <Bar
              dataKey="Préstamos"
              fill="#0969da"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ---- Main Dashboard ----
export const DashboardPage: React.FC = () => {
  const { items, transactions, categories, members } = useAppStore();
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [showConfig, setShowConfig] = useState(false);

  const userId = profile?.id ?? 'anonymous';
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetId[]>(() => loadWidgetConfig(userId));

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const stats = useMemo(() => computeStats(items, transactions, categories, members), [items, transactions, categories, members]);
  const recentLoans = useMemo(() => transactions.slice(0, 5), [transactions]);

  const activityFeed = useMemo(() => {
    const events: { id: string; text: string; time: string; type: 'loan' | 'return' | 'new' }[] = [];
    for (const t of transactions.slice(0, 10)) {
      if (t.status === 'active') {
        events.push({
          id: `loan-${t.id}`,
          text: `${t.user?.full_name ?? 'Usuario'} tomó ${t.items?.length ?? 0} equipo${(t.items?.length ?? 0) !== 1 ? 's' : ''}`,
          time: t.created_at,
          type: 'loan',
        });
      } else if (t.status === 'returned' && t.returned_at) {
        events.push({
          id: `return-${t.id}`,
          text: `${t.user?.full_name ?? 'Usuario'} devolvió ${t.items?.length ?? 0} equipo${(t.items?.length ?? 0) !== 1 ? 's' : ''}`,
          time: t.returned_at,
          type: 'return',
        });
      }
    }
    return events.slice(0, 5);
  }, [transactions]);

  const toggleWidget = useCallback((id: WidgetId) => {
    setVisibleWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      saveWidgetConfig(userId, next);
      return next;
    });
  }, [userId]);

  const resetWidgets = useCallback(() => {
    setVisibleWidgets(DEFAULT_VISIBLE);
    saveWidgetConfig(userId, DEFAULT_VISIBLE);
  }, [userId]);

  const activeWidgetDefs = WIDGET_DEFS.filter(w => visibleWidgets.includes(w.id));
  const showQuickActions = visibleWidgets.includes('quick_actions');
  const showActivity = visibleWidgets.includes('activity');
  const showDistribution = visibleWidgets.includes('distribution_chart');
  const showLoansChart = visibleWidgets.includes('loans_chart');

  const configWidgets = [
    ...WIDGET_DEFS,
    { id: 'quick_actions' as WidgetId, title: 'Acciones rápidas', icon: <PlusIcon size={16} />, color: '#0969da', bgColor: '#ddf4ff', accent: '#0969da' },
    { id: 'activity' as WidgetId, title: 'Actividad reciente', icon: <ClockIcon size={16} />, color: '#656d76', bgColor: '#f6f8fa', accent: '#656d76' },
    { id: 'distribution_chart' as WidgetId, title: 'Gráfica de distribución', icon: <GraphBarHorizontalIcon size={16} />, color: '#2da44e', bgColor: '#dafbe1', accent: '#2da44e' },
    { id: 'loans_chart' as WidgetId, title: 'Préstamos por mes', icon: <GraphIcon size={16} />, color: '#0969da', bgColor: '#ddf4ff', accent: '#0969da' },
  ];

  return (
    <div style={{ padding: isMobile ? '16px' : '24px 32px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between', marginBottom: '20px',
        flexDirection: isMobile ? 'column' : 'row', gap: '8px',
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '24px', fontWeight: 700, color: '#1f2328', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#656d76', margin: '4px 0 0' }}>Resumen general del inventario y préstamos</p>
        </div>
        <button
          type="button" onClick={() => setShowConfig(!showConfig)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            border: showConfig ? '1px solid #0969da' : '1px solid #d0d7de',
            backgroundColor: showConfig ? '#ddf4ff' : '#fff',
            color: showConfig ? '#0969da' : '#656d76',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s', minHeight: '44px',
          }}
          aria-label={showConfig ? 'Cerrar configuración' : 'Personalizar dashboard'}
          aria-expanded={showConfig}
        >
          <GearIcon size={14} /> {showConfig ? 'Listo' : 'Personalizar'}
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328' }}>Widgets visibles</div>
              <div style={{ fontSize: '12px', color: '#656d76' }}>Selecciona qué quieres ver en tu dashboard</div>
            </div>
            <button
              type="button" onClick={resetWidgets}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d0d7de', backgroundColor: '#f6f8fa', color: '#656d76', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '32px' }}
            >
              Restablecer
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px' }}>
            {configWidgets.map(w => (
              <button
                key={w.id} type="button" onClick={() => toggleWidget(w.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px',
                  border: visibleWidgets.includes(w.id) ? `1px solid ${w.accent}` : '1px solid #d0d7de',
                  backgroundColor: visibleWidgets.includes(w.id) ? w.bgColor : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
                  fontWeight: visibleWidgets.includes(w.id) ? 600 : 400,
                  color: visibleWidgets.includes(w.id) ? w.color : '#656d76',
                  transition: 'all 0.15s', minHeight: '44px', textAlign: 'left',
                }}
                role="switch" aria-checked={visibleWidgets.includes(w.id)}
                aria-label={`${visibleWidgets.includes(w.id) ? 'Ocultar' : 'Mostrar'} ${w.title}`}
              >
                <span style={{ color: visibleWidgets.includes(w.id) ? w.color : '#8b949e' }}>{w.icon}</span>
                <span>{w.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      {activeWidgetDefs.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '16px' : '24px',
        }}>
          {activeWidgetDefs.map(def => (
            <StatCard key={def.id} def={def} value={def.getValue(stats) ?? 0} isMobile={isMobile} onClick={() => navigate(def.linkTo)} />
          ))}
        </div>
      )}

      {/* Charts row */}
      {(showDistribution || showLoansChart) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (showDistribution && showLoansChart ? '1fr 1fr' : '1fr'),
          gap: isMobile ? '12px' : '16px',
          marginBottom: isMobile ? '16px' : '24px',
        }}>
          {showDistribution && <DistributionChart items={items} isMobile={isMobile} />}
          {showLoansChart && <LoansPerMonthChart transactions={transactions} isMobile={isMobile} />}
        </div>
      )}

      {/* Quick Actions */}
      {showQuickActions && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px', padding: '16px', marginBottom: isMobile ? '16px' : '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', marginBottom: '12px' }}>Acciones rápidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
            <button type="button" onClick={() => navigate('/loans')} style={quickActionStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0969da'; e.currentTarget.style.backgroundColor = '#ddf4ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d7de'; e.currentTarget.style.backgroundColor = '#fff'; }}>
              <ArrowSwitchIcon size={18} fill="#0969da" />
              <span style={{ fontWeight: 600, color: '#1f2328' }}>Nuevo préstamo</span>
              <span style={{ fontSize: '12px', color: '#656d76' }}>Registrar salida de equipo</span>
            </button>
            <button type="button" onClick={() => navigate('/inventory')} style={quickActionStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2da44e'; e.currentTarget.style.backgroundColor = '#dafbe1'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d7de'; e.currentTarget.style.backgroundColor = '#fff'; }}>
              <PlusIcon size={18} fill="#2da44e" />
              <span style={{ fontWeight: 600, color: '#1f2328' }}>Agregar equipo</span>
              <span style={{ fontSize: '12px', color: '#656d76' }}>Alta de nuevo artículo</span>
            </button>
            <button type="button" onClick={() => navigate('/loans?status=overdue')} style={quickActionStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#cf222e'; e.currentTarget.style.backgroundColor = '#ffebe9'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0d7de'; e.currentTarget.style.backgroundColor = '#fff'; }}>
              <AlertIcon size={18} fill="#cf222e" />
              <span style={{ fontWeight: 600, color: '#1f2328' }}>Ver vencidos</span>
              <span style={{ fontSize: '12px', color: '#656d76' }}>Préstamos fuera de tiempo</span>
            </button>
          </div>
        </div>
      )}

      {/* Activity + Recent Loans grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: (showActivity && !isMobile) ? '1fr 1fr' : '1fr',
        gap: '16px',
      }}>
        {/* Recent loans */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', margin: 0 }}>Préstamos recientes</h2>
            <button type="button" onClick={() => navigate('/loans')}
              style={{ background: 'none', border: 'none', color: '#0969da', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: '4px', minHeight: '28px' }}>
              Ver todos
            </button>
          </div>
          {recentLoans.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#656d76', fontSize: '13px' }}>Sin préstamos recientes</div>
          ) : (
            recentLoans.map(loan => (
              <div key={loan.id}
                style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer', transition: 'background-color 0.1s' }}
                onClick={() => navigate('/loans')}
                onKeyDown={e => { if (e.key === 'Enter') navigate('/loans'); }}
                tabIndex={0} role="link" aria-label={`Préstamo de ${loan.user?.full_name}`}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ddf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0969da', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {loan.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#1f2328', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.user?.full_name}</div>
                    <div style={{ color: '#656d76', fontSize: '12px' }}>
                      {loan.items?.length} equipo{(loan.items?.length ?? 0) > 1 ? 's' : ''}
                      {loan.loan_code && ` · ${loan.loan_code}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <StatusBadge status={loan.status} variant="transaction" />
                  <span style={{ color: '#8b949e', fontSize: '11px' }}>{format(new Date(loan.created_at), 'dd MMM', { locale: es })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity feed */}
        {showActivity && (
          <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #d0d7de' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', margin: 0 }}>Actividad reciente</h2>
            </div>
            {activityFeed.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#656d76', fontSize: '13px' }}>Sin actividad reciente</div>
            ) : (
              activityFeed.map(event => (
                <div key={event.id} style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f4', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0, backgroundColor: event.type === 'loan' ? '#0969da' : event.type === 'return' ? '#1a7f37' : '#656d76' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#1f2328' }}>{event.text}</div>
                    <div style={{ color: '#8b949e', fontSize: '11px', marginTop: '2px' }}>
                      {format(new Date(event.time), "dd MMM 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const quickActionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px',
  padding: '16px', borderRadius: '10px', border: '1px solid #d0d7de', backgroundColor: '#fff',
  cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, background-color 0.15s', minHeight: '44px',
};
