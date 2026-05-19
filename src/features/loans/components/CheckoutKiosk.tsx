import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, XIcon, CheckCircleFillIcon, PackageIcon, PersonIcon } from '@primer/octicons-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../../../lib/store';
import { supabase } from '../../../lib/supabase';
import type { UserProfile, Item } from '../../../types/database';

export const CheckoutKiosk: React.FC = () => {
  const { users, items, categories, transactions, createTransaction, activeOrgId } = useAppStore();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [step, setStep] = useState<1 | 2>(1);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [skuInput, setSkuInput] = useState('');
  const [cart, setCart] = useState<Item[]>([]);
  const [showUserResults, setShowUserResults] = useState(false);
  const [showSkuResults, setShowSkuResults] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<Item | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showQuickBorrowerForm, setShowQuickBorrowerForm] = useState(false);
  const [quickBorrowerName, setQuickBorrowerName] = useState('');
  const [quickBorrowerEmail, setQuickBorrowerEmail] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successLoanCode, setSuccessLoanCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionLoans, setSessionLoans] = useState<{code: string; user: string; items: string[]; date: string}[]>([]);
  const userResultsRef = useRef<HTMLDivElement>(null);
  const skuResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userResultsRef.current && !userResultsRef.current.contains(event.target as Node)) {
        setShowUserResults(false);
      }
      if (skuResultsRef.current && !skuResultsRef.current.contains(event.target as Node)) {
        setShowSkuResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // QR Scanner handling
  const handleQrScan = async (data: string) => {
    setShowQrScanner(false);
    const item = items.find(i => i.sku === data || i.qr_code === data);
    if (item && item.status === 'available' && !cart.find(c => c.id === item.id)) {
      setCart([...cart, item]);
    } else if (item && item.status !== 'available') {
      setError(`${item.name} no esta disponible para prestamo.`);
    } else if (item) {
      setError('Ese articulo ya esta en el prestamo.');
    } else {
      setError('No encontre un articulo con ese codigo QR.');
    }
  };

  const handleCreateQuickBorrower = async () => {
    if (!quickBorrowerName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    // Create a real profile in Supabase
    const tempId = `quick-${uuidv4()}`;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: tempId,
        full_name: quickBorrowerName.trim(),
        email: quickBorrowerEmail.trim() || null,
      }])
      .select()
      .single();

    if (profileError) {
      setError('No se pudo crear el prestatario: ' + profileError.message);
      return;
    }

    // Also add as org member if orgId exists
    if (activeOrgId) {
      await supabase.from('org_members').insert([{
        org_id: activeOrgId,
        user_id: tempId,
        role: 'member',
      }]).catch(() => {});
    }

    const newUser: UserProfile = {
      id: tempId,
      full_name: quickBorrowerName.trim(),
      email: quickBorrowerEmail.trim() || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    setSelectedUser(newUser);
    setQuickBorrowerName('');
    setQuickBorrowerEmail('');
    setShowQuickBorrowerForm(false);
    setStep(2);
  };

  const userResults = userSearch.length > 1
    ? users.filter(u => u && u.full_name && (u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))))
    : [];

  const availableItems = items.filter(i => i.status === 'available' && !cart.find(c => c.id === i.id));
  
  // Filter items by category if selected
  const categoryFilteredItems = categoryFilter
    ? availableItems.filter(i => i.category_id === categoryFilter)
    : availableItems;
  
  const skuResults = skuInput.length > 0
    ? categoryFilteredItems.filter(i =>
        i.sku.toLowerCase().includes(skuInput.toLowerCase()) ||
        i.name.toLowerCase().includes(skuInput.toLowerCase()) ||
        (i.serial_number?.toLowerCase().includes(skuInput.toLowerCase()) ?? false)
      ).slice(0, 8)
    : [];

  // Show items directly when category is selected but no search text
  const categoryItemsPreview = categoryFilter && skuInput.length === 0
    ? categoryFilteredItems.slice(0, 6)
    : [];

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setUserSearch('');
    setShowUserResults(false);
    setStep(2);
  };

  const handleAddSku = () => {
    setError(null);
    const query = skuInput.trim().toLowerCase();
    const item = items.find(i => i.sku.toLowerCase() === query || i.name.toLowerCase().includes(query));
    if (item && item.status === 'available' && !cart.find(c => c.id === item.id)) {
      setCart([...cart, item]);
    } else if (!item) {
      setError('No encontre un articulo con ese SKU o nombre.');
    } else if (item.status !== 'available') {
      setError(`${item.name} no esta disponible para prestamo.`);
    } else {
      setError('Ese articulo ya esta en el prestamo.');
    }
    setSkuInput('');
  };

  const handleRemoveItem = (id: string) => setCart(cart.filter(i => i.id !== id));

  const handleConfirm = async () => {
    if (!selectedUser || cart.length === 0) return;

    setIsSaving(true);
    setError(null);
    setSuccessLoanCode(null);

    const { loanCode, error: saveError } = await createTransaction({
      userId: selectedUser.id,
      items: cart.map(item => ({ itemId: item.id, quantity: 1, conditionOut: 'good' })),
      dueDate: dueDate || null,
      notes: notes || null,
    });

    setIsSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setSuccessLoanCode(loanCode);
    setSessionLoans(prev => [{
      code: loanCode,
      user: selectedUser?.full_name ?? 'Usuario',
      items: cart.map(i => i.name),
      date: new Date().toISOString(),
    }, ...prev].slice(0, 10));
    setStep(1);
    setSelectedUser(null);
    setCart([]);
    setDueDate('');
    setNotes('');
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px 32px', 
      maxWidth: isMobile ? '100%' : '800px', 
      margin: '0 auto' 
    }}>
      <h1 style={{ 
        fontSize: isMobile ? '20px' : '24px', 
        fontWeight: 600, 
        color: '#1f2328', 
        margin: '0 0 4px' 
      }}>Kiosco de Préstamo</h1>
      <p style={{ fontSize: '14px', color: '#656d76', margin: '0 0 16px' }}>Escanea o busca para realizar un préstamo rápido</p>

      {/* Recent loans from store + session */}
      {(() => {
        const storeLoans = transactions.slice(0, 5).map(t => ({
          code: t.loan_code || 'Sin folio',
          user: t.user?.full_name || 'Usuario',
          items: t.items?.map(i => i.item?.name).filter(Boolean) || [],
          date: t.created_at,
          fromStore: true,
        }));
        const allLoans = [...storeLoans, ...sessionLoans].slice(0, 8);
        
        return allLoans.length > 0 ? (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#656d76', marginBottom: '8px' }}>
              Préstamos recientes
            </div>
            <div style={{ 
              display: isMobile ? 'grid' : 'flex', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '8px', 
              overflowX: isMobile ? 'visible' : 'auto', 
              paddingBottom: '8px' 
            }}>
              {allLoans.map((loan, i) => (
                <div
                  key={`${loan.code}-${i}-${loan.fromStore ? 'store' : 'session'}`}
                  style={{
                    flexShrink: 0, minWidth: isMobile ? 'auto' : '180px', padding: '12px',
                    backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0969da' }}>{loan.code}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2328', marginTop: '4px' }}>{loan.user}</div>
                  <div style={{ fontSize: '11px', color: '#656d76', marginTop: '2px' }}>
                    {loan.items.length} equipo{loan.items.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '4px' }}>
                    {new Date(loan.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {successLoanCode && (
        <div style={successStyle}>
          Prestamo creado. Folio: <strong>{successLoanCode}</strong>
        </div>
      )}

      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* Steps indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', marginBottom: '16px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 600,
              backgroundColor: step >= s ? '#0969da' : '#eef1f4', color: step >= s ? '#fff' : '#656d76',
              transition: 'all 0.2s',
            }}>{s}</div>
            <span style={{ fontSize: '13px', fontWeight: step === s ? 600 : 400, color: step === s ? '#1f2328' : '#656d76' }}>
              {s === 1 ? 'Usuario' : 'Equipos'}
            </span>
            {s < 2 && !isMobile && <div style={{ flex: 1, height: '2px', backgroundColor: step > 1 ? '#0969da' : '#d0d7de', transition: 'all 0.3s' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: User search */}
      {step === 1 && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px', padding: isMobile ? '16px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <PersonIcon size={20} fill="#0969da" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2328' }}>¿Quién solicita el equipo?</h2>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              border: '1px solid #0969da', borderRadius: '6px', backgroundColor: '#fff', boxShadow: '0 0 0 3px rgba(9,105,218,0.15)',
            }}>
              <SearchIcon size={16} fill="#656d76" />
              <input
                autoFocus type="text" placeholder="Buscar por nombre o email..."
                value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserResults(true); }}
                style={{ border: 'none', outline: 'none', fontSize: '14px', width: '100%', fontFamily: 'inherit', color: '#1f2328' }}
              />
            </div>
            {showUserResults && userResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff',
                border: '1px solid #d0d7de', borderRadius: '8px', boxShadow: '0 8px 24px rgba(140,149,159,0.2)', zIndex: 10, overflow: 'hidden',
              }}>
                {userResults.map(user => (
                  <div
                    key={user.id} onClick={() => handleSelectUser(user)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                      borderBottom: '1px solid #eef1f4', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: '#ddf4ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0969da', fontSize: '12px', fontWeight: 600,
                    }}>{user.full_name.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1f2328' }}>{user.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#656d76' }}>{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!showQuickBorrowerForm && userSearch.length > 0 && userResults.length === 0 && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickBorrowerForm(true)}
                  style={{
                    background: 'none', border: 'none', color: '#0969da', fontSize: '13px',
                    cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
                  }}
                >
                  + Crear prestatario rapido
                </button>
              </div>
            )}
            {showQuickBorrowerForm && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f8fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2328', marginBottom: '12px' }}>
                  Crear prestatario rapido
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#656d76', display: 'block', marginBottom: '4px' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={quickBorrowerName}
                      onChange={(e) => setQuickBorrowerName(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #d0d7de',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#656d76', display: 'block', marginBottom: '4px' }}>
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={quickBorrowerEmail}
                      onChange={(e) => setQuickBorrowerEmail(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #d0d7de',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => { setShowQuickBorrowerForm(false); setQuickBorrowerName(''); setQuickBorrowerEmail(''); }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #d0d7de',
                        backgroundColor: '#fff', color: '#656d76', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateQuickBorrower}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none',
                        backgroundColor: '#0969da', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Add items */}
      {step === 2 && selectedUser && (
        <div>
          {/* Selected user info */}
          <div style={{
            display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', 
            padding: '12px 16px', flexDirection: isMobile ? 'column' : 'row', gap: '8px',
            backgroundColor: '#ddf4ff', border: '1px solid #54aeff', borderRadius: '6px', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircleFillIcon size={16} fill="#0969da" />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0969da' }}>{selectedUser.full_name}</span>
            </div>
            {selectedUser.email && <span style={{ fontSize: '12px', color: '#0969da' }}>{selectedUser.email}</span>}
            <button
              onClick={() => { setStep(1); setSelectedUser(null); setCart([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0969da', fontFamily: 'inherit', fontSize: '13px' }}
            >Cambiar</button>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#656d76', marginBottom: '8px' }}>
                Filtrar por categoria
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setCategoryFilter(null); setSkuInput(''); }}
                  style={{
                    padding: '6px 12px', borderRadius: '16px', border: '1px solid #d0d7de',
                    backgroundColor: categoryFilter === null ? '#1f2328' : '#fff',
                    color: categoryFilter === null ? '#fff' : '#656d76',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setCategoryFilter(cat.id); setSkuInput(''); }}
                    style={{
                      padding: '6px 12px', borderRadius: '16px', border: '1px solid #d0d7de',
                      backgroundColor: categoryFilter === cat.id ? '#0969da' : '#fff',
                      color: categoryFilter === cat.id ? '#fff' : '#656d76',
                      fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SKU input with autocomplete */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px', padding: isMobile ? '16px' : '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <PackageIcon size={20} fill="#0969da" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2328' }}>Escanear o ingresar SKU</h2>
            </div>
            <div style={{ position: 'relative' }}>
              <form onSubmit={(e) => { e.preventDefault(); handleAddSku(); }} style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <input
                  autoFocus type="text" placeholder="Escribe para buscar equipo..."
                  value={skuInput} onChange={(e) => { setSkuInput(e.target.value); setShowSkuResults(true); }}
                  onFocus={() => setShowSkuResults(true)}
                  style={{
                    flex: 1, minWidth: isMobile ? '100%' : 'auto', padding: '12px 14px', border: '1px solid #d0d7de', borderRadius: '6px',
                    fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: '#1f2328',
                  }}
                />
                <button type="button" onClick={() => setShowQrScanner(true)} title="Escanear QR" style={{
                  padding: isMobile ? '12px' : '10px 14px', borderRadius: '6px', border: '1px solid #d0d7de',
                  backgroundColor: '#f6f8fa', color: '#656d76', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '18px',
                }}>
                  📷
                </button>
                <button type="submit" style={{
                  padding: isMobile ? '12px 16px' : '10px 20px', borderRadius: '6px', border: '1px solid rgba(27,31,36,0.15)',
                  backgroundColor: '#2da44e', color: '#fff', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Agregar</button>
              </form>
              {(showSkuResults && (skuResults.length > 0 || categoryItemsPreview.length > 0)) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(140,149,159,0.2)', zIndex: 10, maxHeight: '280px', overflowY: 'auto',
                }}>
                  {(skuInput.length > 0 ? skuResults : categoryItemsPreview).map(item => (
                    <div
                      key={item.id}
                      onClick={() => { setSkuInput(item.sku); setShowSkuResults(false); setSelectedPreview(item); }}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: '1px solid #eef1f4', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '14px', color: '#1f2328' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#656d76' }}>{item.sku}{item.serial_number ? ` · Serie: ${item.serial_number}` : ''}</div>
                      </div>
<span style={{ fontSize: '11px', color: '#0969da' }}>Ver</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Equipment Preview Modal */}
          {selectedPreview && (
            <div style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '0',
            }}>
              <div style={{
                backgroundColor: '#fff', borderRadius: '12px', width: isMobile ? '100%' : '90%', maxWidth: '420px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.2)', overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2328' }}>Vista previa</h3>
                  <button onClick={() => setSelectedPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#656d76' }}>
                    <XIcon size={18} />
                  </button>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#1f2328', marginBottom: '4px' }}>{selectedPreview.name}</div>
                  <div style={{ fontSize: '13px', color: '#656d76', marginBottom: '16px' }}>{selectedPreview.sku}</div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedPreview.serial_number && (
                      <div><span style={{ fontSize: '12px', fontWeight: 600, color: '#656d76' }}>Serie:</span> <span style={{ fontSize: '13px', color: '#1f2328' }}>{selectedPreview.serial_number}</span></div>
                    )}
                    <div><span style={{ fontSize: '12px', fontWeight: 600, color: '#656d76' }}>Categoria:</span> <span style={{ fontSize: '13px', color: '#1f2328' }}>{selectedPreview.category_id}</span></div>
                    <div><span style={{ fontSize: '12px', fontWeight: 600, color: '#656d76' }}>Estado:</span> <span style={{ fontSize: '13px', color: '#1f2328' }}>Disponible</span></div>
                    {selectedPreview.is_consumable && (
                      <div><span style={{ fontSize: '12px', fontWeight: 600, color: '#656d76' }}>Cantidad:</span> <span style={{ fontSize: '13px', color: '#1f2328' }}>{selectedPreview.quantity_available} / {selectedPreview.quantity}</span></div>
                    )}
                    {selectedPreview.notes && (
                      <div><span style={{ fontSize: '12px', fontWeight: 600, color: '#656d76' }}>Notas:</span> <span style={{ fontSize: '13px', color: '#1f2328' }}>{selectedPreview.notes}</span></div>
                    )}
                  </div>
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid #d0d7de', display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'flex-end' }}>
                  <button onClick={() => setSelectedPreview(null)} style={{
                    padding: '12px 16px', borderRadius: '6px', border: '1px solid #d0d7de',
                    backgroundColor: '#fff', color: '#1f2328', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                  }}>Cancelar</button>
                  <button onClick={() => { setCart([...cart, selectedPreview]); setSelectedPreview(null); setSkuInput(''); }} style={{
                    padding: '12px 16px', borderRadius: '6px', border: 'none',
                    backgroundColor: '#2da44e', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}>Agregar al prestamo</button>
                </div>
              </div>
            </div>
          )}

          {/* QR Scanner Modal */}
          {showQrScanner && (
            <QrScannerModal onClose={() => setShowQrScanner(false)} onScan={handleQrScan} />
          )}

          {/* Cart gallery */}
          {cart.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#656d76', marginBottom: '8px' }}>
                Equipos en prestamo ({cart.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {cart.map(item => (
                  <div key={item.id} style={{
                    padding: '10px', backgroundColor: '#fff', border: '1px solid #d0d7de',
                    borderRadius: '8px', position: 'relative',
                  }}>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px', background: '#fff',
                        border: 'none', cursor: 'pointer', color: '#cf222e', padding: '2px', borderRadius: '4px',
                        fontSize: '12px', lineHeight: 1,
                      }}
                      title="Quitar"
                    >
                      ✕
                    </button>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2328', marginBottom: '4px', paddingRight: '16px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#656d76' }}>{item.sku}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ backgroundColor: '#fff', border: '1px solid #d0d7de', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Fecha esperada de devolución</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    ...dateInputStyle,
                    ...(isMobile ? dateInputMobileStyle : {}),
                    paddingRight: dueDate ? '32px' : '12px',
                  }}
                  aria-label="Fecha esperada de devolución"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    style={{ ...clearDateButton, position: 'relative', display: 'inline-flex', marginTop: '4px' }}
                    aria-label="Limpiar fecha"
                  >
                    <XIcon size={12} /> Limpiar
                  </button>
                )}
                {!dueDate && (
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDueDate(tomorrow.toISOString().split('T')[0]);
                    }}
                    style={quickDateButton}
                  >
                    + Mañana
                  </button>
                )}
              </div>
              <div>
                <label style={labelStyle}>Notas del préstamo</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={isMobile ? 3 : 2}
                  placeholder="Ej: Producción, responsable de campo..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: isMobile ? '80px' : 'auto' }}
                />
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <button
            disabled={cart.length === 0 || isSaving} onClick={handleConfirm}
            style={{
              width: '100%', padding: '16px', borderRadius: '8px', border: 'none', cursor: cart.length > 0 && !isSaving ? 'pointer' : 'not-allowed',
              backgroundColor: cart.length > 0 && !isSaving ? '#2da44e' : '#94d3a2', color: '#fff',
              fontWeight: 600, fontSize: '16px', fontFamily: 'inherit', transition: 'background-color 0.15s',
            }}
          >
            {isSaving ? 'Creando prestamo...' : `Confirmar Préstamo (${cart.length} equipo${cart.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  );
};

interface QrScannerModalProps {
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;
    let detector: any = null;

    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        if ('BarcodeDetector' in window) {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
          const scan = async () => {
            if (videoRef.current && detector) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  onScan(barcodes[0].rawValue);
                  return;
                }
              } catch (e) {}
            }
            animationId = requestAnimationFrame(scan);
          };
          scan();
        } else {
          setError('Tu navegador no soporta escaneo de QR. Usa otro navegador o escribe el SKU manualmente.');
        }
      } catch (e) {
        setHasCamera(false);
        setError('No se pudo acceder a la camara. Verifica los permisos.');
      }
    };

    startScanner();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '400px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2328' }}>Escanear QR</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#656d76' }}>
            <XIcon size={18} />
          </button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {error ? (
            <div>
              <CameraIcon size={48} fill="#cf222e" />
              <p style={{ color: '#cf222e', fontSize: '14px', marginTop: '12px' }}>{error}</p>
              {!hasCamera && (
                <p style={{ color: '#656d76', fontSize: '13px', marginTop: '8px' }}>
                  Puedes escribir el SKU manualmente en el campo de texto.
                </p>
              )}
            </div>
          ) : (
            <div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
              />
              <p style={{ color: '#656d76', fontSize: '13px', marginTop: '12px' }}>
                Apunta la camara al codigo QR del equipo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#1f2328',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  color: '#1f2328',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};

const dateInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  color: '#1f2328',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

const dateInputMobileStyle: React.CSSProperties = {
  padding: '14px 12px',
  fontSize: '16px',
  minHeight: '52px',
};

const clearDateButton: React.CSSProperties = {
  position: 'absolute',
  right: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#f6f8fa',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  padding: '4px',
  cursor: 'pointer',
  color: '#656d76',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const quickDateButton: React.CSSProperties = {
  marginTop: '8px',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px dashed #d0d7de',
  backgroundColor: '#f6f8fa',
  color: '#656d76',
  fontSize: '12px',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #ff8182',
  borderRadius: '8px',
  backgroundColor: '#ffebe9',
  color: '#cf222e',
  fontSize: '13px',
  marginBottom: '14px',
};

const successStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #4ac26b',
  borderRadius: '8px',
  backgroundColor: '#dafbe1',
  color: '#1a7f37',
  fontSize: '13px',
  marginBottom: '14px',
};
