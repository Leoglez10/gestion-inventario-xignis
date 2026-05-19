import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  flexRender, createColumnHelper, type SortingState, type ColumnDef,
} from '@tanstack/react-table';
import {
  SearchIcon, KebabHorizontalIcon, PencilIcon, XCircleIcon,
  SortAscIcon, SortDescIcon, PlusIcon, PackageIcon,
} from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import { useAuthStore } from '../../../lib/authStore';
import { isAdminRole } from '../../../lib/constants';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { CategoryTree } from './CategoryTree';
import { ColumnToggle } from './ColumnToggle';
import { ItemForm } from './ItemForm';
import { ItemDetailPanel } from './ItemDetailPanel';
import type { Item, ItemStatus, SchemaField } from '../../../types/database';

const columnHelper = createColumnHelper<Item>();

const statusFilters: { label: string; value: ItemStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponible', value: 'available' },
  { label: 'Prestado', value: 'checked_out' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Baja', value: 'retired' },
];

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useAuthStore();
  const isAdmin = isAdminRole(role);

  // Store
  const {
    categories, schemas, getFilteredItems, addItem, updateItem, deleteItem,
    columnVisibility, setColumnVisibility, resetColumnVisibility,
  } = useAppStore();

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const initialStatus = (searchParams.get('status') as ItemStatus | 'all') || 'all';
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>(initialStatus);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Dynamic fields for selected category from the STORE (not static mock)
  const dynamicFields = useMemo<SchemaField[]>(() => {
    if (!selectedCategory) return [];
    const schema = schemas.find(s => s.category_id === selectedCategory);
    return schema?.fields ?? [];
  }, [selectedCategory, schemas]);

  // Subscribe to items from store so component re-renders when items change (add/update/delete).
  // This fixes the "add item doesn't show immediately" bug while keeping performance with useMemo.
  const items = useAppStore(state => state.items);
  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId) ?? null, [items, selectedItemId]);
  const filteredItems = useMemo(
    () => getFilteredItems(selectedCategory, statusFilter, search),
    [items, selectedCategory, statusFilter, search, getFilteredItems]
  );

  const selectedItemFields = useMemo<SchemaField[]>(() => {
    if (!selectedItem) return [];
    return schemas.find(schema => schema.category_id === selectedItem.category_id)?.fields ?? [];
  }, [selectedItem, schemas]);

  // Build columns dynamically — reacts to schema changes from store
  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => {
    const base: ColumnDef<Item, unknown>[] = [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Equipo',
        cell: (info) => (
          <div>
            <div style={{ fontWeight: 500, color: '#0969da' }}>{info.getValue()}</div>
            <div style={{ fontSize: '12px', color: '#656d76' }}>{info.row.original.sku}</div>
          </div>
        ),
      }) as ColumnDef<Item, unknown>,
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Estado',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }) as ColumnDef<Item, unknown>,
      columnHelper.accessor('category_id', {
        id: 'category',
        header: 'Categoría',
        cell: (info) => {
          const cat = categories.find(c => c.id === info.getValue());
          return <span style={{ fontSize: '13px' }}>{cat?.name ?? '—'}</span>;
        },
      }) as ColumnDef<Item, unknown>,
    ];

    // Dynamic columns from JSONB schema — auto-generated
    const dynamic: ColumnDef<Item, unknown>[] = dynamicFields.map(field =>
      columnHelper.accessor((row) => row.attributes[field.key], {
        id: `attr_${field.key}`,
        header: field.label,
        cell: (info) => {
          const val = info.getValue();
          if (val === undefined || val === null) return <span style={{ color: '#b0b8c1' }}>—</span>;
          if (typeof val === 'boolean') return val ? '✓ Sí' : '✗ No';
          return <span style={{ fontSize: '13px' }}>{String(val)}</span>;
        },
      }) as ColumnDef<Item, unknown>
    );

    const qty: ColumnDef<Item, unknown> = columnHelper.accessor('quantity_available', {
      id: 'quantity',
      header: 'Disponible',
      cell: (info) => {
        const item = info.row.original;
        if (!item.is_consumable) return <span style={{ color: '#b0b8c1' }}>—</span>;
        return <span style={{ fontSize: '13px' }}>{info.getValue()} / {item.quantity}</span>;
      },
    }) as ColumnDef<Item, unknown>;

    const actions: ColumnDef<Item, unknown> = columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        if (!isAdmin) return null;
        return (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(menuOpen === info.row.original.id ? null : info.row.original.id);
              }}
              style={{
                background: 'none', border: '1px solid transparent', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '6px', color: '#656d76', display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; e.currentTarget.style.borderColor = '#d0d7de'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <KebabHorizontalIcon size={16} />
            </button>
            {menuOpen === info.row.original.id && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(140,149,159,0.2)', zIndex: 100, width: '180px', padding: '4px',
              }}>
                <button onClick={(event) => { event.stopPropagation(); setEditingItem(info.row.original); setShowItemForm(true); setMenuOpen(null); }} style={menuItemStyle}>
                  <PencilIcon size={14} /> Editar
                </button>
                <div style={{ height: '1px', background: '#d0d7de', margin: '4px 8px' }} />
                <button onClick={(event) => { event.stopPropagation(); deleteItem(info.row.original.id); setMenuOpen(null); }} style={{ ...menuItemStyle, color: '#cf222e' }}>
                  <XCircleIcon size={14} /> Dar de baja
                </button>
              </div>
            )}
          </div>
        );
      },
    }) as ColumnDef<Item, unknown>;

    return isAdmin ? [...base, ...dynamic, qty, actions] : [...base, ...dynamic, qty];
  }, [dynamicFields, menuOpen, categories, deleteItem, isAdmin]);

  // Column visibility config for the toggle dropdown
  const columnConfigs = useMemo(() => {
    return columns
      .filter(c => c.id && c.id !== 'actions')
      .map(c => ({
        key: c.id as string,
        label: typeof (c as { header?: unknown }).header === 'string' ? (c as { header: string }).header : c.id as string,
        visible: columnVisibility[c.id as string] !== false,
        required: c.id === 'name' || c.id === 'status',
      }));
  }, [columns, columnVisibility]);

  // Apply column visibility
  const visibleColumns = useMemo(() => {
    return columns.filter(c => {
      if (!c.id || c.id === 'actions') return true;
      return columnVisibility[c.id] !== false;
    });
  }, [columns, columnVisibility]);

  const table = useReactTable({
    data: filteredItems,
    columns: visibleColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Handle new item save
  const handleSaveItem = (itemData: Omit<Item, 'id' | 'org_id' | 'created_at'>) => {
    if (editingItem) {
      updateItem(editingItem.id, itemData);
    } else {
      addItem(itemData);
    }
    setShowItemForm(false);
    setEditingItem(undefined);
  };

  const selectedCategoryName = selectedCategory
    ? categories.find(category => category.id === selectedCategory)?.name ?? 'Categoria'
    : 'Todos';
  const canCreateItem = isAdmin && !!selectedCategory;

  const overlays = (
    <>
      {showItemForm && selectedCategory && (
        <ItemForm
          categoryId={selectedCategory}
          item={editingItem}
          onClose={() => { setShowItemForm(false); setEditingItem(undefined); }}
          onSave={handleSaveItem}
        />
      )}

      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          fields={selectedItemFields}
          onClose={() => setSelectedItemId(null)}
          onEdit={(item) => {
            setSelectedItemId(null);
            setEditingItem(item);
            setSelectedCategory(item.category_id);
            setShowItemForm(true);
          }}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <div style={mobilePageStyle}>
        <div style={mobileHeroStyle}>
          <div>
            <h1 style={mobileTitleStyle}>Inventario</h1>
            <p style={mobileSubtitleStyle}>{filteredItems.length} articulo{filteredItems.length !== 1 ? 's' : ''} en {selectedCategoryName.toLowerCase()}</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              disabled={!canCreateItem}
              title={canCreateItem ? 'Agregar equipo' : 'Elige una categoria para agregar equipo'}
              onClick={() => { setEditingItem(undefined); setShowItemForm(true); }}
              style={!canCreateItem ? mobilePrimaryButtonDisabledStyle : mobilePrimaryButtonStyle}
            >
              <PlusIcon size={16} /> Nuevo
            </button>
          )}
        </div>

        <div style={mobileSearchStyle}>
          <SearchIcon size={15} fill="#656d76" />
          <input
            type="text"
            placeholder="Buscar nombre, SKU o serie"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={mobileSearchInputStyle}
          />
        </div>

        <div style={mobileRailStyle} aria-label="Categorias de inventario">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            style={selectedCategory === null ? mobileChipActiveStyle : mobileChipStyle}
          >
            Todo
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              style={selectedCategory === category.id ? mobileChipActiveStyle : mobileChipStyle}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div style={mobileRailStyle} aria-label="Estados de inventario">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              style={statusFilter === filter.value ? mobileStatusActiveStyle : mobileStatusStyle}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {!selectedCategory && isAdmin && (
          <div style={mobileHintStyle}>Elige una categoria para dar de alta equipo nuevo.</div>
        )}

        <div style={mobileCardListStyle}>
          {filteredItems.length === 0 ? (
            <div style={mobileEmptyStyle}>
              <div style={{ fontWeight: 700, color: '#1f2328' }}>Sin resultados</div>
              <div style={{ color: '#656d76', fontSize: '13px', marginTop: '4px' }}>
                Ajusta la busqueda o cambia de categoria.
              </div>
            </div>
          ) : (
            filteredItems.map(item => {
              const category = categories.find(cat => cat.id === item.category_id);
              const primaryImage = item.images?.find(image => image.is_primary)?.url;

              return (
                <article key={item.id} style={mobileItemCardStyle} onClick={() => setSelectedItemId(item.id)}>
                  <div style={mobileItemImageStyle}>
                    {primaryImage ? (
                      <img src={primaryImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <PackageIcon size={24} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={mobileItemNameStyle}>{item.name}</h2>
                        <div style={mobileItemMetaStyle}>{item.sku}{item.serial_number ? ` · Serie ${item.serial_number}` : ''}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div style={mobileItemFooterStyle}>
                      <span>{category?.name ?? 'Sin categoria'}</span>
                      <span>{item.is_consumable ? `${item.quantity_available}/${item.quantity}` : 'Pieza unica'}</span>
                    </div>
                    <div style={mobileActionsStyle} onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedItemId(item.id)} style={mobileSecondaryButtonStyle}>Ver</button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => { setEditingItem(item); setSelectedCategory(item.category_id); setShowItemForm(true); }}
                          style={mobileSecondaryButtonStyle}
                        >
                          Editar
                        </button>
                      )}
                      <button type="button" onClick={() => navigate('/loans')} style={mobileLoanButtonStyle}>Prestar</button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {overlays}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Category sidebar - reads from store */}
      <CategoryTree selectedCategoryId={selectedCategory} onSelectCategory={setSelectedCategory} />

      {/* Table area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #d0d7de',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px',
            border: '1px solid #d0d7de', borderRadius: '6px', flex: 1, maxWidth: '320px',
            backgroundColor: '#f6f8fa',
          }}>
            <SearchIcon size={14} fill="#656d76" />
            <input
              type="text" placeholder="Buscar por nombre, SKU o serie..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: '13px', color: '#1f2328', width: '100%', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f6f8fa', borderRadius: '6px', padding: '2px', border: '1px solid #d0d7de' }}>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: statusFilter === f.value ? 600 : 400, fontFamily: 'inherit',
                  backgroundColor: statusFilter === f.value ? '#fff' : 'transparent',
                  color: statusFilter === f.value ? '#1f2328' : '#656d76',
                  boxShadow: statusFilter === f.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Column toggle */}
          <ColumnToggle
            columns={columnConfigs}
            onToggle={(key, visible) => setColumnVisibility(key, visible)}
            onReset={resetColumnVisibility}
          />

          {/* Add item button */}
          {isAdmin && (
            <button
              disabled={!canCreateItem}
              title={canCreateItem ? 'Agregar equipo' : 'Selecciona una categoria para agregar equipo'}
              onClick={() => { setEditingItem(undefined); setShowItemForm(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 14px',
                borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)',
                backgroundColor: canCreateItem ? '#2da44e' : '#8c959f', color: '#fff', fontWeight: 600, fontSize: '13px',
                cursor: canCreateItem ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: canCreateItem ? 1 : 0.75,
              }}
            >
              <PlusIcon size={14} /> Nuevo
            </button>
          )}

          {isAdmin && !selectedCategory && (
            <span style={{ fontSize: '12px', color: '#656d76' }}>
              Selecciona una categoria para agregar equipo.
            </span>
          )}

          {/* Count */}
          <span style={{ fontSize: '13px', color: '#656d76', marginLeft: 'auto' }}>
            {filteredItems.length} equipo{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '12px',
                        color: '#656d76', backgroundColor: '#f6f8fa', borderBottom: '1px solid #d0d7de',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <SortAscIcon size={12} />}
                        {header.column.getIsSorted() === 'desc' && <SortDescIcon size={12} />}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ color: '#656d76' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: '#1f2328' }}>
                        Sin resultados
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        {search ? `No se encontraron equipos para "${search}"` : 'No hay equipos en esta categoría'}
                      </div>
                      {selectedCategory && isAdmin && (
                        <button
                          onClick={() => { setEditingItem(undefined); setShowItemForm(true); }}
                          style={{
                            marginTop: '12px', padding: '6px 16px', borderRadius: '6px',
                            border: '1px solid rgba(27,31,36,0.15)', backgroundColor: '#2da44e',
                            color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Crear primer equipo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedItemId(row.original.id)}
                    style={{ borderBottom: '1px solid #d0d7de', backgroundColor: '#fff', transition: 'background-color 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {overlays}
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px',
  border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
  color: '#1f2328', borderRadius: '6px', textAlign: 'left',
};

const mobilePageStyle: React.CSSProperties = {
  minHeight: '100%',
  padding: '16px 14px 24px',
  backgroundColor: '#f6f8fa',
};

const mobileHeroStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '0 2px 16px',
};

const mobileTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#1f2328',
  fontSize: '22px',
  lineHeight: 1.2,
  fontWeight: 700,
};

const mobileSubtitleStyle: React.CSSProperties = {
  margin: '7px 0 0',
  color: '#656d76',
  fontSize: '13px',
};

const mobilePrimaryButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: '1px solid rgba(27,31,36,0.15)',
  borderRadius: '8px',
  padding: '8px 14px',
  backgroundColor: '#2da44e',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const mobilePrimaryButtonDisabledStyle: React.CSSProperties = {
  ...mobilePrimaryButtonStyle,
  background: '#8c959f',
  cursor: 'not-allowed',
  opacity: 0.75,
};

const mobileSearchStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  backgroundColor: '#fff',
  border: '1px solid #d0d7de',
  borderRadius: '10px',
  padding: '8px 12px',
};

const mobileSearchInputStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  width: '100%',
  fontFamily: 'inherit',
  fontSize: '14px',
  color: '#1f2328',
};

const mobileRailStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  overflowX: 'auto',
  padding: '12px 0 0',
  scrollbarWidth: 'none',
};

const mobileChipStyle: React.CSSProperties = {
  border: '1px solid #d0d7de',
  backgroundColor: 'rgba(255,255,255,0.85)',
  color: '#57606a',
  borderRadius: '999px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const mobileChipActiveStyle: React.CSSProperties = {
  ...mobileChipStyle,
  backgroundColor: '#1f2328',
  borderColor: '#1f2328',
  color: '#fff',
};

const mobileStatusStyle: React.CSSProperties = {
  ...mobileChipStyle,
  padding: '7px 11px',
  fontWeight: 650,
};

const mobileStatusActiveStyle: React.CSSProperties = {
  ...mobileStatusStyle,
  backgroundColor: '#ddf4ff',
  borderColor: '#54aeef',
  color: '#0969da',
};

const mobileHintStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '10px 12px',
  borderRadius: '12px',
  backgroundColor: '#fff8c5',
  color: '#7d4e00',
  fontSize: '12px',
  border: '1px solid #f0d98c',
};

