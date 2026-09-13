import React, { useState } from 'react';
import { 
  GitFork, 
  FolderPlus, 
  Building2, 
  Warehouse, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  CheckCircle2,
  Tag
} from 'lucide-react';

export default function ChartOfAccountsView({ 
  accounts, 
  branches, 
  onRefreshAccounts, 
  onRefreshBranches 
}) {
  const [activeSubTab, setActiveSubTab] = useState('tree'); // 'tree' or 'branches'
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);

  // Form states for adding account
  const [accountForm, setAccountForm] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    type: 'expense',
    category: 'operating_expense',
    parent_id: '',
    is_sub: 1
  });

  // Form states for adding branch
  const [branchForm, setBranchForm] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    cr_number: '',
    vat_number: '',
    city: 'الرياض',
    address: '',
    phone: '',
    email: ''
  });

  const [loading, setLoading] = useState(false);

  // Build hierarchical tree from flat accounts array
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }));
  };

  const accountTree = buildTree(accounts, null);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddAccountModal(false);
        setAccountForm({ code: '', name_ar: '', name_en: '', type: 'expense', category: 'operating_expense', parent_id: '', is_sub: 1 });
        onRefreshAccounts();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddBranchModal(false);
        setBranchForm({ code: '', name_ar: '', name_en: '', cr_number: '', vat_number: '', city: 'الرياض', address: '', phone: '', email: '' });
        onRefreshBranches();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Recursive Tree Node renderer
  const renderTreeNode = (node, depth = 0) => {
    const typeColors = {
      asset: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
      liability: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      equity: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
      revenue: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
      expense: { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' },
    };

    const color = typeColors[node.type] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };

    return (
      <div key={node.id} style={{ marginRight: `${depth * 24}px`, marginTop: '0.4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          background: depth === 0 ? '#ffffff' : '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRight: `4px solid ${color.text}`,
          borderRadius: '8px',
          boxShadow: depth === 0 ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="font-mono" style={{ fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
              {node.code}
            </span>
            <span style={{ fontWeight: depth === 0 ? 800 : depth === 1 ? 700 : 500, fontSize: '0.92rem', color: '#1e293b' }}>
              {node.name_ar}
            </span>
            {node.name_en && (
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                ({node.name_en})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: color.bg,
              color: color.text,
              border: `1px solid ${color.border}`
            }}>
              {node.type === 'asset' ? 'أصول' :
               node.type === 'liability' ? 'خصوم' :
               node.type === 'equity' ? 'حقوق ملكية' :
               node.type === 'revenue' ? 'إيرادات' : 'مصروفات'}
            </span>
            {node.is_sub === 1 ? (
              <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                حساب فرعي
              </span>
            ) : (
              <span style={{ fontSize: '0.7rem', color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                حساب رئيسي
              </span>
            )}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub Tabs and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#e2e8f0', padding: '0.3rem', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveSubTab('tree')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'tree' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'tree' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'tree' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🌳 شجرة الحسابات المرنة
          </button>
          <button
            onClick={() => setActiveSubTab('branches')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'branches' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'branches' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: activeSubTab === 'branches' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🏢 الفروع والمستودعات المستقلة
          </button>
        </div>

        <div>
          {activeSubTab === 'tree' ? (
            <button onClick={() => setShowAddAccountModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>إضافة حساب جديد إلى الدليل</span>
            </button>
          ) : (
            <button onClick={() => setShowAddBranchModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>إضافة فرع ومستودع جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'tree' ? (
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              دليل الحسابات المعتمد (Dynamic Chart of Accounts)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              هيكل شجري مرن يدعم التفرع اللانهائي ومراكز التكلفة المحاسبية المتوافقة مع معايير المحاسبة السعودية (SOCPA).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {accountTree.map(rootNode => renderTreeNode(rootNode, 0))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
              قائمة الفروع ومراكز التكلفة
            </h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>كود الفرع</th>
                    <th>اسم الفرع</th>
                    <th>المدينة والعنوان</th>
                    <th>السجل التجاري</th>
                    <th>الرقم الضريبي (ZATCA)</th>
                    <th>المستودعات المرتبطة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                        {b.code}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {b.name_ar}
                        {b.name_en && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{b.name_en}</div>}
                      </td>
                      <td>
                        <div>{b.city}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.address}</div>
                      </td>
                      <td className="font-mono">{b.cr_number || '—'}</td>
                      <td className="font-mono" style={{ color: '#0369a1', fontWeight: 600 }}>{b.vat_number}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {b.warehouses && b.warehouses.length > 0 ? (
                            b.warehouses.map(w => (
                              <span key={w.id} className="badge badge-secondary" style={{ fontSize: '0.725rem' }}>
                                📦 {w.name_ar} ({w.code})
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>مستودع افتراضي</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-success">نشط</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>إضافة حساب جديد إلى شجرة الحسابات</h3>
              <button onClick={() => setShowAddAccountModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">كود الحساب (رقمي)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="مثال: 5304" 
                      className="form-input font-mono" 
                      value={accountForm.code} 
                      onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">اسم الحساب (عربي)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="مثال: مصاريف الضيافة والاستقبال" 
                      className="form-input" 
                      value={accountForm.name_ar} 
                      onChange={e => setAccountForm({ ...accountForm, name_ar: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الاسم بالإنجليزية (اختياري)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Hospitality & Guest Expenses" 
                    className="form-input" 
                    value={accountForm.name_en} 
                    onChange={e => setAccountForm({ ...accountForm, name_en: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">النوع الرئيسي</label>
                    <select 
                      className="form-select" 
                      value={accountForm.type} 
                      onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}
                    >
                      <option value="asset">أصول (Assets)</option>
                      <option value="liability">خصوم (Liabilities)</option>
                      <option value="equity">حقوق ملكية (Equity)</option>
                      <option value="revenue">إيرادات (Revenue)</option>
                      <option value="expense">مصروفات (Expenses)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">التصنيف المالي</label>
                    <select 
                      className="form-select" 
                      value={accountForm.category} 
                      onChange={e => setAccountForm({ ...accountForm, category: e.target.value })}
                    >
                      <option value="operating_expense">مصروفات تشغيلية</option>
                      <option value="admin_expense">مصروفات إدارية وعمومية</option>
                      <option value="current_asset">أصول متداولة</option>
                      <option value="fixed_asset">أصول غير متداولة / ثابتة</option>
                      <option value="current_liability">خصوم متداولة</option>
                      <option value="cogs">تكلفة بضاعة مباعة</option>
                      <option value="operating_revenue">إيراد نشاط رئيسي</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الحساب الأب (للتفريع الشجري)</label>
                  <select 
                    className="form-select" 
                    value={accountForm.parent_id} 
                    onChange={e => setAccountForm({ ...accountForm, parent_id: e.target.value ? Number(e.target.value) : '' })}
                  >
                    <option value="">بدون حساب أب (حساب رئيسي في الدليل)</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name_ar} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'جاري الحفظ...' : 'حفظ وإدراج في الشجرة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>إضافة فرع ومركز تكلفة مستقل</h3>
              <button onClick={() => setShowAddBranchModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={handleCreateBranch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">كود الفرع</label>
                    <input required type="text" placeholder="مثال: BR-104" className="form-input font-mono" value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">اسم الفرع (عربي)</label>
                    <input required type="text" placeholder="مثال: فرع المدينة المنورة" className="form-input" value={branchForm.name_ar} onChange={e => setBranchForm({ ...branchForm, name_ar: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">السجل التجاري للفرع</label>
                    <input type="text" placeholder="1010xxxxxx" className="form-input font-mono" value={branchForm.cr_number} onChange={e => setBranchForm({ ...branchForm, cr_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم الضريبي (15 رقم)</label>
                    <input required type="text" placeholder="310984752000003" className="form-input font-mono" value={branchForm.vat_number} onChange={e => setBranchForm({ ...branchForm, vat_number: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">المدينة</label>
                    <input required type="text" placeholder="المدينة المنورة" className="form-input" value={branchForm.city} onChange={e => setBranchForm({ ...branchForm, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">العنوان التفصيلي</label>
                    <input type="text" placeholder="شارع سلطانة، قرب الدائري الثاني" className="form-input" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddBranchModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الفرع ومستودعه التلقائي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
