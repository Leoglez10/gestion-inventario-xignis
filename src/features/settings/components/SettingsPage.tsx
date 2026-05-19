import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GearIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import { FIELD_TYPE_LABELS } from '../../../lib/constants';
import type { Category, FieldType, SchemaField } from '../../../types/database';

const settingsTabs = [
  { key: 'categories', label: 'Inventario', icon: GearIcon, shortLabel: 'Inventario' },
] as const;

interface CategoryNodeProps {
  category: Category;
  categories: Category[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({ category, categories, depth, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const children = categories.filter(c => c.parent_id === category.id);
  const isSelected = selectedId === category.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        style={{
          ...styles.categoryRow,
          paddingLeft: `${12 + depth * 12}px`,
          backgroundColor: isSelected ? '#ddf4ff' : 'transparent',
          color: isSelected ? '#0969da' : '#1f2328',
          fontWeight: isSelected ? 600 : 400,
        }}
        aria-selected={isSelected}
      >
        {children.length > 0 ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(!expanded);
            }}
            style={styles.expandIcon}
            aria-expanded={expanded}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setExpanded(!expanded);
              }
            }}
          >
            {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
        ) : (
          <span style={{ width: 12 }} />
        )}
        <span style={{ flex: 1, textAlign: 'left' }}>{category.name}</span>
        <span style={styles.countPill}>{category.item_count ?? 0}</span>
      </button>
      {expanded && children.map(child => (
        <CategoryNode
          key={child.id}
          category={child}
          categories={categories}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const collectCategoryBranchIds = (categories: Category[], categoryId: string): string[] => {
  const children = categories.filter(category => category.parent_id === categoryId);
  return [categoryId, ...children.flatMap(child => collectCategoryBranchIds(categories, child.id))];
};

const buildCategoryOptions = (
  categories: Category[],
  parentId: string | null,
  depth = 0,
  excludedIds: string[] = [],
): Array<{ id: string; label: string }> => {
  return categories
    .filter(category => category.parent_id === parentId && !excludedIds.includes(category.id))
    .flatMap(category => [
      { id: category.id, label: `${'  '.repeat(depth)}${category.name}` },
      ...buildCategoryOptions(categories, category.id, depth + 1, excludedIds),
    ]);
};

const makeFieldKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const productionTemplateFields: SchemaField[] = [
  { key: 'marca', label: 'Marca', type: 'string', required: false, sort_order: 1, placeholder: 'Ej: Sony, DJI, Godox' },
  { key: 'responsable_equipo', label: 'Responsable del equipo', type: 'string', required: false, sort_order: 2, placeholder: 'Nombre de la persona responsable' },
  { key: 'condicion_inicial', label: 'Condicion inicial', type: 'select', required: false, sort_order: 3, options: ['Buen estado', 'Regular', 'Dañado / no funciona'] },
  { key: 'notas_estado', label: 'Notas del estado', type: 'textarea', required: false, sort_order: 4, placeholder: 'Detalle de daños, reparación, cambios o faltantes' },
  { key: 'ultima_revision', label: 'Ultima revision', type: 'date', required: false, sort_order: 5 },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'members'>('categories');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('string');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [hasSchemaChanges, setHasSchemaChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('root');
  const [editingCatName, setEditingCatName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string>('root');
  const [isMobile, setIsMobile] = useState(false);
  const [showCategoryPanel, setShowCategoryPanel] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    checkMobile();
    const media = window.matchMedia('(max-width: 768px)');
    media.addEventListener('change', checkMobile);
    return () => media.removeEventListener('change', checkMobile);
  }, []);

  const {
    categories,
    getSchemaForCategory,
    updateSchema,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useAppStore();

  const rootCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);
  const categoryOptions = useMemo(() => buildCategoryOptions(categories, null), [categories]);
  const selectedCategory = categories.find(category => category.id === selectedCatId);
  const childCount = selectedCatId ? categories.filter(category => category.parent_id === selectedCatId).length : 0;
  const selectedItemCount = selectedCategory?.item_count ?? 0;
  const selectedBranchIds = selectedCatId ? collectCategoryBranchIds(categories, selectedCatId) : [];

  const handleSelectCategory = (catId: string) => {
    const category = categories.find(c => c.id === catId);
    setSelectedCatId(catId);
    setEditingCatName(category?.name ?? '');
    setEditingParentId(category?.parent_id ?? 'root');
    setNewCatParentId(catId);
    setFields(getSchemaForCategory(catId)?.fields ?? []);
    setHasSchemaChanges(false);
    setSaved(false);
    if (isMobile) setShowCategoryPanel(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const parentId = newCatParentId === 'root' ? null : newCatParentId;
    const siblingCount = categories.filter(category => category.parent_id === parentId).length;
    await addCategory({
      parent_id: parentId,
      name: newCatName.trim(),
      icon: 'package',
      description: '',
      sort_order: siblingCount + 1,
      is_active: true,
    });
    setNewCatName('');
    setShowNewCat(false);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !editingCatName.trim()) return;
    const nextParentId = editingParentId === 'root' ? null : editingParentId;
    await updateCategory(selectedCategory.id, {
      name: editingCatName.trim(),
      parent_id: nextParentId,
    });
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory || childCount > 0 || selectedItemCount > 0) return;
    await deleteCategory(selectedCategory.id);
    setSelectedCatId(null);
    setEditingCatName('');
    setEditingParentId('root');
    setFields([]);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const key = makeFieldKey(newFieldName);
    if (!key || fields.some(field => field.key === key)) return;
    const newField: SchemaField = {
      key,
      label: newFieldName.trim(),
      type: newFieldType,
      required: false,
      sort_order: fields.length + 1,
      ...(newFieldType === 'select' && newFieldOptions
        ? { options: newFieldOptions.split(',').map(option => option.trim()).filter(Boolean) }
        : {}),
    };
    setFields([...fields, newField]);
    setNewFieldName('');
    setNewFieldType('string');
    setNewFieldOptions('');
    setHasSchemaChanges(true);
  };

  const handleApplyProductionTemplate = () => {
    const existingKeys = new Set(fields.map(field => field.key));
    const fieldsToAdd = productionTemplateFields
      .filter(field => !existingKeys.has(field.key))
      .map((field, index) => ({
        ...field,
        sort_order: fields.length + index + 1,
      }));
    if (fieldsToAdd.length === 0) return;
    setFields([...fields, ...fieldsToAdd]);
    setHasSchemaChanges(true);
  };

  const handleRemoveField = (key: string) => {
    setFields(fields.filter(field => field.key !== key));
    setHasSchemaChanges(true);
  };

  const handleToggleRequired = (key: string) => {
    setFields(fields.map(field => field.key === key ? { ...field, required: !field.required } : field));
    setHasSchemaChanges(true);
  };

  const handleSaveSchema = async () => {
    if (!selectedCatId) return;
    await updateSchema(selectedCatId, fields);
    setHasSchemaChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const nextFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextFields.length) return;
    [nextFields[index], nextFields[targetIndex]] = [nextFields[targetIndex], nextFields[index]];
    nextFields.forEach((field, nextIndex) => {
      field.sort_order = nextIndex + 1;
    });
    setFields(nextFields);
    setHasSchemaChanges(true);
  };

  const CategoryPanel = () => (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <div style={styles.panelTitle}>Categorías</div>
          <div style={styles.panelSubtitle}>Estructura del inventario</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNewCat(!showNewCat);
            setNewCatParentId(selectedCatId ?? 'root');
          }}
          style={styles.smallButton}
        >
          <PlusIcon size={12} /> Nueva
        </button>
      </div>

      {showNewCat && (
        <div style={styles.newCatForm}>
          <label style={styles.label}>Nombre</label>
          <input
            autoFocus
            type="text"
            placeholder="Ej: Producción, Cámaras..."
            value={newCatName}
            onChange={event => setNewCatName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleAddCategory();
              if (event.key === 'Escape') setShowNewCat(false);
            }}
            style={styles.input}
          />
          <label style={{ ...styles.label, marginTop: '8px' }}>Dentro de</label>
          <select
            value={newCatParentId}
            onChange={event => setNewCatParentId(event.target.value)}
            style={styles.input}
          >
            <option value="root">Nivel principal</option>
            {categoryOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowNewCat(false)} style={styles.secondaryButton}>Cancelar</button>
            <button type="button" onClick={handleAddCategory} disabled={!newCatName.trim()} style={styles.primaryButton}>
              Crear
            </button>
          </div>
        </div>
      )}

      <div style={styles.categoryList}>
        {rootCategories.length > 0 ? (
          rootCategories.map(category => (
            <CategoryNode
              key={category.id}
              category={category}
              categories={categories}
              depth={0}
              selectedId={selectedCatId}
              onSelect={handleSelectCategory}
            />
          ))
        ) : (
          <div style={styles.emptyState}>
            No hay categorías. Crea la primera para empezar.
          </div>
        )}
      </div>
    </div>
  );

  const DetailPanel = () => (
    <div>
      {!selectedCategory ? (
        <div style={styles.blankSlate}>
          <GearIcon size={32} fill="#d0d7de" />
          <h3 style={styles.blankTitle}>Selecciona una categoría</h3>
          <p style={styles.blankText}>
            Desde aquí puedes crear ramas como Producción, Coches, Oficina o cualquier estructura que necesites.
          </p>
        </div>
      ) : (
        <div style={styles.detailGrid}>
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.categoryTitle}>Categoría: {selectedCategory.name}</h2>
                <p style={styles.categoryMeta}>
                  {childCount} subcategoría{childCount !== 1 ? 's' : ''} · {selectedItemCount} artículo{selectedItemCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div style={styles.categoryForm}>
              <div style={styles.formRow}>
                <div style={styles.formField}>
                  <label style={styles.label}>Nombre</label>
                  <input
                    type="text"
                    value={editingCatName}
                    onChange={event => setEditingCatName(event.target.value)}
                    style={styles.input}
                  />
                </div>
                <button type="button" onClick={handleUpdateCategory} style={styles.primaryButton}>
                  <PencilIcon size={14} /> Guardar
                </button>
              </div>

              <div style={styles.actionButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCat(true);
                    setNewCatParentId(selectedCategory.id);
                  }}
                  style={styles.secondaryButton}
                >
                  <PlusIcon size={14} /> Crear subcategoría
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={childCount > 0 || selectedItemCount > 0}
                  title={childCount > 0 || selectedItemCount > 0 ? 'Solo se puede borrar una categoría vacía y sin subcategorías.' : 'Eliminar categoría'}
                  style={{
                    ...styles.secondaryButton,
                    color: childCount > 0 || selectedItemCount > 0 ? '#8b949e' : '#cf222e',
                    cursor: childCount > 0 || selectedItemCount > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <TrashIcon size={14} /> Eliminar
                </button>
              </div>
            </div>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.categoryTitle}>Campos de {selectedCategory.name}</h2>
                <p style={styles.panelSubtitle}>
                  Estos campos aparecen como formulario, columnas e importación.
                </p>
              </div>
              <div style={styles.headerActions}>
                <button type="button" onClick={handleApplyProductionTemplate} style={styles.secondaryButton}>
                  Plantilla
                </button>
                {saved && (
                  <span style={styles.savedBadge}>
                    <CheckIcon size={16} /> Guardado
                  </span>
                )}
                {hasSchemaChanges && (
                  <span style={styles.unsavedBadge}>
                    <AlertIcon size={14} /> Sin guardar
                  </span>
                )}
                <button type="button" onClick={handleSaveSchema} disabled={!hasSchemaChanges} style={styles.primaryButton}>
                  Guardar
                </button>
              </div>
            </div>

            {fields.length > 0 && !isMobile && (
              <div style={styles.fieldsHeader}>
                <span>Orden</span>
                <span>Campo</span>
                <span>Tipo</span>
                <span>Oblig.</span>
                <span>Clave</span>
                <span />
              </div>
            )}

            {fields.map((field, index) => (
              <div key={field.key} style={isMobile ? styles.fieldCard : styles.fieldRow}>
                {isMobile ? (
                  <div style={styles.fieldCardContent}>
                    <div style={styles.fieldCardHeader}>
                      <span style={styles.fieldName}>{field.label}</span>
                      <button type="button" onClick={() => handleRemoveField(field.key)} style={styles.dangerIconButton} aria-label={`Eliminar campo ${field.label}`}>
                        <TrashIcon size={14} />
                      </button>
                    </div>
                    <div style={styles.fieldCardMeta}>
                      <span style={styles.typePill}>{FIELD_TYPE_LABELS[field.type]}</span>
                      <label style={styles.requiredToggle}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={() => handleToggleRequired(field.key)}
                          style={{ accentColor: '#0969da' }}
                        />
                        {field.required ? 'Obligatorio' : 'Opcional'}
                      </label>
                    </div>
                    <code style={styles.fieldKey}>{field.key}</code>
                  </div>
                ) : (
                  <>
                    <div style={styles.fieldOrder}>
                      <button
                        type="button"
                        onClick={() => handleMoveField(index, 'up')}
                        disabled={index === 0}
                        style={{ ...styles.arrowButton, opacity: index === 0 ? 0.3 : 1 }}
                        aria-label="Mover arriba"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        style={{ ...styles.arrowButton, opacity: index === fields.length - 1 ? 0.3 : 1 }}
                        aria-label="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>
                    <span style={styles.fieldName}>{field.label}</span>
                    <span style={styles.typePill}>{FIELD_TYPE_LABELS[field.type]}</span>
                    <label style={styles.requiredToggle}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => handleToggleRequired(field.key)}
                        style={{ accentColor: '#0969da' }}
                      />
                    </label>
                    <code style={styles.fieldKey}>{field.key}</code>
                    <button type="button" onClick={() => handleRemoveField(field.key)} style={styles.dangerIconButton} aria-label={`Eliminar campo ${field.label}`}>
                      <TrashIcon size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}

            <div style={styles.addFieldForm}>
              <div style={isMobile ? styles.addFieldMobile : styles.addFieldRow}>
                <div style={styles.formField}>
                  <label style={styles.label}>Nuevo campo</label>
                  <input
                    type="text"
                    placeholder="Ej: Marca, Placas..."
                    value={newFieldName}
                    onChange={event => setNewFieldName(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') handleAddField();
                    }}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.label}>Tipo</label>
                  <select
                    value={newFieldType}
                    onChange={event => setNewFieldType(event.target.value as FieldType)}
                    style={styles.input}
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {isMobile ? (
                  <button type="button" onClick={handleAddField} disabled={!newFieldName.trim()} style={{ ...styles.primaryButton, width: '100%', marginTop: '8px' }}>
                    <PlusIcon size={12} /> Agregar
                  </button>
                ) : (
                  <button type="button" onClick={handleAddField} disabled={!newFieldName.trim()} style={styles.secondaryButton}>
                    <PlusIcon size={12} /> Agregar
                  </button>
                )}
              </div>

              {newFieldType === 'select' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={styles.label}>Opciones (separadas por coma)</label>
                  <input
                    type="text"
                    placeholder="Ej: Disponible, En renta, En taller"
                    value={newFieldOptions}
                    onChange={event => setNewFieldOptions(event.target.value)}
                    style={styles.input}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Configuración</h1>
          {isMobile && activeTab === 'categories' && selectedCategory && (
            <button
              onClick={() => setShowCategoryPanel(true)}
              style={styles.backButton}
            >
              ← Categorías
            </button>
          )}
        </div>

        <nav style={styles.tabs} role="tablist" aria-label="Configuración">
          {settingsTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (isMobile) setShowCategoryPanel(true);
              }}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={tab.key}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
              }}
            >
              <tab.icon size={14} />
              <span>{isMobile ? tab.shortLabel : tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div style={styles.content}>
        {activeTab === 'categories' && (
          isMobile ? (
            showCategoryPanel ? <CategoryPanel /> : <DetailPanel />
          ) : (
            <div style={styles.splitLayout}>
              <div style={styles.categoryPanel}><CategoryPanel /></div>
              <div style={styles.detailPanel}><DetailPanel /></div>
            </div>
          )
        )}
      </div>
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
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2328',
    margin: 0,
  },
  backButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#656d76',
  },
  tabs: {
    display: 'flex',
    padding: '0 16px 12px',
    gap: '8px',
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
    padding: '16px',
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)',
    gap: '20px',
  },
  categoryPanel: {
    minWidth: 0,
  },
  detailPanel: {
    minWidth: 0,
  },
  panel: {
    backgroundColor: '#fff',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #d0d7de',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2328',
  },
  panelSubtitle: {
    fontSize: '12px',
    color: '#656d76',
    marginTop: '2px',
  },
  smallButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #d0d7de',
    backgroundColor: '#f6f8fa',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
    color: '#1f2328',
  },
  newCatForm: {
    padding: '14px 16px',
    borderBottom: '1px solid #d0d7de',
    backgroundColor: '#f6f8fa',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#656d76',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1f2328',
    backgroundColor: '#fff',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d0d7de',
    backgroundColor: '#fff',
    color: '#1f2328',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  categoryList: {
    padding: '8px',
    maxHeight: 'calc(100vh - 280px)',
    overflowY: 'auto',
  },
  categoryRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    background: 'transparent',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  expandIcon: {
    display: 'flex',
    color: '#656d76',
    cursor: 'pointer',
  },
  countPill: {
    fontSize: '11px',
    color: '#656d76',
    backgroundColor: '#eef1f4',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  emptyState: {
    padding: '24px 12px',
    textAlign: 'center',
    color: '#656d76',
    fontSize: '13px',
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
    maxWidth: '400px',
  },
  detailGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  categoryTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2328',
  },
  categoryMeta: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#656d76',
  },
  categoryForm: {
    padding: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  formField: {
    flex: '1 1 160px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  savedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#1a7f37',
    fontWeight: 500,
  },
  unsavedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#9a6700',
  },
  fieldsHeader: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(140px, 1fr) 110px 60px 100px 36px',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#f6f8fa',
    borderBottom: '1px solid #d0d7de',
    fontSize: '11px',
    fontWeight: 600,
    color: '#656d76',
    textTransform: 'uppercase',
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(140px, 1fr) 110px 60px 100px 36px',
    gap: '8px',
    padding: '12px 16px',
    alignItems: 'center',
    borderBottom: '1px solid #eef1f4',
    fontSize: '13px',
  },
  fieldCard: {
    backgroundColor: '#fff',
    border: '1px solid #eef1f4',
    borderRadius: '10px',
    margin: '8px 16px',
    overflow: 'hidden',
  },
  fieldCardContent: {
    padding: '12px',
  },
  fieldCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  fieldCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  fieldOrder: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  arrowButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '10px',
    color: '#656d76',
    padding: '2px',
    lineHeight: 1,
  },
  fieldName: {
    fontWeight: 500,
    color: '#1f2328',
  },
  typePill: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#f6f8fa',
    color: '#656d76',
    border: '1px solid #eef1f4',
    width: 'fit-content',
  },
  requiredToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#656d76',
    cursor: 'pointer',
  },
  fieldKey: {
    fontSize: '11px',
    color: '#8b949e',
    fontFamily: 'monospace',
  },
  dangerIconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#cf222e',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '4px',
  },
  addFieldForm: {
    padding: '14px 16px',
    backgroundColor: '#f6f8fa',
    borderTop: '1px solid #d0d7de',
  },
  addFieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 140px auto',
    gap: '10px',
    alignItems: 'end',
  },
  addFieldMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
};