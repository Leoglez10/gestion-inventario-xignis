import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowSwitchIcon, CheckCircleIcon, PlusIcon, SearchIcon, XIcon, TrashIcon } from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { CheckoutKiosk } from './CheckoutKiosk';
import { PageLoader } from '../../../shared/components/PageLoader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ConditionGrade, ItemStatus, Transaction, TransactionStatus } from '../../../types/database';

const tabs = [
  { key: 'list', label: 'Historial', shortLabel: 'Historial' },
  { key: 'kiosk', label: 'Nuevo Préstamo', shortLabel: 'Nuevo' },
] as const;

export const LoansPage: React.FC = () => {
  const { transactions, returnTransaction, deleteTransaction } = useAppStore();
  const [searchParams] = useSearchParams();
  const hasStatusParam = searchParams.has('status');
  const [activeTab, setActiveTab] = useState<'list' | 'kiosk'>(hasStatusParam ? 'list' : 'list');
  const initialStatus = (searchParams.get('status') as TransactionStatus | 'all') || 'all';
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>(initialStatus);
  const [search, setSearch] = useState('');
  const [returningLoan, setReturningLoan] = useState<Transaction | null>(null);
  const [conditionIn, setConditionIn] = useState<ConditionGrade>('good');
  const [nextStatus, setNextStatus] = useState<ItemStatus>('available');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnError, setReturnError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [deletingLoan, setDeletingLoan] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    checkMobile();
    const media = window.matchMedia('(max-width: 640px)');
    media.addEventListener('change', checkMobile);
    return () => media.removeEventListener('change', checkMobile);
  }, []);

  const filteredLoans = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return transactions
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .filter(t => {
        if (!normalizedSearch) return true;
        return [
          t.loan_code,
          t.user?.full_name,
          t.user?.email,
          t.notes,
          ...(t.items?.flatMap(item => [item.item?.name, item.item?.sku]) ?? []),
        ].some(value => value?.toLowerCase().includes(normalizedSearch));
      });
  }, [transactions, statusFilter, search]);

  const handleReturn = async () => {
    if (!returningLoan) return;
    setIsReturning(true);
    setReturnError(null);
    const { error } = await returnTransaction(returningLoan.id, conditionIn, nextStatus, returnNotes);
    setIsReturning(false);
    if (error) {
      setReturnError(error);
      return;
    }
    setReturningLoan(null);
    setConditionIn('good');
    setNextStatus('available');
    setReturnNotes('');
  };

  const handleDelete = async () => {
    if (!deletingLoan) return;
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await deleteTransaction(deletingLoan.id);
    setIsDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeletingLoan(null);
  };

  const statusOptions: Array<{ value: TransactionStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'returned', label: 'Devueltos' },
    { value: 'overdue', label: 'Vencidos' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerText}>
            <h1 style={styles.title}>Préstamos</h1>
            {!isMobile && <p style={styles.subtitle}>Gestiona los préstamos de equipo</p>}
          </div>
          <button
            onClick={() => setActiveTab('kiosk')}
            style={styles.addButton}
            aria-label="Crear nuevo préstamo"
          >
            <PlusIcon size={16} />
            {!isMobile && <span>Nuevo Préstamo</span>}
          </button>
        </div>

        {/* Tabs - mobile pill style */}
        <nav style={isMobile ? styles.mobileTabs : styles.desktopTabs} role="tablist" aria-label="Navegación de préstamos">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={tab.key === 'list' ? 'loans-list' : 'loans-kiosk'}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
              }}
            >
              {tab.key === 'list' && <ArrowSwitchIcon size={14} />}
              <span>{isMobile ? tab.shortLabel : tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <div style={styles.content}>
        {activeTab === 'kiosk' ? (
          <CheckoutKiosk />
        ) : (
          <div id="loans-list" role="tabpanel">
            {/* Search & Filters */}
            <div style={styles.filtersRow}>
              <div style={styles.searchBox}>
                <SearchIcon size={14} fill="#656d76" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  style={styles.searchInput}
                  aria-label="Buscar préstamos"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={styles.clearSearch}
                    aria-label="Limpiar búsqueda"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>

              {isMobile ? (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={styles.filterToggle}
                  aria-expanded={showFilters}
                  aria-label="Mostrar filtros"
                >
                  <span style={styles.filterBadge}>{statusFilter !== 'all' ? '•' : ''}</span>
                  Filtros
                </button>
              ) : (
                <div style={styles.filterPills} role="group" aria-label="Filtrar por estado">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      style={{
                        ...styles.filterPill,
                        ...(statusFilter === opt.value ? styles.filterPillActive : {}),
                      }}
                      aria-pressed={statusFilter === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Filters Panel */}
            {isMobile && showFilters && (
              <div style={styles.mobileFilters}>
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setShowFilters(false);
                    }}
                    style={{
                      ...styles.mobileFilterOption,
                      ...(statusFilter === opt.value ? styles.mobileFilterOptionActive : {}),
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Loans List */}
            <div style={styles.loansList} role="list" aria-label="Lista de préstamos">
              {filteredLoans.length === 0 ? (
                <div style={styles.emptyState} role="status">
                  <p>No hay préstamos con esos filtros.</p>
                </div>
              ) : (
                filteredLoans.map((loan, i) => (
                  <article
                    key={loan.id}
                    style={styles.loanCard}
                    role="listitem"
                    aria-label={`Préstamo de ${loan.user?.full_name}`}
                  >
                    <div style={styles.loanMain}>
                      <div style={styles.avatar}>
                        {loan.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div style={styles.loanInfo}>
                        <div style={styles.loanName}>{loan.user?.full_name}</div>
                        <div style={styles.loanItems}>
                          {loan.items?.map(i => i.item?.name).join(', ') || 'Sin artículos'}
                        </div>
                        <div style={styles.loanMeta}>
                          <span style={styles.loanCode}>{loan.loan_code ?? 'Sin folio'}</span>
                          {loan.notes && <span> · {loan.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={styles.loanActions}>
                      <StatusBadge status={loan.status} variant="transaction" />
                      
                      <div style={styles.loanDates}>
                        <time style={styles.dateMain}>
                          {format(new Date(loan.created_at), 'dd MMM yyyy', { locale: es })}
                        </time>
                        {loan.due_date && (
                          <time style={loan.status === 'overdue' ? styles.dateOverdue : styles.dateSecondary}>
                            Vence: {format(new Date(loan.due_date), 'dd MMM', { locale: es })}
                          </time>
                        )}
                      </div>

                      {(loan.status === 'active' || loan.status === 'overdue') && (
                        <button
                          onClick={() => setReturningLoan(loan)}
                          style={styles.returnButton}
                          aria-label={`Devolver préstamo de ${loan.user?.full_name}`}
                        >
                          <CheckCircleIcon size={14} />
                          <span>Devolver</span>
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingLoan(loan)}
                        style={styles.deleteButton}
                        aria-label={`Eliminar préstamo de ${loan.user?.full_name}`}
                        title="Eliminar registro"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returningLoan && (
        <div
          style={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
        >
          <div style={styles.modal}>
            <header style={styles.modalHeader}>
              <h2 id="return-modal-title" style={styles.modalTitle}>Devolver préstamo</h2>
              <button
                onClick={() => setReturningLoan(null)}
                style={styles.modalClose}
                aria-label="Cerrar"
              >
                <XIcon size={16} />
              </button>
            </header>

            <p style={styles.modalSubtitle}>
              {returningLoan.loan_code ?? 'Sin folio'} · {returningLoan.user?.full_name ?? 'Usuario'}
            </p>

            {returnError && (
              <div style={styles.errorAlert} role="alert">
                {returnError}
              </div>
            )}

            <div style={styles.formGrid}>
              <label style={styles.fieldLabel}>
                Condición de regreso
                <select
                  value={conditionIn}
                  onChange={(event) => setConditionIn(event.target.value as ConditionGrade)}
                  style={styles.select}
                >
                  <option value="excellent">Excelente</option>
                  <option value="good">Buena</option>
                  <option value="fair">Regular</option>
                  <option value="poor">Mala</option>
                </select>
              </label>

              <label style={styles.fieldLabel}>
                Estado final del artículo
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as ItemStatus)}
                  style={styles.select}
                >
                  <option value="available">Disponible</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="retired">Dado de baja</option>
                </select>
              </label>

              <label style={styles.fieldLabel} style={{ gridColumn: '1 / -1' }}>
                Notas de devolución
                <textarea
                  value={returnNotes}
                  onChange={(event) => setReturnNotes(event.target.value)}
                  rows={3}
                  style={styles.textarea}
                  placeholder="Opcional: observaciones sobre el estado del equipo..."
                />
              </label>
            </div>

            <footer style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setReturningLoan(null)}
                style={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={isReturning}
                style={styles.confirmButton}
              >
                {isReturning ? 'Devolviendo...' : 'Confirmar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLoan && (
        <div
          style={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div style={styles.modal}>
            <header style={styles.modalHeader}>
              <h2 id="delete-modal-title" style={styles.modalTitle}>Eliminar préstamo</h2>
              <button
                onClick={() => { setDeletingLoan(null); setDeleteError(null); }}
                style={styles.modalClose}
                aria-label="Cerrar"
              >
                <XIcon size={16} />
              </button>
            </header>

            <p style={styles.modalSubtitle}>
              {deletingLoan.loan_code ?? 'Sin folio'} · {deletingLoan.user?.full_name ?? 'Usuario'}
            </p>

            {deleteError && (
              <div style={styles.errorAlert} role="alert">
                {deleteError}
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#1f2328', margin: '0 0 16px' }}>
              {deletingLoan.status === 'active' || deletingLoan.status === 'overdue'
                ? 'Este préstamo está activo. Los artículos se devolverán automáticamente a inventario.'
                : '¿Estás seguro de que quieres eliminar este registro de préstamo?'}
            </p>

            <footer style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => { setDeletingLoan(null); setDeleteError(null); }}
                style={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={styles.deleteConfirmButton}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f6f8fa',
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #d0d7de',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    gap: '12px',
  },
  headerText: {
    minWidth: 0,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2328',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '13px',
    color: '#656d76',
    margin: '4px 0 0',
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2da44e',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  mobileTabs: {
    display: 'flex',
    padding: '10px 16px',
    gap: '8px',
  },
  desktopTabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid #d0d7de',
    padding: '10px 16px',
  },
  tabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'inherit',
    color: '#656d76',
    borderRadius: '20px',
    transition: 'all 0.2s ease',
  },
  tabButtonActive: {
    backgroundColor: '#1f2328',
    color: '#fff',
    fontWeight: 600,
  },
  content: {
    padding: '24px 16px',
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #d0d7de',
    borderRadius: '10px',
    backgroundColor: '#fff',
    flex: '1 1 180px',
    maxWidth: '360px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '13px',
    color: '#1f2328',
  },
  clearSearch: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    padding: '2px',
    display: 'flex',
  },
  filterToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#1f2328',
  },
  filterBadge: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#f97316',
  },
  filterPills: {
    display: 'flex',
    gap: '2px',
    backgroundColor: '#f6f8fa',
    borderRadius: '8px',
    padding: '3px',
    border: '1px solid #d0d7de',
  },
  filterPill: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    color: '#656d76',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: '#fff',
    color: '#1f2328',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    fontWeight: 600,
  },
  mobileFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #d0d7de',
  },
  mobileFilterOption: {
    padding: '8px 14px',
    borderRadius: '20px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#656d76',
  },
  mobileFilterOptionActive: {
    backgroundColor: '#1f2328',
    color: '#fff',
    borderColor: '#1f2328',
  },
  loansList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: '#656d76',
    fontSize: '14px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #d0d7de',
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #d0d7de',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  loanMain: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ddf4ff 0%, #a5d6ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0969da',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  loanInfo: {
    minWidth: 0,
    flex: 1,
  },
  loanName: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1f2328',
    marginBottom: '2px',
  },
  loanItems: {
    fontSize: '13px',
    color: '#656d76',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loanMeta: {
    fontSize: '11px',
    color: '#8b949e',
  },
  loanCode: {
    fontWeight: 500,
  },
  loanActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #eef1f4',
  },
  loanDates: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    marginRight: 'auto',
  },
  dateMain: {
    fontSize: '12px',
    color: '#656d76',
  },
  dateSecondary: {
    fontSize: '11px',
    color: '#8b949e',
  },
  dateOverdue: {
    fontSize: '11px',
    color: '#cf222e',
    fontWeight: 500,
  },
  returnButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #2da44e',
    backgroundColor: '#fff',
    color: '#1a7f37',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#656d76',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: '32px',
    minWidth: '32px',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(31,35,40,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 24px 70px rgba(31,35,40,0.28)',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  modalTitle: {
    margin: 0,
    color: '#1f2328',
    fontSize: '18px',
    fontWeight: 600,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
  },
  modalSubtitle: {
    margin: '0 0 16px',
    color: '#656d76',
    fontSize: '13px',
  },
  errorAlert: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ff8182',
    backgroundColor: '#ffebe9',
    color: '#cf222e',
    fontSize: '13px',
  },
  formGrid: {
    display: 'grid',
    gap: '14px',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#1f2328',
    fontSize: '13px',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#1f2328',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#1f2328',
    backgroundColor: '#fff',
    resize: 'vertical',
    minHeight: '80px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#1f2328',
    fontFamily: 'inherit',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2da44e',
    color: '#fff',
    fontFamily: 'inherit',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteConfirmButton: {
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#cf222e',
    color: '#fff',
    fontFamily: 'inherit',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  },
};