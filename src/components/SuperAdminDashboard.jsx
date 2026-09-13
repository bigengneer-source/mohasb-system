import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Lock, 
  Unlock, 
  Calendar, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft,
  ExternalLink,
  Search,
  Sparkles,
  Settings
} from 'lucide-react';

export default function SuperAdminDashboard({ onImpersonateTenant }) {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Trial Edit Modal
  const [selectedTenantForTrial, setSelectedTenantForTrial] = useState(null);
  const [newTrialDate, setNewTrialDate] = useState('');
  const [savingTrial, setSavingTrial] = useState(false);

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        fetch('/api/superadmin/tenants'),
        fetch('/api/superadmin/system-stats')
      ]);
      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();
      if (tenantsData.success) setTenants(tenantsData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Error fetching superadmin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // تغيير حالة الشركة (قفل / فتح / تفعيل)
  const handleUpdateStatus = async (tenantId, status) => {
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchSuperAdminData();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    }
  };

  // تبديل ربط ZATCA للشركة
  const handleToggleZatca = async (tenantId, currentVal) => {
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_zatca: !currentVal })
      });
      const data = await res.json();
      if (data.success) {
        fetchSuperAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // حفظ التاريخ التجريبي الجديد
  const handleSaveTrialDate = async (e) => {
    e.preventDefault();
    setSavingTrial(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenantForTrial.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'trial',
          trial_ends_at: newTrialDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTenantForTrial(null);
        fetchSuperAdminData();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setSavingTrial(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    if (searchTerm) {
      const matchName = t.name_ar.toLowerCase().includes(searchTerm.toLowerCase());
      const matchOwner = t.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCode = t.code.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchOwner && !matchCode) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Super Admin Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              صلاحيات المسؤول المطلق (Super Admin Power)
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              الحساب المعتمد: elhassanelsoudy@gmail.com
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900 }}>
            مركز إدارة الشركات والمشتركين والتحكم بالنظام
          </h2>
          <p style={{ color: '#a7f3d0', fontSize: '0.9rem', maxWidth: '700px' }}>
            أنت تمتلك صلاحية التعديل والتحكم المطلقة في كل شبر داخل منظومة الصويان السحابية: تفعيل حسابات الشركات المشتركة، تحديد الفترات التجريبية يدوياً، وقفل وفتح النظام.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchSuperAdminData} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)' }}>
            تحديث البيانات اللحظي
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ borderTop: '4px solid #047857' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>إجمالي الشركات المسجلة</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
              {stats.total_tenants}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.4rem' }}>
              نشط: {stats.active_tenants} | تجريبي: {stats.trial_tenants}
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>الشركات النشطة</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', marginTop: '0.25rem' }} className="font-mono">
              {stats.active_tenants}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
              اشتراكات مفعلة ومكتملة
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #d97706' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>الشركات في الفترة التجريبية</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#d97706', marginTop: '0.25rem' }} className="font-mono">
              {stats.trial_tenants}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.4rem' }}>
              يمكنك تعديل مدة التجربة يدوياً
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #be123c' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>الشركات المقفلة / الموقوفة</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#be123c', marginTop: '0.25rem' }} className="font-mono">
              {stats.locked_tenants}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#be123c', marginTop: '0.4rem' }}>
              محظور دخولهم للنظام
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid #0284c7' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>حجم مبيعات المنظومة الكلي</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', marginTop: '0.25rem' }} className="font-mono">
              {stats.total_volume?.toLocaleString('ar-SA')} <span style={{ fontSize: '0.8rem' }}>ر.س</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
              عبر {stats.total_invoices} فاتورة مصدرة
            </div>
          </div>
        </div>
      )}

      {/* Tenants Management Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
              جدول إدارة الشركات والمشتركين ({filteredTenants.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              تحكم كامل في تفعيل الشركات، قفل أو فتح النظام، وتعيين تواريخ الفترات التجريبية.
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="بحث بالشركة أو المالك..."
              className="form-input"
              style={{ paddingRight: '2.4rem', width: '100%' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>كود المنشأة</th>
                <th>اسم الشركة / المشتل</th>
                <th>مالك المنشأة والاتصال</th>
                <th>حالة الاشتراك</th>
                <th>نهاية الفترة التجريبية</th>
                <th>ربط ZATCA 2</th>
                <th>الفروع / الكاشيرات</th>
                <th>إجمالي المبيعات</th>
                <th style={{ textAlign: 'center' }}>إجراءات المسؤول المطلق</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(t => (
                <tr key={t.id}>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                    {t.code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{t.name_ar}</div>
                    {t.name_en && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.name_en}</div>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.owner_name}</div>
                    <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                    {t.phone && <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.phone}</div>}
                  </td>
                  <td>
                    <span className={`badge ${
                      t.status === 'active' ? 'badge-success' :
                      t.status === 'trial' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {t.status === 'active' ? '✅ نشط ومفعل' :
                       t.status === 'trial' ? '⏳ فترة تجريبية' : '🔒 مقفل وموقوف'}
                    </span>
                  </td>
                  <td>
                    {t.status === 'trial' ? (
                      <div>
                        <span className="font-mono" style={{ fontWeight: 700, color: '#b45309' }}>
                          {t.trial_ends_at || '—'}
                        </span>
                        <div>
                          <button
                            onClick={() => {
                              setSelectedTenantForTrial(t);
                              setNewTrialDate(t.trial_ends_at || new Date().toISOString().split('T')[0]);
                            }}
                            style={{ background: 'none', border: 'none', color: '#047857', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            تعديل التاريخ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>مفعل دائم</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleZatca(t.id, t.enable_zatca)}
                      className={`badge ${t.enable_zatca ? 'badge-success' : 'badge-secondary'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="انقر لتفعيل أو إلغاء الربط"
                    >
                      {t.enable_zatca ? 'مفعل ✓' : 'معطل ✕'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem' }}>
                      فروع: <strong>{t.branch_count}</strong> • كاشيرات: <strong>{t.user_count}</strong>
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 800 }}>
                    {t.total_sales?.toLocaleString('ar-SA')} ر.س
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      {/* تفعيل كامل */}
                      {t.status !== 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'active')}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#047857' }}
                          title="تفعيل دائم للمنشأة"
                        >
                          تفعيل
                        </button>
                      )}

                      {/* قفل أو فتح */}
                      {t.status === 'locked' ? (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'active')}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#047857' }}
                          title="فتح النظام"
                        >
                          <Unlock size={13} />
                          <span>فتح</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'locked')}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', color: '#be123c' }}
                          title="قفل النظام على المنشأة"
                        >
                          <Lock size={13} />
                          <span>قفل</span>
                        </button>
                      )}

                      {/* الدخول كمسؤول في الشركة */}
                      <button
                        onClick={() => onImpersonateTenant(t)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', background: '#047857' }}
                        title="الدخول للشركة لمعاينة وتعديل بياناتها كمسؤول مطلق"
                      >
                        <ExternalLink size={13} />
                        <span>دخول للمنشأة</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Set Trial Period */}
      {selectedTenantForTrial && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>تحديد الفترة التجريبية للشركة</h3>
              <button onClick={() => setSelectedTenantForTrial(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSaveTrialDate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800 }}>{selectedTenantForTrial.name_ar}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>المالك: {selectedTenantForTrial.owner_name}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ انتهاء الفترة التجريبية</label>
                  <input
                    required
                    type="date"
                    className="form-input font-mono"
                    value={newTrialDate}
                    onChange={e => setNewTrialDate(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    بعد هذا التاريخ لن يتمكن مستخدمو الشركة من الدخول إلا بعد تفعيلك للاشتراك.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedTenantForTrial(null)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={savingTrial} className="btn btn-primary" style={{ background: '#047857' }}>
                  {savingTrial ? 'جاري الحفظ...' : 'حفظ الفترة التجريبية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
