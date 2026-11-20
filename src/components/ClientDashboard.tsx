import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import type {
  AccountOwnerProfile,
  EntityProfile,
  MainStage,
  SavedCompanyAccount,
  StatementRequestRecord,
  SupportTicket,
} from '../types/qawaem';
import {
  computeFinancialStatements,
  formatNumber,
  formatSar,
  getAuditorExemptionInfo,
  halalasToSar,
} from '../utils/accounting';
import { ComparativeStatementsView } from './ComparativeStatementsView';

interface ClientDashboardProps {
  accountOwner: AccountOwnerProfile;
  savedCompanies: SavedCompanyAccount[];
  statementRequests: StatementRequestRecord[];
  supportTickets: SupportTicket[];
  completedReminderIds: string[];
  onStartNewStatement: (preselectedCompanyId?: string) => void;
  onAddCompany: (company: SavedCompanyAccount) => void;
  onOpenStatement: (requestId: string, targetStage?: MainStage) => void;
  onToggleReminder: (reminderId: string) => void;
  onSendSupportTicket: (ticket: {
    subject: string;
    category: SupportTicket['category'];
    message: string;
  }) => void;
}

type DashboardTab =
  | 'statements'
  | 'comparative'
  | 'companies'
  | 'invoices'
  | 'reminders'
  | 'support';

function formatArabicDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  accountOwner,
  savedCompanies,
  statementRequests,
  supportTickets,
  completedReminderIds,
  onStartNewStatement,
  onAddCompany,
  onOpenStatement,
  onToggleReminder,
  onSendSupportTicket,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('statements');
  const [comparativeCompanyId, setComparativeCompanyId] = useState<
    string | undefined
  >(undefined);

  // Inline Add New Company form state
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCr, setNewCr] = useState('');
  const [newName, setNewName] = useState('');
  const [newLegalForm, setNewLegalForm] = useState('شركة ذات مسؤولية محدودة');
  const [newCity, setNewCity] = useState('الرياض');
  const [newCapitalSar, setNewCapitalSar] = useState(100000);
  const [newRep, setNewRep] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Support ticket form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] =
    useState<SupportTicket['category']>('accounting');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSentNotice, setTicketSentNotice] = useState(false);

  const metrics = useMemo(() => {
    let inProgress = 0;
    let issued = 0;
    let totalPaidHalalas = 0;

    for (const req of statementRequests) {
      if (req.payment.paid || req.status === 'issued') {
        issued += 1;
        totalPaidHalalas += req.payment.totalHalalas;
      } else {
        inProgress += 1;
      }
    }

    return {
      companiesCount: savedCompanies.length,
      inProgressCount: inProgress,
      issuedCount: issued,
      totalPaidHalalas,
    };
  }, [savedCompanies.length, statementRequests]);

  // Determine highest-priority next-step banner request
  const nextStepTarget = useMemo(() => {
    const readyForPayment = statementRequests.find(
      (r) =>
        !r.payment.paid &&
        (r.status === 'awaiting_payment' || r.status === 'ready_for_review')
    );
    if (readyForPayment) {
      return {
        request: readyForPayment,
        readyForPay: true,
        title: `قائمة ${readyForPayment.entity.entityName} ${readyForPayment.entity.fiscalYearLabel} جاهزة — بقي الدفع`,
        subtitle:
          'أكملت البيانات ووقّعت الإقرار. بعد الدفع تُفتح نسختك النهائية PDF و Excel وقوالب منصة قوائم.',
        ctaLabel: 'إتمام الدفع',
        targetStage: 6 as MainStage,
      };
    }

    const activeDraft = statementRequests.find((r) => !r.payment.paid);
    if (activeDraft) {
      return {
        request: activeDraft,
        readyForPay: false,
        title: `استكمال إعداد قائمة ${activeDraft.entity.entityName} ${activeDraft.entity.fiscalYearLabel}`,
        subtitle:
          'تابع إدخال البيانات المالية أو فحص التوازن قبل الانتقال إلى مرحلة الدفع وإصدار الفاتورة.',
        ctaLabel: 'استكمال القائمة',
        targetStage: activeDraft.currentStage,
      };
    }

    return null;
  }, [statementRequests]);

  // Build regulatory deadline reminders for all registered companies
  const regulatoryReminders = useMemo(() => {
    const list: Array<{
      id: string;
      companyName: string;
      crNumber: string;
      title: string;
      dueDateLabel: string;
      detail: string;
      urgency: 'high' | 'normal';
    }> = [];

    for (const comp of savedCompanies) {
      const exemption = getAuditorExemptionInfo(comp.profile.classification);
      list.push({
        id: `rem-qawaem-${comp.id}`,
        companyName: comp.profile.entityName,
        crNumber: comp.profile.crNumber,
        title: 'إيداع القوائم المالية السنوية في منصة قوائم (وزارة التجارة)',
        dueDateLabel: 'خلال 6 أشهر من نهاية السنة المالية (حتى 30 يونيو)',
        detail: exemption.exempt
          ? 'المنشأة معفاة من تعيين مراجع حسابات خارجي وفق تصنيفها، وتُودع القوائم عبر النفاذ الوطني.'
          : 'يتطلب الإيداع اعتماد مكتب مراجع حسابات قانوني مرخص (SOCPA) قبل الرفع النهائي.',
        urgency: 'high',
      });
      list.push({
        id: `rem-zatca-${comp.id}`,
        companyName: comp.profile.entityName,
        crNumber: comp.profile.crNumber,
        title: 'تقديم الإقرار الزكوي / الضريبي السنوي (ZATCA)',
        dueDateLabel: 'خلال 120 يوماً من نهاية السنة المالية (حتى 30 أبريل)',
        detail:
          'يجب مطابقة أرقام الإقرار الزكوي مع قائمة المركز المالي وقائمة الدخل المعدة في المنصة.',
        urgency: 'normal',
      });
    }
    return list;
  }, [savedCompanies]);

  const paidInvoices = useMemo(
    () => statementRequests.filter((r) => r.payment.paid),
    [statementRequests]
  );

  const pendingPayments = useMemo(
    () => statementRequests.filter((r) => !r.payment.paid),
    [statementRequests]
  );

  const handleWathqLookupNewCompany = async () => {
    const cleanCr = newCr.replace(/\D/g, '');
    if (cleanCr.length !== 10) {
      setAddError('يرجى إدخال رقم سجل تجاري مكون من 10 أرقام.');
      return;
    }
    setLookupLoading(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/wathq/lookup/${cleanCr}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر جلب بيانات السجل التجاري.');
      }
      const fetched = data.entity as Partial<EntityProfile>;
      if (fetched.entityName) setNewName(fetched.entityName);
      if (fetched.legalForm) setNewLegalForm(fetched.legalForm);
      if (fetched.city) setNewCity(fetched.city);
      if (typeof fetched.paidUpCapitalSar === 'number') {
        setNewCapitalSar(fetched.paidUpCapitalSar);
      }
      if (fetched.legalRepresentative) {
        setNewRep(fetched.legalRepresentative);
      }
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'تعذر الاتصال بخدمة واثق.'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSaveNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const cleanCr = newCr.replace(/\D/g, '');
    if (cleanCr.length !== 10) {
      setAddError('رقم السجل التجاري يجب أن يتكون من 10 أرقام.');
      return;
    }
    if (newName.trim().length < 3) {
      setAddError('يرجى إدخال اسم المنشأة الرسمي.');
      return;
    }

    const exists = savedCompanies.some((c) => c.profile.crNumber === cleanCr);
    if (exists) {
      setAddError('هذه المنشأة مسجلة بالفعل في حسابك.');
      return;
    }

    const created: SavedCompanyAccount = {
      id: `comp-${cleanCr}-${Date.now()}`,
      createdYears: [],
      profile: {
        crNumber: cleanCr,
        unifiedNumber: `700${cleanCr.slice(3)}`,
        entityName: newName.trim(),
        legalForm: newLegalForm,
        isicCode: '620101',
        isicDescription: 'الأنشطة التجارية والخدمية المسجلة بالسجل التجاري',
        paidUpCapitalSar: Number(newCapitalSar) || 0,
        legalRepresentative: newRep.trim() || 'المدير العام / الممثل النظامي',
        fiscalPeriodRange: 'من 01/01/2026 إلى 31/12/2026',
        statementType: 'active',
        fiscalYearEnd: '12-31',
        fiscalYearLabel: '2026',
        vatNumber: `310${cleanCr.slice(0, 9)}0003`,
        city: newCity.trim() || 'الرياض',
        classification: 'small',
        annualRevenueMillions: 2.0,
        totalAssetsMillions: 1.5,
        employeesCount: 10,
        wathqVerified: true,
      },
    };

    onAddCompany(created);
    setNewCr('');
    setNewName('');
    setNewRep('');
    setShowAddCompany(false);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    onSendSupportTicket({
      subject: ticketSubject.trim(),
      category: ticketCategory,
      message: ticketMessage.trim(),
    });
    setTicketSubject('');
    setTicketMessage('');
    setTicketSentNotice(true);
    setTimeout(() => setTicketSentNotice(false), 4000);
  };

  const statusMeta = (req: StatementRequestRecord) => {
    if (req.payment.paid || req.status === 'issued') {
      return {
        label: 'مصدّرة ومسددة',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    }
    if (req.status === 'awaiting_payment' || req.status === 'ready_for_review') {
      return {
        label: 'جاهزة للمراجعة',
        className: 'bg-sky-50 border-sky-200 text-blue-700',
      };
    }
    return {
      label: 'بانتظار البيانات',
      className: 'bg-amber-50 border-amber-200 text-amber-800',
    };
  };

  const greetingName = accountOwner.fullName?.trim() || 'Business Developers';

  return (
    <div className="max-w-[1280px] w-full mx-auto px-6 py-7 space-y-6">
      {/* Top Hero Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-semibold text-blue-700">
            لوحة تحكم العميل — مرحباً، {greetingName}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            إدارة المنشآت والقوائم المالية
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddCompany((v) => !v)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-700" />
            <span>إضافة منشأة جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => onStartNewStatement()}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>بدء قائمة مالية جديدة</span>
          </button>
        </div>
      </div>

      {/* Inline Add New Company Drawer */}
      {showAddCompany && (
        <form
          onSubmit={handleSaveNewCompany}
          className="no-print bg-white border border-blue-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>إضافة منشأة جديدة إلى حسابك</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCompany(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رقم السجل التجاري (10 أرقام)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  maxLength={10}
                  value={newCr}
                  onChange={(e) => setNewCr(e.target.value.replace(/\D/g, ''))}
                  placeholder="7050124192"
                  className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  disabled={lookupLoading}
                  onClick={() => void handleWathqLookupNewCompany()}
                  className="h-10 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {lookupLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>جلب</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                اسم المنشأة
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: شركة الرواد المحدودة"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الشكل القانوني
              </label>
              <select
                value={newLegalForm}
                onChange={(e) => setNewLegalForm(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="شركة ذات مسؤولية محدودة">
                  شركة ذات مسؤولية محدودة
                </option>
                <option value="شركة الشخص الواحد ذات مسؤولية محدودة">
                  شركة الشخص الواحد ذات مسؤولية محدودة
                </option>
                <option value="شركة مساهمة مبسطة">شركة مساهمة مبسطة</option>
                <option value="مؤسسة فردية">مؤسسة فردية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المدينة
              </label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رأس المال المسجل (ريال)
              </label>
              <input
                type="number"
                dir="ltr"
                value={newCapitalSar}
                onChange={(e) => setNewCapitalSar(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                الممثل النظامي
              </label>
              <input
                type="text"
                value={newRep}
                onChange={(e) => setNewRep(e.target.value)}
                placeholder="اسم مدير الشركة / المفوض"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {addError && (
            <p className="text-xs font-medium text-red-700">{addError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddCompany(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              حفظ وإضافة للحساب
            </button>
          </div>
        </form>
      )}

      {/* Next-Step Banner */}
      {nextStepTarget && (
        <section className="no-print rounded-xl border border-blue-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] font-semibold text-slate-500">
                خطوتك التالية
              </div>
              <div className="text-sm font-bold text-slate-900">
                {nextStepTarget.title}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {nextStepTarget.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onOpenStatement(
                nextStepTarget.request.id,
                nextStepTarget.targetStage
              )
            }
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-full inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <span>{nextStepTarget.ctaLabel}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* 4 KPI Metric Cards */}
      <section className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">
              المنشآت المسجلة
            </div>
            <div className="text-2xl font-bold font-mono-num text-slate-900">
              {metrics.companiesCount}
            </div>
            <div className="text-[11px] text-slate-400">منشآت في حسابك</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-blue-700 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">
              قوائم قيد الإعداد
            </div>
            <div className="text-2xl font-bold font-mono-num text-slate-900">
              {metrics.inProgressCount}
            </div>
            <div className="text-[11px] text-amber-700 font-medium">
              تتطلب استكمالاً أو دفعاً
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">
              القوائم المصدرة
            </div>
            <div className="text-2xl font-bold font-mono-num text-slate-900">
              {metrics.issuedCount}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              جاهزة للتحميل والرفع
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">المدفوعات</div>
            <div className="text-2xl font-bold font-mono-num text-slate-900">
              {Math.round(halalasToSar(metrics.totalPaidHalalas)).toLocaleString('en-US')}{' '}
              ريال
            </div>
            <div className="text-[11px] text-slate-400">
              فواتير صادرة باسم منشأتك
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* 6 Navigation Tabs */}
      <nav
        aria-label="أقسام لوحة تحكم العميل"
        className="no-print flex flex-wrap items-center gap-2"
      >
        {[
          { id: 'statements' as const, label: 'القوائم المالية والطلبات' },
          {
            id: 'comparative' as const,
            label: 'القوائم المقارنة وتحليل الانحرافات',
          },
          {
            id: 'companies' as const,
            label: `المنشآت والسجلات (${savedCompanies.length})`,
          },
          { id: 'invoices' as const, label: 'الفواتير والمدفوعات' },
          { id: 'reminders' as const, label: 'التذكيرات والمواعيد النظامية' },
          { id: 'support' as const, label: 'مركز الرسائل والدعم' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: Financial Statements & Requests */}
      {activeTab === 'statements' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xs font-bold text-slate-900">
                سجل القوائم المالية والطلبات:
              </h2>
              <span className="text-[11px] text-slate-400">
                سنوات مالية متعددة
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('comparative')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>مقارنة السنوات وتحليل الانحرافات</span>
            </button>
          </div>

          {statementRequests.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-500">
                لا توجد قوائم مالية مسجلة بعد. ابدأ بإنشاء قائمة مالية جديدة لأي منشأة في حسابك.
              </p>
              <button
                type="button"
                onClick={() => onStartNewStatement()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                بدء قائمة مالية جديدة
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {statementRequests.map((req) => {
                const computed = computeFinancialStatements(req.financials);
                const badge = statusMeta(req);
                const statementKind =
                  req.entity.statementType === 'dormant'
                    ? 'قائمة رأس مال فقط (بدون نشاط)'
                    : 'قائمة مالية بنشاط';

                return (
                  <div
                    key={req.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {req.entity.entityName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono-num font-semibold">
                          {req.entity.fiscalYearLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                        <span>{statementKind}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الأصول:{' '}
                          <span className="font-mono-num font-semibold text-slate-700">
                            {formatNumber(computed.totalAssets)} ريال
                          </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>تحديث: {formatArabicDate(req.updatedAtIso)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setComparativeCompanyId(req.companyId);
                          setActiveTab('comparative');
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        مقارنة
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenStatement(req.id)}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        فتح القائمة
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Comparative Financial Statements & Variance Analysis */}
      {activeTab === 'comparative' && (
        <ComparativeStatementsView
          savedCompanies={savedCompanies}
          statementRequests={statementRequests}
          initialCompanyId={comparativeCompanyId}
          onStartNewStatement={onStartNewStatement}
          onOpenStatement={onOpenStatement}
        />
      )}

      {/* TAB 2: Registered Companies & CRs */}
      {activeTab === 'companies' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900">
              المنشآت والسجلات التجارية المرتبطة بحسابك ({savedCompanies.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowAddCompany(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة منشأة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedCompanies.map((company) => {
              const exemption = getAuditorExemptionInfo(
                company.profile.classification
              );
              return (
                <div
                  key={company.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold text-slate-900">
                        {company.profile.entityName}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold shrink-0">
                        {exemption.exempt ? 'معفاة من المراجع' : 'تتطلب مراجعاً'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {company.profile.legalForm} · {company.profile.city}
                    </div>
                    <div className="text-xs text-slate-500 font-mono-num">
                      السجل التجاري: {company.profile.crNumber} · رأس المال:{' '}
                      {company.profile.paidUpCapitalSar.toLocaleString('en-US')} ريال
                    </div>
                    <div className="text-[11px] text-slate-500">
                      الممثل النظامي: {company.profile.legalRepresentative}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      سنوات منشأة مسبقاً:{' '}
                      <span className="font-mono-num font-semibold text-slate-700">
                        {company.createdYears.length > 0
                          ? company.createdYears.join('، ')
                          : 'لا يوجد'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartNewStatement(company.id)}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      بدء قائمة جديدة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: Invoices & Payments */}
      {activeTab === 'invoices' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900">
              الفواتير الضريبية والمدفوعات (ZATCA)
            </h2>
          </div>

          {paidInvoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                لا توجد فواتير مدفوعة حتى الآن
              </div>
              <p className="text-[11px] text-slate-500">
                تصدر الفاتورة الضريبية الإلكترونية برمز ZATCA QR فور إتمام الدفع لأي قائمة جاهزة.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paidInvoices.map((req) => (
                <div
                  key={req.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono-num">
                        {req.payment.invoiceNumber}
                      </span>
                      <span>— {req.entity.entityName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      السنة المالية {req.entity.fiscalYearLabel} · تاريخ الإصدار:{' '}
                      {formatArabicDate(req.payment.paidAtIso)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono-num text-emerald-700">
                      {formatSar(req.payment.totalHalalas)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenStatement(req.id, 6)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      عرض الفاتورة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingPayments.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-bold text-slate-700">
                طلبات بانتظار السداد ({pendingPayments.length})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl px-4">
                {pendingPayments.map((req) => (
                  <div
                    key={req.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {req.entity.entityName}
                      </span>{' '}
                      <span className="font-mono-num text-slate-500">
                        ({req.entity.fiscalYearLabel})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num font-bold text-slate-800">
                        {formatSar(req.payment.totalHalalas)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenStatement(req.id, 6)}
                        className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        الانتقال للدفع
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Regulatory Reminders & Deadlines */}
      {activeTab === 'reminders' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <CalendarClock className="w-4 h-4 text-blue-700" />
              <span>التذكيرات والمواعيد النظامية لمنشآتك</span>
            </div>
            <span className="text-[11px] text-slate-500">
              وفق نظام الشركات السعودي وهيئة الزكاة والضريبة والجمارك
            </span>
          </div>

          <div className="space-y-2.5">
            {regulatoryReminders.map((rem) => {
              const done = completedReminderIds.includes(rem.id);
              return (
                <div
                  key={rem.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    done
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bell
                        className={`w-3.5 h-3.5 shrink-0 ${
                          done ? 'text-emerald-700' : 'text-amber-600'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900">
                        {rem.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                        {rem.companyName}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-blue-800">
                      الموعد النظامي: {rem.dueDateLabel}
                    </div>
                    <p className="text-[11px] text-slate-600">{rem.detail}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleReminder(rem.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                      done
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {done ? 'تم الإجراء ✓' : 'تحديد كمكتمل'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 5: Support & Messaging Center */}
      {activeTab === 'support' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
              <MessageSquare className="w-4 h-4 text-blue-700" />
              <span>سجل الرسائل والاستفسارات ({supportTickets.length})</span>
            </div>

            <div className="space-y-3">
              {supportTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {ticket.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                        ticket.status === 'answered'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-sky-50 border-sky-200 text-blue-700'
                      }`}
                    >
                      {ticket.status === 'answered' ? 'تم الرد' : 'قيد المراجعة'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ticket.message}
                  </p>
                  {ticket.reply && (
                    <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{ticket.reply}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    {formatArabicDate(ticket.createdAtIso)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmitTicket}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
              إرسال رسالة للفريق المحاسبي والدعم
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                التصنيف
              </label>
              <select
                value={ticketCategory}
                onChange={(e) =>
                  setTicketCategory(e.target.value as SupportTicket['category'])
                }
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="accounting">استفسار محاسبي / مراجع قانوني</option>
                <option value="qawaem_portal">الرفع في منصة قوائم</option>
                <option value="billing">الفواتير والمدفوعات</option>
                <option value="technical">الدعم الفني</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان الرسالة
              </label>
              <input
                type="text"
                required
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="مثال: استفسار حول تصنيف جاري الشركاء"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                التفاصيل
              </label>
              <textarea
                rows={4}
                required
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="اكتب استفسارك وسيرد عليك المستشار المختص..."
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {ticketSentNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                تم إرسال رسالتك إلى الفريق المختص بنجاح.
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال الرسالة</span>
            </button>
          </form>
        </section>
      )}
    </div>
  );
};
