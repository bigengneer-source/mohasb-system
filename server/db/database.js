const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../mohasb.db');
const db = new Database(dbPath);

// تمكين المفاتيح الأجنبية ونمط الكتابة السريع
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  const schema = `
    -- 1. جدول الشركات المشتركة (Multi-Tenant SaaS)
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'trial', -- trial, active, locked
      trial_ends_at TEXT,
      owner_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      cr_number TEXT,
      vat_number TEXT,
      enable_zatca INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. جدول المستخدمين والصلاحيات والكاشيرات
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE, -- NULL للمسؤول المطلق
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL, -- super_admin, tenant_owner, accountant, cashier
      branch_id INTEGER,
      is_active INTEGER DEFAULT 1,
      permissions TEXT, -- JSON: can_discount, max_discount, can_void, etc.
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. الفروع ومراكز التكلفة
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      cr_number TEXT,
      vat_number TEXT,
      address TEXT,
      city TEXT,
      phone TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. المستودعات والمشاتل
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. شجرة الحسابات المرنة
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
      category TEXT NOT NULL,
      parent_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      is_sub INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. جهات التعامل (عملاء وموردين)
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- customer, vendor
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      vat_number TEXT,
      cr_number TEXT,
      address TEXT,
      balance REAL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. دفتر القيود اليومية الآلية
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      entry_number TEXT NOT NULL,
      date TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      reference_type TEXT, -- sales, purchase, expense, salary, damage, annual_count, manual, transfer
      reference_id INTEGER,
      narration TEXT,
      total_debit REAL NOT NULL DEFAULT 0.00,
      total_credit REAL NOT NULL DEFAULT 0.00,
      created_by TEXT DEFAULT 'محرك القيود الآلي',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- سطور القيود
    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id),
      branch_id INTEGER REFERENCES branches(id),
      debit REAL NOT NULL DEFAULT 0.00,
      credit REAL NOT NULL DEFAULT 0.00,
      description TEXT
    );

    -- 8. الأصناف والمنتجات الزراعية والمشاتل
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      barcode TEXT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      category TEXT, -- شتلات زهور، أشجار مثمرة، أسمدة، شبكات ري، أدوات
      unit TEXT DEFAULT 'شتلة',
      cost_price REAL NOT NULL DEFAULT 0.00,
      retail_price REAL NOT NULL DEFAULT 0.00,
      wholesale_price REAL NOT NULL DEFAULT 0.00,
      selling_price REAL NOT NULL DEFAULT 0.00, -- Default selling price
      tax_rate REAL DEFAULT 0.15,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- أرصدة المخزون
    CREATE TABLE IF NOT EXISTS inventory_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
      branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 0.00,
      min_alert_quantity REAL DEFAULT 5.00,
      UNIQUE(product_id, warehouse_id)
    );

    -- حركات المخزون
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      branch_id INTEGER REFERENCES branches(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      product_id INTEGER REFERENCES products(id),
      type TEXT NOT NULL, -- in, out, transfer_in, transfer_out, damage, adjustment, annual_count
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      reference_id TEXT,
      notes TEXT
    );

    -- 9. جلسات الجرد السنوي لمطابقة الفعلي بالدفتري
    CREATE TABLE IF NOT EXISTS inventory_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      count_number TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      count_date TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'draft', -- draft, posted
      total_variance_qty REAL DEFAULT 0.00,
      total_variance_cost REAL DEFAULT 0.00,
      journal_entry_number TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- بنود الجرد السنوي
    CREATE TABLE IF NOT EXISTS inventory_count_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      count_id INTEGER REFERENCES inventory_counts(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      book_quantity REAL NOT NULL,
      actual_quantity REAL NOT NULL,
      variance_quantity REAL NOT NULL, -- actual - book
      unit_cost REAL NOT NULL,
      variance_cost REAL NOT NULL, -- variance_qty * unit_cost
      notes TEXT
    );

    -- 10. فواتير المبيعات ونقاط البيع (POS & ZATCA 2)
    CREATE TABLE IF NOT EXISTS sales_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      invoice_type TEXT NOT NULL DEFAULT 'simplified_invoice', -- tax_invoice, simplified_invoice
      branch_id INTEGER REFERENCES branches(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      customer_id INTEGER REFERENCES contacts(id),
      cashier_id INTEGER REFERENCES users(id),
      issue_date TEXT NOT NULL,
      issue_time TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash', -- cash, card, transfer, credit
      price_tier TEXT DEFAULT 'retail', -- retail (تجزئة) or wholesale (جملة)
      subtotal REAL NOT NULL DEFAULT 0.00,
      discount REAL DEFAULT 0.00,
      vat_total REAL NOT NULL DEFAULT 0.00,
      grand_total REAL NOT NULL DEFAULT 0.00,
      zatca_status TEXT DEFAULT 'draft', -- draft, reported, cleared, rejected
      zatca_uuid TEXT,
      zatca_hash TEXT,
      zatca_qr TEXT,
      zatca_xml TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES sales_invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0.00,
      vat_rate REAL DEFAULT 0.15,
      vat_amount REAL NOT NULL,
      line_total REAL NOT NULL
    );

    -- 11. فواتير المشتريات
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      vendor_id INTEGER REFERENCES contacts(id),
      invoice_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'credit',
      subtotal REAL NOT NULL,
      vat_total REAL NOT NULL,
      grand_total REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER REFERENCES purchase_invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      vat_rate REAL DEFAULT 0.15,
      vat_amount REAL NOT NULL,
      line_total REAL NOT NULL
    );

    -- 12. المصروفات وتتبع الصرف
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      expense_number TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      account_id INTEGER REFERENCES accounts(id),
      expense_type TEXT NOT NULL, -- operating, admin, general
      amount REAL NOT NULL,
      vat_amount REAL DEFAULT 0.00,
      total_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      paid_to TEXT,
      responsible_person TEXT NOT NULL,
      date TEXT NOT NULL,
      receipt_ref TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.exec(schema);
  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count > 0) return;

  // 1. زرع حساب المسؤول المطلق (Super Admin) الوحيد للنظام
  const insertUser = db.prepare(`
    INSERT INTO users (tenant_id, name, email, username, password, role, is_active, permissions)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insertUser.run(
    null, // لا يتبع شركة معينة بل يدير كل المنظومة
    'الحسن السعودي (المسؤول المطلق)',
    'elhassanelsoudy@gmail.com',
    'elhassanelsoudy@gmail.com',
    'hassan@2016',
    'super_admin',
    JSON.stringify({ all: true, super_admin: true })
  );

  // 2. زرع الشركة النموذجية الأولى (شركة ومشاتل الصويان الزراعية)
  const insertTenant = db.prepare(`
    INSERT INTO tenants (name_ar, name_en, code, status, trial_ends_at, owner_name, email, phone, cr_number, vat_number, enable_zatca)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = insertTenant.run(
    'شركة ومشاتل الصويان الزراعية',
    'Al-Suwayan Agricultural & Nurseries Co.',
    'AL-SUWAYAN',
    'active',
    '2030-12-31',
    'فهد الصويان',
    'owner@al-suwayan.sa',
    '0501234567',
    '1010892341',
    '310984752000003',
    1
  ).lastInsertRowid;

  // شركة ثانية تحت التجربة لاختبار إدارة المشتركين
  const t2 = insertTenant.run(
    'مؤسسة واحة النخيل للتنمية الزراعية',
    'Palm Oasis Agricultural Est.',
    'PALM-OASIS',
    'trial',
    '2026-09-30',
    'سلطان الغامدي',
    'sultan@palmoasis.sa',
    '0558889900',
    '4030554433',
    '310555777800003',
    0
  ).lastInsertRowid;

  // 3. حسابات مستخدمي الشركة 1 (مالك، محاسب، كاشيرات)
  insertUser.run(
    t1,
    'فهد الصويان (مالك المنشأة)',
    'owner@al-suwayan.sa',
    'fahad_owner',
    'hassan@2016',
    'tenant_owner',
    JSON.stringify({ can_edit_settings: true, can_view_reports: true, can_manage_pos: true })
  );

  // كاشير 1 (صالة عرض الرياض)
  const cashier1Id = insertUser.run(
    t1,
    'محمد الشمري (كاشير صالة الرياض)',
    'cashier1@al-suwayan.sa',
    'cashier1',
    'hassan@2016',
    'cashier',
    JSON.stringify({ can_discount: true, max_discount: 10, can_void: false })
  ).lastInsertRowid;

  // كاشير 2 (مشتل جدة)
  insertUser.run(
    t1,
    'سالم الحربي (كاشير مشتل جدة)',
    'cashier2@al-suwayan.sa',
    'cashier2',
    'hassan@2016',
    'cashier',
    JSON.stringify({ can_discount: true, max_discount: 5, can_void: false })
  );

  // 4. الفروع والمستودعات للشركة 1
  const insertBranch = db.prepare(`
    INSERT INTO branches (tenant_id, code, name_ar, name_en, cr_number, vat_number, address, city, phone, email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const b1 = insertBranch.run(t1, 'BR-101', 'مشتل وصالة الرياض الرئيسية', 'Riyadh Main Nursery', '1010892341', '310984752000003', 'طريق الملك فهد، العليا', 'الرياض', '0112345678', 'riyadh@al-suwayan.sa').lastInsertRowid;
  const b2 = insertBranch.run(t1, 'BR-102', 'مشتل جدة الإقليمي', 'Jeddah Regional Nursery', '4030789123', '310984752000003', 'طريق مكة القديم، كيلو 14', 'جدة', '0129876543', 'jeddah@al-suwayan.sa').lastInsertRowid;
  const b3 = insertBranch.run(t1, 'BR-103', 'مشتل الدمام والشرقية', 'Dammam Nursery', '2050123456', '310984752000003', 'طريق أبو حدرية، سيهات', 'الدمام', '0138765432', 'dammam@al-suwayan.sa').lastInsertRowid;

  // ربط الكاشير 1 بفرع الرياض
  db.prepare('UPDATE users SET branch_id = ? WHERE id = ?').run(b1, cashier1Id);

  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (tenant_id, branch_id, code, name_ar, address)
    VALUES (?, ?, ?, ?, ?)
  `);

  const w1 = insertWarehouse.run(t1, b1, 'WH-RYD-01', 'مستودع المشتل المركزي - الرياض', 'طريق صلبوخ، الرياض').lastInsertRowid;
  const w2 = insertWarehouse.run(t1, b1, 'WH-RYD-02', 'مستودع صالة البيع السريع - العليا', 'صالة العرض').lastInsertRowid;
  const w3 = insertWarehouse.run(t1, b2, 'WH-JED-01', 'مستودع مشتل جدة', 'طريق مكة القديم').lastInsertRowid;
  const w4 = insertWarehouse.run(t1, b3, 'WH-DMM-01', 'مستودع مشتل الدمام', 'سيهات').lastInsertRowid;

  // 5. شجرة الحسابات للشركة 1
  const insertAccount = db.prepare(`
    INSERT INTO accounts (tenant_id, code, name_ar, name_en, type, category, parent_id, is_sub)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // الأصول
  const a1 = insertAccount.run(t1, '1', 'الأصول', 'Assets', 'asset', 'root', null, 0).lastInsertRowid;
  const a11 = insertAccount.run(t1, '11', 'الأصول المتداولة', 'Current Assets', 'asset', 'current_asset', a1, 0).lastInsertRowid;
  const a111 = insertAccount.run(t1, '111', 'النقد وما في حكمه (صناديق الكاشير)', 'Cash and Cash Equivalents', 'asset', 'current_asset', a11, 0).lastInsertRowid;
  insertAccount.run(t1, '1111', 'صندوق كاشير صالة الرياض', 'Riyadh POS Cash', 'asset', 'current_asset', a111, 1);
  insertAccount.run(t1, '1112', 'صندوق كاشير مشتل جدة', 'Jeddah POS Cash', 'asset', 'current_asset', a111, 1);
  insertAccount.run(t1, '1113', 'صندوق كاشير مشتل الدمام', 'Dammam POS Cash', 'asset', 'current_asset', a111, 1);

  const a112 = insertAccount.run(t1, '112', 'البنوك والشبكات (مدى)', 'Banks & POS Terminals', 'asset', 'current_asset', a11, 0).lastInsertRowid;
  insertAccount.run(t1, '1121', 'مصرف الراجحي - شبكات نقاط البيع', 'Al Rajhi POS Bank', 'asset', 'current_asset', a112, 1);
  insertAccount.run(t1, '1122', 'البنك الأهلي السعودي - الحساب الجاري', 'SNB Current Account', 'asset', 'current_asset', a112, 1);

  const a113 = insertAccount.run(t1, '113', 'المدينون والعملاء (حسابات القبض)', 'Accounts Receivable', 'asset', 'current_asset', a11, 1).lastInsertRowid;

  const a114 = insertAccount.run(t1, '114', 'المخزون السلعي والنباتي', 'Nursery & Goods Inventory', 'asset', 'current_asset', a11, 0).lastInsertRowid;
  insertAccount.run(t1, '1141', 'مخزون شتلات ومزروعات الرياض', 'Riyadh Nursery Stock', 'asset', 'current_asset', a114, 1);
  insertAccount.run(t1, '1142', 'مخزون مشتل جدة', 'Jeddah Nursery Stock', 'asset', 'current_asset', a114, 1);
  insertAccount.run(t1, '1143', 'مخزون مشتل الدمام', 'Dammam Nursery Stock', 'asset', 'current_asset', a114, 1);

  insertAccount.run(t1, '115', 'ضريبة القيمة المضافة المدخلات (المشتريات)', 'Input VAT', 'asset', 'current_asset', a11, 1);

  const a12 = insertAccount.run(t1, '12', 'الأصول غير المتداولة (الثابتة)', 'Fixed Assets', 'asset', 'fixed_asset', a1, 0).lastInsertRowid;
  insertAccount.run(t1, '121', 'البيوت المحمية وشبكات الري الزراعية', 'Greenhouses & Irrigation Systems', 'asset', 'fixed_asset', a12, 1);
  insertAccount.run(t1, '122', 'شاحنات نقل وتوزيع المزروعات', 'Nursery Trucks', 'asset', 'fixed_asset', a12, 1);

  // الخصوم
  const a2 = insertAccount.run(t1, '2', 'الخصوم والالتزامات', 'Liabilities', 'liability', 'root', null, 0).lastInsertRowid;
  const a21 = insertAccount.run(t1, '21', 'الخصوم المتداولة', 'Current Liabilities', 'liability', 'current_liability', a2, 0).lastInsertRowid;
  insertAccount.run(t1, '211', 'الدائنون والموردون (موردي الشتلات والأسمدة)', 'Accounts Payable', 'liability', 'current_liability', a21, 1);
  insertAccount.run(t1, '212', 'ضريبة القيمة المضافة المخرجات (المبيعات)', 'Output VAT', 'liability', 'current_liability', a21, 1);
  insertAccount.run(t1, '213', 'مستحقات رواتب عمال المشاتل', 'Accrued Wages', 'liability', 'current_liability', a21, 1);

  // حقوق الملكية
  const a3 = insertAccount.run(t1, '3', 'حقوق الملكية', 'Equity', 'equity', 'root', null, 0).lastInsertRowid;
  insertAccount.run(t1, '31', 'رأس المال المدفوع للمشتل', 'Paid-in Capital', 'equity', 'equity', a3, 1);
  insertAccount.run(t1, '32', 'الأرباح المحتجزة / المبقاة', 'Retained Earnings', 'equity', 'equity', a3, 1);

  // الإيرادات
  const a4 = insertAccount.run(t1, '4', 'الإيرادات', 'Revenue', 'revenue', 'root', null, 0).lastInsertRowid;
  const a41 = insertAccount.run(t1, '41', 'إيرادات المبيعات الزراعية', 'Agricultural Sales Revenue', 'revenue', 'operating_revenue', a4, 0).lastInsertRowid;
  insertAccount.run(t1, '4101', 'مبيعات كاشير صالة الرياض', 'Sales Riyadh POS', 'revenue', 'operating_revenue', a41, 1);
  insertAccount.run(t1, '4102', 'مبيعات كاشير مشتل جدة', 'Sales Jeddah POS', 'revenue', 'operating_revenue', a41, 1);
  insertAccount.run(t1, '4103', 'مبيعات كاشير مشتل الدمام', 'Sales Dammam POS', 'revenue', 'operating_revenue', a41, 1);
  insertAccount.run(t1, '42', 'مردودات مبيعات الشتلات', 'Plant Sales Returns', 'revenue', 'operating_revenue', a4, 1);

  // المصروفات
  const a5 = insertAccount.run(t1, '5', 'المصروفات', 'Expenses', 'expense', 'root', null, 0).lastInsertRowid;
  insertAccount.run(t1, '51', 'تكلفة البضاعة والشتلات المباعة (COGS)', 'Cost of Plants Sold', 'expense', 'cogs', a5, 1);
  
  const a52 = insertAccount.run(t1, '52', 'المصروفات التشغيلية للمشاتل', 'Nursery Operating Expenses', 'expense', 'operating_expense', a5, 0).lastInsertRowid;
  insertAccount.run(t1, '5201', 'إيجارات أراضي المشاتل والمستودعات', 'Land & Greenhouse Rent', 'expense', 'operating_expense', a52, 1);
  insertAccount.run(t1, '5202', 'مياه ري الآبار والكهرباء الزراعية', 'Irrigation Water & Power', 'expense', 'operating_expense', a52, 1);
  insertAccount.run(t1, '5203', 'مبيدات حشرية وفطرية ووقاية نبات', 'Pesticides & Plant Care', 'expense', 'operating_expense', a52, 1);

  const a53 = insertAccount.run(t1, '53', 'المصروفات الإدارية والعمومية', 'General & Admin Expenses', 'expense', 'admin_expense', a5, 0).lastInsertRowid;
  insertAccount.run(t1, '5301', 'رواتب المهندسين الزراعيين والعمال', 'Salaries & Labor Wages', 'expense', 'admin_expense', a53, 1);
  insertAccount.run(t1, '5302', 'الاستضافة السحابية وتراخيص النظام', 'Cloud SaaS Subscription', 'expense', 'admin_expense', a53, 1);
  insertAccount.run(t1, '54', 'توالف وموت الشتلات (عجز المخزون)', 'Plant Spoilage & Shrinkage Loss', 'expense', 'operating_expense', a5, 1);
  insertAccount.run(t1, '55', 'فروقات وفائض الجرد السنوي', 'Annual Inventory Reconciliation Variance', 'revenue', 'operating_revenue', a4, 1);

  // 6. عملاء وموردين للمشتل
  const insertContact = db.prepare(`
    INSERT INTO contacts (tenant_id, type, name, phone, email, vat_number, cr_number, address, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertContact.run(t1, 'customer', 'مؤسسة الحدائق الخضراء للمقاولات', '0501112233', 'info@green-gardens.sa', '310123456700003', '1010567890', 'حي النخيل، الرياض', 18500.00);
  insertContact.run(t1, 'customer', 'شركة روابي نجد للتشجير', '0554445566', 'sales@rawabi-najd.sa', '310987654300003', '1010678901', 'طريق التخصصي، الرياض', 12300.00);
  insertContact.run(t1, 'customer', 'عميل نقدي تجزئة (POS)', '0590000000', null, null, null, 'مبيعات الكاشير المباشرة', 0.00);

  insertContact.run(t1, 'vendor', 'شركة البذور والأسمدة الهولندية الحديثة', '0114567890', 'orders@seeds-fertilizer.sa', '310222333400003', '1010345678', 'المدينة الصناعية الثانية', -45000.00);
  insertContact.run(t1, 'vendor', 'مزارع أصول الجنوب لإنتاج الشتلات', '0126789012', 'sales@south-plants.sa', '310555666700003', '4030234567', 'جازان - بيش', -28000.00);

  // 7. الأصناف الزراعية المتخصصة للمشاتل (تكويد كامل مع أسعار الجملة والتجزئة)
  const insertProduct = db.prepare(`
    INSERT INTO products (tenant_id, sku, barcode, name_ar, name_en, category, unit, cost_price, retail_price, wholesale_price, selling_price, tax_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.15)
  `);

  const p1 = insertProduct.run(t1, 'PLANT-101', '6282001001', 'شتلة بتونيا هولندية مزهرة ألوان مشكلة', 'Dutch Petunia Seedling Flower', 'شتلات زهور', 'شتلة', 3.50, 8.00, 5.50, 8.00).lastInsertRowid;
  const p2 = insertProduct.run(t1, 'PLANT-102', '6282001002', 'شتلة ياسمين عراقي عطري متسلق أصيص 25 سم', 'Climbing Fragrant Jasmine Plant', 'نباتات متسلقة', 'شتلة', 15.00, 35.00, 25.00, 35.00).lastInsertRowid;
  const p3 = insertProduct.run(t1, 'PLANT-103', '6282001003', 'شتلة زيتون إسباني مروي نخب أول طول مترين', 'Spanish Olive Tree Seedling 2m', 'أشجار مثمرة', 'شجرة', 120.00, 250.00, 190.00, 250.00).lastInsertRowid;
  const p4 = insertProduct.run(t1, 'PLANT-104', '6282001004', 'شتلة لافندر فرنسي عطري طارد للحشرات', 'French Lavender Herb Plant', 'نباتات عطرية', 'شتلة', 8.00, 18.00, 12.00, 18.00).lastInsertRowid;
  const p5 = insertProduct.run(t1, 'FERT-201', '6282002001', 'سماد داب مركب نتروجين/فوسفات 18-46-0 كيس 50 كجم', 'DAP Compound Fertilizer 18-46-0 50kg', 'أسمدة ومخصبات', 'كيس', 140.00, 220.00, 180.00, 220.00).lastInsertRowid;
  const p6 = insertProduct.run(t1, 'SOIL-301', '6282003001', 'بيتموس عضوي مخصب نخب أول بالة 300 لتر', 'Organic Peat Moss Bale 300L', 'تربة زراعية', 'بالة', 65.00, 110.00, 85.00, 110.00).lastInsertRowid;
  const p7 = insertProduct.run(t1, 'IRR-401', '6282004001', 'لفة لي تنقيط زراعي GR مقاس 16 مم طول 400 متر', 'GR Drip Irrigation Pipe 16mm 400m', 'شبكات ري', 'لفة', 110.00, 175.00, 145.00, 175.00).lastInsertRowid;
  const p8 = insertProduct.run(t1, 'TOOL-501', '6282005001', 'مقص تقليم وتطعيم أشجار فولاذي ياباني أصلي Pro', 'Professional Japanese Pruning Shears', 'أدوات زراعية', 'قطعة', 45.00, 85.00, 65.00, 85.00).lastInsertRowid;

  // إيداع كميات المخزون في مستودعات ومشتل الرياض وجدة والدمام
  const insertInv = db.prepare(`
    INSERT INTO inventory_levels (tenant_id, product_id, warehouse_id, branch_id, quantity, min_alert_quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertInv.run(t1, p1, w1, b1, 650, 50);
  insertInv.run(t1, p1, w2, b1, 120, 20);
  insertInv.run(t1, p1, w3, b2, 350, 40);

  insertInv.run(t1, p2, w1, b1, 280, 30);
  insertInv.run(t1, p2, w2, b1, 60, 15);
  insertInv.run(t1, p2, w3, b2, 140, 20);

  insertInv.run(t1, p3, w1, b1, 95, 10);
  insertInv.run(t1, p3, w3, b2, 45, 5);
  insertInv.run(t1, p3, w4, b3, 30, 5);

  insertInv.run(t1, p4, w1, b1, 400, 40);
  insertInv.run(t1, p4, w2, b1, 90, 15);

  insertInv.run(t1, p5, w1, b1, 150, 25);
  insertInv.run(t1, p5, w3, b2, 60, 15);

  insertInv.run(t1, p6, w1, b1, 180, 20);
  insertInv.run(t1, p6, w2, b1, 40, 10);

  insertInv.run(t1, p7, w1, b1, 85, 10);
  insertInv.run(t1, p8, w2, b1, 45, 8);

  // 8. قيود افتتاحية موزونة للمشتل
  const insertJE = db.prepare(`
    INSERT INTO journal_entries (tenant_id, entry_number, date, branch_id, reference_type, narration, total_debit, total_credit, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJL = db.prepare(`
    INSERT INTO journal_lines (tenant_id, entry_id, account_id, branch_id, debit, credit, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const je1 = insertJE.run(t1, 'JE-2026-0001', '2026-01-01', b1, 'manual', 'إثبات رأس المال التأسيسي للمشتل وتغذية الصناديق والبنوك', 600000.00, 600000.00, 'المدير المالي').lastInsertRowid;
  
  const accRajhi = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '1121'").get(t1).id;
  const accCash1 = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '1111'").get(t1).id;
  const accCash2 = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '1112'").get(t1).id;
  const accCapital = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND code = '31'").get(t1).id;

  insertJL.run(t1, je1, accRajhi, b1, 450000.00, 0.00, 'إيداع بنكي - مصرف الراجحي');
  insertJL.run(t1, je1, accCash1, b1, 75000.00, 0.00, 'تغذية صندوق كاشير صالة الرياض');
  insertJL.run(t1, je1, accCash2, b2, 75000.00, 0.00, 'تغذية صندوق كاشير مشتل جدة');
  insertJL.run(t1, je1, accCapital, b1, 0.00, 600000.00, 'رأس مال مشاتل الصويان المصرح به');
}

initDatabase();

module.exports = { db, initDatabase };
