import React, { useState } from 'react';
import { 
  BookOpenCheck, 
  Receipt, 
  Plus, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText,
  UserCheck,
  CheckCircle2,
  Filter
} from 'lucide-react';

export default function JournalAndExpensesView({ 
  journalEntries, 
  expenses, 
  branches, 
  accounts, 
  selectedBranch, 
  onRefreshJournals, 
  onRefreshExpenses,
  onOpenNewExpense 
}) {
  const [activeTab, setActiveTab] = useState('journals'); // 'journals' or 'expenses'
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [expenseFilterType, setExpenseFilterType] = useState('all');

  const filteredExpenses = expenses.filter(exp => {
    if (selectedBranch !== 'all' && exp.branch_id != selectedBranch) return false;
    if (expenseFilterType !== 'all' && exp.expense_type !== expenseFilterType) return false;
    return true;
  });

  const filteredJournals = journalEntries.filter(je => {
    if (selectedBranch !== 'all' && je.branch_id != selectedBranch) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tab Switcher & Top Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#e2e8f0', padding: '0.3rem', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('journals')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'journals' ? '#ffffff' : 'transparent',
              color: activeTab === 'journals' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'journals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📖 سجل القيود المحاسبية التلقائية ({filteredJournals.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'expenses' ? '#ffffff' : 'transparent',
              color: activeTab === 'expenses' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'expenses' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            💸 محرك تتبع المصروفات بدقة ({filteredExpenses.length})
          </button>
        </div>

        <div>
          <button onClick={onOpenNewExpense} className="btn btn-primary">
            <Plus size={16} />
            <span>تسجيل سند مصروف جديد</span>
          </button>
        </div>
      </div>

      {activeTab === 'journals' ? (
        /* ================== القيود المحاسبية الآلية ================== */
        <div style={{ display: 'grid', gridTemplateColumns: selectedEntry ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  دفتر اليومية العامة والقيود الآلية (Automated General Ledger)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  يتم إدراج قيود القيد المزدوج فورياً عند كل حركة مبيعات، مشتريات، توالف، أو مصروفات مع إثبات مركز التكلفة (Branch ID).
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم القيد</th>
                    <th>التاريخ</th>
                    <th>الفرع (مركز التكلفة)</th>
                    <th>نوع الحركة</th>
                    <th>البيان المحاسبي</th>
                    <th>إجمالي المدين/الدائن</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJournals.map(je => {
                    const isSelected = selectedEntry && selectedEntry.id === je.id;
                    return (
                      <tr key={je.id} style={{ background: isSelected ? '#ecfdf5' : undefined }}>
                        <td className="font-mono" style={{ fontWeight: 800, color: '#047857' }}>
                          {je.entry_number}
                        </td>
                        <td>{je.date}</td>
                        <td>
                          <span className="badge badge-secondary">
                            {je.branch_name || 'المركز الموحد'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            je.reference_type === 'sales' ? 'badge-success' :
                            je.reference_type === 'expense' ? 'badge-danger' :
                            je.reference_type === 'purchase' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {je.reference_type === 'sales' ? 'مبيعات' :
                             je.reference_type === 'expense' ? 'مصروف' :
                             je.reference_type === 'purchase' ? 'مشتريات' :
                             je.reference_type === 'salary' ? 'رواتب' :
                             je.reference_type === 'damage' ? 'تالف مخزني' : 'قيد يدوي/تأسيسي'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={je.narration}>
                          {je.narration}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 800 }}>
                          {je.total_debit?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedEntry(isSelected ? null : je)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            {isSelected ? 'إغلاق' : 'عرض السطور'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* تفاصيل أسطر القيد المختار */}
          {selectedEntry && (
            <div className="card" style={{ border: '2px solid #10b981', position: 'sticky', top: '90px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    تفاصيل القيد: {selectedEntry.entry_number}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    بتاريخ: {selectedEntry.date} • {selectedEntry.branch_name}
                  </span>
                </div>
                <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong style={{ color: '#334155' }}>البيان: </strong> {selectedEntry.narration}
              </div>

              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th>الحساب</th>
                      <th>الفرع</th>
                      <th>مدين (Debit)</th>
                      <th>دائن (Credit)</th>
                      <th>الشرح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEntry.lines.map((line, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{line.account_name}</div>
                          <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{line.account_code}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem' }}>{line.branch_name}</span>
                        </td>
                        <td className="font-mono" style={{ fontWeight: line.debit > 0 ? 800 : 400, color: line.debit > 0 ? '#047857' : '#94a3b8' }}>
                          {line.debit > 0 ? line.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="font-mono" style={{ fontWeight: line.credit > 0 ? 800 : 400, color: line.credit > 0 ? '#0284c7' : '#94a3b8' }}>
                          {line.credit > 0 ? line.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{line.description}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td colSpan="2" style={{ textAlign: 'left' }}>الإجمالي الموزون:</td>
                      <td className="font-mono" style={{ color: '#047857' }}>
                        {selectedEntry.total_debit?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="font-mono" style={{ color: '#0284c7' }}>
                        {selectedEntry.total_credit?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td>
                        <span className="badge badge-success">موزون 100%</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================== تتبع المصروفات بدقة ================== */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                سجل المصروفات ومراقبة بنود الصرف
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                تصنيف كامل للمصاريف التشغيلية والإدارية والعمومية مع إثبات الفرع والمسؤول عن الصرف والمستند.
              </p>
            </div>

            {/* Filter by Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={expenseFilterType}
                onChange={e => setExpenseFilterType(e.target.value)}
                className="form-select"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <option value="all">كافة التصنيفات</option>
                <option value="operating">مصاريف تشغيلية</option>
                <option value="admin">مصاريف إدارية</option>
                <option value="general">مصاريف عمومية</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم السند</th>
                  <th>التاريخ</th>
                  <th>الفرع</th>
                  <th>بند المصروف (الحساب)</th>
                  <th>التصنيف</th>
                  <th>المبلغ الأساسي</th>
                  <th>الضريبة 15%</th>
                  <th>الإجمالي المسدد</th>
                  <th>المسؤول عن الصرف</th>
                  <th>المدفوع له</th>
                  <th>طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#be123c' }}>
                      {exp.expense_number}
                    </td>
                    <td>{exp.date}</td>
                    <td>
                      <span className="badge badge-secondary">{exp.branch_name}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{exp.account_name}</div>
                      <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>{exp.account_code}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        exp.expense_type === 'operating' ? 'badge-warning' :
                        exp.expense_type === 'admin' ? 'badge-info' : 'badge-secondary'
                      }`}>
                        {exp.expense_type === 'operating' ? 'تشغيلي' :
                         exp.expense_type === 'admin' ? 'إداري' : 'عمومي'}
                      </span>
                    </td>
                    <td className="font-mono">
                      {exp.amount?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="font-mono" style={{ color: '#d97706' }}>
                      {exp.vat_amount > 0 ? `${exp.vat_amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س` : '—'}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#0f172a' }}>
                      {exp.total_amount?.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <UserCheck size={14} style={{ color: '#047857' }} />
                        <span>{exp.responsible_person}</span>
                      </div>
                    </td>
                    <td>{exp.paid_to || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {exp.payment_method === 'cash' ? '💵 نقداً' :
                         exp.payment_method === 'bank_transfer' ? '🏦 تحويل بنكي' : '💳 مدى / شبكة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
