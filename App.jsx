import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CashierPosView from './components/CashierPosView';
import AnnualInventoryCountView from './components/AnnualInventoryCountView';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ChartOfAccountsView from './components/ChartOfAccountsView';
import JournalAndExpensesView from './components/JournalAndExpensesView';
import ZatcaInvoicingView from './components/ZatcaInvoicingView';
import InventoryView from './components/InventoryView';
import FinancialReportsView from './components/FinancialReportsView';
import { 
  NewInvoiceModal, 
  NewExpenseModal, 
  StockTransferModal, 
  StockDamageModal 
} from './components/Modals';
import { CheckCircle2, X } from 'lucide-react';
import { t } from './i18n';
import { safeFetch } from './api/client';

export default function App() {
  // Auth & Tenant States
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('suwayan_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [currentTenant, setCurrentTenant] = useState(() => {
    try {
      const saved = localStorage.getItem('suwayan_tenant');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('suwayan_lang') || 'ar');
  const [theme, setTheme] = useState(() => localStorage.getItem('suwayan_theme') || 'light');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCashier = currentUser?.role === 'cashier';

  // Navigation state
  const [activeTab, setActiveTab] = useState(() => {
    if (currentUser?.role === 'cashier') return 'cashier_pos';
    if (currentUser?.role === 'super_admin') return 'super_admin';
    return 'dashboard';
  });

  const [selectedBranch, setSelectedBranch] = useState('all');

  // Core Data states
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [summary, setSummary] = useState(null);

  // Modal triggers
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);

  // Success Notification
  const [notification, setNotification] = useState(null);

  const showSuccessToast = (title, message) => {
    setNotification({ title, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Language management
  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('suwayan_lang', nextLang);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Theme management
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('suwayan_theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth Handlers
  const handleLoginSuccess = (loginData, possibleTenant, possibleSuper) => {
    let user = loginData;
    let tenant = possibleTenant || null;
    let isSuper = possibleSuper;

    if (loginData && typeof loginData === 'object' && loginData.user) {
      user = loginData.user;
      tenant = loginData.tenant || null;
      isSuper = loginData.isSuperAdmin || (user?.role === 'super_admin');
    } else if (user?.role === 'super_admin') {
      isSuper = true;
    }

    setCurrentUser(user);
    setCurrentTenant(tenant);
    setIsImpersonating(false);

    localStorage.setItem('suwayan_user', JSON.stringify(user));
    if (tenant) {
      localStorage.setItem('suwayan_tenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('suwayan_tenant');
    }

    if (isSuper) {
      setActiveTab('super_admin');
    } else if (user?.role === 'cashier') {
      setActiveTab('cashier_pos');
    } else {
      setActiveTab('dashboard');
    }

    showSuccessToast(
      'تم تسجيل الدخول بنجاح!',
      `مرحباً بك، ${user?.name} في منظومة الصويان السحابية.`
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTenant(null);
    setIsImpersonating(false);
    localStorage.removeItem('suwayan_user');
    localStorage.removeItem('suwayan_tenant');
    setActiveTab('dashboard');
  };

  const handleImpersonateTenant = (tenant) => {
    setCurrentTenant(tenant);
    setIsImpersonating(true);
    setActiveTab('dashboard');
    showSuccessToast(
      'تم دخول حساب المشترك!',
      `أنت تتصفح الآن حساب: ${tenant.company_name_ar}`
    );
  };

  const handleStopImpersonating = () => {
    setCurrentTenant(null);
    setIsImpersonating(false);
    setActiveTab('super_admin');
    showSuccessToast(
      'تم إنهاء وضع الانتحال',
      'تمت العودة إلى لوحة تحكم المسؤول المطلق.'
    );
  };

  // Helper fetch with tenant header and fail-safe JSON parsing
  const apiFetch = async (url, options = {}) => {
    const tenantId = currentTenant?.id || (currentUser?.tenant_id || 1);
    return safeFetch(url, { ...options, tenantId });
  };

  // Data fetching functions
  const fetchBranches = async () => {
    try {
      const data = await apiFetch('/api/branches');
      if (data && data.success) setBranches(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchAccounts = async () => {
    try {
      const data = await apiFetch('/api/accounts');
      if (data && data.success) setAccounts(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchProducts = async () => {
    try {
      const branchParam = selectedBranch !== 'all' ? `?branchId=${selectedBranch}` : '';
      const data = await apiFetch(`/api/products${branchParam}`);
      if (data && data.success) setProducts(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchJournalEntries = async () => {
    try {
      const branchParam = selectedBranch !== 'all' ? `?branchId=${selectedBranch}` : '';
      const data = await apiFetch(`/api/journal-entries${branchParam}`);
      if (data && data.success) setJournalEntries(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchExpenses = async () => {
    try {
      const branchParam = selectedBranch !== 'all' ? `?branchId=${selectedBranch}` : '';
      const data = await apiFetch(`/api/expenses${branchParam}`);
      if (data && data.success) setExpenses(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchInvoices = async () => {
    try {
      const branchParam = selectedBranch !== 'all' ? `?branchId=${selectedBranch}` : '';
      const data = await apiFetch(`/api/invoices${branchParam}`);
      if (data && data.success) setInvoices(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchContacts = async () => {
    try {
      const data = await apiFetch('/api/contacts');
      if (data && data.success) setContacts(data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchSummary = async () => {
    try {
      const branchParam = selectedBranch !== 'all' ? `?branchId=${selectedBranch}` : '';
      const data = await apiFetch(`/api/dashboard/summary${branchParam}`);
      if (data && data.success) setSummary(data.data || null);
    } catch (e) { console.error(e); }
  };

  const refreshAll = () => {
    if (!currentUser) return;
    fetchBranches();
    fetchAccounts();
    fetchProducts();
    fetchJournalEntries();
    fetchExpenses();
    fetchInvoices();
    fetchContacts();
    fetchSummary();
  };

  useEffect(() => {
    if (currentUser) {
      refreshAll();
    }
  }, [selectedBranch, currentTenant, currentUser]);

  // If not logged in, display the Emerald Landing Page
  if (!currentUser) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        currentTenant={currentTenant}
        isSuperAdmin={isSuperAdmin}
        isImpersonating={isImpersonating}
        onStopImpersonating={handleStopImpersonating}
        onLogout={handleLogout}
        lang={lang}
      />

      {/* Main Container */}
      <div className="main-content">
        {/* Header Bar */}
        <Header 
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          onOpenNewInvoice={() => setShowInvoiceModal(true)}
          onOpenNewExpense={() => setShowExpenseModal(true)}
          onOpenTransfer={() => setShowTransferModal(true)}
          onOpenPos={() => setActiveTab('cashier_pos')}
          currentTenant={currentTenant}
          currentUser={currentUser}
          products={products}
          lang={lang}
          onToggleLang={toggleLanguage}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Dynamic Content Body */}
        <main className="content-body">
          {/* Notification Toast */}
          {notification && (
            <div style={{
              background: '#047857',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.25)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={20} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{notification.title}</div>
                  <div style={{ fontSize: '0.825rem', color: '#d1fae5' }}>{notification.message}</div>
                </div>
              </div>
              <button 
                onClick={() => setNotification(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Super Admin Dashboard */}
          {activeTab === 'super_admin' && isSuperAdmin && (
            <SuperAdminDashboard 
              currentUser={currentUser}
              onImpersonateTenant={handleImpersonateTenant}
            />
          )}

          {/* Cashier Quick POS */}
          {activeTab === 'cashier_pos' && (
            <CashierPosView 
              currentTenant={currentTenant}
              currentUser={currentUser}
              branches={branches}
              products={products}
              contacts={contacts}
              onSaleCompleted={refreshAll}
              onSaleSuccess={refreshAll}
            />
          )}

          {/* Annual Inventory Count & Variance Audit */}
          {activeTab === 'annual_count' && (
            <AnnualInventoryCountView 
              branches={branches}
              selectedBranch={selectedBranch}
              onReconciliationComplete={refreshAll}
            />
          )}

          {/* Executive Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              summary={summary}
              branches={branches}
              onViewJournalDetails={() => setActiveTab('journals')}
              onSwitchTab={setActiveTab}
            />
          )}

          {/* Chart of Accounts & Tree */}
          {activeTab === 'accounts' && (
            <ChartOfAccountsView 
              accounts={accounts}
              branches={branches}
              onRefreshAccounts={fetchAccounts}
              onRefreshBranches={fetchBranches}
            />
          )}

          {/* Journals & Expenses */}
          {activeTab === 'journals' && (
            <JournalAndExpensesView 
              journalEntries={journalEntries}
              expenses={expenses}
              branches={branches}
              accounts={accounts}
              selectedBranch={selectedBranch}
              onRefreshJournals={fetchJournalEntries}
              onRefreshExpenses={fetchExpenses}
              onOpenNewExpense={() => setShowExpenseModal(true)}
            />
          )}

          {/* ZATCA Phase 2 Invoicing */}
          {activeTab === 'zatca' && (
            <ZatcaInvoicingView 
              invoices={invoices}
              branches={branches}
              selectedBranch={selectedBranch}
              onRefreshInvoices={() => { fetchInvoices(); fetchJournalEntries(); fetchSummary(); }}
              onOpenNewInvoice={() => setShowInvoiceModal(true)}
            />
          )}

          {/* Agricultural Inventory & Warehouses */}
          {activeTab === 'inventory' && (
            <InventoryView 
              products={products}
              branches={branches}
              selectedBranch={selectedBranch}
              onRefreshProducts={() => { fetchProducts(); fetchSummary(); }}
              onOpenTransfer={() => setShowTransferModal(true)}
              onOpenDamage={() => setShowDamageModal(true)}
            />
          )}

          {/* Financial Statements & Reports */}
          {activeTab === 'reports' && (
            <FinancialReportsView 
              branches={branches}
              selectedBranch={selectedBranch}
            />
          )}
        </main>
      </div>

      {/* Global Interactive Modals */}
      {showInvoiceModal && (
        <NewInvoiceModal 
          branches={branches}
          products={products}
          contacts={contacts}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={(res) => {
            refreshAll();
            showSuccessToast(
              `تم إصدار الفاتورة ${res.invoiceNumber} بنجاح!`,
              `تم توليد القيد المحاسبي الآلي رقم (${res.journalEntryNumber}) وتشفير كود المرحلة الثانية ZATCA.`
            );
          }}
        />
      )}

      {showExpenseModal && (
        <NewExpenseModal 
          branches={branches}
          accounts={accounts}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={(res) => {
            refreshAll();
            showSuccessToast(
              `تم حفظ سند المصروف ${res.expenseNumber} بنجاح!`,
              `تم توليد قيد اليومية الآلي رقم (${res.journalEntryNumber}) وربطه بمركز تكلفة الفرع.`
            );
          }}
        />
      )}

      {showTransferModal && (
        <StockTransferModal 
          branches={branches}
          products={products}
          onClose={() => setShowTransferModal(false)}
          onSuccess={(res) => {
            refreshAll();
            showSuccessToast(
              'تمت مناقلة المخزون بنجاح!',
              `تم قيد المناقلة آلياً برقم (${res.data.entryNumber}) بقيمة إجمالية ${res.data.totalCost} ر.س.`
            );
          }}
        />
      )}

      {showDamageModal && (
        <StockDamageModal 
          branches={branches}
          products={products}
          onClose={() => setShowDamageModal(false)}
          onSuccess={(res) => {
            refreshAll();
            showSuccessToast(
              'تم إثبات التالف المخزني بنجاح!',
              `تم خفض رصيد الصنف وتسجيل قيد خسائر التالف الآلي برقم (${res.data.entryNumber}).`
            );
          }}
        />
      )}
    </div>
  );
}
