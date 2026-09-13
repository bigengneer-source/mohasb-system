import React, { useState } from 'react';
import { 
  Boxes, 
  ArrowRightLeft, 
  AlertOctagon, 
  Plus, 
  PackageCheck, 
  Warehouse, 
  Search,
  CheckCircle2
} from 'lucide-react';

export default function InventoryView({ 
  products, 
  branches, 
  selectedBranch, 
  onRefreshProducts, 
  onOpenTransfer,
  onOpenDamage 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [productForm, setProductForm] = useState({
    sku: '',
    barcode: '',
    name_ar: '',
    name_en: '',
    category: 'أجهزة نقاط البيع',
    unit: 'جهاز',
    cost_price: '',
    selling_price: '',
    initial_qty: 10,
    branch_id: 1,
    warehouse_id: 1
  });

  const filteredProducts = products.filter(p => {
    if (searchTerm) {
      const matchName = p.name_ar.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSku = p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddProductModal(false);
        setProductForm({
          sku: '', barcode: '', name_ar: '', name_en: '', category: 'أجهزة نقاط البيع',
          unit: 'جهاز', cost_price: '', selling_price: '', initial_qty: 10, branch_id: 1, warehouse_id: 1
        });
        onRefreshProducts();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو الباركود أو SKU..."
            className="form-input"
            style={{ paddingRight: '2.5rem', width: '100%' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onOpenTransfer} className="btn btn-secondary">
            <ArrowRightLeft size={16} />
            <span>مناقلة مخزون بين الفروع</span>
          </button>

          <button onClick={onOpenDamage} className="btn btn-secondary" style={{ color: '#be123c' }}>
            <AlertOctagon size={16} />
            <span>تسجيل إتلاف مخزني</span>
          </button>

          <button onClick={() => setShowAddProductModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              دليل الأصناف والمخزون السلعي ({filteredProducts.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              تتبع لحظي للكميات المتوفرة لكل مستودع وفرع، ومتوسط أسعار التكلفة وهامش الربح.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>رمز الصنف (SKU)</th>
                <th>اسم الصنف</th>
                <th>التصنيف</th>
                <th>الوحدة</th>
                <th>سعر التكلفة</th>
                <th>سعر البيع (بدون ضريبة)</th>
                <th>شامل الضريبة 15%</th>
                <th>الرصيد الإجمالي</th>
                <th>توزيع المستودعات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const priceWithVat = p.selling_price * 1.15;
                return (
                  <tr key={p.id}>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                      {p.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.name_ar}</div>
                      {p.name_en && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.name_en}</div>}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{p.category}</span>
                    </td>
                    <td>{p.unit}</td>
                    <td className="font-mono">{p.cost_price?.toFixed(2)} ر.س</td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>{p.selling_price?.toFixed(2)} ر.س</td>
                    <td className="font-mono" style={{ color: '#047857', fontWeight: 800 }}>{priceWithVat.toFixed(2)} ر.س</td>
                    <td>
                      <span className={`badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.85rem' }}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '300px' }}>
                        {p.levels && p.levels.map((lvl, i) => (
                          <span key={i} style={{ fontSize: '0.725rem', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {lvl.warehouse_name}: <strong className="font-mono">{lvl.quantity}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>تعريف صنف جديد بالمخزون</h3>
              <button onClick={() => setShowAddProductModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رمز الصنف (SKU)</label>
                    <input required type="text" placeholder="مثال: SKU-1006" className="form-input font-mono" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الباركود الدولي (Barcode)</label>
                    <input type="text" placeholder="628100xxxx" className="form-input font-mono" value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">اسم المنتج (عربي)</label>
                    <input required type="text" placeholder="جهاز عداد نقود إلكتروني فائق السرعة" className="form-input" value={productForm.name_ar} onChange={e => setProductForm({ ...productForm, name_ar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الوحدة</label>
                    <input type="text" placeholder="حبة / طقم / كرتون" className="form-input" value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">سعر التكلفة (بدون ضريبة)</label>
                    <input required type="number" step="0.01" placeholder="350.00" className="form-input font-mono" value={productForm.cost_price} onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">سعر البيع (بدون ضريبة)</label>
                    <input required type="number" step="0.01" placeholder="580.00" className="form-input font-mono" value={productForm.selling_price} onChange={e => setProductForm({ ...productForm, selling_price: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">الرصيد الأولي</label>
                    <input type="number" placeholder="20" className="form-input font-mono" value={productForm.initial_qty} onChange={e => setProductForm({ ...productForm, initial_qty: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">إيداع في فرع</label>
                    <select className="form-select" value={productForm.branch_id} onChange={e => setProductForm({ ...productForm, branch_id: Number(e.target.value) })}>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">المستودع</label>
                    <select className="form-select" value={productForm.warehouse_id} onChange={e => setProductForm({ ...productForm, warehouse_id: Number(e.target.value) })}>
                      <option value="1">المستودع المركزي - الرياض</option>
                      <option value="2">مستودع المعرض - العليا</option>
                      <option value="3">مستودع جدة الرئيسي</option>
                      <option value="4">مستودع الدمام اللوجستي</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'جاري الإضافة...' : 'إضافة وتخزين بالدليل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
