import React, { useState } from 'react';
import { 
  Sprout, 
  ShieldCheck, 
  Store, 
  GitFork, 
  FileSpreadsheet, 
  Boxes, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  UserPlus, 
  LogIn, 
  Globe, 
  Sparkles,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { translations } from '../i18n';

export default function LandingPage({ onLoginSuccess, lang, setLang }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register Form
  const [regForm, setRegForm] = useState({
    company_name_ar: '',
    company_name_en: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    cr_number: '',
    vat_number: '',
    city: 'الرياض',
    trial_days: 30
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const t = translations[lang] || translations.ar;

  // تسجيل الدخول
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setShowLoginModal(false);
        onLoginSuccess(data);
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError('خطأ في الاتصال بالخادم: ' + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // تسجيل حساب شركة جديد
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowRegisterModal(false);
        // تسجيل الدخول تلقائياً
        onLoginSuccess({
          user: data.user,
          tenant: data.tenant,
          isSuperAdmin: false
        });
      } else {
        setRegError(data.error);
      }
    } catch (err) {
      setRegError('خطأ في الاتصال: ' + err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // أزرار التعبئة السريعة لتسهيل التجربة للمستخدم
  const prefillSuperAdmin = () => {
    setLoginIdentifier('elhassanelsoudy@gmail.com');
    setLoginPassword('hassan@2016');
  };

  const prefillTenantOwner = () => {
    setLoginIdentifier('owner@al-suwayan.sa');
    setLoginPassword('hassan@2016');
  };

  const prefillCashier = () => {
    setLoginIdentifier('cashier1');
    setLoginPassword('hassan@2016');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Top Navbar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(4, 120, 87, 0.35)'
          }}>
            <Sprout size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#064e3b', letterSpacing: '-0.3px', margin: 0 }}>
              {t.system_title}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              {t.system_subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.825rem',
              color: '#334155'
            }}
          >
            <Globe size={15} />
            <span>{t.switch_lang}</span>
          </button>

          {/* Login Button */}
          <button
            onClick={() => { setShowLoginModal(true); setLoginError(''); }}
            className="btn btn-secondary"
            style={{ fontWeight: 700, padding: '0.6rem 1.25rem' }}
          >
            <LogIn size={16} />
            <span>{t.login}</span>
          </button>

          {/* Register Button */}
          <button
            onClick={() => { setShowRegisterModal(true); setRegError(''); }}
            className="btn btn-primary"
            style={{ fontWeight: 800, padding: '0.6rem 1.35rem', background: '#047857' }}
          >
            <UserPlus size={16} />
            <span>{t.register}</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'radial-gradient(circle at top right, #064e3b 0%, #047857 40%, #0f172a 100%)',
        color: '#ffffff',
        padding: '5rem 2.5rem 6rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '950px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.25)',
            border: '1px solid rgba(110, 231, 183, 0.4)',
            color: '#a7f3d0',
            fontSize: '0.85rem',
            fontWeight: 800,
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={16} />
            <span>منصة سحابية متكاملة للمشاتل والمزارع والشركات الزراعية</span>
          </div>

          <h2 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.25, marginBottom: '1.25rem', letterSpacing: '-0.5px' }}>
            إدارة محاسبية ومخزنية ذكية لمشاتلك وفروعك من أي مكان
          </h2>

          <p style={{ fontSize: '1.15rem', color: '#cbd5e1', lineHeight: 1.7, maxWidth: '750px', margin: '0 auto 2.5rem' }}>
            نظام متكامل يجمع بين تكويد أصناف الشتلات والأشجار والأسمدة، نقاط البيع السريعة للكاشيرات مع خصم المخزون اللحظي، شجرة حسابات مرنة، الجرد السنوي الآلي، والربط والامتثال المعتمد مع هيئة الزكاة والضريبة والجمارك (ZATCA 2).
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowRegisterModal(true); setRegError(''); }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.9rem 2.25rem',
                borderRadius: '12px',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>ابدأ تجربتك المجانية للشركات الآن</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => { setShowLoginModal(true); setLoginError(''); }}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '0.9rem 2rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              تسجيل الدخول للمنظومة
            </button>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section style={{ padding: '4.5rem 2.5rem', maxWidth: '1350px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#064e3b', marginBottom: '0.75rem' }}>
            حلول برمجية متخصصة صُممت لقطاع المشاتل والتجارة الزراعية
          </h3>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '650px', margin: '0 auto' }}>
            بنية معمارية سحابية تتيح عزل بيانات كل شركة مع الحفاظ على مرونة الربط والتحكم المحاسبي المركزي.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Feature 1 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #047857' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Store size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              نقاط بيع سريعة للكاشيرات (Fast POS)
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              لوحة لمسية مخصصة للكاشير، تدعم شتلات الزهور والأشجار والأسمدة، التبديل بين أسعار التجزئة والجملة، الخصم اللحظي من المستودع، وإصدار الفواتير فوراً.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #10b981' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Boxes size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              الجرد السنوي التلقائي للمشاتل
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              مطابقة الكميات الدفترية مع الكميات الفعلية المحصورة في المشتل، حساب فروقات العجز والتوالف أو الفائض، وتوليد قيود التسوية المحاسبية تلقائياً.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #0284c7' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <GitFork size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              شجرة حسابات ومحرك قيود آلي
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              توليد القيود المزدوجة فوراً بدون تدخل بشري عند كل عملية بيع كاشير أو شراء أو مصروف، مع ربط كل حركة بمركز تكلفة الفرع والمستودع.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #d97706' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShieldCheck size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              الربط والتكامل ZATCA 2
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              توليد ملفات XML UBL 2.1 ورمز الاستجابة السريع المشفر TLV والتوقيع الرقمي مع خيار التفعيل الاختياري لكل شركة مشتركة.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #9333ea' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Building2 size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              منصة سحابية متعددة الشركات (Multi-Tenancy)
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              عزل تام لبيانات كل شركة مشتركة، مع تحكم مطلق للمسؤول في تحديد الفترات التجريبية وتفعيل أو قفل اشتراكات الشركات.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid #be123c' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ffe4e6', color: '#be123c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FileSpreadsheet size={26} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              القوائم والتقارير المالية الفورية
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              ميزان مراجعة متطابق 100%، قائمة الدخل (P&L)، الميزانية العمومية، كشوف حسابات العملاء والموردين، ونموذج إقرار الضريبة الجاهز.
            </p>
          </div>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <section style={{ background: '#f1f5f9', padding: '4.5rem 2.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#064e3b', marginBottom: '0.5rem' }}>
            باقات الاشتراك السحابية المرنة
          </h3>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '3rem' }}>
            فترة تجريبية مجانية لكل شركة جديدة مع تحكم كامل في الفروع والكاشيرات
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Plan 1 */}
            <div className="card" style={{ padding: '2rem', textAlign: 'right' }}>
              <h4 style={{ fontWeight: 800, fontSize: '1.25rem' }}>باقة المشتل الفردي</h4>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#047857', margin: '1rem 0 0.5rem' }} className="font-mono">
                199 <span style={{ fontSize: '0.9rem' }}>ر.س / شهرياً</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>مناسبة للمشاتل الفردية ومعارض الزينة</p>
              <ul style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>✓ فرع واحد ومستودع مستقل</li>
                <li>✓ نقطة بيع كاشير واحدة</li>
                <li>✓ إدارة شتلات ومخزون زراعي</li>
                <li>✓ قيود محاسبية تلقائية</li>
              </ul>
              <button onClick={() => { setShowRegisterModal(true); setRegError(''); }} className="btn btn-secondary" style={{ width: '100%', fontWeight: 700 }}>
                بدء تجربة 30 يوماً
              </button>
            </div>

            {/* Plan 2 - Featured */}
            <div className="card" style={{ padding: '2rem', textAlign: 'right', border: '2px solid #047857', position: 'relative', boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.2)' }}>
              <div style={{ position: 'absolute', top: '-14px', right: '2rem', background: '#047857', color: '#ffffff', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
                الأكثر طلباً للمشاتل
              </div>
              <h4 style={{ fontWeight: 800, fontSize: '1.25rem' }}>باقة المشاتل المتعددة (Pro)</h4>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#047857', margin: '1rem 0 0.5rem' }} className="font-mono">
                399 <span style={{ fontSize: '0.9rem' }}>ر.س / شهرياً</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>للشركات ذات الفروع والمستودعات المتعددة</p>
              <ul style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>✓ فروع ومستودعات غير محدودة</li>
                <li>✓ كاشيرات متعددة بكلمات سر وصلاحيات مستقلة</li>
                <li>✓ تكويد أسعار التجزئة والجملة</li>
                <li>✓ نظام الجرد السنوي الذكي للمشاتل</li>
                <li>✓ ربط واختيار ZATCA 2 للفوترة الإلكترونية</li>
              </ul>
              <button onClick={() => { setShowRegisterModal(true); setRegError(''); }} className="btn btn-primary" style={{ width: '100%', fontWeight: 800, background: '#047857' }}>
                بدء تجربة 30 يوماً
              </button>
            </div>

            {/* Plan 3 */}
            <div className="card" style={{ padding: '2rem', textAlign: 'right' }}>
              <h4 style={{ fontWeight: 800, fontSize: '1.25rem' }}>باقة كبرى المزارع (Enterprise)</h4>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '1rem 0 0.5rem' }} className="font-mono">
                799 <span style={{ fontSize: '0.9rem' }}>ر.س / شهرياً</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>للمشاريع والمؤسسات الزراعية الكبرى</p>
              <ul style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>✓ كافة ميزات باقة Pro الزراعية</li>
                <li>✓ دعم فني مخصص وربط شبكات ري</li>
                <li>✓ تقارير مالية وتحليل هوامش أرباح الشتلات</li>
                <li>✓ مسيرات رواتب العمال والمهندسين</li>
              </ul>
              <button onClick={() => { setShowRegisterModal(true); setRegError(''); }} className="btn btn-secondary" style={{ width: '100%', fontWeight: 700 }}>
                طلب الباقة وتجربتها
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#064e3b', color: '#ffffff', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Sprout size={22} style={{ color: '#6ee7b7' }} />
          <span style={{ fontSize: '1.15rem', fontWeight: 900 }}>منظومة الصويان السحابية</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
          جميع الحقوق محفوظة لمنظومة الصويان السحابية © {new Date().getFullYear()} • المنصة السحابية الزراعية والمحاسبية المعتمدة
        </p>
      </footer>

      {/* ===================== Login Modal ===================== */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={20} style={{ color: '#047857' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>تسجيل الدخول إلى منظومة الصويان</h3>
              </div>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleLogin}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {loginError && (
                  <div style={{ background: '#ffe4e6', color: '#be123c', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                    {loginError}
                  </div>
                )}

                {/* Quick pre-fill shortcuts */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                    ⚡ تسجيل دخول تجريبي سريع بنقرة واحدة:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <button type="button" onClick={prefillSuperAdmin} style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontWeight: 700, cursor: 'pointer' }}>
                      👑 المسؤول المطلق (elhassanelsoudy)
                    </button>
                    <button type="button" onClick={prefillTenantOwner} style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 700, cursor: 'pointer' }}>
                      🏢 مالك شركة الصويان
                    </button>
                    <button type="button" onClick={prefillCashier} style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>
                      🛒 كاشير صالة الرياض (cashier1)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني أو اسم المستخدم</label>
                  <input
                    required
                    type="text"
                    placeholder="مثال: elhassanelsoudy@gmail.com أو cashier1"
                    className="form-input"
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">كلمة المرور</label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="form-input font-mono"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowLoginModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={loginLoading} className="btn btn-primary" style={{ background: '#047857' }}>
                  {loginLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== Register Modal ===================== */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} style={{ color: '#047857' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem' }}>إنشاء حساب شركة ومشترك جديد</h3>
              </div>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleRegister}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {regError && (
                  <div style={{ background: '#ffe4e6', color: '#be123c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {regError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">اسم الشركة / المشتل (عربي)</label>
                    <input required type="text" placeholder="مثال: مشاتل الرياض الخضراء" className="form-input" value={regForm.company_name_ar} onChange={e => setRegForm({ ...regForm, company_name_ar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المدينة</label>
                    <input required type="text" placeholder="الرياض / جدة / القصيم" className="form-input" value={regForm.city} onChange={e => setRegForm({ ...regForm, city: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">اسم مالك أو مدير المنشأة</label>
                    <input required type="text" placeholder="مثال: عبدالرحمن السبيعي" className="form-input" value={regForm.owner_name} onChange={e => setRegForm({ ...regForm, owner_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الجوال</label>
                    <input type="text" placeholder="05xxxxxxxx" className="form-input font-mono" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">البريد الإلكتروني (لتسجيل الدخول)</label>
                    <input required type="email" placeholder="owner@nursery.sa" className="form-input font-mono" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">كلمة المرور للحساب</label>
                    <input required type="password" placeholder="••••••••" className="form-input font-mono" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">السجل التجاري (اختياري)</label>
                    <input type="text" placeholder="1010xxxxxx" className="form-input font-mono" value={regForm.cr_number} onChange={e => setRegForm({ ...regForm, cr_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم الضريبي (ZATCA - 15 رقم)</label>
                    <input type="text" placeholder="310000000000003" className="form-input font-mono" value={regForm.vat_number} onChange={e => setRegForm({ ...regForm, vat_number: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" disabled={regLoading} className="btn btn-primary" style={{ background: '#047857' }}>
                  {regLoading ? 'جاري تأسيس المنشأة...' : 'تأكيد التسجيل وبدء الفترة التجريبية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
