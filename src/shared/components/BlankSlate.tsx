import React from 'react';

interface BlankSlateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const BlankSlate: React.FC<BlankSlateProps> = ({ title, description, icon, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 40px',
        textAlign: 'center',
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        backgroundColor: '#f6f8fa',
      }}
    >
      {icon && (
        <div style={{ marginBottom: '16px', color: '#656d76' }}>
          {icon}
        </div>
      )}
      <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#1f2328' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#656d76', maxWidth: '440px', lineHeight: 1.5 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
