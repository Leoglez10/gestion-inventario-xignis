import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { APP_NAME } from '../lib/constants';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { InventoryPage } from '../features/inventory/components/InventoryPage';
import { LoansPage } from '../features/loans/components/LoansPage';
import { SettingsPage } from '../features/settings/components/SettingsPage';
import { MembersPage } from '../features/members/components/MembersPage';
import { ProfilePage } from '../features/profile/components/ProfilePage';
import { AuthPage } from '../features/auth/AuthPage';
import { AppLoader } from '../shared/components/AppLoader';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();
  if (loading) return <AppLoader message="Verificando sesión..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

import { useAppStore } from '../lib/store';

const AccessDeniedScreen: React.FC = () => {
  const { signOut, profile } = useAuthStore();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f6f8fa',
      padding: '24px',
    }}>
      <div style={{
        width: 'min(100%, 420px)',
        backgroundColor: '#fff',
        border: '1px solid #d0d7de',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          margin: '0 auto 14px',
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '20px',
        }}>
          X
        </div>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2328' }}>
          Acceso pendiente
        </h1>
        <p style={{ margin: '8px 0 18px', color: '#656d76', fontSize: '14px' }}>
          {profile?.email ?? 'Este usuario'} inicio sesion, pero no tiene acceso activo a {APP_NAME}.
          Un admin general debe agregarlo desde administracion.
        </p>
        <button
          type="button"
          onClick={async () => {
            try { await signOut(); } catch (e) { console.error(e); }
            window.location.href = '/login';
          }}
          style={{
            padding: '9px 16px',
            borderRadius: '6px',
            border: '1px solid #d0d7de',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            color: '#1f2328',
          }}
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
};

// Requires org
const RequireOrg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgId, loading } = useAuthStore();
  const { fetchInitialData, isDataLoaded } = useAppStore();

  useEffect(() => {
    if (orgId && !isDataLoaded) {
      fetchInitialData(orgId);
    }
  }, [orgId, isDataLoaded, fetchInitialData]);

  if (loading) return <AppLoader message="Cargando datos..." />;
  if (!orgId) return <AccessDeniedScreen />;
  if (!isDataLoaded) return <AppLoader message="Cargando datos..." />; // Wait for data
  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  const { initialize, initialized, user, orgId, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) return <AppLoader />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          user ? (orgId ? <Navigate to="/" replace /> : <AccessDeniedScreen />) : <AuthPage />
        } />

        {/* App routes (logged in + has org) */}
        <Route path="/" element={
          <ProtectedRoute>
            <RequireOrg>
              <DashboardLayout />
            </RequireOrg>
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
