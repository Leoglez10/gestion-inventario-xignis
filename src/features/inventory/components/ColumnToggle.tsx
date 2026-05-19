import React, { useState, useRef, useEffect } from 'react';
import { ColumnsIcon, EyeIcon, EyeClosedIcon } from '@primer/octicons-react';

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean; // Columns like 'name' can't be hidden
}

interface ColumnToggleProps {
  columns: ColumnConfig[];
  onToggle: (key: string, visible: boolean) => void;
  onReset: () => void;
}

/**
 * Dropdown to let users pick which columns to show in the table.
 * Core columns (Equipo, Estado) are always visible and can't be hidden.
 */
export const ColumnToggle: React.FC<ColumnToggleProps> = ({ columns, onToggle, onReset }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '6px',
          border: '1px solid #d0d7de', backgroundColor: open ? '#f6f8fa' : '#fff',
          cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
          color: '#1f2328', fontWeight: 500,
        }}
      >
        <ColumnsIcon size={14} />
        Columnas
        <span style={{
          fontSize: '11px', backgroundColor: '#eef1f4', padding: '0 6px',
          borderRadius: '10px', color: '#656d76',
        }}>{visibleCount}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          width: '260px', backgroundColor: '#fff', border: '1px solid #d0d7de',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(140,149,159,0.2)',
          zIndex: 100, overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px', borderBottom: '1px solid #d0d7de',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2328' }}>
              Columnas visibles
            </span>
            <button
              onClick={onReset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: '#0969da', fontFamily: 'inherit',
              }}
            >
              Restaurar
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflow: 'auto', padding: '4px' }}>
            {columns.map(col => (
              <label
                key={col.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px', borderRadius: '6px', cursor: col.required ? 'default' : 'pointer',
                  opacity: col.required ? 0.5 : 1,
                  fontSize: '13px', color: '#1f2328',
                }}
                onMouseEnter={e => { if (!col.required) e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={col.required}
                  onChange={e => onToggle(col.key, e.target.checked)}
                  style={{ accentColor: '#0969da' }}
                />
                {col.visible
                  ? <EyeIcon size={14} fill="#656d76" />
                  : <EyeClosedIcon size={14} fill="#b0b8c1" />
                }
                <span style={{ flex: 1 }}>{col.label}</span>
                {col.required && (
                  <span style={{ fontSize: '10px', color: '#8b949e' }}>fija</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
