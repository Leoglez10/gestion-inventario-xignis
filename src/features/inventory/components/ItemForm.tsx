import React, { useEffect, useMemo, useState } from 'react';
import { XIcon } from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import type { Item, ItemStatus, SchemaField } from '../../../types/database';

interface ItemFormProps {
  categoryId: string;
  item?: Item;         // If editing, pass existing item
  onClose: () => void;
  onSave: (item: Omit<Item, 'id' | 'org_id' | 'created_at'>) => void;
}

/**
 * Dynamic form that generates fields based on the category's schema.
 * No hardcoded fields — everything comes from the JSONB schema.
 * Adding a new field in Schema Builder → this form auto-updates.
 */
export const ItemForm: React.FC<ItemFormProps> = ({ categoryId, item, onClose, onSave }) => {
  const { categories, getSchemaForCategory } = useAppStore();
  const schema = getSchemaForCategory(categoryId);
  const category = categories.find(c => c.id === categoryId);
  const dynamicFields = schema?.fields ?? [];

  // Core fields state
  const [name, setName] = useState(item?.name ?? '');
  const [sku, setSku] = useState(item?.sku ?? '');
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? 'available');
  const [serialNumber, setSerialNumber] = useState(item?.serial_number ?? '');
  const [isConsumable, setIsConsumable] = useState(item?.is_consumable ?? false);
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Dynamic attributes from schema
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>(
    item?.attributes ?? {}
  );

  const updateAttribute = (key: string, value: string | number | boolean) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      category_id: categoryId,
      name,
      sku,
      status,
      serial_number: serialNumber || null,
      is_consumable: isConsumable,
      quantity: isConsumable ? quantity : 1,
      quantity_available: isConsumable ? quantity : (status === 'available' ? 1 : 0),
      attributes,
      qr_code: item?.qr_code ?? null,
      notes: notes || null,
      acquired_at: item?.acquired_at ?? new Date().toISOString().split('T')[0],
    });
  };

  // Check if required fields are filled
  const isValid = useMemo(() => {
    if (!name.trim() || !sku.trim()) return false;
    for (const field of dynamicFields) {
      if (field.required && (attributes[field.key] === undefined || attributes[field.key] === '')) {
        return false;
      }
    }
    return true;
  }, [name, sku, attributes, dynamicFields]);

  const renderDynamicField = (field: SchemaField) => {
    const value = attributes[field.key];

    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            placeholder={field.placeholder ?? `Ingresa ${field.label.toLowerCase()}`}
            style={inputStyle}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value !== undefined ? Number(value) : ''}
            onChange={e => updateAttribute(field.key, e.target.value ? Number(e.target.value) : '')}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder ?? '0'}
            style={inputStyle}
          />
        );
      case 'boolean':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => updateAttribute(field.key, e.target.checked)}
              style={{ accentColor: '#0969da', width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '13px', color: '#1f2328' }}>
              {value ? 'Sí' : 'No'}
            </span>
          </label>
        );
      case 'select':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            style={inputStyle}
          >
            <option value="">Seleccionar...</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            style={inputStyle}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
          />
        );
      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => updateAttribute(field.key, e.target.value)}
            style={inputStyle}
          />
        );
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'center',
      paddingTop: isMobile ? 0 : '60px', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: isMobile ? '0' : '12px', width: isMobile ? '100%' : '580px', maxHeight: isMobile ? '100vh' : '80vh',
        overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #d0d7de',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2328' }}>
              {item ? 'Editar equipo' : 'Nuevo equipo'}
            </h2>
            <span style={{ fontSize: '12px', color: '#656d76' }}>
              Categoría: {category?.name ?? 'Sin categoría'}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#656d76',
            padding: '4px', display: 'flex', borderRadius: '6px',
          }}>
            <XIcon size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '20px' }}>
            {/* Core fields — always shown */}
            <div style={{ marginBottom: '20px' }}>
              <div style={sectionHeaderStyle}>Información básica</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ej: Sony A7 IV" style={inputStyle} autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>SKU *</label>
                  <input
                    type="text" value={sku} onChange={e => setSku(e.target.value)}
                    placeholder="Ej: CAM-005" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Número de serie</label>
                  <input
                    type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                    placeholder="Opcional" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ItemStatus)} style={inputStyle}>
                    <option value="available">Disponible</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="retired">Dado de baja</option>
                  </select>
                </div>
              </div>

              {/* Consumable toggle */}
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox" checked={isConsumable}
                    onChange={e => setIsConsumable(e.target.checked)}
                    style={{ accentColor: '#0969da' }}
                  />
                  Es consumible (se maneja por cantidad)
                </label>
                {isConsumable && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#656d76' }}>Cantidad:</label>
                    <input
                      type="number" value={quantity} min={1}
                      onChange={e => setQuantity(Number(e.target.value))}
                      style={{ ...inputStyle, width: '80px' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic fields from schema */}
            {dynamicFields.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={sectionHeaderStyle}>
                  Campos de "{category?.name}"
                  <span style={{ fontWeight: 400, fontSize: '11px', color: '#8b949e', marginLeft: '8px' }}>
                    Definidos en el Schema Builder
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  {dynamicFields
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(field => (
                      <div key={field.key} style={field.type === 'textarea' && !isMobile ? { gridColumn: 'span 2' } : {}}>
                        <label style={labelStyle}>
                          {field.label}
                          {field.required && <span style={{ color: '#cf222e' }}> *</span>}
                        </label>
                        {renderDynamicField(field)}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {dynamicFields.length === 0 && (
              <div style={{
                padding: '16px', backgroundColor: '#fff8c5', border: '1px solid #d4a72c',
                borderRadius: '6px', fontSize: '13px', color: '#6f5404', marginBottom: '20px',
              }}>
                ⚠️ Esta categoría no tiene campos personalizados. Puedes agregarlos en{' '}
                <strong>Configuración → Categorías y Esquemas</strong>.
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notas</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notas internas opcionales..." rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #d0d7de',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
            backgroundColor: '#f6f8fa',
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #d0d7de',
              backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#1f2328',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={!isValid} style={{
              padding: '8px 20px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)',
              backgroundColor: isValid ? '#2da44e' : '#94d3a2', color: '#fff',
              fontWeight: 600, fontSize: '14px', cursor: isValid ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}>
              {item ? 'Guardar cambios' : 'Crear equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', border: '1px solid #d0d7de', borderRadius: '6px',
  fontSize: '13px', fontFamily: 'inherit', outline: 'none', color: '#1f2328',
  backgroundColor: '#fff', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#1f2328',
  marginBottom: '4px',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#1f2328',
  paddingBottom: '8px', marginBottom: '12px',
  borderBottom: '1px solid #d0d7de',
};
