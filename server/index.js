const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { db } = require('./db/database');
const accounting = require('./services/accounting');
const zatca = require('./services/zatca');
const reports = require('./services/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// استخراج tenant_id من الترويسة أو المعاملات (افتراضياً 1)
function getTenantId(req) {
  const tid = req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenant_id;
  return tid ? Number(tid) : 1;
}

// ==========================================
// 1. بوابة المصادقة والحسابات (Authentication)
// ==========================================

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم / البريد وكلمة السر' });
    }

    const user = db.prepare(`
      SELECT * FROM users 
      WHERE (email = ? OR username = ?) AND password = ?
    `).get(identifier.trim(), identifier.trim(), password);

    if (!user) {
      return res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد/المستخدم وكلمة المرور' });
    }

    // إذا كان المسؤول المطلق (Super Admin)
    if (user.role === 'super_admin') {
      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          permissions: JSON.parse(user.permissions || '{}')
        },
        tenant: null,
        isSuperAdmin: true
      });
    }

    // للمستخدمين التابعين لشركات (مالك، كاشير، محاسب)
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id);
    if (!tenant) {
      return res.status(403).json({ success: false, error: 'المنشأة التابع لها هذا الحساب غير موجودة' });
    }

    // فحص حالة الشركة (نشط / تجريبي / مقفل)
    if (tenant.status === 'locked') {
      return res.status(403).json({
        success: false,
        error: '⚠️ تم إيقاف وقفل حساب هذه الشركة من قِبل إدارة منظومة الصويان السحابية. يرجى التواصل مع الإدارة.'
      });
    }

    // فحص انتهاء الفترة التجريبية
    if (tenant.status === 'trial' && tenant.trial_ends_at) {
      const today = new Date().toISOString().split('T')[0];
      if (today > tenant.trial_ends_at) {
        return res.status(403).json({
          success: false,
          error: `⚠️ انتهت الفترة التجريبية لاشتراك الشركة بتاريخ (${tenant.trial_ends_at}). يرجى التواصل مع المسؤول المطلق للتفعيل.`
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id,
        permissions: JSON.parse(user.permissions || '{}')
      },
      tenant,
      isSuperAdmin: false
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تسجيل شركة ومشترك جديد (Register New Tenant)
app.post('/api/auth/register-tenant', (req, res) => {
  try {
    const {
      company_name_ar,
      company_name_en,
      owner_name,
      email,
      phone,
      password,
      cr_number,
      vat_number,
      city = 'الرياض',
      trial_days = 30
    } = req.body;

    if (!company_name_ar || !owner_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'يرجى إكمال الحقول الإلزامية لتسجيل الشركة' });
    }

    // حساب تاريخ نهاية الفترة التجريبية
    const trialDate = new Date();
    trialDate.setDate(trialDate.getDate() + Number(trial_days));
    const trial_ends_at = trialDate.toISOString().split('T')[0];
    const code = 'TENANT-' + Date.now().toString().slice(-4);

    let newTenantId;
    let newUserId;

    const createTenantTx = db.transaction(() => {
      // 1. إنشاء سجل الشركة
      const insTenant = db.prepare(`
        INSERT INTO tenants (name_ar, name_en, code, status, trial_ends_at, owner_name, email, phone, cr_number, vat_number, enable_zatca)
        VALUES (?, ?, ?, 'trial', ?, ?, ?, ?, ?, ?, 1)
      `);
      const tInfo = insTenant.run(
        company_name_ar,
        company_name_en || company_name_ar,
        code,
        trial_ends_at,
        owner_name,
        email,
        phone || '',
        cr_number || '',
        vat_number || '310000000000003'
      );
      newTenantId = tInfo.lastInsertRowid;

      // 2. إنشاء حساب مالك الشركة
      const insUser = db.prepare(`
        INSERT INTO users (tenant_id, name, email, username, password, role, is_active, permissions)
        VALUES (?, ?, ?, ?, ?, 'tenant_owner', 1, ?)
      `);
      const uInfo = insUser.run(
        newTenantId,
        owner_name,
        email,
        email.split('@')[0],
        password,
        JSON.stringify({ can_edit_settings: true, can_view_reports: true, can_manage_pos: true })
      );
      newUserId = uInfo.lastInsertRowid;

      // 3. إنشاء الفرع الرئيسي والمستودع الافتراضي للشركة
      const insBranch = db.prepare(`
        INSERT INTO branches (tenant_id, code, name_ar, name_en, cr_number, vat_number, address, city, phone, email)
        VALUES (?, 'BR-01', ?, 'Main Branch', ?, ?, 'الفرع الرئيسي', ?, ?, ?)
      `);
      const bInfo = insBranch.run(newTenantId, `الفرع الرئيسي - ${company_name_ar}`, cr_number, vat_number, city, phone, email);
      const newBranchId = bInfo.lastInsertRowid;

      db.prepare(`
        INSERT INTO warehouses (tenant_id, branch_id, code, name_ar, address)
        VALUES (?, ?, 'WH-01', 'المستودع الرئيسي', 'المقر الرئيسي')
      `).run(newTenantId, newBranchId);

      // 4. نسخ شجرة الحسابات الأساسية للشركة الجديدة
      const defaultAccounts = [
        { code: '1', name_ar: 'الأصول', type: 'asset', category: 'root' },
        { code: '11', name_ar: 'الأصول المتداولة', type: 'asset', category: 'current_asset' },
        { code: '111', name_ar: 'النقد وما في حكمه (الصناديق)', type: 'asset', category: 'current_asset' },
        { code: '1111', name_ar: 'صندوق الكاشير الرئيسي', type: 'asset', category: 'current_asset' },
        { code: '112', name_ar: 'البنوك والشبكات', type: 'asset', category: 'current_asset' },
        { code: '1121', name_ar: 'الحساب البنكي / شبكات مدى', type: 'asset', category: 'current_asset' },
        { code: '113', name_ar: 'المدينون والعملاء', type: 'asset', category: 'current_asset' },
        { code: '114', name_ar: 'المخزون السلعي', type: 'asset', category: 'current_asset' },
        { code: '1141', name_ar: 'مخزون بضاعة الفرع الرئيسي', type: 'asset', category: 'current_asset' },
        { code: '115', name_ar: 'ضريبة القيمة المضافة المدخلات (المشتريات)', type: 'asset', category: 'current_asset' },
        { code: '2', name_ar: 'الخصوم والالتزامات', type: 'liability', category: 'root' },
        { code: '21', name_ar: 'الخصوم المتداولة', type: 'liability', category: 'current_liability' },
        { code: '211', name_ar: 'الدائنون والموردون', type: 'liability', category: 'current_liability' },
        { code: '212', name_ar: 'ضريبة القيمة المضافة المخرجات (المبيعات)', type: 'liability', category: 'current_liability' },
        { code: '3', name_ar: 'حقوق الملكية', type: 'equity', category: 'root' },
        { code: '31', name_ar: 'رأس المال', type: 'equity', category: 'equity' },
        { code: '32', name_ar: 'الأرباح المبقاة', type: 'equity', category: 'equity' },
        { code: '4', name_ar: 'الإيرادات', type: 'revenue', category: 'root' },
        { code: '41', name_ar: 'إيرادات المبيعات', type: 'revenue', category: 'operating_revenue' },
        { code: '4101', name_ar: 'مبيعات الكاشير وصالة العرض', type: 'revenue', category: 'operating_revenue' },
        { code: '5', name_ar: 'المصروفات', type: 'expense', category: 'root' },
        { code: '51', name_ar: 'تكلفة البضاعة المباعة (COGS)', type: 'expense', category: 'cogs' },
        { code: '52', name_ar: 'المصروفات التشغيلية', type: 'expense', category: 'operating_expense' },
        { code: '53', name_ar: 'المصروفات الإدارية والعمومية', type: 'expense', category: 'admin_expense' },
        { code: '54', name_ar: 'توالف وخسائر عجز المخزون', type: 'expense', category: 'operating_expense' },
        { code: '55', name_ar: 'فروقات وفائض الجرد السنوي', type: 'revenue', category: 'operating_revenue' }
      ];

      const insAcc = db.prepare(`
        INSERT INTO accounts (tenant_id, code, name_ar, type, category, is_sub)
        VALUES (?, ?, ?, ?, ?, 1)
      `);
      for (const a of defaultAccounts) {
        insAcc.run(newTenantId, a.code, a.name_ar, a.type, a.category);
      }
    });

    createTenantTx();

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(newTenantId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);

    res.json({
      success: true,
      message: 'تم تسجيل المنشأة بنجاح وبدء الفترة التجريبية',
      tenant,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. صلاحيات المسؤول المطلق (Super Admin Power)
// ==========================================

// استعراض كافة الشركات المشتركة وإحصائياتها
app.get('/api/superadmin/tenants', (req, res) => {
  try {
    const tenants = db.prepare('SELECT * FROM tenants ORDER BY id DESC').all();

    const getBranchCount = db.prepare('SELECT count(*) as cnt FROM branches WHERE tenant_id = ?');
    const getUserCount = db.prepare('SELECT count(*) as cnt FROM users WHERE tenant_id = ?');
    const getInvoiceCount = db.prepare('SELECT count(*) as cnt FROM sales_invoices WHERE tenant_id = ?');
    const getTotalSales = db.prepare('SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE tenant_id = ?');

    const result = tenants.map(t => ({
      ...t,
      branch_count: getBranchCount.get(t.id).cnt,
      user_count: getUserCount.get(t.id).cnt,
      invoice_count: getInvoiceCount.get(t.id).cnt,
      total_sales: getTotalSales.get(t.id).total
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تحكم المسؤول المطلق في حالة الشركة وتحديد الفترة التجريبية وقفل/فتح النظام
app.post('/api/superadmin/tenants/:id/status', (req, res) => {
  try {
    const { status, trial_ends_at, enable_zatca } = req.body;
    const tenantId = req.params.id;

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (trial_ends_at !== undefined) {
      updates.push('trial_ends_at = ?');
      params.push(trial_ends_at);
    }
    if (enable_zatca !== undefined) {
      updates.push('enable_zatca = ?');
      params.push(enable_zatca ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(tenantId);
      db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// إحصائيات عامة للمسؤول المطلق على مستوى المنصة
app.get('/api/superadmin/system-stats', (req, res) => {
  try {
    const totalTenants = db.prepare('SELECT count(*) as cnt FROM tenants').get().cnt;
    const activeTenants = db.prepare("SELECT count(*) as cnt FROM tenants WHERE status = 'active'").get().cnt;
    const trialTenants = db.prepare("SELECT count(*) as cnt FROM tenants WHERE status = 'trial'").get().cnt;
    const lockedTenants = db.prepare("SELECT count(*) as cnt FROM tenants WHERE status = 'locked'").get().cnt;
    const totalUsers = db.prepare('SELECT count(*) as cnt FROM users').get().cnt;
    const totalInvoices = db.prepare('SELECT count(*) as cnt FROM sales_invoices').get().cnt;
    const totalVolume = db.prepare('SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices').get().total;

    res.json({
      success: true,
      data: {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        trial_tenants: trialTenants,
        locked_tenants: lockedTenants,
        total_users: totalUsers,
        total_invoices: totalInvoices,
        total_volume: totalVolume
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. إدارة الكاشيرات وصلاحياتهم
// ==========================================

app.get('/api/cashiers', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const cashiers = db.prepare(`
      SELECT u.id, u.tenant_id, u.name, u.email, u.username, u.role, u.branch_id, u.is_active, u.permissions, b.name_ar as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.tenant_id = ? AND u.role = 'cashier'
      ORDER BY u.id DESC
    `).all(tenantId);

    const result = cashiers.map(c => ({
      ...c,
      permissions: JSON.parse(c.permissions || '{}')
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cashiers', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, username, password, branch_id, permissions = {} } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم الكاشير واسم المستخدم وكلمة السر' });
    }

    const insUser = db.prepare(`
      INSERT INTO users (tenant_id, name, username, password, role, branch_id, is_active, permissions)
      VALUES (?, ?, ?, ?, 'cashier', ?, 1, ?)
    `);

    const info = insUser.run(tenantId, name, username, password, branch_id || null, JSON.stringify(permissions));
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. الجرد السنوي للمخزون (Annual Inventory Count)
// ==========================================

// تجهيز مسودة الجرد السنوي بجلب الكميات الدفترية
app.get('/api/inventory/annual-counts/prepare', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { warehouseId } = req.query;
    if (!warehouseId) return res.status(400).json({ success: false, error: 'يرجى اختيار المستودع للجرد' });

    const products = db.prepare(`
      SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, p.unit, p.cost_price, p.retail_price,
             COALESCE(il.quantity, 0) as book_quantity
      FROM products p
      LEFT JOIN inventory_levels il ON p.id = il.product_id AND il.warehouse_id = ? AND il.tenant_id = ?
      WHERE p.tenant_id = ? AND p.is_active = 1
      ORDER BY p.name_ar ASC
    `).all(warehouseId, tenantId, tenantId);

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// استعراض جلسات الجرد السنوي السابقة
app.get('/api/inventory/annual-counts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const counts = db.prepare(`
      SELECT ic.*, b.name_ar as branch_name, w.name_ar as warehouse_name
      FROM inventory_counts ic
      LEFT JOIN branches b ON ic.branch_id = b.id
      LEFT JOIN warehouses w ON ic.warehouse_id = w.id
      WHERE ic.tenant_id = ?
      ORDER BY ic.id DESC
    `).all(tenantId);

    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// اعتماد الجرد السنوي وتوليد قيد التسوية المحاسبي آلياً
app.post('/api/inventory/annual-counts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branch_id, warehouse_id, title, notes, items, created_by = 'أمين المستودع' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب أن يحتوي الجرد على أصناف محصورة' });
    }

    const countRow = db.prepare('SELECT count(*) as cnt FROM inventory_counts WHERE tenant_id = ?').get(tenantId);
    const countNumber = `AUDIT-2026-${(countRow.cnt + 1).toString().padStart(4, '0')}`;
    const countDate = new Date().toISOString().split('T')[0];

    let countId;
    let totalVarQty = 0;
    let totalVarCost = 0;

    const createCountTx = db.transaction(() => {
      const insCount = db.prepare(`
        INSERT INTO inventory_counts (tenant_id, count_number, branch_id, warehouse_id, count_date, title, notes, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)
      `);
      const info = insCount.run(tenantId, countNumber, branch_id, warehouse_id, countDate, title || `جرد سنوي عام - ${countDate}`, notes, created_by);
      countId = info.lastInsertRowid;

      const insItem = db.prepare(`
        INSERT INTO inventory_count_items (count_id, product_id, book_quantity, actual_quantity, variance_quantity, unit_cost, variance_cost, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items) {
        const bookQty = Number(it.book_quantity || 0);
        const actualQty = Number(it.actual_quantity || 0);
        const varQty = Number((actualQty - bookQty).toFixed(2));
        const unitCost = Number(it.unit_cost || 0);
        const varCost = Number((varQty * unitCost).toFixed(2));

        totalVarQty += varQty;
        totalVarCost += varCost;

        insItem.run(countId, it.product_id, bookQty, actualQty, varQty, unitCost, varCost, it.notes || '');
      }

      db.prepare('UPDATE inventory_counts SET total_variance_qty = ?, total_variance_cost = ? WHERE id = ?')
        .run(totalVarQty, totalVarCost, countId);
    });

    createCountTx();

    // تشغيل محرك التسوية المحاسبية والترحيل الآلي
    const reconcileResult = accounting.recordAnnualInventoryReconciliationJournal(countId);

    res.json({
      success: true,
      countId,
      countNumber,
      reconcileResult,
      message: `تم اعتماد الجرد السنوي وتوليد قيد التسوية المحاسبي برقم (${reconcileResult.entryNumber})`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. الفروع والمستودعات
// ==========================================

app.get('/api/branches', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const branches = db.prepare('SELECT * FROM branches WHERE tenant_id = ? ORDER BY id ASC').all(tenantId);
    const warehouses = db.prepare('SELECT * FROM warehouses WHERE tenant_id = ? ORDER BY id ASC').all(tenantId);

    const data = branches.map(b => ({
      ...b,
      warehouses: warehouses.filter(w => w.branch_id === b.id)
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/branches', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { code, name_ar, name_en, cr_number, vat_number, address, city, phone, email } = req.body;
    const stmt = db.prepare(`
      INSERT INTO branches (tenant_id, code, name_ar, name_en, cr_number, vat_number, address, city, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(tenantId, code, name_ar, name_en, cr_number, vat_number, address, city, phone, email);

    db.prepare(`
      INSERT INTO warehouses (tenant_id, branch_id, code, name_ar, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, info.lastInsertRowid, `WH-${code}`, `مستودع ${name_ar}`, address);

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. شجرة الحسابات المرنة
// ==========================================

app.get('/api/accounts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const accounts = db.prepare('SELECT * FROM accounts WHERE tenant_id = ? ORDER BY code ASC').all(tenantId);
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { code, name_ar, name_en, type, category, parent_id, is_sub } = req.body;
    const stmt = db.prepare(`
      INSERT INTO accounts (tenant_id, code, name_ar, name_en, type, category, parent_id, is_sub)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(tenantId, code, name_ar, name_en, type, category, parent_id || null, is_sub !== undefined ? is_sub : 1);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. القيود المحاسبية
// ==========================================

app.get('/api/journal-entries', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branchId, limit = 50 } = req.query;
    let query = `
      SELECT je.*, b.name_ar as branch_name 
      FROM journal_entries je
      LEFT JOIN branches b ON je.branch_id = b.id
      WHERE je.tenant_id = ?
    `;
    const params = [tenantId];
    if (branchId && branchId !== 'all') {
      query += ` AND je.branch_id = ?`;
      params.push(branchId);
    }
    query += ` ORDER BY je.id DESC LIMIT ?`;
    params.push(Number(limit));

    const entries = db.prepare(query).all(...params);

    const getLines = db.prepare(`
      SELECT jl.*, a.code as account_code, a.name_ar as account_name, b.name_ar as branch_name
      FROM journal_lines jl
      JOIN accounts a ON jl.account_id = a.id
      LEFT JOIN branches b ON jl.branch_id = b.id
      WHERE jl.entry_id = ? AND jl.tenant_id = ?
      ORDER BY jl.debit DESC
    `);

    const result = entries.map(entry => ({
      ...entry,
      lines: getLines.all(entry.id, tenantId)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. المصروفات وتتبع الصرف
// ==========================================

app.get('/api/expenses', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branchId } = req.query;
    let query = `
      SELECT e.*, b.name_ar as branch_name, a.name_ar as account_name, a.code as account_code
      FROM expenses e
      JOIN branches b ON e.branch_id = b.id
      JOIN accounts a ON e.account_id = a.id
      WHERE e.tenant_id = ?
    `;
    const params = [tenantId];
    if (branchId && branchId !== 'all') {
      query += ` AND e.branch_id = ?`;
      params.push(branchId);
    }
    query += ` ORDER BY e.id DESC`;

    const expenses = db.prepare(query).all(...params);
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branch_id, account_id, expense_type, amount, vat_amount = 0, payment_method, paid_to, responsible_person, date, receipt_ref, notes } = req.body;

    const countRow = db.prepare('SELECT count(*) as cnt FROM expenses WHERE tenant_id = ?').get(tenantId);
    const expenseNumber = `EXP-2026-${(countRow.cnt + 1).toString().padStart(4, '0')}`;
    const totalAmount = Number((Number(amount) + Number(vat_amount)).toFixed(2));

    const insertExp = db.prepare(`
      INSERT INTO expenses (tenant_id, expense_number, branch_id, account_id, expense_type, amount, vat_amount, total_amount, payment_method, paid_to, responsible_person, date, receipt_ref, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertExp.run(
      tenantId,
      expenseNumber,
      branch_id,
      account_id,
      expense_type,
      Number(amount),
      Number(vat_amount),
      totalAmount,
      payment_method,
      paid_to,
      responsible_person,
      date || new Date().toISOString().split('T')[0],
      receipt_ref,
      notes
    );

    const journalEntryNumber = accounting.recordExpenseJournal(info.lastInsertRowid);

    res.json({
      success: true,
      id: info.lastInsertRowid,
      expenseNumber,
      journalEntryNumber
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. الأصناف والمنتجات الزراعية والمخزون
// ==========================================

app.get('/api/products', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branchId } = req.query;
    const products = db.prepare('SELECT * FROM products WHERE tenant_id = ? ORDER BY id ASC').all(tenantId);

    const getLevels = db.prepare(`
      SELECT il.*, w.name_ar as warehouse_name, b.name_ar as branch_name
      FROM inventory_levels il
      JOIN warehouses w ON il.warehouse_id = w.id
      JOIN branches b ON il.branch_id = b.id
      WHERE il.product_id = ? AND il.tenant_id = ?
    `);

    const result = products.map(p => {
      const levels = getLevels.all(p.id, tenantId);
      let totalQty = 0;
      if (branchId && branchId !== 'all') {
        const branchLevels = levels.filter(l => l.branch_id == branchId);
        totalQty = branchLevels.reduce((s, l) => s + l.quantity, 0);
      } else {
        totalQty = levels.reduce((s, l) => s + l.quantity, 0);
      }
      return {
        ...p,
        stock: totalQty,
        levels
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const {
      sku, barcode, name_ar, name_en, category, unit,
      cost_price, retail_price, wholesale_price,
      initial_qty = 0, branch_id = 1, warehouse_id = 1
    } = req.body;

    const selling_price = retail_price || cost_price;

    const insertProd = db.prepare(`
      INSERT INTO products (tenant_id, sku, barcode, name_ar, name_en, category, unit, cost_price, retail_price, wholesale_price, selling_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertProd.run(
      tenantId,
      sku,
      barcode,
      name_ar,
      name_en,
      category,
      unit || 'شتلة',
      Number(cost_price),
      Number(retail_price || selling_price),
      Number(wholesale_price || selling_price),
      Number(selling_price)
    );
    const prodId = info.lastInsertRowid;

    if (initial_qty > 0) {
      db.prepare(`
        INSERT INTO inventory_levels (tenant_id, product_id, warehouse_id, branch_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `).run(tenantId, prodId, warehouse_id, branch_id, Number(initial_qty));
    }

    res.json({ success: true, id: prodId });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// إتلاف وتلف شتلات
app.post('/api/inventory/damage', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branch_id, warehouse_id, product_id, quantity, notes } = req.body;
    const result = accounting.recordInventoryDamageJournal(tenantId, branch_id, warehouse_id, product_id, Number(quantity), notes);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// مناقلة بين الفروع
app.post('/api/inventory/transfer', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { from_branch_id, to_branch_id, from_warehouse_id, to_warehouse_id, product_id, quantity, notes } = req.body;
    const result = accounting.recordInterBranchTransferJournal(
      tenantId,
      from_branch_id,
      to_branch_id,
      from_warehouse_id,
      to_warehouse_id,
      product_id,
      Number(quantity),
      notes
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 10. الفواتير ومبيعات الكاشير و ZATCA 2
// ==========================================

app.get('/api/invoices', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branchId, limit = 50 } = req.query;
    let query = `
      SELECT si.*, b.name_ar as branch_name, c.name as customer_name, c.vat_number as customer_vat, u.name as cashier_name
      FROM sales_invoices si
      JOIN branches b ON si.branch_id = b.id
      LEFT JOIN contacts c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id
      WHERE si.tenant_id = ?
    `;
    const params = [tenantId];
    if (branchId && branchId !== 'all') {
      query += ` AND si.branch_id = ?`;
      params.push(branchId);
    }
    query += ` ORDER BY si.id DESC LIMIT ?`;
    params.push(Number(limit));

    const invoices = db.prepare(query).all(...params);
    const getItems = db.prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?');

    const result = invoices.map(inv => ({
      ...inv,
      items: getItems.all(inv.id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/invoices', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const {
      invoice_type: invoiceType = 'simplified_invoice',
      branch_id,
      warehouse_id,
      customer_id,
      cashier_id,
      payment_method: paymentMethod = 'cash',
      price_tier = 'retail',
      items,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      throw new Error('يجب إضافة بند واحد على الأقل في الفاتورة');
    }

    const branch = db.prepare('SELECT * FROM branches WHERE id = ? AND tenant_id = ?').get(branch_id, tenantId);
    const customer = customer_id ? db.prepare('SELECT * FROM contacts WHERE id = ? AND tenant_id = ?').get(customer_id, tenantId) : null;
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

    let subtotal = 0;
    let vatTotal = 0;

    const calculatedItems = items.map(item => {
      const lineSubtotal = Number((item.quantity * item.unit_price).toFixed(2));
      const lineVat = Number((lineSubtotal * 0.15).toFixed(2));
      const lineTotal = Number((lineSubtotal + lineVat).toFixed(2));
      subtotal += lineSubtotal;
      vatTotal += lineVat;
      return {
        ...item,
        vat_rate: 0.15,
        vat_amount: lineVat,
        line_total: lineTotal
      };
    });

    const grandTotal = Number((subtotal + vatTotal).toFixed(2));
    const countRow = db.prepare('SELECT count(*) as cnt FROM sales_invoices WHERE tenant_id = ?').get(tenantId);
    const invoiceNumber = `INV-2026-${(countRow.cnt + 1).toString().padStart(5, '0')}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const issueTime = new Date().toTimeString().split(' ')[0];
    const uuid = crypto.randomUUID();

    // 1. توليد UBL 2.1 XML
    const xml = zatca.generateUBL21Xml({
      uuid,
      invoiceNumber,
      issueDate,
      issueTime,
      invoiceType,
      seller: {
        name_ar: tenant?.name_ar || branch?.name_ar,
        vat_number: tenant?.vat_number || branch?.vat_number || '310984752000003',
        cr_number: tenant?.cr_number || branch?.cr_number,
        address: branch?.address,
        city: branch?.city
      },
      customer,
      items: calculatedItems,
      subtotal,
      vatTotal,
      grandTotal,
      paymentMethod
    });

    // 2. حساب الهاش المشفر والتوقيع
    const invoiceHash = zatca.calculateInvoiceHash(xml);
    const digitalSignature = zatca.generateDigitalSignature(invoiceHash);

    // 3. توليد الـ QR Code
    const qrCode = zatca.generateZatcaPhase2QR({
      sellerName: tenant?.name_ar || branch?.name_ar,
      vatNumber: tenant?.vat_number || branch?.vat_number || '310984752000003',
      timestamp: `${issueDate}T${issueTime}Z`,
      totalAmount: grandTotal,
      vatAmount: vatTotal,
      invoiceHash,
      digitalSignature
    });

    let invoiceId;
    const createTransaction = db.transaction(() => {
      const insInv = db.prepare(`
        INSERT INTO sales_invoices (
          tenant_id, invoice_number, invoice_type, branch_id, warehouse_id, customer_id, cashier_id,
          issue_date, issue_time, payment_method, price_tier, subtotal, vat_total, grand_total, 
          zatca_status, zatca_uuid, zatca_hash, zatca_qr, zatca_xml, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      `);

      const info = insInv.run(
        tenantId,
        invoiceNumber,
        invoiceType,
        branch_id,
        warehouse_id,
        customer_id || null,
        cashier_id || null,
        issueDate,
        issueTime,
        paymentMethod,
        price_tier,
        subtotal,
        vatTotal,
        grandTotal,
        uuid,
        invoiceHash,
        qrCode,
        xml,
        notes
      );

      invoiceId = info.lastInsertRowid;

      const insItem = db.prepare(`
        INSERT INTO sales_invoice_items (invoice_id, product_id, item_name, quantity, unit_price, vat_rate, vat_amount, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of calculatedItems) {
        insItem.run(invoiceId, item.product_id, item.item_name, item.quantity, item.unit_price, item.vat_rate, item.vat_amount, item.line_total);

        // خصم المخزون اللحظي
        db.prepare('UPDATE inventory_levels SET quantity = quantity - ? WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?')
          .run(item.quantity, tenantId, item.product_id, warehouse_id);

        db.prepare(`
          INSERT INTO inventory_transactions (tenant_id, branch_id, warehouse_id, product_id, type, quantity, unit_cost, reference_id, notes)
          VALUES (?, ?, ?, ?, 'out', ?, ?, ?, ?)
        `).run(tenantId, branch_id, warehouse_id, item.product_id, -item.quantity, item.unit_price, invoiceNumber, `مبيعات كاشير ${invoiceNumber}`);
      }
    });

    createTransaction();

    // 4. توليد القيد المحاسبي آلياً
    const journalEntryNumber = accounting.recordSalesInvoiceJournal(invoiceId);

    res.json({
      success: true,
      invoiceId,
      invoiceNumber,
      zatcaQr: qrCode,
      journalEntryNumber,
      invoiceHash
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// إرسال الفاتورة لمنصة Fatoora
app.post('/api/invoices/:id/zatca-submit', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const invoice = db.prepare('SELECT * FROM sales_invoices WHERE id = ? AND tenant_id = ?').get(req.params.id, tenantId);
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    const submissionResult = await zatca.submitToZatcaPlatform({
      xml: invoice.zatca_xml,
      invoiceType: invoice.invoice_type,
      uuid: invoice.zatca_uuid,
      hash: invoice.zatca_hash
    });

    db.prepare('UPDATE sales_invoices SET zatca_status = ? WHERE id = ?').run(submissionResult.status, invoice.id);

    res.json({
      success: true,
      status: submissionResult.status,
      result: submissionResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. العملاء والموردين
// ==========================================

app.get('/api/contacts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.query;
    let query = 'SELECT * FROM contacts WHERE tenant_id = ?';
    const params = [tenantId];
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY name ASC';
    const contacts = db.prepare(query).all(...params);
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/contacts', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { type, name, phone, email, vat_number, cr_number, address } = req.body;
    const stmt = db.prepare(`
      INSERT INTO contacts (tenant_id, type, name, phone, email, vat_number, cr_number, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(tenantId, type, name, phone, email, vat_number, cr_number, address);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 12. التقارير المالية الفورية
// ==========================================

app.get('/api/reports/trial-balance', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const data = reports.getTrialBalance({ tenantId, ...req.query });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/profit-loss', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const data = reports.getProfitAndLoss({ tenantId, ...req.query });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/balance-sheet', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const data = reports.getBalanceSheet({ tenantId, ...req.query });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/contact-statement/:id', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const data = reports.getContactStatement(req.params.id, { tenantId, ...req.query });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/vat-return', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const data = reports.getVatReturnReport({ tenantId, ...req.query });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 13. إحصائيات لوحة التحكم للشركة
// ==========================================

app.get('/api/dashboard/summary', (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { branchId } = req.query;
    const pnl = reports.getProfitAndLoss({ tenantId, branchId });
    const vat = reports.getVatReturnReport({ tenantId, branchId });

    let cashQ = `
      SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as balance
      FROM accounts a
      JOIN journal_lines jl ON a.id = jl.account_id
      WHERE a.tenant_id = ? AND a.category = 'current_asset' AND (a.code LIKE '111%' OR a.code LIKE '112%')
    `;
    const cashP = [tenantId];
    if (branchId && branchId !== 'all') {
      cashQ += ' AND jl.branch_id = ?';
      cashP.push(branchId);
    }
    const cashRes = db.prepare(cashQ).get(...cashP);

    const branchCount = db.prepare('SELECT count(*) as cnt FROM branches WHERE tenant_id = ?').get(tenantId).cnt;
    const invoiceCount = db.prepare('SELECT count(*) as cnt FROM sales_invoices WHERE tenant_id = ?').get(tenantId).cnt;

    const recentJournals = db.prepare(`
      SELECT je.*, b.name_ar as branch_name 
      FROM journal_entries je
      LEFT JOIN branches b ON je.branch_id = b.id
      WHERE je.tenant_id = ?
      ORDER BY je.id DESC LIMIT 5
    `).all(tenantId);

    const lowStock = db.prepare(`
      SELECT p.name_ar, p.sku, il.quantity, il.min_alert_quantity, w.name_ar as warehouse_name, b.name_ar as branch_name
      FROM inventory_levels il
      JOIN products p ON il.product_id = p.id
      JOIN warehouses w ON il.warehouse_id = w.id
      JOIN branches b ON il.branch_id = b.id
      WHERE il.tenant_id = ? AND il.quantity <= il.min_alert_quantity
      LIMIT 5
    `).all(tenantId);

    res.json({
      success: true,
      data: {
        total_revenue: pnl.revenue.total,
        gross_profit: pnl.gross_profit,
        total_expenses: pnl.total_expenses,
        net_profit: pnl.net_profit,
        liquid_cash: Number(cashRes.balance.toFixed(2)),
        net_vat_due: vat.net_vat_due,
        branch_count: branchCount,
        invoice_count: invoiceCount,
        recent_journals: recentJournals,
        low_stock: lowStock
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// خدمة ملفات واجهة React المبنية
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
  next();
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 خادم منظومة الصويان السحابية يعمل على: http://localhost:${PORT}`);
  console.log(`🌿 منصة SaaS للمشاتل والزراعة - حساب المسؤول المطلق مفعل`);
  console.log(`====================================================`);
});
