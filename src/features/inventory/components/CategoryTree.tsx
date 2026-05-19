import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@primer/octicons-react';
import { useAppStore } from '../../../lib/store';
import type { Category } from '../../../types/database';

interface CategoryTreeProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

interface TreeNodeProps {
  category: Category;
  allCategories: Category[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ category, allCategories, depth, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const children = allCategories.filter(c => c.parent_id === category.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        onClick={() => onSelect(isSelected ? null : category.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', paddingLeft: `${12 + depth * 16}px`,
          cursor: 'pointer', fontSize: '13px', borderRadius: '6px',
          backgroundColor: isSelected ? '#ddf4ff' : 'transparent',
          color: isSelected ? '#0969da' : '#1f2328',
          fontWeight: isSelected ? 600 : 400,
          transition: 'background-color 0.1s',
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ display: 'flex', alignItems: 'center', color: '#656d76' }}
          >
            {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
        )}
        {!hasChildren && <span style={{ width: '12px' }} />}
        <span style={{ flex: 1 }}>{category.name}</span>
        <span style={{ fontSize: '11px', color: '#656d76', backgroundColor: '#eef1f4', padding: '0 6px', borderRadius: '10px' }}>
          {category.item_count ?? 0}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map(child => (
            <TreeNode key={child.id} category={child} allCategories={allCategories} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export const CategoryTree: React.FC<CategoryTreeProps> = ({ selectedCategoryId, onSelectCategory }) => {
  // Read categories from the store — auto-updates when a new category is added
  const categories = useAppStore(state => state.categories);
  const rootCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);

  return (
    <div style={{
      width: '220px', minWidth: '220px', borderRight: '1px solid #d0d7de',
      backgroundColor: '#fff', padding: '12px 0', overflowY: 'auto',
    }}>
      <div style={{ padding: '4px 16px 12px', fontSize: '11px', fontWeight: 600, color: '#656d76', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Categorías
      </div>
      {/* All items */}
      <div
        onClick={() => onSelectCategory(null)}
        style={{
          padding: '6px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '6px',
          margin: '0 8px', marginBottom: '4px',
          backgroundColor: selectedCategoryId === null ? '#ddf4ff' : 'transparent',
          color: selectedCategoryId === null ? '#0969da' : '#1f2328',
          fontWeight: selectedCategoryId === null ? 600 : 400,
          transition: 'background-color 0.1s',
        }}
      >
        Todos los equipos
      </div>
      <div style={{ height: '1px', backgroundColor: '#d0d7de', margin: '8px 16px' }} />
      {rootCategories.map(cat => (
        <TreeNode key={cat.id} category={cat} allCategories={categories} depth={0} selectedId={selectedCategoryId} onSelect={onSelectCategory} />
      ))}
    </div>
  );
};
