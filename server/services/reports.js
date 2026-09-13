const { db } = require('../db/database');

/**
 * محرك استخراج القوائم والتقارير المالية الفورية متعدد الشركات
 * (Multi-Tenant Instant Financial Statements & Analytics Engine)
 */

// 1. ميزان المراجعة (Trial Balance) بالمجاميع والأرصدة
function getTrialBalance({ tenantId = 1, branchId, fromDate, toDate } = {}) {
  let query = `
    SELECT 
      a.id,
      a.code,
      a.name_ar,
      a.name_en,
      a.type,
      a.category,
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM accounts a
    LEFT JOIN journal_lines jl ON a.id = jl.account_id AND jl.tenant_id = ?
    LEFT JOIN journal_entries je ON jl.entry_id = je.id AND je.tenant_id = ?
    WHERE a.is_active = 1 AND a.tenant_id = ?
  `;

  const params = [tenantId, tenantId, tenantId];

  if (branchId && branchId !== 'all') {
    query += ` AND (jl.branch_id = ? OR jl.branch_id IS NULL)`;
    params.push(branchId);
  }

  if (fromDate) {
    query += ` AND (je.date >= ? OR je.date IS NULL)`;
    params.push(fromDate);
  }

  if (toDate) {
    query += ` AND (je.date <= ? OR je.date IS NULL)`;
    params.push(toDate);
  }

  query += ` GROUP BY a.id, a.code, a.name_ar, a.name_en, a.type, a.category ORDER BY a.code ASC`;

  const rows = db.prepare(query).all(...params);

  let grandDebit = 0;
  let grandCredit = 0;

  const accounts = rows.map(acc => {
    const debit = Number(acc.total_debit.toFixed(2));
    const credit = Number(acc.total_credit.toFixed(2));
    grandDebit += debit;
    grandCredit += credit;

    let balanceDebit = 0;
    let balanceCredit = 0;

    if (acc.type === 'asset' || acc.type === 'expense') {
      const diff = debit - credit;
      if (diff >= 0) balanceDebit = diff;
      else balanceCredit = Math.abs(diff);
    } else {
      const diff = credit - debit;
      if (diff >= 0) balanceCredit = diff;
      else balanceDebit = Math.abs(diff);
    }

    return {
      ...acc,
      total_debit: debit,
      total_credit: credit,
      balance_debit: Number(balanceDebit.toFixed(2)),
      balance_credit: Number(balanceCredit.toFixed(2))
    };
  });

  return {
    accounts,
    summary: {
      total_debit: Number(grandDebit.toFixed(2)),
      total_credit: Number(grandCredit.toFixed(2)),
      is_balanced: Math.abs(grandDebit - grandCredit) < 0.05
    }
  };
}

// 2. قائمة الدخل (Profit & Loss / Income Statement)
function getProfitAndLoss({ tenantId = 1, branchId, fromDate, toDate } = {}) {
  const trial = getTrialBalance({ tenantId, branchId, fromDate, toDate });

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalOperatingExp = 0;
  let totalAdminExp = 0;
  let totalOtherExp = 0;

  const revenueItems = [];
  const cogsItems = [];
  const operatingExpItems = [];
  const adminExpItems = [];
  const otherExpItems = [];

  for (const acc of trial.accounts) {
    if (acc.type === 'revenue') {
      const net = acc.total_credit - acc.total_debit;
      if (net !== 0) {
        revenueItems.push({ ...acc, amount: net });
        totalRevenue += net;
      }
    } else if (acc.type === 'expense') {
      const net = acc.total_debit - acc.total_credit;
      if (net !== 0) {
        if (acc.category === 'cogs') {
          cogsItems.push({ ...acc, amount: net });
          totalCogs += net;
        } else if (acc.category === 'operating_expense') {
          operatingExpItems.push({ ...acc, amount: net });
          totalOperatingExp += net;
        } else if (acc.category === 'admin_expense' || acc.category === 'general_expense') {
          adminExpItems.push({ ...acc, amount: net });
          totalAdminExp += net;
        } else {
          otherExpItems.push({ ...acc, amount: net });
          totalOtherExp += net;
        }
      }
    }
  }

  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = totalOperatingExp + totalAdminExp + totalOtherExp;
  const netProfit = grossProfit - totalExpenses;

  return {
    revenue: { items: revenueItems, total: Number(totalRevenue.toFixed(2)) },
    cogs: { items: cogsItems, total: Number(totalCogs.toFixed(2)) },
    gross_profit: Number(grossProfit.toFixed(2)),
    operating_expenses: { items: operatingExpItems, total: Number(totalOperatingExp.toFixed(2)) },
    admin_expenses: { items: adminExpItems, total: Number(totalAdminExp.toFixed(2)) },
    other_expenses: { items: otherExpItems, total: Number(totalOtherExp.toFixed(2)) },
    total_expenses: Number(totalExpenses.toFixed(2)),
    net_profit: Number(netProfit.toFixed(2))
  };
}

