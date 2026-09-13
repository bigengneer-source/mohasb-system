import React from 'react';
import { 
  LayoutDashboard, 
  GitFork, 
  BookOpenCheck, 
  QrCode, 
  Boxes, 
  FileSpreadsheet, 
  Users, 
  Sparkles,
  ShoppingBag,
  ClipboardCheck,
  ShieldAlert,
  LogOut,
  Building,
  UserCheck
} from 'lucide-react';
import { t } from '../i18n';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  currentTenant, 
  isSuperAdmin,
  isImpersonating,
  onStopImpersonating,
  onLogout,
  lang = 'ar'
}) {
  const isCashier = currentUser?.role === 'cashier';

  // Define full menu
  const menuItems = [
    { id: 'dashboard', label: t('dashboard', lang), icon: LayoutDashboard, showForCashier: false },
    { id: 'cashier_pos', label: t('cashier_pos', lang), icon: ShoppingBag, badge: 'POS', showForCashier: true },
    { id: 'annual_count', label: t('annual_count', lang), icon: t('annual_count', lang), icon: ClipboardCheck, badge: 'تسوية', showForCashier: false },
    { id: 'inventory', label: t('inventory', lang), icon: Boxes, showForCashier: true },
    { id: 'zatca', label: t('zatca', lang), icon: QrCode, badge: 'Phase 2', showForCashier: false },
    { id: 'accounts', label: t('accounts', lang), icon: GitFork, badge: 'ديناميكية', showForCashier: false },
    { id: 'journals', label: t('journals', lang), icon: BookOpenCheck, badge: 'آلية', showForCashier: false },
    { id: 'reports', label: t('reports', lang), icon: FileSpreadsheet, badge: 'فورية', showForCashier: false },
  ];

  if (isSuperAdmin) {
    menuItems.unshift({
      id: 'super_admin',
      label: 'إدارة المنظومة (Super Admin)',
      icon: ShieldAlert,
      badge: 'مطلق',
      showForCashier: false
    });
  }

  const visibleItems = isCashier 
    ? menuItems.filter(item => item.showForCashier)
    : menuItems;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '1.25rem 1.1rem', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <Sparkles size={22} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              منظومة الصويان السحابية
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, margin: '2px 0 0' }}>
              {currentTenant ? currentTenant.company_name_ar : 'منصة المشاتل والزراعة'}
            </p>
          </div>
        </div>

        {isImpersonating && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.45rem 0.65rem', 
            background: 'rgba(234, 179, 8, 0.15)', 
            border: '1px solid #eab308', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#fef08a', fontWeight: 700 }}>
              وضع انتحال المشترك
            </span>
            <button
              onClick={onStopImpersonating}
              style={{
                background: '#ca8a04',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              رجوع للإدارة
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', padding: '0 0.75rem 0.4rem' }}>
          {isCashier ? 'قائمة الكاشير والمبيعات' : 'الوحدات الأساسية'}
        </div>

        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.7rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.08) 100%)' : 'transparent',
                color: isActive ? '#34d399' : '#cbd5e1',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'right',
                width: '100%',
                outline: 'none',
                borderRight: isActive ? '3px solid #10b981' : '3px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <Icon size={18} style={{ color: isActive ? '#34d399' : '#94a3b8' }} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '6px',
                  background: isActive ? '#065f46' : '#1e293b',
                  color: isActive ? '#6ee7b7' : '#94a3b8',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #1e293b', background: '#0b132b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#047857',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem',
              flexShrink: 0
            }}>
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'مستخدم المنظومة'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {currentUser?.role === 'super_admin' ? 'المسؤول المطلق' : (currentUser?.role === 'cashier' ? 'كاشير نقطة البيع' : 'مدير المنشأة')}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
          <span>منظومة الصويان السحابية</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            متصل
          </span>
        </div>
      </div>
    </aside>
  );
}

