import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  GraphIcon, PackageIcon, ArrowSwitchIcon, GearIcon, FlameIcon, SignOutIcon, PeopleIcon, PersonIcon,
} from '@primer/octicons-react';
import { useAuthStore } from '../../lib/authStore';
import { APP_NAME, ROLE_LABELS, isAdminRole } from '../../lib/constants';

const navItems = [
  { label: 'Dashboard', path: '/', icon: GraphIcon },
  { label: 'Inventario', path: '/inventory', icon: PackageIcon },
  { label: 'Préstamos', path: '/loans', icon: ArrowSwitchIcon },
  { label: 'Miembros', path: '/members', icon: PeopleIcon, adminOnly: true },
  { label: 'Configuración', path: '/settings', icon: GearIcon, adminOnly: true },
  { label: 'Perfil', path: '/profile', icon: PersonIcon },
];

export const DashboardLayout: React.FC = () => {
  const { profile, orgName, role, signOut } = useAuthStore();
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? '?';
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  
  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => 
    !item.adminOnly || isAdminRole(role)
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: '#f6f8fa' }}>
        <header style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          backgroundColor: '#1f2328',
          color: '#f0f6fc',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FlameIcon size={18} fill="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.2 }}>{APP_NAME}</div>
              <div style={{ color: '#7d8590', fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {orgName ?? 'Control interno'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <NavLink
              to="/profile"
              title="Mi perfil"
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#30363d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f0f6fc', fontSize: '12px', fontWeight: 600, textDecoration: 'none',
              }}
            >
              {initials}
            </NavLink>
            <button
              onClick={async () => {
                try { await signOut(); } catch (e) { console.error(e); }
                window.location.href = '/login';
              }}
              title="Cerrar sesion"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f0f6fc', display: 'flex', alignItems: 'center', padding: '8px' }}
            >
              <SignOutIcon size={16} />
            </button>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 56px)', paddingBottom: '72px', overflow: 'auto' }}>
          <Outlet />
        </main>

        <nav style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '64px',
          backgroundColor: '#fff',
          borderTop: '1px solid #d0d7de',
          display: 'grid',
          gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
          zIndex: 30,
        }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                textDecoration: 'none',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0969da' : '#656d76',
                minWidth: 0,
              })}
            >
              <item.icon size={18} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          minWidth: '240px',
          backgroundColor: '#1f2328',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #30363d',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '16px 16px 24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #30363d' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FlameIcon size={18} fill="#fff" />
          </div>
          <div>
            <div style={{ color: '#f0f6fc', fontSize: '15px', fontWeight: 600, lineHeight: 1.2 }}>{APP_NAME}</div>
            <div style={{ color: '#7d8590', fontSize: '11px', lineHeight: 1.2 }}>{orgName ?? 'Control interno'}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f0f6fc' : '#7d8590',
                backgroundColor: isActive ? '#30363d' : 'transparent',
                marginBottom: '2px',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #30363d' }}>
          <NavLink
            to="/profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              textDecoration: 'none', padding: '4px', borderRadius: '6px',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#30363d'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#30363d', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7d8590', fontSize: '12px', fontWeight: 600,
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: '#f0f6fc', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name ?? 'Usuario'}</div>
              <div style={{ color: '#7d8590', fontSize: '11px' }}>{ROLE_LABELS[role ?? ''] ?? role ?? 'Miembro'}</div>
            </div>
          </NavLink>
          <button
            onClick={async () => {
              try { await signOut(); } catch (e) { console.error(e); }
              window.location.href = '/login';
            }}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#7d8590',
              display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px',
              marginTop: '8px', width: '100%', justifyContent: 'center',
              fontSize: '12px', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0f6fc'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#7d8590'; }}
          >
            <SignOutIcon size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#f6f8fa' }}>
        <Outlet />
      </main>
    </div>
  );
};
