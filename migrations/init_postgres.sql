-- ==========================================================
-- نظام الصويان ومخازن (Al-Suwayan Multi-Branch Cloud ERP)
-- PostgreSQL Production Schema
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. الفروع (Branches / Cost Centers)
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    cr_number VARCHAR(50),
    vat_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. المستودعات (Warehouses)
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. شجرة الحسابات (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    category VARCHAR(50) NOT NULL,
    parent_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    is_sub BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. جهات التعامل: العملاء والموردين (Contacts: Customers & Vendors)
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'vendor')),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    vat_number VARCHAR(50),
    cr_number VARCHAR(50),
    address TEXT,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. القيود اليومية (Journal Entries)
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    branch_id INT REFERENCES branches(id),
    reference_type VARCHAR(50),
    reference_id INT,
    narration TEXT,
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_by VARCHAR(100) DEFAULT 'النظام الآلي',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- سطور القيود (Journal Lines)
CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    entry_id INT REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INT REFERENCES accounts(id),
    branch_id INT REFERENCES branches(id),
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    description TEXT
);

-- 6. المنتجات والأصناف (Products)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'حبة',
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 4) DEFAULT 0.1500,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- أرصدة المخزون حسب المستودع والفرع (Inventory Levels)
CREATE TABLE IF NOT EXISTS inventory_levels (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INT REFERENCES warehouses(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    min_alert_quantity NUMERIC(15, 2) DEFAULT 5.00,
    UNIQUE(product_id, warehouse_id)
);

-- حركات المخزون (Inventory Transactions)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    branch_id INT REFERENCES branches(id),
    warehouse_id INT REFERENCES warehouses(id),
    product_id INT REFERENCES products(id),
    type VARCHAR(50) NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    reference_id VARCHAR(100),
    notes TEXT
);

-- 7. فواتير المبيعات (Sales Invoices & ZATCA 2)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'simplified_invoice',
    branch_id INT REFERENCES branches(id),
    warehouse_id INT REFERENCES warehouses(id),
    customer_id INT REFERENCES contacts(id),
    issue_date DATE NOT NULL,
    issue_time VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) DEFAULT 0.00,
    vat_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    zatca_status VARCHAR(50) DEFAULT 'draft',
    zatca_uuid VARCHAR(100),
    zatca_hash TEXT,
    zatca_qr TEXT,
    zatca_xml TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(15, 2) DEFAULT 0.00,
    vat_rate NUMERIC(5, 4) DEFAULT 0.1500,
    vat_amount NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL
);

-- 8. فواتير المشتريات (Purchase Invoices)
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    branch_id INT REFERENCES branches(id),
    warehouse_id INT REFERENCES warehouses(id),
    vendor_id INT REFERENCES contacts(id),
    invoice_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'credit',
    subtotal NUMERIC(15, 2) NOT NULL,
    vat_total NUMERIC(15, 2) NOT NULL,
    grand_total NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    vat_rate NUMERIC(5, 4) DEFAULT 0.1500,
    vat_amount NUMERIC(15, 2) NOT NULL,
    line_total NUMERIC(15, 2) NOT NULL
);

-- 9. المصروفات وتتبع الصرف (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(100) UNIQUE NOT NULL,
    branch_id INT REFERENCES branches(id),
    account_id INT REFERENCES accounts(id),
    expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN ('operating', 'admin', 'general')),
    amount NUMERIC(15, 2) NOT NULL,
    vat_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    paid_to VARCHAR(255),
    responsible_person VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    receipt_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
