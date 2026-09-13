import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Layers, 
  Plus, 
  Receipt, 
  ArrowRightLeft,
  ShoppingBag,
  Globe
} from 'lucide-react';
import { t } from '../i18n';

export default function Header({ 
  branches, 
  selectedBranch, 
  onSelectBranch, 
  onOpenNewInvoice, 
  onOpenNewExpense, 
  onOpenTransfer,
  onOpenPos,
  currentTenant,
  currentUser,
  lang,
  onToggleLang
}) {
  const isCashier = currentUser?.role === 'cashier';

  return (
    <header className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Branch Selector */}
        {!isCashier && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <Building2 size={18} style={{ color: '#047857' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
              {t('active_branch', lang)}
            </span>
            <select 
              value={selectedBranch} 
              onChange={(e) => onSelectBranch(e.target.value)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                outline: 'none', 
                fontWeight: 700, 
                fontSize: '0.9rem', 
                color: '#0f172a',
                cursor: 'pointer' 
              }}
            >
              <option value="all">🏢 {t('all_branches', lang)}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  📍 {b.name_ar} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ZATCA Phase 2 Active Badge */}
        <div className="badge badge-success" title="نظام الربط مع منصة فاتورة نشط ومفعل للمرحلة الثانية">
          <ShieldCheck size={14} />
          <span>{t('zatca_compliant', lang)}</span>
        </div>

        {/* Tenant Name */}
        {currentTenant && (
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
            🌿 {currentTenant.company_name_ar}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        {/* Language Switcher */}
        <button
          onClick={onToggleLang}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.8rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title="تغيير لغة النظام / Change Language"
        >
          <Globe size={15} />
          <span>{t('switch_lang', lang)}</span>
        </button>

        {/* Quick Actions */}
        <button 
          onClick={onOpenPos}
          className="btn btn-primary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
        >
          <ShoppingBag size={16} />
          <span>{t('cashier_pos', lang)}</span>
        </button>

        {!isCashier && (
          <>
            <button 
              onClick={onOpenNewInvoice}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Receipt size={16} />
              <span>{t('new_invoice', lang)}</span>
            </button>

            <button 
              onClick={onOpenNewExpense}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>{t('new_expense', lang)}</span>
            </button>

            <button 
              onClick={onOpenTransfer}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <ArrowRightLeft size={16} />
              <span>{t('stock_transfer', lang)}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

