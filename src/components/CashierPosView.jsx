import React, { useState } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Receipt, 
  Printer, 
  Search, 
  User, 
  Tag, 
  CreditCard, 
  Banknote, 
  Sprout,
  X
} from 'lucide-react';

export default function CashierPosView({ 
  products = [], 
  branches = [], 
  currentUser, 
  contacts = [], 
  onSaleSuccess,
  onSaleCompleted
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceTier, setPriceTier] = useState('retail'); // 'retail' (تجزئة) or 'wholesale' (جملة)
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const activeBranchId = currentUser?.branch_id || branches[0]?.id || 1;
  const currentBranch = branches.find(b => b.id == activeBranchId) || branches[0];
  const currentWarehouseId = currentBranch?.warehouses?.[0]?.id || 1;

  // استخراج فئات الأصناف الزراعية المتاحة
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchTerm) {
      const matchName = p.name_ar.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSku = p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBarcode = p.barcode?.includes(searchTerm);
      if (!matchName && !matchSku && !matchBarcode) return false;
    }
    return true;
  });

  // إضافة صنف إلى السلة
  const addToCart = (product) => {
    const price = priceTier === 'wholesale' ? (product.wholesale_price || product.selling_price) : (product.retail_price || product.selling_price);
    const existingIndex = cart.findIndex(it => it.product_id === product.id);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          sku: product.sku,
          name_ar: product.name_ar,
          unit: product.unit,
          unit_price: Number(price),
          quantity: 1
        }
      ]);
    }
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // تبديل فئة السعر (تجزئة / جملة) وتحديث السلة
  const handlePriceTierChange = (tier) => {
    setPriceTier(tier);
    const updatedCart = cart.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) return item;
      const newPrice = tier === 'wholesale' ? (prod.wholesale_price || prod.selling_price) : (prod.retail_price || prod.selling_price);
      return { ...item, unit_price: Number(newPrice) };
    });
    setCart(updatedCart);
  };

  const subtotal = cart.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
  const vatTotal = subtotal * 0.15;
  const grandTotal = subtotal + vatTotal;

  // إتمام البيع
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_type: 'simplified_invoice',
          branch_id: Number(activeBranchId),
          warehouse_id: Number(currentWarehouseId),
          customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
          cashier_id: currentUser?.id || null,
          payment_method: paymentMethod,
          price_tier: priceTier,
          items: cart.map(it => ({
            product_id: it.product_id,
            item_name: it.name_ar,
            quantity: it.quantity,
            unit_price: it.unit_price
          })),
          notes: `مبيعات كاشير (${currentUser?.name || 'كاشير'}) - صالة المشتل`
        })
      });

      const data = await res.json();
      if (data.success) {
        setLastInvoice({
          invoiceNumber: data.invoiceNumber,
          journalEntryNumber: data.journalEntryNumber,
          qr: data.zatcaQr,
          total: grandTotal,
          items: [...cart],
          date: new Date().toLocaleDateString('ar-SA'),
          time: new Date().toLocaleTimeString('ar-SA')
        });
        setCart([]);
        if (typeof onSaleCompleted === 'function') onSaleCompleted();
        if (typeof onSaleSuccess === 'function') onSaleSuccess();
      } else {
        alert('حدث خطأ أثناء إتمام البيع: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', height: 'calc(100vh - 120px)' }}>
      {/* Products & Catalog Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        {/* Top Control Bar */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Price Tier Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '10px' }}>
            <button
              onClick={() => handlePriceTierChange('retail')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: priceTier === 'retail' ? '#047857' : 'transparent',
                color: priceTier === 'retail' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.825rem',
                cursor: 'pointer'
              }}
            >
              🏷️ بيع تجزئة (Retail)
            </button>
            <button
              onClick={() => handlePriceTierChange('wholesale')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: priceTier === 'wholesale' ? '#047857' : 'transparent',
                color: priceTier === 'wholesale' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.825rem',
                cursor: 'pointer'
              }}
            >
              📦 بيع جملة ومقاولات (Wholesale)
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="بحث باسم الشتلة أو الباركود..."
              className="form-input"
              style={{ paddingRight: '2.4rem', width: '100%', fontSize: '0.85rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '9999px',
                border: selectedCategory === cat ? '2px solid #047857' : '1px solid #cbd5e1',
                background: selectedCategory === cat ? '#ecfdf5' : '#ffffff',
                color: selectedCategory === cat ? '#065f46' : '#475569',
                fontWeight: 700,
                fontSize: '0.825rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat === 'all' ? '🌿 كافة الأصناف' : cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {filteredProducts.map(p => {
            const currentPrice = priceTier === 'wholesale' ? (p.wholesale_price || p.selling_price) : (p.retail_price || p.selling_price);
            const priceWithVat = currentPrice * 1.15;
            const inStock = p.stock > 0;

            return (
              <div
                key={p.id}
                onClick={() => inStock && addToCart(p)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: inStock ? 'pointer' : 'not-allowed',
                  opacity: inStock ? 1 : 0.6,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.category}</span>
                    <span className={`badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {p.stock} {p.unit}
                    </span>
                  </div>

                  <h5 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.3, marginBottom: '0.5rem', minHeight: '38px' }}>
                    {p.name_ar}
                  </h5>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: '#047857' }}>
                      {priceWithVat.toFixed(2)} <span style={{ fontSize: '0.7rem' }}>ر.س</span>
                    </div>
                    <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                      بدون ضريبة: {currentPrice.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!inStock}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cashier Cart & Checkout Column */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', height: '100%', position: 'sticky', top: '90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} style={{ color: '#047857' }} />
            <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>سلة البيع ({cart.length})</h4>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: '#be123c', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              إفراغ السلة
            </button>
          )}
        </div>

        {/* Customer select */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>العميل:</label>
          <select
            className="form-select"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
          >
            <option value="">عميل نقدي عام (تجزئة)</option>
            {contacts.filter(c => c.type === 'customer').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <Sprout size={36} style={{ margin: '0 auto 0.5rem', color: '#cbd5e1' }} />
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>السلة فارغة</div>
              <div style={{ fontSize: '0.75rem' }}>انقر على أي شتلة أو منتج لإضافته للبيع</div>
            </div>
          ) : (
            cart.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.825rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.name_ar}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {it.unit_price.toFixed(2)} ر.س × {it.quantity}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button onClick={() => updateQuantity(idx, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Minus size={12} />
                  </button>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.85rem', width: '20px', textAlign: 'center' }}>
                    {it.quantity}
                  </span>
                  <button onClick={() => updateQuantity(idx, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(idx)} style={{ background: 'none', border: 'none', color: '#be123c', cursor: 'pointer', padding: '0 0.2rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Methods */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => setPaymentMethod('cash')}
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: paymentMethod === 'cash' ? '2px solid #047857' : '1px solid #e2e8f0',
              background: paymentMethod === 'cash' ? '#ecfdf5' : '#f8fafc',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: paymentMethod === 'cash' ? '#047857' : '#475569'
            }}
          >
            💵 نقداً
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: paymentMethod === 'card' ? '2px solid #047857' : '1px solid #e2e8f0',
              background: paymentMethod === 'card' ? '#ecfdf5' : '#f8fafc',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: paymentMethod === 'card' ? '#047857' : '#475569'
            }}
          >
            💳 مدى / شبكة
          </button>
          <button
            onClick={() => setPaymentMethod('credit')}
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: paymentMethod === 'credit' ? '2px solid #047857' : '1px solid #e2e8f0',
              background: paymentMethod === 'credit' ? '#ecfdf5' : '#f8fafc',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: paymentMethod === 'credit' ? '#047857' : '#475569'
            }}
          >
            📝 آجل
          </button>
        </div>

        {/* Totals Summary */}
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
            <span>المبلغ بدون ضريبة:</span>
            <span className="font-mono">{subtotal.toFixed(2)} ر.س</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#d97706' }}>
            <span>ضريبة القيمة المضافة 15%:</span>
            <span className="font-mono">{vatTotal.toFixed(2)} ر.س</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#047857', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem' }}>
            <span>الإجمالي النهائي:</span>
            <span className="font-mono">{grandTotal.toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || checkoutLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', fontWeight: 800, background: '#047857' }}
        >
          {checkoutLoading ? 'جاري خصم المخزون والفوترة...' : 'إتمام البيع وطباعة الفاتورة (ZATCA)'}
        </button>
      </div>

      {/* Modal: Thermal Receipt & ZATCA QR preview */}
      {lastInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <CheckCircle2 size={28} />
              </div>
            </div>

            <div className="modal-body" style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a' }}>
                تم إتمام العملية بنجاح!
              </h3>
              <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                رقم الفاتورة: <strong className="font-mono" style={{ color: '#047857' }}>{lastInvoice.invoiceNumber}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '0.35rem', borderRadius: '6px' }}>
                تم خصم الكميات من المخزن وتوليد القيد الآلي ({lastInvoice.journalEntryNumber})
              </div>

              {/* QR Image */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '0.5rem auto' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(lastInvoice.qr || 'ZATCA')}`}
                  alt="ZATCA QR"
                  style={{ width: '150px', height: '150px', display: 'block', margin: '0 auto' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700, marginTop: '0.35rem' }}>
                  رمز الاستجابة السريع ZATCA Phase 2
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                <span>المبلغ المدفوع:</span>
                <span className="font-mono" style={{ color: '#047857' }}>{lastInvoice.total.toFixed(2)} ر.س</span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                <Printer size={15} />
                <span>طباعة الإيصال الحراري</span>
              </button>
              <button onClick={() => setLastInvoice(null)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', background: '#047857' }}>
                عملية جديدة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