// 3. الميزانية العمومية / قائمة المركز المالي (Balance Sheet)
function getBalanceSheet({ tenantId = 1, branchId, toDate } = {}) {
  const trial = getTrialBalance({ tenantId, branchId, toDate });
  const pnl = getProfitAndLoss({ tenantId, branchId, toDate });

  const currentAssets = [];
  const fixedAssets = [];
  let totalCurrentAssets = 0;
  let totalFixedAssets = 0;

  const currentLiabilities = [];
  let totalCurrentLiabilities = 0;

  const equityItems = [];
  let totalEquity = 0;

  for (const acc of trial.accounts) {
    if (acc.type === 'asset') {
      const net = acc.total_debit - acc.total_credit;
      if (net !== 0) {
        if (acc.category === 'current_asset') {
          currentAssets.push({ ...acc, amount: net });
          totalCurrentAssets += net;
        } else {
          fixedAssets.push({ ...acc, amount: net });
          totalFixedAssets += net;
        }
      }
    } else if (acc.type === 'liability') {
      const net = acc.total_credit - acc.total_debit;
      if (net !== 0) {
        currentLiabilities.push({ ...acc, amount: net });
        totalCurrentLiabilities += net;
      }
    } else if (acc.type === 'equity') {
      const net = acc.total_credit - acc.total_debit;
      if (net !== 0) {
        equityItems.push({ ...acc, amount: net });
        totalEquity += net;
      }
    }
  }

  const currentPeriodNetIncome = pnl.net_profit;
  totalEquity += currentPeriodNetIncome;

  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilitiesAndEquity = totalCurrentLiabilities + totalEquity;

  return {
    assets: {
      current: { items: currentAssets, total: Number(totalCurrentAssets.toFixed(2)) },
      fixed: { items: fixedAssets, total: Number(totalFixedAssets.toFixed(2)) },
      total: Number(totalAssets.toFixed(2))
    },
    liabilities: {
      current: { items: currentLiabilities, total: Number(totalCurrentLiabilities.toFixed(2)) },
      total: Number(totalCurrentLiabilities.toFixed(2))
    },
    equity: {
      items: equityItems,
      current_period_profit: Number(currentPeriodNetIncome.toFixed(2)),
      total: Number(totalEquity.toFixed(2))
    },
    total_liabilities_and_equity: Number(totalLiabilitiesAndEquity.toFixed(2)),
    is_balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05
  };
}

