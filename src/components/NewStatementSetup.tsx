import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  FileX,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type {
  EntityProfile,
  SavedCompanyAccount,
  StatementRequestRecord,
} from '../types/qawaem';

interface NewStatementSetupProps {
  savedCompanies: SavedCompanyAccount[];
  statementRequests: StatementRequestRecord[];
  activeCompanyId?: string;
  hasActiveDraft: boolean;
  onAddCompany: (company: SavedCompanyAccount) => void;
  onStartStatement: (params: {
    company: SavedCompanyAccount;
    statementType: 'active' | 'dormant';
    selectedYears: string[];
    rollForwardFromRequestId?: string;
  }) => void;
  onResumeWorkspace: () => void;
}

const FISCAL_YEARS = [
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
];

const PREP_FEE_PER_YEAR_SAR = 399;

export const NewStatementSetup: React.FC<NewStatementSetupProps> = ({
  savedCompanies,
  statementRequests,
  activeCompanyId,
  hasActiveDraft,
  onAddCompany,
  onStartStatement,
  onResumeWorkspace,
}) => {
  const initialCompanyId =
    activeCompanyId && savedCompanies.some((c) => c.id === activeCompanyId)
      ? activeCompanyId
      : (savedCompanies[0]?.id ?? '');

  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [statementType, setStatementType] = useState<'active' | 'dormant'>(
    'active'
  );
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);

  // Inline Add New Company drawer state
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCr, setNewCr] = useState('');
  const [newName, setNewName] = useState('');
  const [newLegalForm, setNewLegalForm] = useState('شركة ذات مسؤولية محدودة');
  const [newCity, setNewCity] = useState('الرياض');
  const [newCapitalSar, setNewCapitalSar] = useState(100000);
  const [newRep, setNewRep] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const selectedCompany = useMemo(
    () =>
      savedCompanies.find((c) => c.id === selectedCompanyId) ||
      savedCompanies[0],
    [savedCompanies, selectedCompanyId]
  );

  const priorRollForwardCandidate = useMemo(() => {
    if (!selectedCompany || selectedYears.length === 0) return null;
    const minSelectedYear = Math.min(...selectedYears.map((y) => Number(y)));
    const candidates = statementRequests
      .filter(
        (req) =>
          (req.companyId === selectedCompany.id ||
            req.entity.crNumber === selectedCompany.profile.crNumber) &&
          Number(req.entity.fiscalYearLabel) < minSelectedYear &&
          (req.financials.paid_up_capital > 0 ||
            req.financials.cash_and_equivalents > 0)
      )
      .sort(
        (a, b) =>
          Number(b.entity.fiscalYearLabel) - Number(a.entity.fiscalYearLabel)
      );
    return candidates[0] ?? null;
  }, [selectedCompany, selectedYears, statementRequests]);

  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    // Clear any selected year that was already created for the newly chosen company
    const target = savedCompanies.find((c) => c.id === id);
    if (target) {
      setSelectedYears((prev) =>
        prev.filter((y) => !target.createdYears.includes(y))
      );
    }
  };

  const toggleYear = (year: string) => {
    if (selectedCompany?.createdYears.includes(year)) return;
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

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
    const existing = savedCompanies.find((c) => c.profile.crNumber === cleanCr);
    if (existing) {
      setSelectedCompanyId(existing.id);
      setShowAddCompany(false);
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
    setSelectedCompanyId(created.id);
    setNewCr('');
    setNewName('');
    setNewRep('');
    setShowAddCompany(false);
  };

  const totalCostSar = selectedYears.length * PREP_FEE_PER_YEAR_SAR;
  const canSubmit = Boolean(selectedCompany) && selectedYears.length > 0;

  return (
    <div className="max-w-[1200px] w-full mx-auto px-6 py-8 space-y-6">
      {/* Top Page Title matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-semibold text-blue-700">
            إعداد قائمة مالية
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            قائمة مالية جديدة
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ثلاث إجابات بسيطة ونبدأ في تجهيز قائمتك.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddCompany((v) => !v)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-700" />
            <span>إضافة منشأة لحسابك</span>
          </button>

          {hasActiveDraft && (
            <button
              type="button"
              onClick={onResumeWorkspace}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>متابعة الطلب الحالي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Add New Company Form */}
      {showAddCompany && (
        <form
          onSubmit={handleSaveNewCompany}
          className="bg-white border border-blue-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>إضافة منشأة جديدة إلى قائمة منشآتك</span>
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

      {/* Main 2-Column Layout matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column (RTL first - 8 cols): 3 Questions */}
        <div className="lg:col-span-8 space-y-5">
          {/* Question 1: Which company? */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">لأي منشأة؟</h2>
            <div>
              <label
                htmlFor="account-company-select"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                المنشأة
              </label>
              <select
                id="account-company-select"
                value={selectedCompany?.id || ''}
                onChange={(e) => handleSelectCompany(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {savedCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.profile.entityName} — سجل ({company.profile.crNumber})
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Question 2: Did your entity achieve any income? */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              هل حقّقت منشأتك أي دخل خلال هذه الفترة؟
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatementType('active')}
                className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  statementType === 'active'
                    ? 'border-blue-700 bg-sky-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <FileText
                  className={`w-5 h-5 ${
                    statementType === 'active' ? 'text-blue-700' : 'text-slate-500'
                  }`}
                />
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  نعم، كان لدينا دخل
                </div>
                <p className="text-[11px] text-slate-500">
                  ستدخل إيراداتك ومصروفاتك خطوة بخطوة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStatementType('dormant')}
                className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  statementType === 'dormant'
                    ? 'border-blue-700 bg-sky-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <FileX
                  className={`w-5 h-5 ${
                    statementType === 'dormant' ? 'text-blue-700' : 'text-slate-500'
                  }`}
                />
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  لا، لم يكن هناك دخل
                </div>
                <p className="text-[11px] text-slate-500">
                  ستصدر قائمة توضح رأس مالك فقط، دون نشاط تشغيلي.
                </p>
              </button>
            </div>
          </section>

          {/* Question 3: Which fiscal year? */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">لأي سنة مالية؟</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تُحفظ بيانات كل سنة بشكل مستقل تماماً عن الأخرى.
              </p>
            </div>

            <div className="space-y-2">
              {FISCAL_YEARS.map((year) => {
                const alreadyCreated = Boolean(
                  selectedCompany?.createdYears.includes(year)
                );
                const checked = selectedYears.includes(year);
                return (
                  <label
                    key={year}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      alreadyCreated
                        ? 'bg-slate-50 border-slate-200/80 text-slate-400 cursor-not-allowed'
                        : checked
                          ? 'bg-sky-50/60 border-blue-600 text-slate-900 cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={alreadyCreated}
                        checked={checked}
                        onChange={() => toggleYear(year)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 disabled:opacity-40"
                      />
                      <span className="text-xs font-bold font-mono-num">
                        {year}{' '}
                        {alreadyCreated && (
                          <span className="font-normal text-slate-400 mr-1">
                            (تم إنشاؤها مسبقاً)
                          </span>
                        )}
                      </span>
                    </div>

                    {checked && !alreadyCreated && (
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>

            {priorRollForwardCandidate && (
              <label className="mt-3 flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 bg-sky-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={carryForwardEnabled}
                  onChange={(e) => setCarryForwardEnabled(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-slate-900">
                    ترحيل أرصدة الإقفال من سنة{' '}
                    <span className="font-mono-num">
                      {priorRollForwardCandidate.entity.fiscalYearLabel}
                    </span>{' '}
                    كأرصدة افتتاحية تلقائياً (نقل الأرصدة)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    يتم نقل أرصدة الموجودات والمطلوبات ورصيد الأرباح المبقاة الختامي من السنة السابقة تلقائياً لتبدأ السنة الجديدة بدون إعادة إدخال.
                  </p>
                </div>
              </label>
            )}
          </section>
        </div>

        {/* Left Column (RTL second - 4 cols): Expected Cost Card */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              التكلفة المتوقعة
            </h2>

            {selectedYears.length > 0 && (
              <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                {selectedYears
                  .slice()
                  .sort((a, b) => Number(b) - Number(a))
                  .map((yr) => (
                    <div
                      key={yr}
                      className="flex items-center justify-between text-slate-600"
                    >
                      <span>
                        إعداد القوائم —{' '}
                        <span className="font-mono-num">{yr}</span>
                      </span>
                      <span className="font-mono-num font-semibold text-slate-900">
                        {PREP_FEE_PER_YEAR_SAR} ريال
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">الإجمالي</span>
              <span className="text-base font-bold font-mono-num text-blue-700">
                {totalCostSar.toLocaleString('en-US')} ريال
              </span>
            </div>

            <div className="rounded-lg bg-slate-100/90 px-3 py-2.5 text-[11px] text-slate-500 text-center leading-relaxed">
              لن تدفع الآن — تُدخل بياناتك أولاً ويفحصها النظام، والدفع يتم في النهاية لإصدار القوائم.
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (!selectedCompany || selectedYears.length === 0) return;
                onStartStatement({
                  company: selectedCompany,
                  statementType,
                  selectedYears: selectedYears
                    .slice()
                    .sort((a, b) => Number(b) - Number(a)),
                  rollForwardFromRequestId:
                    carryForwardEnabled && priorRollForwardCandidate
                      ? priorRollForwardCandidate.id
                      : undefined,
                });
              }}
              className={`w-full py-3 px-5 rounded-full text-sm font-bold transition-colors ${
                canSubmit
                  ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
                  : 'bg-blue-200 text-white cursor-not-allowed'
              }`}
            >
              ابدأ إدخال البيانات
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
