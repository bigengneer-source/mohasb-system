import React, { useState } from 'react';
import { 
  Receipt, 
  QrCode, 
  ShieldCheck, 
  FileCode2, 
  Send, 
  Download, 
  Eye, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy,
  Printer
} from 'lucide-react';

export default function ZatcaInvoicingView({ 
  invoices, 
  branches, 
  selectedBranch, 
  onRefreshInvoices, 
  onOpenNewInvoice 
}) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submittingZatca, setSubmittingZatca] = useState(false);
  const [zatcaResult, setZatcaResult] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary'); // 'summary', 'zatca_xml', 'qr'

  const filteredInvoices = invoices.filter(inv => {
    if (selectedBranch !== 'all' && inv.branch_id != selectedBranch) return false;
    return true;
  });

  const handleSubmitToZatca = async (invoiceId) => {
    setSubmittingZatca(true);
    setZatcaResult(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/zatca-submit`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setZatcaResult(data.result);
        onRefreshInvoices();
        // تحديث الفاتورة الحالية في العرض
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, zatca_status: data.status });
        }
      } else {
        alert('خطأ في إرسال الفاتورة لمنظومة زكاة: ' + data.error);
      }
    } catch (err) {
      alert('خطأ في الاتصال: ' + err.message);
    } finally {
      setSubmittingZatca(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
        padding: '1.5rem 2rem',
        borderRadius: '16px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.85rem', borderRadius: '12px' }}>
            <ShieldCheck size={32} style={{ color: '#a7f3d0' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', background: '#ecfdf5', color: '#065f46', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                ZATCA Phase 2
              </span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                بوابة الفوترة الإلكترونية - الربط والتكامل
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              فواتير المبيعات المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك
            </h2>
          </div>
        </div>

        <button onClick={onOpenNewInvoice} className="btn btn-primary" style={{ background: '#ffffff', color: '#047857', fontWeight: 800 }}>
          <Plus size={18} />
          <span>إصدار فاتورة إلكترونية جديدة</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              سجل الفواتير الصادرة ({filteredInvoices.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              تتضمن الفواتير الضريبية (B2B) للتخليص Clearance، والفواتير المبسطة (B2C) للإبلاغ Reporting.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>نوع الفاتورة</th>
                <th>الفرع المصدر</th>
                <th>العميل</th>
                <th>تاريخ ووقت الإصدار</th>
                <th>المبلغ الخاضع</th>
                <th>الضريبة 15%</th>
                <th>الإجمالي شامل الضريبة</th>
                <th>حالة زكاة (ZATCA)</th>
                <th>معاينة واعتماد</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                    {inv.invoice_number}
                  </td>
                  <td>
                    <span className={`badge ${inv.invoice_type === 'tax_invoice' ? 'badge-info' : 'badge-secondary'}`}>
                      {inv.invoice_type === 'tax_invoice' ? 'ضريبية B2B' : 'مبسطة B2C'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{inv.branch_name}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{inv.customer_name || 'عميل نقدي عام'}</div>
                    {inv.customer_vat && (
                      <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        الرقم الضريبي: {inv.customer_vat}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{inv.issue_date}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }} className="font-mono">{inv.issue_time}</div>
                  </td>
                  <td className="font-mono">
                    {inv.subtotal?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                  </td>
                  <td className="font-mono" style={{ color: '#d97706', fontWeight: 700 }}>
                    {inv.vat_total?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                  </td>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#0f172a' }}>
                    {inv.grand_total?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.zatca_status === 'cleared' ? 'badge-success' :
                      inv.zatca_status === 'reported' ? 'badge-success' :
                      inv.zatca_status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {inv.zatca_status === 'cleared' ? '✅ تم التخليص (Cleared)' :
                       inv.zatca_status === 'reported' ? '✅ تم الإبلاغ (Reported)' :
                       inv.zatca_status === 'rejected' ? '❌ مرفوضة من الهيئة' : 'مسودة (Draft)'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => { setSelectedInvoice(inv); setZatcaResult(null); }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} />
                      <span>تفاصيل ZATCA</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ZATCA Phase 2 Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#ecfdf5', color: '#047857', padding: '0.5rem', borderRadius: '8px' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>
                    ملف الفاتورة الإلكترونية: {selectedInvoice.invoice_number}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    المعرف الفريد (UUID): <span className="font-mono">{selectedInvoice.zatca_uuid}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setActiveDetailTab('summary')}
                className={`btn ${activeDetailTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
              >
                تفاصيل الفاتورة والبنود
              </button>
              <button
                onClick={() => setActiveDetailTab('qr')}
                className={`btn ${activeDetailTab === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
              >
                رمز الاستجابة السريعة (QR TLV)
              </button>
              <button
                onClick={() => setActiveDetailTab('zatca_xml')}
                className={`btn ${activeDetailTab === 'zatca_xml' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
              >
                كود UBL 2.1 XML والتشفير
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activeDetailTab === 'summary' && (
                <>
                  {/* Status Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '10px',
                    background: selectedInvoice.zatca_status === 'cleared' || selectedInvoice.zatca_status === 'reported' ? '#ecfdf5' : '#fffbeb',
                    border: `1px solid ${selectedInvoice.zatca_status === 'cleared' || selectedInvoice.zatca_status === 'reported' ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        حالة الربط والامتثال لدى هيئة الزكاة والضريبة:
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
                        {selectedInvoice.zatca_status === 'cleared' ? 'تم تخليص الفاتورة وتثبيت الختم المشفر من خوادم الهيئة بنجاح (Clearance Approved).' :
                         selectedInvoice.zatca_status === 'reported' ? 'تم استلام وإبلاغ الفاتورة المبسطة بنجاح لدى منصة فاتورة (Reported).' :
                         'الفاتورة جاهزة بصيغة UBL 2.1 وتحتاج إلى إرسالها لمنصة فاتورة (Fatoora API).'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSubmitToZatca(selectedInvoice.id)}
                      disabled={submittingZatca || selectedInvoice.zatca_status === 'cleared' || selectedInvoice.zatca_status === 'reported'}
                      className="btn btn-primary"
                    >
                      <Send size={16} />
                      <span>{submittingZatca ? 'جاري الاعتماد...' : 'إرسال لمنصة فاتورة (API)'}</span>
                    </button>
                  </div>

                  {/* Items Table */}
                  <div className="table-wrapper">
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>البند / الصنف</th>
                          <th>الكمية</th>
                          <th>سعر الوحدة</th>
                          <th>الضريبة 15%</th>
                          <th>الإجمالي شامل الضريبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700 }}>{item.item_name}</td>
                            <td className="font-mono">{item.quantity}</td>
                            <td className="font-mono">{item.unit_price?.toFixed(2)} ر.س</td>
                            <td className="font-mono" style={{ color: '#d97706' }}>{item.vat_amount?.toFixed(2)} ر.س</td>
                            <td className="font-mono" style={{ fontWeight: 700 }}>{item.line_total?.toFixed(2)} ر.س</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                          <td colSpan="3" style={{ textAlign: 'left' }}>المجموع النهائي:</td>
                          <td className="font-mono" style={{ color: '#d97706' }}>{selectedInvoice.vat_total?.toFixed(2)} ر.س</td>
                          <td className="font-mono" style={{ color: '#047857', fontSize: '1rem' }}>{selectedInvoice.grand_total?.toFixed(2)} ر.س</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}

              {activeDetailTab === 'qr' && (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                  <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    {/* Visual QR representation using a dynamic QR generator image */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedInvoice.zatca_qr || 'ZATCA-AL-SUWAYAN')}`} 
                      alt="ZATCA QR Code"
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginTop: '0.5rem' }}>
                      QR Phase 2 (TLV 8 Tags)
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>محتويات الرمز المشفر وفق اشتراطات ZATCA 2:</h4>
                    <ul style={{ fontSize: '0.825rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <li><strong>Tag 1:</strong> اسم المنشأة: شركة الصويان ومخازن للتجارة</li>
                      <li><strong>Tag 2:</strong> الرقم الضريبي: 310984752000003</li>
                      <li><strong>Tag 3:</strong> الطابع الزمني: {selectedInvoice.issue_date}T{selectedInvoice.issue_time}Z</li>
                      <li><strong>Tag 4:</strong> إجمالي الفاتورة: {selectedInvoice.grand_total} ر.س</li>
                      <li><strong>Tag 5:</strong> إجمالي الضريبة: {selectedInvoice.vat_total} ر.س</li>
                      <li><strong>Tag 6:</strong> الهاش المشفر (Invoice SHA-256 Hash)</li>
                      <li><strong>Tag 7:</strong> التوقيع الرقمي (ECDSA secp256k1 Signature)</li>
                      <li><strong>Tag 8:</strong> المفتاح العام للخادم (Public Key)</li>
                    </ul>

                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>النص المشفر Base64 TLV:</label>
                      <textarea
                        readOnly
                        className="form-textarea font-mono"
                        style={{ fontSize: '0.75rem', height: '60px', width: '100%', background: '#ffffff' }}
                        value={selectedInvoice.zatca_qr || ''}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'zatca_xml' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      مخطط ملف XML بصيغة Universal Business Language 2.1 (UBL 2.1)
                    </span>
                    <a
                      href={`/api/invoices/${selectedInvoice.id}/download-xml`}
                      download
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Download size={14} />
                      <span>تحميل ملف XML</span>
                    </a>
                  </div>

                  <div style={{ background: '#0f172a', color: '#34d399', padding: '1rem', borderRadius: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    <pre className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {selectedInvoice.zatca_xml}
                    </pre>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <strong>Invoice SHA-256 Hash: </strong>
                    <span className="font-mono" style={{ color: '#0284c7' }}>{selectedInvoice.zatca_hash}</span>
                  </div>
                </div>
              )}

              {/* Fatoora API Live Simulator Response */}
              {zatcaResult && (
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={18} style={{ color: '#059669' }} />
                    <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.9rem' }}>
                      استجابة منصة هيئة الزكاة والضريبة (Fatoora Gateway):
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                    {zatcaResult.zatcaResponse?.validationResults?.infoMessages?.map((msg, i) => (
                      <div key={i}>• {msg.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