// 4. كشف حساب تفصيلي
function getContactStatement(contactId, { tenantId = 1, fromDate, toDate } = {}) {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND tenant_id = ?').get(contactId, tenantId);
  if (!contact) throw new Error('Contact not found');

  let invoices = [];
  if (contact.type === 'customer') {
    let q = 'SELECT * FROM sales_invoices WHERE customer_id = ? AND tenant_id = ?';
    const p = [contactId, tenantId];
    if (fromDate) { q += ' AND issue_date >= ?'; p.push(fromDate); }
    if (toDate) { q += ' AND issue_date <= ?'; p.push(toDate); }
    q += ' ORDER BY issue_date ASC';
    invoices = db.prepare(q).all(...p);
  } else {
    let q = 'SELECT * FROM purchase_invoices WHERE vendor_id = ? AND tenant_id = ?';
    const p = [contactId, tenantId];
    if (fromDate) { q += ' AND invoice_date >= ?'; p.push(fromDate); }
    if (toDate) { q += ' AND invoice_date <= ?'; p.push(toDate); }
    q += ' ORDER BY invoice_date ASC';
    invoices = db.prepare(q).all(...p);
  }

  return {
    contact,
    invoices,
    total_invoiced: invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
    balance_due: contact.balance
  };
}

// 5. تقرير إقرار ضريبة القيمة المضافة
function getVatReturnReport({ tenantId = 1, branchId, fromDate, toDate } = {}) {
  let salesQ = `
    SELECT 
      COALESCE(SUM(subtotal), 0) AS total_sales_taxable,
      COALESCE(SUM(vat_total), 0) AS total_output_vat
    FROM sales_invoices
    WHERE tenant_id = ?
  `;
  const salesP = [tenantId];
  if (branchId && branchId !== 'all') {
    salesQ += ' AND branch_id = ?';
    salesP.push(branchId);
  }
  if (fromDate) { salesQ += ' AND issue_date >= ?'; salesP.push(fromDate); }
  if (toDate) { salesQ += ' AND issue_date <= ?'; salesP.push(toDate); }

  const salesRes = db.prepare(salesQ).get(...salesP);

  let purQ = `
    SELECT 
      COALESCE(SUM(subtotal), 0) AS total_purchases_taxable,
      COALESCE(SUM(vat_total), 0) AS total_input_vat_purchases
    FROM purchase_invoices
    WHERE tenant_id = ?
  `;
  const purP = [tenantId];
  if (branchId && branchId !== 'all') {
    purQ += ' AND branch_id = ?';
    purP.push(branchId);
  }
  if (fromDate) { purQ += ' AND invoice_date >= ?'; purP.push(fromDate); }
  if (toDate) { purQ += ' AND invoice_date <= ?'; purP.push(toDate); }

  const purRes = db.prepare(purQ).get(...purP);

  let expQ = `
    SELECT 
      COALESCE(SUM(amount), 0) AS total_expenses_taxable,
      COALESCE(SUM(vat_amount), 0) AS total_input_vat_expenses
    FROM expenses
    WHERE tenant_id = ? AND vat_amount > 0
  `;
  const expP = [tenantId];
  if (branchId && branchId !== 'all') {
    expQ += ' AND branch_id = ?';
    expP.push(branchId);
  }
  if (fromDate) { expQ += ' AND date >= ?'; expP.push(fromDate); }
  if (toDate) { expQ += ' AND date <= ?'; expP.push(toDate); }

  const expRes = db.prepare(expQ).get(...expP);

  const totalOutputVat = Number(salesRes.total_output_vat.toFixed(2));
  const totalInputVat = Number((purRes.total_input_vat_purchases + expRes.total_input_vat_expenses).toFixed(2));
  const netVatDue = Number((totalOutputVat - totalInputVat).toFixed(2));

  return {
    sales: {
      standard_rated_sales: Number(salesRes.total_sales_taxable.toFixed(2)),
      output_vat_amount: totalOutputVat
    },
    purchases_and_expenses: {
      standard_rated_purchases: Number(purRes.total_purchases_taxable.toFixed(2)),
      standard_rated_expenses: Number(expRes.total_expenses_taxable.toFixed(2)),
      total_taxable_inputs: Number((purRes.total_purchases_taxable + expRes.total_expenses_taxable).toFixed(2)),
      input_vat_amount: totalInputVat
    },
    net_vat_due: netVatDue,
    status: netVatDue >= 0 ? 'مستحق السداد لهيئة الزكاة والضريبة' : 'رصيد ضريبي مسترد للمنشأة'
  };
}

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getContactStatement,
  getVatReturnReport
};
