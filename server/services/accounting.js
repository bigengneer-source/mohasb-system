const { db } = require('../db/database');

// توليد رقم قيد تسلسلي جديد للشركة
function generateEntryNumber(tenantId = 1) {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM journal_entries WHERE tenant_id = ? AND date LIKE ?').get(tenantId, `${year}%`);
  const seq = (countRow.cnt + 1).toString().padStart(4, '0');
  return `JE-${year}-${seq}`;
}

// العثور على حساب الصندوق أو البنك المناسب حسب طريقة السداد والفرع للشركة
function getPaymentAccount(tenantId, paymentMethod, branchId) {
  if (paymentMethod === 'cash') {
    const cashAccounts = {
      1: '1111', // الرياض
      2: '1112', // جدة
      3: '1113', // الدمام
    };
    const code = cashAccounts[branchId] || '1111';
    const acc = db.prepare('SELECT id FROM accounts WHERE tenant_id = ? AND code = ?').get(tenantId, code);
    return acc ? acc.id : db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code LIKE '111%' LIMIT 1").get(tenantId)?.id;
  } else if (paymentMethod === 'card' || paymentMethod === 'bank_transfer' || paymentMethod === 'transfer') {
    return db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '1121'").get(tenantId)?.id;
  } else if (paymentMethod === 'credit') {
    return db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '113'").get(tenantId)?.id;
  }
  return db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code LIKE '111%' LIMIT 1").get(tenantId)?.id;
}

// حساب المخزون حسب الفرع للشركة
function getInventoryAccount(tenantId, branchId) {
  const invAccounts = {
    1: '1141',
    2: '1142',
    3: '1143',
  };
  const code = invAccounts[branchId] || '1141';
  const acc = db.prepare('SELECT id FROM accounts WHERE tenant_id = ? AND code = ?').get(tenantId, code);
  return acc ? acc.id : db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code LIKE '114%' LIMIT 1").get(tenantId)?.id;
}

// حساب المبيعات حسب الفرع للشركة
function getSalesRevenueAccount(tenantId, branchId) {
  const salesAccounts = {
    1: '4101',
    2: '4102',
    3: '4103',
  };
  const code = salesAccounts[branchId] || '4101';
  const acc = db.prepare('SELECT id FROM accounts WHERE tenant_id = ? AND code = ?').get(tenantId, code);
  return acc ? acc.id : db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code LIKE '41%' LIMIT 1").get(tenantId)?.id;
}

// 1. توليد قيد آلي لفاتورة المبيعات (Sales & POS Invoice)
function recordSalesInvoiceJournal(invoiceId) {
  const invoice = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  const tenantId = invoice.tenant_id || 1;
  const items = db.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?').all(invoiceId);

  // حساب تكلفة البضاعة المباعة (COGS)
  let totalCost = 0;
  for (const item of items) {
    const prod = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.product_id);
    if (prod) {
      totalCost += (prod.cost_price * item.quantity);
    }
  }

  const entryNumber = generateEntryNumber(tenantId);
  const date = invoice.issue_date;
  const branchId = invoice.branch_id;

  const paymentAccId = invoice.payment_method === 'credit'
    ? db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '113'").get(tenantId).id
    : getPaymentAccount(tenantId, invoice.payment_method, branchId);

  const salesAccId = getSalesRevenueAccount(tenantId, branchId);
  const vatOutAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '212'").get(tenantId).id;
  const cogsAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '51'").get(tenantId).id;
  const invAccId = getInventoryAccount(tenantId, branchId);

  const executeJournal = db.transaction(() => {
    const totalDebit = Number((invoice.grand_total + (totalCost > 0 ? totalCost : 0)).toFixed(2));
    const totalCredit = totalDebit;

    const je = db.prepare(`
      INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, reference_id, narration, total_debit, total_credit, created_by)
      VALUES (?, ?, ?, ?, 'sales', ?, ?, ?, ?, 'محرك مبيعات الكاشير الآلي')
    `).run(
      tenantId,
      entryNumber,
      date,
      branchId,
      invoice.id,
      `قيد آلي لمبيعات كاشير / فاتورة رقم ${invoice.invoice_number} (${invoice.invoice_type === 'tax_invoice' ? 'ضريبية B2B' : 'مبسطة B2C'})`,
      totalDebit,
      totalCredit
    );

    const jeId = je.lastInsertRowid;
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // المدين: الصندوق أو الشبكة أو العميل
    insertLine.run(tenantId, jeId, paymentAccId, branchId, invoice.grand_total, 0, `تحصيل مبيعات ${invoice.invoice_number}`);

    // الدائن: إيراد المبيعات
    insertLine.run(tenantId, jeId, salesAccId, branchId, 0, invoice.subtotal, `إيراد مبيعات فاتورة ${invoice.invoice_number}`);

    // الدائن: ضريبة القيمة المضافة 15%
    if (invoice.vat_total > 0) {
      insertLine.run(tenantId, jeId, vatOutAccId, branchId, 0, invoice.vat_total, `ضريبة مخرجات مستحقة 15%`);
    }

    // إثبات تكلفة البضاعة المباعة
    if (totalCost > 0) {
      insertLine.run(tenantId, jeId, cogsAccId, branchId, totalCost, 0, `إثبات تكلفة المبيعات لفاتورة ${invoice.invoice_number}`);
      insertLine.run(tenantId, jeId, invAccId, branchId, 0, totalCost, `خصم تكلفة الشتلات المباعة من المخزن`);
    }

    // تحديث رصيد العميل إن وجد
    if (invoice.payment_method === 'credit' && invoice.customer_id) {
      db.prepare('UPDATE contacts SET balance = balance + ? WHERE id = ?').run(invoice.grand_total, invoice.customer_id);
    }
  });

  executeJournal();
  return entryNumber;
}

