import React, { useState } from 'react';
import { useAuthStore } from '../../lib/authStore';
import { APP_NAME } from '../../lib/constants';
import { AlertIcon, FlameIcon, LockIcon } from '@primer/octicons-react';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await signIn(email, password);
    if (error) setError('No se pudo iniciar sesion. Revisa tu correo, contrasena o acceso interno.');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f6f8fa',
    }}>
      <div style={{ width: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <FlameIcon size={24} fill="#fff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 300, color: '#1f2328', margin: 0 }}>
            Acceso interno
          </h1>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1f2328', margin: '2px 0 0' }}>
            {APP_NAME}
          </h2>
          <p style={{ margin: '8px 0 0', color: '#656d76', fontSize: '13px' }}>
            Solo miembros autorizados por administracion.
          </p>
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '6px',
          padding: '20px',
        }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
              backgroundColor: '#ffebe9', border: '1px solid #ff818266', borderRadius: '6px',
              fontSize: '13px', color: '#cf222e', marginBottom: '16px',
            }}>
              <AlertIcon size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="usuario@xignis.com" autoFocus style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px', borderRadius: '6px',
              border: '1px solid rgba(27,31,36,0.15)',
              backgroundColor: loading ? '#94d3a2' : '#2da44e',
              color: '#fff', fontWeight: 600, fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {loading ? 'Validando acceso...' : 'Iniciar sesion'}
            </button>
          </form>
        </div>

        <div style={{
          marginTop: '16px', padding: '16px', textAlign: 'center',
          border: '1px solid #d0d7de', borderRadius: '6px', backgroundColor: '#fff',
          fontSize: '13px', color: '#656d76', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <LockIcon size={14} /> Las cuentas se crean desde administracion.
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#1f2328', marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d0d7de', borderRadius: '6px',
  fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: '#1f2328',
  boxSizing: 'border-box', backgroundColor: '#fff',
};
