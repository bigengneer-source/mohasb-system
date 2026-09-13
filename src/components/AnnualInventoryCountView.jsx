import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Warehouse, 
  AlertCircle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  FileSpreadsheet,
  Printer,
  Sparkles
} from 'lucide-react';

export default function AnnualInventoryCountView({ branches = [], onRefreshInventory, onReconciliationComplete }) {
  const [historyCounts, setHistoryCounts] = useState([]);
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || 1);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(1);
  const [auditItems, setAuditItems] = useState([]);
  const [auditTitle, setAuditTitle] = useState(`الجرد السنوي للمشتل - ${new Date().getFullYear()}`);
  const [auditNotes, setAuditNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCountHistory();
  }, []);

  const fetchCountHistory = async () => {
    try {
      const res = await fetch('/api/inventory/annual-counts');
      const data = await res.json();
      if (data.success) setHistoryCounts(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartNewAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/annual-counts/prepare?warehouseId=${selectedWarehouseId}`);
      const data = await res.json();
      if (data.success) {
        setAuditItems(data.data.map(p => ({
          product_id: p.id,
          sku: p.sku,
          name_ar: p.name_ar,
          unit: p.unit,
          cost_price: p.cost_price,
          book_quantity: p.book_quantity,
          actual_quantity: p.book_quantity // افتراضياً متطابق حتى يقوم المستخدم بإدخال الفعلي
        })));
        setShowNewAuditModal(true);
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActualQtyChange = (index, val) => {
    const newItems = [...auditItems];
    newItems[index].actual_quantity = Math.max(0, Number(val));
    setAuditItems(newItems);
  };

  const handlePostAudit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/annual-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: Number(selectedBranchId),
          warehouse_id: Number(selectedWarehouseId),
          title: auditTitle,
          notes: auditNotes,
          items: auditItems.map(it => ({
            product_id: it.product_id,
            book_quantity: it.book_quantity,
            actual_quantity: it.actual_quantity,
            unit_cost: it.cost_price
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowNewAuditModal(false);
        setSuccessMessage(data.message);
        fetchCountHistory();
        if (typeof onReconciliationComplete === 'function') onReconciliationComplete();
        if (typeof onRefreshInventory === 'function') onRefreshInventory();
        setTimeout(() => setSuccessMessage(''), 7000);
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // إجمالي الفروقات الدفترية والفعلية
  let totalBookVal = 0;
  let totalActualVal = 0;
  let totalDeficit = 0;
  let totalSurplus = 0;

  for (const it of auditItems) {
    const bVal = it.book_quantity * it.cost_price;
    const aVal = it.actual_quantity * it.cost_price;
    totalBookVal += bVal;
    totalActualVal += aVal;
    const diff = it.actual_quantity - it.book_quantity;
    if (diff < 0) totalDeficit += Math.abs(diff * it.cost_price);
    else if (diff > 0) totalSurplus += (diff * it.cost_price);
  }

  const selectedBranchObj = branches.find(b => b.id == selectedBranchId) || branches[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ background: '#ecfdf5', color: '#065f46', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              نظام الجرد السنوي الذكي للمشاتل
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 900 }}>
            مطابقة المخزون الفعلي بالدفتري وتوليد قيود التسوية آلياً
          </h2>
          <p style={{ color: '#a7f3d0', fontSize: '0.875rem', maxWidth: '650px' }}>
            يتيح حصر كميات الشتلات والأشجار والأسمدة في المشاتل والمستودعات، واحتساب فروقات العجز والتلف أو الفائض، وإدراج قيد تسوية الجرد المزدوج تلقائياً.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="form-select"
            style={{ padding: '0.55rem 1rem', fontWeight: 700 }}
            value={selectedBranchId}
            onChange={e => {
              setSelectedBranchId(e.target.value);
              const b = branches.find(br => br.id == e.target.value);
              if (b && b.warehouses?.length > 0) setSelectedWarehouseId(b.warehouses[0].id);
            }}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>🏢 {b.name_ar}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ padding: '0.55rem 1rem', fontWeight: 700 }}
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
          >
            {selectedBranchObj?.warehouses?.map(w => (
              <option key={w.id} value={w.id}>📦 {w.name_ar}</option>
            ))}
          </select>

          <button
            onClick={handleStartNewAudit}
            disabled={loading}
            className="btn btn-primary"
            style={{ background: '#ffffff', color: '#047857', fontWeight: 800 }}
          >
            <Plus size={16} />
            <span>{loading ? 'جاري التجهيز...' : 'بدء جلسة جرد سنوي'}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* History Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              سجل جلسات الجرد السنوي المعتمدة ({historyCounts.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              كافة جلسات الجرد ومطابقة الكميات مع أرقام قيود التسوية المحاسبية المقيدة بالدفاتر.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>كود الجلسة</th>
                <th>التاريخ</th>
                <th>عنوان الجرد</th>
                <th>الفرع والمستودع</th>
                <th>فرق الكميات</th>
                <th>قيمة الفروقات (عجز/فائض)</th>
                <th>رقم قيد التسوية الآلي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {historyCounts.map(cnt => (
                <tr key={cnt.id}>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                    {cnt.count_number}
                  </td>
                  <td>{cnt.count_date}</td>
                  <td style={{ fontWeight: 700 }}>{cnt.title}</td>
                  <td>
                    <div>{cnt.branch_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cnt.warehouse_name}</div>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, color: cnt.total_variance_qty < 0 ? '#be123c' : cnt.total_variance_qty > 0 ? '#047857' : '#64748b' }}>
                    {cnt.total_variance_qty > 0 ? `+${cnt.total_variance_qty}` : cnt.total_variance_qty} حبة
                  </td>
                  <td className="font-mono" style={{ fontWeight: 800, color: cnt.total_variance_cost < 0 ? '#be123c' : '#047857' }}>
                    {cnt.total_variance_cost?.toFixed(2)} ر.س
                  </td>
                  <td>
                    {cnt.journal_entry_number ? (
                      <span className="badge badge-info font-mono">
                        {cnt.journal_entry_number}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {cnt.status === 'posted' ? '✅ معتمد ومقيد' : 'مسودة'}
                    </span>
                  </td>
                </tr>
              ))}
              {historyCounts.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    لا توجد جلسات جرد سابقة. انقر على "بدء جلسة جرد سنوي" للبدء في حصر المخزون ومطابقته.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal */}
      {showNewAuditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '950px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ClipboardCheck size={24} style={{ color: '#047857' }} />
                <div>
                  <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>
                    جلسة مطابقة الجرد السنوي لمخزون المشتل
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selectedBranchObj.name_ar} • المستودع: {selectedWarehouseId}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowNewAuditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">عنوان جلسة الجرد</label>
                  <input type="text" className="form-input" value={auditTitle} onChange={e => setAuditTitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ملاحظات / أعضاء لجنة الجرد</label>
                  <input type="text" placeholder="المهندس الزراعي المشرف وأمين المستودع" className="form-input" value={auditNotes} onChange={e => setAuditNotes(e.target.value)} />
                </div>
              </div>

              {/* Items Reconcile Table */}
              <div className="table-wrapper" style={{ maxHeight: '380px' }}>
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>كود الصنف</th>
                      <th>اسم الشتلة / المنتج الزراعي</th>
                      <th>سعر التكلفة</th>
                      <th style={{ textAlign: 'center' }}>الكمية الدفترية (المسجلة)</th>
                      <th style={{ textAlign: 'center', width: '130px', background: '#ecfdf5' }}>الكمية الفعلية (المحصورة)</th>
                      <th style={{ textAlign: 'center' }}>فرق الجرد</th>
                      <th style={{ textAlign: 'center' }}>الأثر المالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditItems.map((it, idx) => {
                      const diff = it.actual_quantity - it.book_quantity;
                      const costDiff = diff * it.cost_price;
                      return (
                        <tr key={it.product_id} style={{ background: diff !== 0 ? (diff < 0 ? '#fff1f2' : '#f0fdf4') : undefined }}>
                          <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>{it.sku}</td>
                          <td style={{ fontWeight: 700 }}>{it.name_ar}</td>
                          <td className="font-mono">{it.cost_price.toFixed(2)} ر.س</td>
                          <td className="font-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                            {it.book_quantity} {it.unit}
                          </td>
                          <td style={{ textAlign: 'center', background: '#ecfdf5' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-input font-mono"
                              style={{ width: '90px', padding: '0.35rem', textAlign: 'center', fontWeight: 800, margin: '0 auto' }}
                              value={it.actual_quantity}
                              onChange={e => handleActualQtyChange(idx, e.target.value)}
                            />
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center', fontWeight: 800, color: diff < 0 ? '#be123c' : diff > 0 ? '#047857' : '#64748b' }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center', fontWeight: 800, color: costDiff < 0 ? '#be123c' : costDiff > 0 ? '#047857' : '#64748b' }}>
                            {costDiff.toFixed(2)} ر.س
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي القيمة الدفترية:</span>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{totalBookVal.toFixed(2)} ر.س</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>إجمالي القيمة الفعلية المحصورة:</span>
                  <div className="font-mono" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#047857' }}>{totalActualVal.toFixed(2)} ر.س</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>صافي الأثر المالي للتسوية:</span>
                  <div className="font-mono" style={{ fontWeight: 900, fontSize: '1.15rem', color: (totalSurplus - totalDeficit) >= 0 ? '#047857' : '#be123c' }}>
                    {(totalSurplus - totalDeficit).toFixed(2)} ر.س
                    <span style={{ fontSize: '0.75rem', marginRight: '0.4rem' }}>
                      {(totalSurplus - totalDeficit) >= 0 ? '(فائض)' : '(عجز)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowNewAuditModal(false)} className="btn btn-secondary">إلغاء</button>
              <button
                type="button"
                onClick={handlePostAudit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ background: '#047857', fontWeight: 800 }}
              >
                {submitting ? 'جاري توليد قيد التسوية...' : 'اعتماد الجرد السنوي وتوليد قيود التسوية آلياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