// 2. توليد قيد آلي لفاتورة المشتريات
function recordPurchaseInvoiceJournal(purchaseId) {
  const purchase = db.prepare('SELECT * FROM purchase_invoices WHERE id = ?').get(purchaseId);
  if (!purchase) throw new Error('Purchase invoice not found');

  const tenantId = purchase.tenant_id || 1;
  const entryNumber = generateEntryNumber(tenantId);
  const date = purchase.invoice_date;
  const branchId = purchase.branch_id;

  const invAccId = getInventoryAccount(tenantId, branchId);
  const vatInAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '115'").get(tenantId).id;
  const paymentAccId = purchase.payment_method === 'credit'
    ? db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '211'").get(tenantId).id
    : getPaymentAccount(tenantId, purchase.payment_method, branchId);

  const executeJournal = db.transaction(() => {
    const je = db.prepare(`
      INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, reference_id, narration, total_debit, total_credit, created_by)
      VALUES (?, ?, ?, ?, 'purchase', ?, ?, ?, ?, 'محرك المشتريات الآلي')
    `).run(
      tenantId,
      entryNumber,
      date,
      branchId,
      purchase.id,
      `قيد آلي لمشتريات شتلات ومستلزمات فاتورة توريد رقم ${purchase.invoice_number}`,
      purchase.grand_total,
      purchase.grand_total
    );

    const jeId = je.lastInsertRowid;
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLine.run(tenantId, jeId, invAccId, branchId, purchase.subtotal, 0, `إضافة بضاعة مشتريات إلى المخزون`);
    if (purchase.vat_total > 0) {
      insertLine.run(tenantId, jeId, vatInAccId, branchId, purchase.vat_total, 0, `ضريبة مدخلات مشتريات قابلة للخصم 15%`);
    }
    insertLine.run(tenantId, jeId, paymentAccId, branchId, 0, purchase.grand_total, `استحقاق سداد مشتريات للمورد`);

    if (purchase.payment_method === 'credit' && purchase.vendor_id) {
      db.prepare('UPDATE contacts SET balance = balance - ? WHERE id = ?').run(purchase.grand_total, purchase.vendor_id);
    }
  });

  executeJournal();
  return entryNumber;
}

// 3. توليد قيد آلي لتسجيل المصروفات
function recordExpenseJournal(expenseId) {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  if (!expense) throw new Error('Expense not found');

  const tenantId = expense.tenant_id || 1;
  const entryNumber = generateEntryNumber(tenantId);
  const branchId = expense.branch_id;
  const expenseAccId = expense.account_id;
  const vatInAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '115'").get(tenantId).id;
  const paymentAccId = getPaymentAccount(tenantId, expense.payment_method, branchId);

  const executeJournal = db.transaction(() => {
    const je = db.prepare(`
      INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, reference_id, narration, total_debit, total_credit, created_by)
      VALUES (?, ?, ?, ?, 'expense', ?, ?, ?, ?, 'محرك المصروفات الآلي')
    `).run(
      tenantId,
      entryNumber,
      expense.date,
      branchId,
      expense.id,
      `قيد آلي لمصروف (${expense.expense_type}): ${expense.responsible_person} - ${expense.paid_to || ''} [سند: ${expense.expense_number}]`,
      expense.total_amount,
      expense.total_amount
    );

    const jeId = je.lastInsertRowid;
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLine.run(tenantId, jeId, expenseAccId, branchId, expense.amount, 0, `إثبات مصروف: ${expense.notes || ''}`);
    if (expense.vat_amount > 0) {
      insertLine.run(tenantId, jeId, vatInAccId, branchId, expense.vat_amount, 0, `ضريبة مدخلات المصروف 15%`);
    }
    insertLine.run(tenantId, jeId, paymentAccId, branchId, 0, expense.total_amount, `صرف بواسطة ${expense.responsible_person}`);
  });

  executeJournal();
  return entryNumber;
}

