import React, { useState } from 'react';
import { 
  Receipt, 
  Trash2, 
  Plus, 
  ArrowRightLeft, 
  AlertOctagon, 
  DollarSign, 
  User, 
  Calendar,
  Building2,
  Warehouse,
  CheckCircle2
} from 'lucide-react';

// ========================================================
// 1. نافذة إصدار فاتورة مبيعات جديدة (ZATCA Phase 2)
// ========================================================
export function NewInvoiceModal({ branches, products, contacts, onClose, onSuccess }) {
  const [invoiceType, setInvoiceType] = useState('simplified_invoice'); // 'simplified_invoice' or 'tax_invoice'
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [warehouseId, setWarehouseId] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([
    {
      product_id: products[0]?.id || 1,
      item_name: products[0]?.name_ar || 'ماسح باركود لاسلكي',
      quantity: 1,
      unit_price: products[0]?.selling_price || 420.00
    }
  ]);

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => p.id == prodId);
    if (!prod) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: prod.id,
      item_name: prod.name_ar,
      unit_price: prod.selling_price
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, Number(qty));
    setItems(newItems);
  };

  const handlePriceChange = (index, price) => {
    const newItems = [...items];
    newItems[index].unit_price = Number(price);
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        product_id: products[0]?.id || 1,
        item_name: products[0]?.name_ar || 'منتج',
        quantity: 1,
        unit_price: products[0]?.selling_price || 100.00
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const vatTotal = subtotal * 0.15;
  const grandTotal = subtotal + vatTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_type: invoiceType,
          branch_id: Number(branchId),
          warehouse_id: Number(warehouseId),
          customer_id: customerId ? Number(customerId) : null,
          payment_method: paymentMethod,
          items,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
      } else {
        alert('حدث خطأ أثناء إصدار الفاتورة: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedBranchObj = branches.find(b => b.id == branchId);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Receipt size={22} style={{ color: '#047857' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
              إصدار فاتورة مبيعات جديدة (ZATCA 2)
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Type & Branch Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">نوع الفاتورة</label>
                <select className="form-select" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
                  <option value="simplified_invoice">مبسطة B2C (إبلاغ Reporting)</option>
                  <option value="tax_invoice">ضريبية B2B (تخليص Clearance)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الفرع المصدر (مركز التكلفة)</label>
                <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المستودع المصروف منه</label>
                <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  {selectedBranchObj && selectedBranchObj.warehouses?.map(w => (
                    <option key={w.id} value={w.id}>{w.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">طريقة السداد</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">نقداً (صندوق الفرع)</option>
                  <option value="card">مدى / شبكة (بنك)</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="credit">آجل (حساب العميل)</option>
                </select>
              </div>
            </div>

            {/* Customer selection if Tax Invoice */}
            <div className="form-group">
              <label className="form-label">العميل / المشتري</label>
              <select className="form-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">عميل نقدي عام (B2C)</option>
                {contacts.filter(c => c.type === 'customer').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.vat_number ? `(الرقم الضريبي: ${c.vat_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Items Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>بنود وأصناف الفاتورة:</span>
                <button type="button" onClick={addItemRow} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                  <Plus size={14} />
                  <span>إضافة بند</span>
                </button>
              </div>

              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th style={{ width: '90px' }}>الكمية</th>
                      <th style={{ width: '120px' }}>السعر (بدون ضريبة)</th>
                      <th style={{ width: '100px' }}>الضريبة 15%</th>
                      <th style={{ width: '130px' }}>الإجمالي</th>
                      <th style={{ width: '50px' }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const lineSub = item.quantity * item.unit_price;
                      const lineVat = lineSub * 0.15;
                      const lineTotal = lineSub + lineVat;
                      return (
                        <tr key={idx}>
                          <td>
                            <select
                              className="form-select"
                              style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem' }}
                              value={item.product_id}
                              onChange={e => handleProductChange(idx, e.target.value)}
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name_ar} (متوفر: {p.stock} {p.unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-input font-mono"
                              style={{ width: '100%', padding: '0.4rem', textAlign: 'center' }}
                              value={item.quantity}
                              onChange={e => handleQuantityChange(idx, e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input font-mono"
                              style={{ width: '100%', padding: '0.4rem', textAlign: 'center' }}
                              value={item.unit_price}
                              onChange={e => handlePriceChange(idx, e.target.value)}
                            />
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center', color: '#d97706' }}>
                            {lineVat.toFixed(2)} ر.س
                          </td>
                          <td className="font-mono" style={{ textAlign: 'center', fontWeight: 800 }}>
                            {lineTotal.toFixed(2)} ر.س
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              style={{ background: 'none', border: 'none', color: '#be123c', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations Summary */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>إجمالي غير خاضع / خاضع: </span>
                <strong className="font-mono">{subtotal.toFixed(2)} ر.س</strong>
                <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>|</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ضريبة القيمة المضافة 15%: </span>
                <strong className="font-mono" style={{ color: '#d97706' }}>{vatTotal.toFixed(2)} ر.س</strong>
              </div>

              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '0.5rem' }}>المبلغ المستحق النهائي:</span>
                <span className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#047857' }}>
                  {grandTotal.toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري التوليد والتشغيل الآلي...' : 'إصدار الفاتورة وتوليد القيد آلياً'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// 2. نافذة تسجيل سند مصروف وتوليد قيده المحاسبي آلياً
// ========================================================
export function NewExpenseModal({ branches, accounts, onClose, onSuccess }) {
  const [branchId, setBranchId] = useState(branches[0]?.id || 1);
  const [accountId, setAccountId] = useState(accounts.find(a => a.category === 'operating_expense')?.id || 26);
  const [expenseType, setExpenseType] = useState('operating'); // 'operating', 'admin', 'general'
  const [amount, setAmount] = useState('');
  const [vatAmount, setVatAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidTo, setPaidTo] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // تحديث الضريبة التلقائي 15% إذا كانت هناك ضريبة
  const handleAmountChange = (val) => {
    setAmount(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setVatAmount((num * 0.15).toFixed(2));
    } else {
      setVatAmount('0');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: Number(branchId),
          account_id: Number(accountId),
          expense_type: expenseType,
          amount: Number(amount),
          vat_amount: Number(vatAmount),
          payment_method: paymentMethod,
          paid_to: paidTo,
          responsible_person: responsiblePerson,
          receipt_ref: receiptRef,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
      } else {
        alert('حدث خطأ: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const expenseAccounts = accounts.filter(a => a.type === 'expense');

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>تسجيل سند مصروف جديد</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">الفرع (مركز التكلفة)</label>
                <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">تصنيف المصروف</label>
                <select className="form-select" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                  <option value="operating">مصروف تشغيلي (Operating)</option>
                  <option value="admin">مصروف إداري (Administrative)</option>
                  <option value="general">مصروف عمومي (General)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">بند المصروف في شجرة الحسابات</label>
              <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                {expenseAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">المبلغ الخاضع للضريبة</label>
                <input required type="number" step="0.01" placeholder="1500.00" className="form-input font-mono" value={amount} onChange={e => handleAmountChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">ضريبة القيمة المضافة 15%</label>
                <input type="number" step="0.01" className="form-input font-mono" value={vatAmount} onChange={e => setVatAmount(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">المسؤول عن الصرف (إلزامي)</label>
                <input required type="text" placeholder="اسم الموظف أو المشرف" className="form-input" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">الجهة المدفوع لها</label>
                <input type="text" placeholder="اسم الشركة أو المورد" className="form-input" value={paidTo} onChange={e => setPaidTo(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">طريقة الدفع</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">نقداً (صندوق الفرع)</option>
                  <option value="bank_transfer">تحويل بنكي (مصرف الراجحي)</option>
                  <option value="card">بطاقة مدى</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">رقم الإشعار / الفاتورة المرجعية</label>
                <input type="text" placeholder="مثال: INV-987" className="form-input font-mono" value={receiptRef} onChange={e => setReceiptRef(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">البيان والشرح</label>
              <textarea placeholder="شرح تفاصيل المصروف..." className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري الحفظ...' : 'تسجيل المصروف وتوليد القيد آلياً'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// 3. نافذة مناقلة مخزون بين الفروع وتوليد قيد المناقلة
// ========================================================
export function StockTransferModal({ branches, products, onClose, onSuccess }) {
  const [fromBranchId, setFromBranchId] = useState(1);
  const [toBranchId, setToBranchId] = useState(2);
  const [fromWarehouseId, setFromWarehouseId] = useState(1);
  const [toWarehouseId, setToWarehouseId] = useState(3);
  const [productId, setProductId] = useState(products[0]?.id || 1);
  const [quantity, setQuantity] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fromBranchId == toBranchId && fromWarehouseId == toWarehouseId) {
      alert('يرجى اختيار فرعين أو مستودعين مختلفين للمناقلة');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_branch_id: Number(fromBranchId),
          to_branch_id: Number(toBranchId),
          from_warehouse_id: Number(fromWarehouseId),
          to_warehouse_id: Number(toWarehouseId),
          product_id: Number(productId),
          quantity: Number(quantity),
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ArrowRightLeft size={20} style={{ color: '#047857' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>مناقلة مخزون بين الفروع</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">الصنف المراد تحويله</label>
              <select className="form-select" value={productId} onChange={e => setProductId(e.target.value)}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name_ar} (كود: {p.sku})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">من فرع</label>
                <select className="form-select" value={fromBranchId} onChange={e => setFromBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">إلى فرع</label>
                <select className="form-select" value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">الكمية المحولة</label>
              <input required type="number" min="1" className="form-input font-mono" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات المناقلة</label>
              <textarea placeholder="إذن تحويل بضاعة..." className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'جاري التحويل...' : 'تأكيد المناقلة وتوليد القيد الآلي'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// 4. نافذة تسجيل إتلاف مخزني وتوليد قيد الخسارة
// ========================================================
export function StockDamageModal({ branches, products, onClose, onSuccess }) {
  const [branchId, setBranchId] = useState(1);
  const [warehouseId, setWarehouseId] = useState(1);
  const [productId, setProductId] = useState(products[0]?.id || 1);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: Number(branchId),
          warehouse_id: Number(warehouseId),
          product_id: Number(productId),
          quantity: Number(quantity),
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data);
        onClose();
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertOctagon size={20} style={{ color: '#be123c' }} />
            <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>تسجيل تالف مخزني (هبوط مخزون)</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">الصنف المتلف</label>
              <select className="form-select" value={productId} onChange={e => setProductId(e.target.value)}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name_ar} (كود: {p.sku})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">الفرع</label>
                <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">المستودع</label>
                <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  <option value="1">المستودع المركزي - الرياض</option>
                  <option value="2">صالة العرض - العليا</option>
                  <option value="3">مستودع جدة الرئيسي</option>
                  <option value="4">مستودع الدمام اللوجستي</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">الكمية المتلفة</label>
              <input required type="number" min="1" className="form-input font-mono" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">سبب الإتلاف / محضر التلف</label>
              <textarea required placeholder="كسر أثناء التنزيل / انتهاء صلاحية / سوء تخزين..." className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn btn-danger">
              {loading ? 'جاري الإتلاف...' : 'إثبات التلف وخفض المخزون آلياً'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
