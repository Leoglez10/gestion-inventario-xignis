import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  PeopleIcon, PlusIcon, SearchIcon, XIcon, TrashIcon,
  ChevronDownIcon, PersonIcon, MailIcon,
} from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import { useAuthStore } from '../../../lib/authStore';
import { ROLE_LABELS, isAdminRole } from '../../../lib/constants';
import type { UserRole, OrgMember } from '../../../types/database';

const ROLES: { value: UserRole; label: string; color: string; bg: string }[] = [
  { value: 'viewer', label: 'Solo lectura', color: '#57606a', bg: '#f6f8fa' },
  { value: 'member', label: 'Operador', color: '#0969da', bg: '#ddf4ff' },
  { value: 'admin', label: 'Admin inventario', color: '#9a6700', bg: '#fff8c5' },
  { value: 'owner', label: 'Dirección', color: '#8250df', bg: '#fbefff' },
  { value: 'super_admin', label: 'Admin general', color: '#cf222e', bg: '#ffebe9' },
];

const getRoleStyle = (role: string) => ROLES.find(r => r.value === role) ?? ROLES[1];

export const MembersPage: React.FC = () => {
  const { members, inviteMember, updateMemberRole, removeMember } = useAppStore();
  const { role: currentUserRole, profile } = useAuthStore();
  const isAdmin = isAdminRole(currentUserRole);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const inviteInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Focus trap for invite modal
  useEffect(() => {
    if (!showInviteModal) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInviteModal(false);
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    first?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showInviteModal]);

  // Close role dropdown on outside click
  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [roleDropdownOpen]);

  // Auto-dismiss success
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const toggleRoleDropdown = useCallback((memberId: string, e: React.MouseEvent) => {
    if (roleDropdownOpen === memberId) {
      setRoleDropdownOpen(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setRoleDropdownOpen(memberId);
  }, [roleDropdownOpen]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.user?.full_name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleInvite = useCallback(async () => {
    setError(null);
    setInviteLoading(true);
    const result = await inviteMember(inviteEmail, inviteRole);
    setInviteLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(result.warning ?? `Invitación enviada a ${inviteEmail}`);
    setInviteEmail('');
    setInviteRole('member');
    setShowInviteModal(false);
  }, [inviteEmail, inviteRole, inviteMember]);

  const handleRoleChange = useCallback(async (memberId: string, newRole: UserRole) => {
    setError(null);
    setRoleDropdownOpen(null);
    const result = await updateMemberRole(memberId, newRole);
    if (result.error) setError(result.error);
    else setSuccess('Rol actualizado');
  }, [updateMemberRole]);

  const handleRemove = useCallback(async (memberId: string) => {
    setError(null);
    setConfirmRemove(null);
    const result = await removeMember(memberId);
    if (result.error) setError(result.error);
    else setSuccess('Miembro eliminado');
  }, [removeMember]);

  const currentUserId = profile?.id;

  return (
    <div style={{
      padding: isMobile ? '16px' : '24px 32px',
      maxWidth: '960px',
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '24px', fontWeight: 700, color: '#1f2328', margin: 0 }}>
            Miembros
          </h1>
          <p style={{ fontSize: '14px', color: '#656d76', margin: '4px 0 0' }}>
            {members.length} miembro{members.length !== 1 ? 's' : ''} en la organización
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            style={styles.primaryButton}
            aria-label="Invitar miembro"
          >
            <PlusIcon size={16} /> Invitar
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" aria-live="assertive" style={styles.errorAlert}>
          {error}
          <button type="button" onClick={() => setError(null)} style={styles.alertClose} aria-label="Cerrar error">
            <XIcon size={14} />
          </button>
        </div>
      )}
      {success && (
        <div role="status" aria-live="polite" style={styles.successAlert}>
          {success}
        </div>
      )}

      {/* Search */}
      <div style={styles.searchWrapper}>
        <SearchIcon size={16} fill="#656d76" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
          aria-label="Buscar miembros"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} style={styles.searchClear} aria-label="Limpiar búsqueda">
            <XIcon size={14} />
          </button>
        )}
      </div>

      {/* Members list */}
      {filteredMembers.length === 0 ? (
        <div style={styles.blankSlate}>
          <PeopleIcon size={36} fill="#d0d7de" />
          <h3 style={styles.blankTitle}>
            {search ? 'Sin resultados' : 'Sin miembros'}
          </h3>
          <p style={styles.blankText}>
            {search
              ? `No se encontraron miembros que coincidan con "${search}"`
              : 'Invita a tu primer miembro para comenzar.'}
          </p>
        </div>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredMembers.map(member => {
            const roleStyle = getRoleStyle(member.role);
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div key={member.id} style={styles.memberCard}>
                <div style={styles.memberCardHeader}>
                  <div style={styles.avatar}>
                    {(member.user?.full_name ?? 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.memberName}>
                      {member.user?.full_name ?? 'Usuario'}
                      {isCurrentUser && <span style={styles.youBadge}>Tú</span>}
                    </div>
                    <div style={styles.memberEmail}>{member.user?.email}</div>
                  </div>
                </div>
                <div style={styles.memberCardFooter}>
                  {isAdmin && !isCurrentUser ? (
                    <div>
                      <button
                        type="button"
                        onClick={(e) => toggleRoleDropdown(member.id, e)}
                        style={{ ...styles.roleBadge, backgroundColor: roleStyle.bg, color: roleStyle.color, cursor: 'pointer', border: '1px solid transparent' }}
                        aria-haspopup="listbox"
                        aria-expanded={roleDropdownOpen === member.id}
                        aria-label={`Cambiar rol de ${member.user?.full_name}`}
                      >
                        {roleStyle.label} <ChevronDownIcon size={12} />
                      </button>
                      {roleDropdownOpen === member.id && (
                        <div ref={dropdownRef} style={{ ...styles.dropdown, top: dropdownPos.top, left: dropdownPos.left }} role="listbox" aria-label="Seleccionar rol">
                          {ROLES.map(r => (
                            <button
                              key={r.value}
                              type="button"
                              role="option"
                              aria-selected={r.value === member.role}
                              onClick={() => handleRoleChange(member.id, r.value)}
                              style={{
                                ...styles.dropdownItem,
                                backgroundColor: r.value === member.role ? '#f6f8fa' : 'transparent',
                                fontWeight: r.value === member.role ? 600 : 400,
                              }}
                            >
                              <span style={{ ...styles.roleDot, backgroundColor: r.color }} />
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ ...styles.roleBadge, backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                      {roleStyle.label}
                    </span>
                  )}
                  {isAdmin && !isCurrentUser && (
                    confirmRemove === member.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button type="button" onClick={() => handleRemove(member.id)} style={styles.dangerSmallButton} aria-label="Confirmar eliminación">
                          Confirmar
                        </button>
                        <button type="button" onClick={() => setConfirmRemove(null)} style={styles.cancelSmallButton} aria-label="Cancelar eliminación">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(member.id)}
                        style={styles.iconButton}
                        aria-label={`Eliminar a ${member.user?.full_name}`}
                        title="Eliminar miembro"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop: Table layout */
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={{ ...styles.tableHeaderText, flex: 2 }}>Miembro</span>
            <span style={{ ...styles.tableHeaderText, flex: 1 }}>Email</span>
            <span style={{ ...styles.tableHeaderText, flex: 1 }}>Rol</span>
            <span style={{ ...styles.tableHeaderText, width: '80px', textAlign: 'center' }}>Desde</span>
            {isAdmin && <span style={{ width: '44px' }} />}
          </div>
          {filteredMembers.map(member => {
            const roleStyle = getRoleStyle(member.role);
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div key={member.id} style={styles.tableRow}>
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={styles.avatar}>
                    {(member.user?.full_name ?? 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <span style={styles.memberName}>
                    {member.user?.full_name ?? 'Usuario'}
                    {isCurrentUser && <span style={styles.youBadge}>Tú</span>}
                  </span>
                </div>
                <span style={{ flex: 1, fontSize: '13px', color: '#656d76', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.user?.email}
                </span>
                <div style={{ flex: 1 }}>
                  {isAdmin && !isCurrentUser ? (
                    <div>
                      <button
                        type="button"
                        onClick={(e) => toggleRoleDropdown(member.id, e)}
                        style={{ ...styles.roleBadge, backgroundColor: roleStyle.bg, color: roleStyle.color, cursor: 'pointer', border: '1px solid transparent' }}
                        aria-haspopup="listbox"
                        aria-expanded={roleDropdownOpen === member.id}
                        aria-label={`Cambiar rol de ${member.user?.full_name}`}
                      >
                        {roleStyle.label} <ChevronDownIcon size={12} />
                      </button>
                      {roleDropdownOpen === member.id && (
                        <div ref={dropdownRef} style={{ ...styles.dropdown, top: dropdownPos.top, left: dropdownPos.left }} role="listbox" aria-label="Seleccionar rol">
                          {ROLES.map(r => (
                            <button
                              key={r.value}
                              type="button"
                              role="option"
                              aria-selected={r.value === member.role}
                              onClick={() => handleRoleChange(member.id, r.value)}
                              style={{
                                ...styles.dropdownItem,
                                backgroundColor: r.value === member.role ? '#f6f8fa' : 'transparent',
                                fontWeight: r.value === member.role ? 600 : 400,
                              }}
                            >
                              <span style={{ ...styles.roleDot, backgroundColor: r.color }} />
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ ...styles.roleBadge, backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                      {roleStyle.label}
                    </span>
                  )}
                </div>
                <span style={{ width: '80px', textAlign: 'center', fontSize: '12px', color: '#656d76' }}>
                  {member.joined_at
                    ? new Date(member.joined_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
                {isAdmin && (
                  <div style={{ width: '44px', display: 'flex', justifyContent: 'center' }}>
                    {!isCurrentUser && (
                      confirmRemove === member.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" onClick={() => handleRemove(member.id)} style={styles.dangerSmallButton} aria-label="Confirmar eliminación">
                            Sí
                          </button>
                          <button type="button" onClick={() => setConfirmRemove(null)} style={styles.cancelSmallButton} aria-label="Cancelar">
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(member.id)}
                          style={styles.iconButton}
                          aria-label={`Eliminar a ${member.user?.full_name}`}
                          title="Eliminar miembro"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          style={styles.overlay}
          onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
          role="presentation"
        >
          <div
            ref={modalRef}
            style={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <div style={styles.modalHeader}>
              <h2 id="invite-modal-title" style={styles.modalTitle}>Invitar miembro</h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={styles.modalClose}
                aria-label="Cerrar"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div style={styles.modalBody}>
              {error && (
                <div role="alert" style={{ ...styles.errorAlert, marginBottom: '12px' }}>
                  {error}
                  <button type="button" onClick={() => setError(null)} style={styles.alertClose} aria-label="Cerrar error">
                    <XIcon size={14} />
                  </button>
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="invite-email" style={styles.label}>
                  <MailIcon size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Email del usuario
                </label>
                <input
                  ref={inviteInputRef}
                  id="invite-email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inviteEmail.trim()) handleInvite(); }}
                  style={styles.input}
                  autoComplete="email"
                  required
                />
                <p style={styles.inputHint}>
                  Si el usuario ya tiene cuenta se agrega directamente. Si no, recibe un email de invitación.
                </p>
              </div>
              <div>
                <label htmlFor="invite-role" style={styles.label}>
                  <PersonIcon size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Rol
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  style={styles.input}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p style={styles.inputHint}>
                  {getRoleStyle(inviteRole).label}: {
                    inviteRole === 'viewer' ? 'Puede ver inventario y préstamos, sin editar.' :
                    inviteRole === 'member' ? 'Puede gestionar préstamos y ver inventario.' :
                    inviteRole === 'admin' ? 'Puede gestionar inventario, categorías y préstamos.' :
                    inviteRole === 'owner' ? 'Control total de la organización.' :
                    'Control total incluyendo configuración de la organización.'
                  }
                </p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={styles.secondaryButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteLoading}
                style={{
                  ...styles.primaryButton,
                  opacity: !inviteEmail.trim() || inviteLoading ? 0.6 : 1,
                  cursor: !inviteEmail.trim() || inviteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {inviteLoading ? 'Enviando...' : 'Invitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2da44e',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s, transform 0.1s',
    minHeight: '44px',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 18px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#1f2328',
    fontWeight: 500,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: '44px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    border: '1px solid #ff8182',
    borderRadius: '8px',
    backgroundColor: '#ffebe9',
    color: '#cf222e',
    fontSize: '13px',
    marginBottom: '14px',
  },
  successAlert: {
    padding: '10px 14px',
    border: '1px solid #4ac26b',
    borderRadius: '8px',
    backgroundColor: '#dafbe1',
    color: '#1a7f37',
    fontSize: '13px',
    marginBottom: '14px',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '4px',
    minHeight: '24px',
    minWidth: '24px',
    justifyContent: 'center',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    backgroundColor: '#fff',
    marginBottom: '16px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'inherit',
    color: '#1f2328',
    backgroundColor: 'transparent',
  },
  searchClear: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '4px',
    minHeight: '24px',
    minWidth: '24px',
    justifyContent: 'center',
  },
  blankSlate: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    backgroundColor: '#fff',
  },
  blankTitle: {
    margin: '16px 0 8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2328',
  },
  blankText: {
    margin: 0,
    fontSize: '14px',
    color: '#656d76',
    maxWidth: '360px',
  },
  // Table (desktop)
  table: {
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#f6f8fa',
    borderBottom: '1px solid #d0d7de',
    gap: '12px',
  },
  tableHeaderText: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#656d76',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #eef1f4',
    gap: '12px',
    transition: 'background-color 0.1s',
  },
  // Card (mobile)
  memberCard: {
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '10px',
    padding: '14px',
  },
  memberCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  memberCardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ddf4ff, #bebeff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0969da',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
  },
  memberName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2328',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  memberEmail: {
    fontSize: '12px',
    color: '#656d76',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  youBadge: {
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '10px',
    backgroundColor: '#dafbe1',
    color: '#1a7f37',
    fontWeight: 600,
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '16px',
    fontWeight: 500,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    minHeight: '28px',
  },
  roleDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  dropdown: {
    position: 'fixed',
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(140,149,159,0.2)',
    zIndex: 100,
    minWidth: '180px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#1f2328',
    textAlign: 'left',
    transition: 'background-color 0.1s',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    minHeight: '32px',
    minWidth: '32px',
    transition: 'color 0.15s, background-color 0.15s',
  },
  dangerSmallButton: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #ff8182',
    backgroundColor: '#ffebe9',
    color: '#cf222e',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: '28px',
  },
  cancelSmallButton: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#656d76',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: '28px',
  },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #d0d7de',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2328',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '4px',
    minHeight: '32px',
    minWidth: '32px',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '20px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '14px 20px',
    borderTop: '1px solid #d0d7de',
    backgroundColor: '#f6f8fa',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#1f2328',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1f2328',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    minHeight: '44px',
  },
  inputHint: {
    margin: '4px 0 0',
    fontSize: '11px',
    color: '#8b949e',
  },
};
