import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PersonIcon, MailIcon, OrganizationIcon, SignOutIcon,
  CheckIcon, ImageIcon, UploadIcon, XIcon,
} from '@primer/octicons-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/authStore';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS, APP_NAME } from '../../../lib/constants';

const PROFILES_BUCKET = 'xignis-profiles';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, orgName, role, updateProfile, signOut, user } = useAuthStore();

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  const uploadAvatar = async (file: File) => {
    if (!user) {
      setUploadError('No hay sesión activa.');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PROFILES_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error('[Avatar upload] error:', uploadError);
      setUploadError('No se pudo subir la imagen. Intenta de nuevo.');
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(PROFILES_BUCKET).getPublicUrl(path);
    if (!urlData?.publicUrl) {
      setUploadError('No se pudo obtener la URL de la imagen.');
      setIsUploading(false);
      return;
    }
    setAvatarUrl(urlData.publicUrl);
    setIsUploading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    const result = await updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
    });

    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const hasChanges = fullName !== (profile?.full_name ?? '') || avatarUrl !== (profile?.avatar_url ?? '');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Mi Perfil</h1>
          <p style={styles.subtitle}>Administra tu información personal</p>
        </div>
      </header>

      <main style={styles.content}>
        <section style={styles.section} aria-labelledby="personal-info-heading">
          <h2 id="personal-info-heading" style={styles.sectionTitle}>Información personal</h2>

          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={styles.avatarImage} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  <span style={styles.avatarInitials}>{initials}</span>
                </div>
              )}
              {isUploading && (
                <div style={styles.uploadingOverlay}>
                  <div style={styles.spinner} />
                </div>
              )}
            </div>
            <div style={styles.avatarInfo}>
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={styles.uploadButton}
              >
                <UploadIcon size={14} aria-hidden />
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {uploadError && (
                <span style={styles.uploadError}>{uploadError}</span>
              )}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  style={styles.removeButton}
                >
                  <XIcon size={12} aria-hidden />
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="full-name" style={styles.label}>Nombre completo</label>
            <div style={styles.inputWrapper}>
              <PersonIcon size={14} fill="#656d76" />
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>Correo electrónico</label>
            <div style={styles.inputWrapper}>
              <MailIcon size={14} fill="#656d76" />
              <input
                id="email"
                type="email"
                value={profile?.email ?? ''}
                disabled
                style={{ ...styles.input, ...styles.inputDisabled }}
                aria-disabled="true"
              />
            </div>
            <span style={styles.hint}>El correo no se puede modificar. Contacta a un admin si necesitas cambios.</span>
          </div>

          {saveError && (
            <div role="alert" style={styles.errorAlert}>
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div role="status" style={styles.successAlert}>
              <CheckIcon size={14} /> Cambios guardados correctamente
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={{
              ...styles.saveButton,
              ...(hasChanges && !isSaving ? {} : styles.saveButtonDisabled),
            }}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </section>

        <section style={styles.section} aria-labelledby="organization-info-heading">
          <h2 id="organization-info-heading" style={styles.sectionTitle}>Organización</h2>

          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <OrganizationIcon size={16} fill="#656d76" />
              <span style={styles.infoLabel}>Organización</span>
              <span style={styles.infoValue}>{orgName ?? APP_NAME}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoRow}>
              <PersonIcon size={16} fill="#656d76" />
              <span style={styles.infoLabel}>Rol</span>
              <span style={{
                ...styles.roleBadge,
                backgroundColor: ROLE_COLORS[role ?? 'member']?.bg ?? '#ddf4ff',
                color: ROLE_COLORS[role ?? 'member']?.color ?? '#0969da',
              }}>{ROLE_LABELS[role ?? ''] ?? role ?? 'Miembro'}</span>
            </div>
          </div>

          {/* Role Legend */}
          <div style={styles.roleLegend}>
            <div style={styles.yourRoleSection}>
              <span style={styles.yourRoleTitle}>Tu rol te permite:</span>
              <span style={styles.yourRoleDescription}>
                ✓ {ROLE_DESCRIPTIONS[role ?? 'member'] ?? 'Gestionar préstamos y ver inventario'}
              </span>
            </div>
            <div style={styles.allRolesSection}>
              <span style={styles.allRolesTitle}>Todos los roles:</span>
              {(['viewer', 'member', 'admin', 'owner', 'super_admin'] as const).map((r) => {
                const isCurrentRole = r === role;
                const colors = ROLE_COLORS[r];
                return (
                  <div key={r} style={{
                    ...styles.roleRow,
                    backgroundColor: isCurrentRole ? colors.bg : 'transparent',
                    borderRadius: '6px',
                    padding: isCurrentRole ? '4px 8px' : '2px 0',
                    margin: isCurrentRole ? '0 -8px' : '0',
                  }}>
                    <span style={{
                      ...styles.roleMiniBadge,
                      backgroundColor: colors.bg,
                      color: colors.color,
                    }}>
                      {ROLE_LABELS[r]}
                    </span>
                    <span style={styles.roleDescription}>
                      {ROLE_DESCRIPTIONS[r]}
                      {isCurrentRole && <span style={styles.youIndicator}> ← tu rol</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={styles.section} aria-labelledby="account-actions-heading">
          <h2 id="account-actions-heading" style={styles.sectionTitle}>Cuenta</h2>

          <button
            type="button"
            onClick={handleSignOut}
            style={styles.logoutButton}
          >
            <SignOutIcon size={16} />
            Cerrar sesión
          </button>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
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
    padding: '16px',
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
  content: {
    padding: '24px 16px',
    maxWidth: '560px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2328',
    margin: '0 0 12px',
  },
  avatarSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    flexShrink: 0,
    position: 'relative',
  },
  avatarImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #d0d7de',
  },
  avatarPlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ddf4ff 0%, #a5d6ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #d0d7de',
  },
  avatarInitials: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#0969da',
  },
  uploadingOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #d0d7de',
    borderTopColor: '#0969da',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  avatarInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2328',
    marginBottom: '6px',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  input: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    flex: 1,
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#1f2328',
  },
  inputDisabled: {
    color: '#656d76',
    cursor: 'not-allowed',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#656d76',
    marginTop: '4px',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #0969da',
    backgroundColor: '#ddf4ff',
    color: '#0969da',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    alignSelf: 'flex-start',
  },
  uploadError: {
    fontSize: '12px',
    color: '#cf222e',
  },
  removeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    fontSize: '12px',
    fontFamily: 'inherit',
    padding: '2px 0',
    alignSelf: 'flex-start',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#656d76',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  errorAlert: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#ffebe9',
    color: '#cf222e',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #ff818266',
  },
  successAlert: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#dafbe1',
    color: '#1a7f37',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #4ac26b66',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  saveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2da44e',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveButtonDisabled: {
    backgroundColor: '#8c959f',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
  infoCard: {
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    padding: '4px 0',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#d0d7de',
    margin: '0 16px',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#656d76',
    minWidth: '100px',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2328',
  },
  roleBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: '#ddf4ff',
    color: '#0969da',
  },
  roleLegend: {
    marginTop: '12px',
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    padding: '14px 16px',
  },
  yourRoleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eef1f4',
  },
  yourRoleTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1f2328',
  },
  yourRoleDescription: {
    fontSize: '13px',
    color: '#1a7f37',
  },
  allRolesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  allRolesTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#656d76',
    marginBottom: '4px',
  },
  roleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleMiniBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
    minWidth: '80px',
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: '12px',
    color: '#656d76',
  },
  youIndicator: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#0969da',
  },
  logoutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#cf222e',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};