const mobileCardListStyle: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
  marginTop: '16px',
};

const mobileItemCardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  border: '1px solid #d0d7de',
  borderRadius: '12px',
  padding: '14px',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const mobileItemImageStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '10px',
  backgroundColor: '#f6f8fa',
  color: '#8b949e',
  border: '1px solid #eaeef2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
};

const mobileItemNameStyle: React.CSSProperties = {
  margin: 0,
  color: '#1f2328',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mobileItemMetaStyle: React.CSSProperties = {
  marginTop: '3px',
  color: '#656d76',
  fontSize: '12px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mobileItemFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  marginTop: '10px',
  color: '#656d76',
  fontSize: '12px',
};

const mobileActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
};

const mobileSecondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  backgroundColor: '#fff',
  color: '#1f2328',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 600,
  padding: '7px 10px',
  cursor: 'pointer',
};

const mobileLoanButtonStyle: React.CSSProperties = {
  ...mobileSecondaryButtonStyle,
  backgroundColor: '#2da44e',
  borderColor: '#2da44e',
  color: '#fff',
  marginLeft: 'auto',
};

const mobileEmptyStyle: React.CSSProperties = {
  padding: '28px 18px',
  textAlign: 'center',
  backgroundColor: '#fff',
  border: '1px dashed #d0d7de',
  borderRadius: '12px',
};
