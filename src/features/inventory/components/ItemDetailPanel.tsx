import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertIcon, ArrowSwitchIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon, PencilIcon, StarFillIcon, StarIcon, TrashIcon, UploadIcon, XIcon } from '@primer/octicons-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppStore } from '../../../lib/store';
import { useAuthStore } from '../../../lib/authStore';
import { isAdminRole } from '../../../lib/constants';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { Item, ItemImage, SchemaField } from '../../../types/database';

interface ItemDetailPanelProps {
  item: Item;
  fields: SchemaField[];
  onClose: () => void;
  onEdit?: (item: Item) => void;
}

export const ItemDetailPanel: React.FC<ItemDetailPanelProps> = ({ item, fields, onClose, onEdit }) => {
  const { categories, transactions, uploadItemImages, deleteItemImage, setPrimaryImage } = useAppStore();
  const { role } = useAuthStore();
  const category = categories.find(cat => cat.id === item.category_id);
  const isAdmin = isAdminRole(role);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [activeImageUrl, setActiveImageUrl] = useState(item.images?.find(image => image.is_primary)?.url ?? item.images?.[0]?.url ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState<ItemImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const announce = useCallback((message: string) => {
    setStatusMessage('');
    requestAnimationFrame(() => setStatusMessage(message));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Focus trap for confirmation dialog
  useEffect(() => {
    if (!confirmDeleteImage) return;
    const dialog = confirmDialogRef.current;
    if (!dialog) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Focus the cancel button first (safer default)
    const cancelBtn = dialog.querySelector<HTMLElement>('[data-action="cancel"]');
    (cancelBtn ?? first)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirmDeleteImage(null);
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

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [confirmDeleteImage]);

  // Close panel on Escape (only when no dialog/lightbox is open)
  useEffect(() => {
    if (confirmDeleteImage || lightboxIndex !== null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, confirmDeleteImage, lightboxIndex]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxIndex(null); return; }
      if (e.key === 'ArrowLeft') {
        const images = item.images ?? [];
        setLightboxIndex(prev => (prev !== null && prev > 0) ? prev - 1 : images.length - 1);
      }
      if (e.key === 'ArrowRight') {
        const images = item.images ?? [];
        setLightboxIndex(prev => (prev !== null && prev < images.length - 1) ? prev + 1 : 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, item.images]);

  const loanHistory = useMemo(() => {
    return transactions.filter(transaction =>
      transaction.items?.some(transactionItem => transactionItem.item_id === item.id)
    );
  }, [item.id, transactions]);

  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.sort_order - b.sort_order), [fields]);

  useEffect(() => {
    setActiveImageUrl(item.images?.find(image => image.is_primary)?.url ?? item.images?.[0]?.url ?? null);
  }, [item.id, item.images]);

  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setIsUploading(true);
    setUploadError(null);
    const { error } = await uploadItemImages(item.id, files);
    setIsUploading(false);

    if (error) {
      setUploadError(error);
      announce(`Error al subir: ${error}`);
    } else {
      announce(`${files.length} imagen(es) subida(s) correctamente`);
    }
    event.target.value = '';
  }, [item.id, uploadItemImages, announce]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteImage) return;
    const imageId = confirmDeleteImage.id;
    setConfirmDeleteImage(null);
    setDeletingImageId(imageId);
    const { error } = await deleteItemImage(item.id, imageId);
    setDeletingImageId(null);
    if (error) {
      setUploadError(error);
      announce(`Error al eliminar: ${error}`);
    } else {
      announce('Imagen eliminada correctamente');
    }
  }, [confirmDeleteImage, item.id, deleteItemImage, announce]);

  const handleSetPrimary = useCallback(async (imageId: string) => {
    const { error } = await setPrimaryImage(item.id, imageId);
    if (error) {
      announce(`Error: ${error}`);
    } else {
      announce('Imagen principal actualizada');
    }
  }, [item.id, setPrimaryImage, announce]);

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${item.name}`}
    >
      {/* Screen-reader live region */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {statusMessage}
      </div>

      <section style={panelStyle(isMobile)}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge status={item.status} />
            <span style={{ fontSize: '12px', color: '#656d76' }}>{category?.name ?? 'Sin categoria'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                style={editButtonStyle}
                className="btn-edit"
                aria-label="Editar equipo"
              >
                <PencilIcon size={14} aria-hidden />
                <span>Editar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={closeButtonStyle}
              className="btn-close"
              aria-label="Cerrar detalle"
            >
              <XIcon size={16} aria-hidden />
            </button>
          </div>
        </header>

        <div style={contentStyle(isMobile)}>
          <style>{`
            .thumb-wrapper:hover .thumb-action,
            .thumb-wrapper:focus-within .thumb-action { opacity: 1 !important; }
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
              }
            }
            .focus-ring:focus-visible {
              outline: 2px solid #0969da;
              outline-offset: 2px;
            }
            .focus-ring-thumb:focus-visible {
              outline: 2px solid #f97316;
              outline-offset: 1px;
            }
            .btn-edit:hover {
              background: linear-gradient(135deg, #26a641, #1f9235) !important;
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(45,164,78,0.4) !important;
            }
            .btn-close:hover {
              background: #f6f8fa !important;
              border-color: #afb6bd !important;
              color: #1f2328 !important;
            }
          `}</style>

          <div style={itemTitleStyle}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1f2328', letterSpacing: '-0.3px' }}>{item.name}</h2>
            <p style={{ margin: '4px 0 0', color: '#656d76', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
              {item.sku}{item.serial_number ? ` · Serie ${item.serial_number}` : ''}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 240px) 1fr', gap: '16px' }}>
            <div>
              <div style={imageBoxStyle}>
              {activeImageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = item.images?.findIndex(img => img.url === activeImageUrl) ?? 0;
                    setLightboxIndex(idx >= 0 ? idx : 0);
                  }}
                  style={imageButtonStyle}
                  className="focus-ring"
                  aria-label={`Ampliar imagen de ${item.name}`}
                >
                  <img
                    src={activeImageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: '#656d76' }}>
                  <ImageIcon size={36} aria-hidden />
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>Sin imagen principal</div>
                </div>
              )}
              </div>

              {(item.images?.length ?? 0) > 0 && (
                <div role="list" aria-label="Miniaturas de imagenes" style={thumbRailStyle}>
                  {item.images?.map((image, index) => {
                    const isActive = activeImageUrl === image.url;
                    const isDeleting = deletingImageId === image.id;
                    const imgLabel = image.is_primary
                      ? `Imagen principal — ${item.name}`
                      : `Miniatura ${index + 1} de ${item.images?.length ?? 0}`;

                    return (
                      <div key={image.id} style={thumbWrapperStyle} className="thumb-wrapper" role="listitem">
                        <button
                          type="button"
                          onClick={() => setActiveImageUrl(image.url)}
                          style={{
                            ...thumbButtonStyle,
                            borderColor: isActive ? '#f97316' : '#d0d7de',
                            opacity: isDeleting ? 0.4 : 1,
                          }}
                          className="focus-ring-thumb"
                          aria-label={imgLabel}
                          aria-current={isActive ? 'true' : undefined}
                          disabled={isDeleting}
                        >
                          <img src={image.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                        {isAdmin && !isDeleting && (
                          <div style={thumbOverlayStyle} aria-hidden="true">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSetPrimary(image.id); }}
                              style={{
                                ...thumbActionButtonStyle,
                                color: image.is_primary ? '#f97316' : '#656d76',
                                opacity: image.is_primary ? 1 : 0,
                              }}
                              className="thumb-action"
                              aria-label={image.is_primary ? 'Esta es la imagen principal' : 'Establecer como imagen principal'}
                            >
                              {image.is_primary ? <StarFillIcon size={12} /> : <StarIcon size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteImage(image); }}
                              style={{ ...thumbActionButtonStyle, color: '#cf222e', opacity: 0 }}
                              className="thumb-action"
                              aria-label={`Eliminar ${imgLabel}`}
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isAdmin && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    ref={fileInputRef}
                    id="item-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={uploadButtonStyle}
                    className="focus-ring"
                    aria-busy={isUploading}
                  >
                    <UploadIcon size={15} aria-hidden /> {isUploading ? 'Subiendo...' : 'Subir fotos'}
                  </button>
                  {uploadError && (
                    <div role="alert" style={uploadErrorStyle}>
                      <AlertIcon size={12} aria-hidden />
                      {uploadError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ ...summaryGridStyle, gridTemplateColumns: isMobile ? '1fr 1fr' : summaryGridStyle.gridTemplateColumns }}>
              <DetailBlock label="Estado" value={<StatusBadge status={item.status} />} />
              <DetailBlock label="SKU" value={item.sku} />
              <DetailBlock label="Categoria" value={category?.name ?? 'Sin categoria'} />
              <DetailBlock label="Cantidad" value={item.is_consumable ? `${item.quantity_available} de ${item.quantity}` : 'Pieza unica'} />
              <DetailBlock label="Alta" value={item.acquired_at ? format(new Date(item.acquired_at), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'} />
              <DetailBlock label="QR" value={item.qr_code ?? 'Pendiente'} />
            </div>
          </div>

          {sortedFields.length > 0 && (
            <section style={cardStyle} aria-labelledby="custom-fields-heading">
              <h3 id="custom-fields-heading" style={sectionTitleStyle}>Campos personalizados</h3>
              <div style={{ ...attributeGridStyle, gridTemplateColumns: isMobile ? '1fr' : attributeGridStyle.gridTemplateColumns }}>
                {sortedFields.map(field => (
                  <DetailBlock
                    key={field.key}
                    label={field.label}
                    value={formatAttribute(item.attributes[field.key])}
                  />
                ))}
              </div>
            </section>
          )}

          <section style={cardStyle} aria-labelledby="notes-heading">
            <h3 id="notes-heading" style={sectionTitleStyle}>Notas</h3>
            <p style={{ margin: 0, color: item.notes ? '#1f2328' : '#656d76', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
              {item.notes || 'Sin notas registradas.'}
            </p>
          </section>

          <section style={cardStyle} aria-labelledby="history-heading">
            <h3 id="history-heading" style={sectionTitleStyle}>Historial de prestamos</h3>
            {loanHistory.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {loanHistory.map(transaction => (
                  <div key={transaction.id} style={historyRowStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={historyIconStyle} aria-hidden><ArrowSwitchIcon size={14} /></div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2328' }}>
                          {transaction.user?.full_name ?? 'Usuario sin nombre'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#656d76' }}>
                          {format(new Date(transaction.created_at), 'dd MMM yyyy', { locale: es })}
                          {transaction.due_date ? ` · Vence ${format(new Date(transaction.due_date), 'dd MMM yyyy', { locale: es })}` : ''}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={transaction.status} variant="transaction" />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#656d76', fontSize: '13px' }}>
                Este articulo todavia no tiene prestamos registrados.
              </p>
            )}
          </section>
        </div>
      </section>

      {/* Delete confirmation dialog */}
      {confirmDeleteImage && (
        <div style={confirmOverlayStyle} onClick={() => setConfirmDeleteImage(null)}>
          <div
            ref={confirmDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmar eliminacion de imagen"
            style={confirmDialogStyle(isMobile)}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={confirmTitleStyle}>Eliminar esta imagen?</p>
            <img
              src={confirmDeleteImage.url}
              alt=""
              style={confirmPreviewStyle}
            />
            <p style={confirmHintStyle}>Esta accion no se puede deshacer.</p>
            <div style={confirmActionsStyle}>
              <button
                type="button"
                data-action="cancel"
                onClick={() => setConfirmDeleteImage(null)}
                style={confirmCancelButtonStyle}
                className="focus-ring"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-action="confirm"
                onClick={handleConfirmDelete}
                style={confirmDeleteButtonStyle}
                className="focus-ring"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxIndex !== null && (() => {
        const images = item.images ?? [];
        const currentImage = images[lightboxIndex];
        if (!currentImage) return null;
        return (
          <div
            ref={lightboxRef}
            style={lightboxOverlayStyle}
            role="dialog"
            aria-modal="true"
            aria-label={`Visor de imagen — ${item.name}`}
            onClick={() => setLightboxIndex(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              style={lightboxCloseStyle}
              className="focus-ring"
              aria-label="Cerrar visor"
            >
              <XIcon size={24} aria-hidden />
            </button>
            <div style={lightboxCounterStyle}>
              {lightboxIndex + 1} / {images.length}
            </div>
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => (prev !== null && prev > 0) ? prev - 1 : images.length - 1);
                }}
                style={lightboxNavStyle('left')}
                className="focus-ring"
                aria-label="Imagen anterior"
              >
                <ChevronLeftIcon size={28} aria-hidden />
              </button>
            )}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => (prev !== null && prev < images.length - 1) ? prev + 1 : 0);
                }}
                style={lightboxNavStyle('right')}
                className="focus-ring"
                aria-label="Imagen siguiente"
              >
                <ChevronRightIcon size={28} aria-hidden />
              </button>
            )}
            <img
              src={currentImage.url}
              alt={`${item.name} — imagen ${lightboxIndex + 1} de ${images.length}`}
              style={lightboxImageStyle}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      })()}
    </div>
  );
};

// ==========================================
// Memoized sub-components
// ==========================================
const DetailBlock: React.FC<{ label: string; value: React.ReactNode }> = React.memo(({ label, value }) => (
  <div>
    <dt style={{ fontSize: '11px', fontWeight: 600, color: '#656d76', marginBottom: '4px' }}>{label}</dt>
    <dd style={{ fontSize: '13px', color: '#1f2328', minHeight: '20px', margin: 0 }}>{value}</dd>
  </div>
));

const formatAttribute = (value: unknown) => {
  if (value === undefined || value === null || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
};

// ==========================================
// Styles
// ==========================================
const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(31,35,40,0.45)',
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'flex-end',
};

const panelStyle = (mobile: boolean): React.CSSProperties => ({
  width: mobile ? '100%' : 'min(100%, 720px)',
  height: '100%',
  backgroundColor: '#fff',
  boxShadow: '-16px 0 48px rgba(31,35,40,0.22)',
  display: 'flex',
  flexDirection: 'column',
});

const headerStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid #eaeef2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  backgroundColor: '#fff',
};

const contentStyle = (mobile: boolean): React.CSSProperties => ({
  flex: 1,
  overflow: 'auto',
  padding: mobile ? '14px' : '20px',
  display: 'grid',
  gap: '16px',
  background: '#f6f8fa',
});

const iconButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d0d7de',
  cursor: 'pointer',
  color: '#656d76',
  padding: '6px 10px',
  display: 'flex',
  borderRadius: '8px',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  gap: '5px',
};

const editButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2da44e, #26a641)',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  padding: '7px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  gap: '6px',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 8px rgba(45,164,78,0.3)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d0d7de',
  cursor: 'pointer',
  color: '#656d76',
  padding: '7px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  transition: 'all 0.15s ease',
};

const itemTitleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const imageBoxStyle: React.CSSProperties = {
  aspectRatio: '4 / 3',
  borderRadius: '18px',
  overflow: 'hidden',
  border: '1px solid #d0d7de',
  background: 'linear-gradient(135deg, #fff7ed, #f6f8fa)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 14px 34px rgba(31,35,40,0.08)',
};

const thumbRailStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
  overflowX: 'auto',
};

const thumbButtonStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '12px',
  border: '2px solid #d0d7de',
  padding: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  backgroundColor: '#fff',
  flexShrink: 0,
};

const thumbWrapperStyle: React.CSSProperties = {
  position: 'relative',
  flexShrink: 0,
};

const thumbOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '2px',
  pointerEvents: 'none',
  borderRadius: '12px',
};

const thumbActionButtonStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(4px)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
  padding: 0,
  pointerEvents: 'auto',
  transition: 'opacity 0.15s',
  flexShrink: 0,
};

const uploadButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  border: '1px dashed #f97316',
  borderRadius: '14px',
  backgroundColor: '#fff7ed',
  color: '#bc4c00',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 800,
  padding: '10px 12px',
  cursor: 'pointer',
  minHeight: '44px',
};

const uploadErrorStyle: React.CSSProperties = {
  marginTop: '8px',
  color: '#cf222e',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
  alignContent: 'start',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  padding: '14px 16px',
  backgroundColor: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#1f2328',
};

const attributeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
};

const historyRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px',
  border: '1px solid #eef1f4',
  borderRadius: '6px',
  alignItems: 'center',
};

const historyIconStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  backgroundColor: '#ddf4ff',
  color: '#0969da',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

// Confirmation dialog styles
const confirmOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(31,35,40,0.55)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

const confirmDialogStyle = (mobile: boolean): React.CSSProperties => ({
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: mobile ? '20px' : '24px',
  maxWidth: '360px',
  width: '100%',
  boxShadow: '0 20px 60px rgba(31,35,40,0.3)',
  display: 'grid',
  gap: '14px',
  outline: 'none',
});

const confirmTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: '#1f2328',
};

const confirmPreviewStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  objectFit: 'cover',
  borderRadius: '10px',
  border: '1px solid #d0d7de',
};

const confirmHintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#656d76',
};

const confirmActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
};

const confirmCancelButtonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: '1px solid #d0d7de',
  backgroundColor: '#f6f8fa',
  color: '#1f2328',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: '40px',
  minWidth: '40px',
};

const confirmDeleteButtonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#cf222e',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  minHeight: '40px',
  minWidth: '40px',
};

const imageButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  background: 'none',
};

// Lightbox styles
const lightboxOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.92)',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const lightboxCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  zIndex: 10,
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  border: 'none',
  borderRadius: '50%',
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
};

const lightboxCounterStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  color: 'rgba(255,255,255,0.85)',
  fontSize: '14px',
  fontWeight: 600,
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  padding: '6px 16px',
  borderRadius: '20px',
  pointerEvents: 'none',
};

const lightboxNavStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  border: 'none',
  borderRadius: '50%',
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
});

const lightboxImageStyle: React.CSSProperties = {
  maxWidth: '92vw',
  maxHeight: '92vh',
  objectFit: 'contain',
  borderRadius: '6px',
  boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
};
