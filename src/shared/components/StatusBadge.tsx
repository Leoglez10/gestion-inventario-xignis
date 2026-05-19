import React from 'react';
import { STATUS_COLORS, STATUS_LABELS, TRANSACTION_STATUS_COLORS, TRANSACTION_STATUS_LABELS } from '../../lib/constants';
import type { ItemStatus, TransactionStatus } from '../../types/database';

interface StatusBadgeProps {
  status: ItemStatus | TransactionStatus;
  variant?: 'item' | 'transaction';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'item' }) => {
  const colors = variant === 'item' ? STATUS_COLORS[status] : TRANSACTION_STATUS_COLORS[status];
  const label = variant === 'item' ? STATUS_LABELS[status] : TRANSACTION_STATUS_LABELS[status];

  if (!colors || !label) return <span>{status}</span>;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '20px',
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
    >
      {'dot' in colors && (
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: (colors as { dot: string }).dot,
          }}
        />
      )}
      {label}
    </span>
  );
};
