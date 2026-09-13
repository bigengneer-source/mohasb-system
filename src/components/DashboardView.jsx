import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Coins, 
  ReceiptText, 
  Store, 
  AlertTriangle, 
  FileCheck2,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function DashboardView({ summary, branches, onViewJournalDetails, onSwitchTab }) {
  if (!summary) return <div>جاري تحميل بيانات لوحة التحكم...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              ERP السحابي المعتمد
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              نظام الصويان ومخازن متعدد الفروع والمستودعات
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            مرحباً بك في لوحة الإدارة المالية والمخزنية
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', maxWidth: '650px', lineHeight: 1.6 }}>
            تم تفعيل محرك القيود المزدوجة التلقائي، وربط كل حركة بمركز تكلفة الفرع، مع جاهزية كاملة لنظام الفوترة الإلكترونية المرحلة الثانية (ZATCA Phase 2).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => onSwitchTab('reports')} 
            className="btn btn-secondary" 
            style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            استعراض ميزان المراجعة
          </button>
          <button 
            onClick={() => onSwitchTab('zatca')} 
            className="btn btn-primary"
          >
            إصدار فاتورة ZATCA
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Total Revenue */}
        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>إجمالي المبيعات المحققة</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
                {summary.total_revenue?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ر.س</span>
              </div>
            </div>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.65rem', borderRadius: '10px' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.8rem', color: '#059669' }}>
            <span style={{ fontWeight: 700 }}>مجمل الربح:</span>
            <span className="font-mono">{summary.gross_profit?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span>
          </div>
        </div>

        {/* Liquid Cash & Banks */}
        <div className="card" style={{ borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>السيولة النقدية (البنوك والصناديق)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
                {summary.liquid_cash?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ر.س</span>
              </div>
            </div>
            <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.65rem', borderRadius: '10px' }}>
              <Wallet size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>توزيع السيولة عبر حسابات البنوك وصناديق الفروع</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card" style={{ borderTop: '4px solid #e11d48' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>إجمالي المصروفات (تشغيلية وعمومية)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
                {summary.total_expenses?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ر.س</span>
              </div>
            </div>
            <div style={{ background: '#ffe4e6', color: '#e11d48', padding: '0.65rem', borderRadius: '10px' }}>
              <TrendingDown size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>مراقبة تكاليف الإيجارات، الرواتب، والمرافق</span>
          </div>
        </div>

        {/* Net ZATCA VAT */}
        <div className="card" style={{ borderTop: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>صافي الضريبة المستحقة (ZATCA)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
                {summary.net_vat_due?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>ر.س</span>
              </div>
            </div>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '0.65rem', borderRadius: '10px' }}>
              <ReceiptText size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
            <span>نموذج الإقرار الضريبي مطابق لمعايير الهيئة</span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Automated Journals */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                أحدث القيود المحاسبية الآلية المتولدة
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                تتولد تلقائياً فوراً وبدون تدخل بشري عند حدوث أي عملية مبيعات، مصروف، أو مشتريات
              </p>
            </div>
            <button onClick={() => onSwitchTab('journals')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              عرض كافة القيود
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>مركز التكلفة (الفرع)</th>
                  <th>نوع العملية</th>
                  <th>البيان المحاسبي</th>
                  <th>المبلغ الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_journals && summary.recent_journals.length > 0 ? (
                  summary.recent_journals.map(je => (
                    <tr key={je.id}>
                      <td className="font-mono" style={{ fontWeight: 700, color: '#047857' }}>
                        {je.entry_number}
                      </td>
                      <td>{je.date}</td>
                      <td>
                        <span className="badge badge-secondary">
                          {je.branch_name || 'المركز الرئيسي'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {je.reference_type === 'sales' ? 'مبيعات' : 
                           je.reference_type === 'expense' ? 'مصروف' : 
                           je.reference_type === 'purchase' ? 'مشتريات' : 
                           je.reference_type === 'salary' ? 'رواتب' : 
                           je.reference_type === 'damage' ? 'إتلاف' : 'قيد تأسيسي'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={je.narration}>
                        {je.narration}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        {je.total_debit?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      لا توجد قيود مسجلة بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branches & Critical Stock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Branches Status */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
              شبكة الفروع ومراكز التكلفة
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {branches.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b.name_ar}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.city} • كود: {b.code}</div>
                    </div>
                  </div>
                  <span className="badge badge-success">نشط</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <AlertTriangle size={18} style={{ color: '#d97706' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                تنبيهات المخزون الحرج
              </h3>
            </div>
            
            {summary.low_stock && summary.low_stock.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {summary.low_stock.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>{item.name_ar}</div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309' }}>{item.warehouse_name} ({item.branch_name})</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className="font-mono" style={{ fontWeight: 800, color: '#b45309' }}>{item.quantity} حبة</div>
                      <div style={{ fontSize: '0.7rem', color: '#92400e' }}>حد الطلب: {item.min_alert_quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#059669', background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                ✅ جميع المستودعات عند مستويات آمنة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