// 4. قيد تسوية الجرد السنوي الآلي (Annual Inventory Reconciliation Journal)
function recordAnnualInventoryReconciliationJournal(countId) {
  const count = db.prepare('SELECT * FROM inventory_counts WHERE id = ?').get(countId);
  if (!count) throw new Error('Inventory count record not found');

  const tenantId = count.tenant_id || 1;
  const items = db.prepare('SELECT * FROM inventory_count_items WHERE count_id = ?').all(countId);

  let totalDeficit = 0; // عجز (Actual < Book)
  let totalSurplus = 0; // فائض (Actual > Book)

  for (const it of items) {
    if (it.variance_quantity < 0) {
      totalDeficit += Math.abs(it.variance_cost);
    } else if (it.variance_quantity > 0) {
      totalSurplus += it.variance_cost;
    }
  }

  const netVariance = Number((totalSurplus - totalDeficit).toFixed(2));
  const entryNumber = generateEntryNumber(tenantId);
  const branchId = count.branch_id;
  const invAccId = getInventoryAccount(tenantId, branchId);
  const lossAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '54'").get(tenantId).id;
  const surplusAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '55'").get(tenantId).id;

  const executeReconcile = db.transaction(() => {
    // 1. تحديث أرصدة المخزون بالكميات الفعلية المحصورة
    for (const it of items) {
      db.prepare('UPDATE inventory_levels SET quantity = ? WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?')
        .run(it.actual_quantity, tenantId, it.product_id, count.warehouse_id);

      db.prepare(`
        INSERT INTO inventory_transactions (tenant_id, branch_id, warehouse_id, product_id, type, quantity, unit_cost, reference_id, notes)
        VALUES (?, ?, ?, ?, 'annual_count', ?, ?, ?, ?)
      `).run(tenantId, branchId, count.warehouse_id, it.product_id, it.variance_quantity, it.unit_cost, count.count_number, `تسوية جرد سنوي: ${count.title}`);
    }

    // 2. توليد القيد المحاسبي المتوازن للتسوية
    const totalAmount = Math.max(totalDeficit, totalSurplus, Math.abs(netVariance));
    if (totalAmount > 0) {
      const je = db.prepare(`
        INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, reference_id, narration, total_debit, total_credit, created_by)
        VALUES (?, ?, ?, ?, 'annual_count', ?, ?, ?, ?, 'محرك الجرد السنوي الآلي')
      `).run(
        tenantId,
        entryNumber,
        count.count_date,
        branchId,
        count.id,
        `قيد تسوية الجرد السنوي لمطابقة الفعلي بالدفتري (${count.title}) - كود: ${count.count_number}`,
        totalAmount,
        totalAmount
      );

      const jeId = je.lastInsertRowid;
      const insertLine = db.prepare(`
        INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      if (totalDeficit > 0) {
        // مدين: حساب خسائر وعجز المخزون (توالف الشتلات)
        insertLine.run(tenantId, jeId, lossAccId, branchId, totalDeficit, 0, `إثبات عجز الجرد الفعلي للمشتل`);
        // دائن: خفض المخزون السلعي
        insertLine.run(tenantId, jeId, invAccId, branchId, 0, totalDeficit, `تخفيض المخزون بقيمة العجز المحصور`);
      }

      if (totalSurplus > 0) {
        // مدين: زيادة المخزون السلعي
        insertLine.run(tenantId, jeId, invAccId, branchId, totalSurplus, 0, `زيادة المخزون السلعي بقيمة الفائض المحصور`);
        // دائن: إيرادات فروقات الجرد
        insertLine.run(tenantId, jeId, surplusAccId, branchId, 0, totalSurplus, `إثبات فائض الجرد السنوي`);
      }

      // تحديث حالة الجلسة
      db.prepare('UPDATE inventory_counts SET status = ?, journal_entry_number = ? WHERE id = ?')
        .run('posted', entryNumber, countId);
    }
  });

  executeReconcile();
  return { entryNumber, netVariance, totalDeficit, totalSurplus };
}

// 5. قيد تحويل مخزني بين الفروع
function recordInterBranchTransferJournal(tenantId, fromBranchId, toBranchId, fromWarehouseId, toWarehouseId, productId, quantity, notes) {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!prod) throw new Error('Product not found');

  const totalCost = Number((prod.cost_price * quantity).toFixed(2));
  const entryNumber = generateEntryNumber(tenantId);
  const date = new Date().toISOString().split('T')[0];

  const fromInvAccId = getInventoryAccount(tenantId, fromBranchId);
  const toInvAccId = getInventoryAccount(tenantId, toBranchId);

  const executeTransfer = db.transaction(() => {
    db.prepare('UPDATE inventory_levels SET quantity = quantity - ? WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?')
      .run(quantity, tenantId, productId, fromWarehouseId);

    const existing = db.prepare('SELECT * FROM inventory_levels WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?').get(tenantId, productId, toWarehouseId);
    if (existing) {
      db.prepare('UPDATE inventory_levels SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare('INSERT INTO inventory_levels (tenant_id, product_id, warehouse_id, branch_id, quantity) VALUES (?, ?, ?, ?, ?)')
        .run(tenantId, productId, toWarehouseId, toBranchId, quantity);
    }

    db.prepare(`
      INSERT INTO inventory_transactions (tenant_id, branch_id, warehouse_id, product_id, type, quantity, unit_cost, reference_id, notes)
      VALUES (?, ?, ?, ?, 'transfer_out', ?, ?, ?, ?)
    `).run(tenantId, fromBranchId, fromWarehouseId, productId, -quantity, prod.cost_price, entryNumber, `مناقلة شتلات صادرة لفرع ${toBranchId}`);

    db.prepare(`
      INSERT INTO inventory_transactions (tenant_id, branch_id, warehouse_id, product_id, type, quantity, unit_cost, reference_id, notes)
      VALUES (?, ?, ?, ?, 'transfer_in', ?, ?, ?, ?)
    `).run(tenantId, toBranchId, toWarehouseId, productId, quantity, prod.cost_price, entryNumber, `مناقلة شتلات واردة من فرع ${fromBranchId}`);

    const je = db.prepare(`
      INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, narration, total_debit, total_credit, created_by)
      VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?, 'محرك المناقلات الآلي')
    `).run(
      tenantId,
      entryNumber,
      date,
      toBranchId,
      `قيد مناقلة شتلات ومزروعات: من فرع ${fromBranchId} إلى فرع ${toBranchId} - صنف: ${prod.name_ar} (${quantity} ${prod.unit})`,
      totalCost,
      totalCost
    );

    const jeId = je.lastInsertRowid;
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLine.run(tenantId, jeId, toInvAccId, toBranchId, totalCost, 0, `استلام شتلات محولة`);
    insertLine.run(tenantId, jeId, fromInvAccId, fromBranchId, 0, totalCost, `إرسال شتلات محولة`);
  });

  executeTransfer();
  return { entryNumber, totalCost };
}

// 6. قيد إتلاف وموت شتلات
function recordInventoryDamageJournal(tenantId, branchId, warehouseId, productId, quantity, notes) {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!prod) throw new Error('Product not found');

  const totalCost = Number((prod.cost_price * quantity).toFixed(2));
  const entryNumber = generateEntryNumber(tenantId);
  const date = new Date().toISOString().split('T')[0];

  const damageLossAccId = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '54'").get(tenantId).id;
  const invAccId = getInventoryAccount(tenantId, branchId);

  const executeJournal = db.transaction(() => {
    db.prepare('UPDATE inventory_levels SET quantity = quantity - ? WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?')
      .run(quantity, tenantId, productId, warehouseId);

    db.prepare(`
      INSERT INTO inventory_transactions (tenant_id, branch_id, warehouse_id, product_id, type, quantity, unit_cost, reference_id, notes)
      VALUES (?, ?, ?, ?, 'damage', ?, ?, ?, ?)
    `).run(tenantId, branchId, warehouseId, productId, -quantity, prod.cost_price, entryNumber, notes || 'موت شتلات أو تلف نباتي');

    const je = db.prepare(`
      INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, narration, total_debit, total_credit, created_by)
      VALUES (?, ?, ?, ?, 'damage', ?, ?, ?, 'محرك الإتلاف الآلي')
    `).run(
      tenantId,
      entryNumber,
      date,
      branchId,
      `إثبات موت وتلف شتلات: ${quantity} ${prod.unit} من صنف (${prod.name_ar}) - ${notes || ''}`,
      totalCost,
      totalCost
    );

    const jeId = je.lastInsertRowid;
    const insertLine = db.prepare(`
      INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertLine.run(tenantId, jeId, damageLossAccId, branchId, totalCost, 0, `خسائر تلف وموت شتلات - كود ${prod.sku}`);
    insertLine.run(tenantId, jeId, invAccId, branchId, 0, totalCost, `خفض مخزون المشتل بالبضاعة المتلفة`);
  });

  executeJournal();
  return { entryNumber, totalCost };
}

module.exports = {
  recordSalesInvoiceJournal,
  recordPurchaseInvoiceJournal,
  recordExpenseJournal,
  recordAnnualInventoryReconciliationJournal,
  recordInterBranchTransferJournal,
  recordInventoryDamageJournal
};
