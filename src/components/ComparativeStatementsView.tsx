import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CalendarPlus,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Minus,
  Printer,
  Search,
  TrendingUp,
} from 'lucide-react';
import type {
  MainStage,
  SavedCompanyAccount,
  StatementRequestRecord,
} from '../types/qawaem';
import { formatNumber, formatSar } from '../utils/accounting';
import {
  buildComparativeStatements,
  exportComparativeStatementsExcel,
  formatSignedSar,
  formatVariancePercent,
  type ComparativeLineItem,
  type ComparativeStatementSectionId,
} from '../utils/comparativeAnalysis';

interface ComparativeStatementsViewProps {
  savedCompanies: SavedCompanyAccount[];
  statementRequests: StatementRequestRecord[];
  initialCompanyId?: string;
  onStartNewStatement: (companyId?: string) => void;
  onOpenStatement: (requestId: string, targetStage?: MainStage) => void;
}

type SectionFilter = 'all' | ComparativeStatementSectionId;
type VarianceFilter = 'all' | 'changed' | 'material';

const SECTION_ORDER: Array<{
  id: ComparativeStatementSectionId;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'balance_sheet',
    title: '1. قائمة المركز المالي المقارنة',
    subtitle: 'الموجودات والمطلوبات وحقوق الملكية كما في نهاية السنة المالية',
  },
  {
    id: 'income_statement',
    title: '2. قائمة الدخل المقارنة',
    subtitle: 'الإيرادات وتكاليف النشاط والمصاريف التشغيلية وصافي النتائج',
  },
  {
    id: 'equity',
    title: '3. قائمة التغيرات في حقوق الملكية المقارنة',
    subtitle: 'حركة رأس المال والأرباح المبقاة والتوزيعات وجاري الشركاء',
  },
  {
    id: 'cash_flow',
    title: '4. قائمة التدفقات النقدية المقارنة (الطريقة غير المباشرة)',
    subtitle: 'التدفقات التشغيلية والاستثمارية والتمويلية وصافي النقدية',
  },
];

export const ComparativeStatementsView: React.FC<
  ComparativeStatementsViewProps
> = ({
  savedCompanies,
  statementRequests,
  initialCompanyId,
  onStartNewStatement,
  onOpenStatement,
}) => {
  // Group requests by companyId (falling back to CR number match)
  const requestsByCompany = useMemo(() => {
    const map = new Map<string, StatementRequestRecord[]>();
    for (const comp of savedCompanies) {
      map.set(comp.id, []);
    }
    for (const req of statementRequests) {
      const matchedComp =
        savedCompanies.find((c) => c.id === req.companyId) ||
        savedCompanies.find(
          (c) => c.profile.crNumber === req.entity.crNumber
        );
      const key = matchedComp?.id || req.companyId;
      const existing = map.get(key) || [];
      existing.push(req);
      map.set(key, existing);
    }
    for (const [key, list] of map.entries()) {
      list.sort((a, b) =>
        b.entity.fiscalYearLabel.localeCompare(a.entity.fiscalYearLabel)
      );
      map.set(key, list);
    }
    return map;
  }, [savedCompanies, statementRequests]);

  const defaultCompanyId = useMemo(() => {
    if (initialCompanyId && requestsByCompany.has(initialCompanyId)) {
      return initialCompanyId;
    }
    const multiYearComp = savedCompanies.find(
      (c) => (requestsByCompany.get(c.id)?.length || 0) >= 2
    );
    return multiYearComp?.id || savedCompanies[0]?.id || '';
  }, [initialCompanyId, requestsByCompany, savedCompanies]);

  const [selectedCompanyId, setSelectedCompanyId] =
    useState<string>(defaultCompanyId);

  useEffect(() => {
    if (initialCompanyId && requestsByCompany.has(initialCompanyId)) {
      setSelectedCompanyId(initialCompanyId);
    }
  }, [initialCompanyId, requestsByCompany]);

  const companyRequests = useMemo(
    () => requestsByCompany.get(selectedCompanyId) || [],
    [requestsByCompany, selectedCompanyId]
  );

  const selectedCompany = useMemo(
    () => savedCompanies.find((c) => c.id === selectedCompanyId) || null,
    [savedCompanies, selectedCompanyId]
  );

  const [currentReqId, setCurrentReqId] = useState<string>('');
  const [priorReqId, setPriorReqId] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [varianceFilter, setVarianceFilter] = useState<VarianceFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printingPdf, setPrintingPdf] = useState(false);

  // Sync current/prior statement IDs whenever selected company changes
  useEffect(() => {
    if (companyRequests.length >= 2) {
      setCurrentReqId(companyRequests[0].id);
      setPriorReqId(companyRequests[1].id);
    } else if (companyRequests.length === 1) {
      setCurrentReqId(companyRequests[0].id);
      setPriorReqId('');
    } else {
      setCurrentReqId('');
      setPriorReqId('');
    }
  }, [companyRequests]);

  const currentReq = useMemo(
    () => companyRequests.find((r) => r.id === currentReqId) || null,
    [companyRequests, currentReqId]
  );

  const priorReq = useMemo(
    () => companyRequests.find((r) => r.id === priorReqId) || null,
    [companyRequests, priorReqId]
  );

  const bundle = useMemo(() => {
    if (!currentReq || !priorReq) return null;
    return buildComparativeStatements(currentReq, priorReq);
  }, [currentReq, priorReq]);

  const filteredItems = useMemo(() => {
    if (!bundle) return [];
    const q = searchQuery.trim().toLowerCase();
    return bundle.items.filter((item) => {
      if (sectionFilter !== 'all' && item.section !== sectionFilter) {
        return false;
      }
      if (varianceFilter === 'changed' && item.varianceHalalas === 0) {
        return false;
      }
      if (
        varianceFilter === 'material' &&
        !item.isMaterial &&
        !item.isTotal
      ) {
        return false;
      }
      if (q) {
        const matchLabel = item.arabicLabel.toLowerCase().includes(q);
        const matchCode = item.xbrlCode?.toLowerCase().includes(q) || false;
        if (!matchLabel && !matchCode) return false;
      }
      return true;
    });
  }, [bundle, sectionFilter, varianceFilter, searchQuery]);

  const handleSwapYears = () => {
    if (!currentReqId || !priorReqId) return;
    setCurrentReqId(priorReqId);
    setPriorReqId(currentReqId);
  };

  const handleExportExcel = () => {
    if (!bundle || !currentReq) return;
    exportComparativeStatementsExcel({
      entityName: currentReq.entity.entityName,
      crNumber: currentReq.entity.crNumber,
      currentYearLabel: bundle.currentYearLabel,
      priorYearLabel: bundle.priorYearLabel,
      items: bundle.items,
      filename: `Comparative_Statements_${currentReq.entity.crNumber}_${bundle.currentYearLabel}_vs_${bundle.priorYearLabel}.xlsx`,
    });
  };

  const handlePrintPdf = () => {
    if (!bundle || !currentReq) return;
    setPrintingPdf(true);
    const originalTitle = document.title;
    document.title = `Comparative_${currentReq.entity.crNumber}_${bundle.currentYearLabel}_vs_${bundle.priorYearLabel}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setPrintingPdf(false);
    }, 150);
  };

  const renderVarianceCell = (item: ComparativeLineItem) => {
    const isUp = item.varianceHalalas > 0;
    const isDown = item.varianceHalalas < 0;

    let colorClass = 'text-slate-600';
    if (item.impact === 'favorable') {
      colorClass = 'text-emerald-700';
    } else if (item.impact === 'unfavorable') {
      colorClass = 'text-rose-700';
    } else if (isUp) {
      colorClass = 'text-blue-700';
    } else if (isDown) {
      colorClass = 'text-amber-700';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 font-mono-num font-semibold ${colorClass}`}
        dir="ltr"
      >
        {isUp && <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
        {isDown && <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
        {!isUp && !isDown && <Minus className="w-3 h-3 shrink-0 opacity-50" />}
        <span>{formatSignedSar(item.varianceHalalas)}</span>
      </span>
    );
  };

  const renderPercentCell = (item: ComparativeLineItem) => {
    const text = formatVariancePercent(item.variancePercent);
    if (item.varianceHalalas === 0) {
      return (
        <span className="font-mono-num text-slate-400 text-[11px]">0.0%</span>
      );
    }
    let badgeTone = 'text-slate-700';
    if (item.impact === 'favorable') {
      badgeTone = 'text-emerald-700 font-semibold';
    } else if (item.impact === 'unfavorable') {
      badgeTone = 'text-rose-700 font-semibold';
    } else if (item.variancePercent === null) {
      badgeTone = 'text-blue-700 font-semibold';
    }
    return (
      <span className={`font-mono-num text-[11px] ${badgeTone}`} dir="ltr">
        {text}
      </span>
    );
  };

  const visibleSections = SECTION_ORDER.filter(
    (s) => sectionFilter === 'all' || s.id === sectionFilter
  );

  return (
    <section className="space-y-5">
      {/* Control Toolbar (hidden when printing PDF) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              القوائم المالية المقارنة وتحليل الانحرافات
            </h2>
            <p className="text-xs text-slate-500">
              قارن بنود المركز المالي وقائمة الدخل وحقوق الملكية والتدفقات النقدية بين سنتين ماليتين مع احتساب الفروقات بالريال والنسبة المئوية تلقائياً.
            </p>
          </div>

          {bundle && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>تصدير Excel مقارن</span>
              </button>
              <button
                type="button"
                disabled={printingPdf}
                onClick={handlePrintPdf}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة / حفظ تقرير المقارنة PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Company & Year Comparison Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="comp-select-entity"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              المنشأة
            </label>
            <select
              id="comp-select-entity"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {savedCompanies.map((comp) => {
                const count = requestsByCompany.get(comp.id)?.length || 0;
                return (
                  <option key={comp.id} value={comp.id}>
                    {comp.profile.entityName} ({count} قوائم مسجلة)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="comp-select-current-year"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              السنة الحالية (الأساس)
            </label>
            <select
              id="comp-select-current-year"
              disabled={companyRequests.length === 0}
              value={currentReqId}
              onChange={(e) => setCurrentReqId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num font-semibold text-slate-900 disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {companyRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  السنة المالية {req.entity.fiscalYearLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 flex justify-center">
            <button
              type="button"
              disabled={companyRequests.length < 2}
              onClick={handleSwapYears}
              title="تبديل سنتي المقارنة"
              aria-label="تبديل سنتي المقارنة"
              className="h-10 w-10 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="comp-select-prior-year"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              السنة السابقة (المقارنة)
            </label>
            <select
              id="comp-select-prior-year"
              disabled={companyRequests.length < 2}
              value={priorReqId}
              onChange={(e) => setPriorReqId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num font-semibold text-slate-900 disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {companyRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  السنة المالية {req.entity.fiscalYearLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Row (only shown when two statements are comparable) */}
        {bundle && (
          <div className="pt-2 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'all' as const, label: 'جميع القوائم' },
                { id: 'balance_sheet' as const, label: 'المركز المالي' },
                { id: 'income_statement' as const, label: 'قائمة الدخل' },
                { id: 'equity' as const, label: 'حقوق الملكية' },
                { id: 'cash_flow' as const, label: 'التدفقات النقدية' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionFilter(sec.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sectionFilter === sec.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'all' as const, label: 'كل البنود' },
                  { id: 'changed' as const, label: 'المتغيرة فقط' },
                  { id: 'material' as const, label: 'انحراف جوهري (≥15%)' },
                ].map((vf) => (
                  <button
                    key={vf.id}
                    type="button"
                    onClick={() => setVarianceFilter(vf.id)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      varianceFilter === vf.id
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {vf.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم البند أو رمز قوائم..."
                  className="w-full h-9 pr-8 pl-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty / Insufficient Years State */}
      {companyRequests.length < 2 && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">
              {companyRequests.length === 0
                ? `لا توجد قوائم مالية مسجلة لـ ${selectedCompany?.profile.entityName || 'هذه المنشأة'} بعد`
                : `تتوفر قائمة مالية لسنة واحدة فقط (${companyRequests[0].entity.fiscalYearLabel}) لـ ${selectedCompany?.profile.entityName}`}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {companyRequests.length === 0
                ? 'ابدأ بإنشاء قوائم مالية لسنتين ماليتين متتاليتين لعرضهما جنباً إلى جنب وتحليل الانحرافات.'
                : 'لإجراء مقارنة تحليلية بين السنة الحالية والسنة السابقة، أنشئ قائمة مالية لسنة مالية أخرى لنفس المنشأة (ويمكنك ترحيل أرصدة الافتتاح تلقائياً).'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onStartNewStatement(selectedCompanyId)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>إنشاء قائمة لسنة مالية جديدة</span>
            </button>
            {companyRequests.length === 1 && (
              <button
                type="button"
                onClick={() => onOpenStatement(companyRequests[0].id)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>
                  فتح قائمة {companyRequests[0].entity.fiscalYearLabel}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Same Year Warning */}
      {companyRequests.length >= 2 && currentReqId === priorReqId && (
        <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 font-medium">
          اختر سنتين ماليتين مختلفتين في القائمتين أعلاه لعرض فروقات الأداء والمركز المالي بينهما.
        </div>
      )}

      {/* Main Comparative Financial Statements & Variance Report */}
      {bundle && currentReq && priorReq && currentReq.id !== priorReq.id && (
        <article className="bg-white border border-slate-200 rounded-xl p-6 space-y-7 print:border-0 print:p-0">
          {/* Formal Comparative Header */}
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-blue-700">
                تقرير القوائم المالية المقارنة وتحليل الانحرافات · SOCPA SMEs
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {currentReq.entity.entityName}
              </h3>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>{currentReq.entity.legalForm}</span>
                <span aria-hidden="true">·</span>
                <span>
                  سجل تجاري:{' '}
                  <span className="font-mono-num text-slate-700">
                    {currentReq.entity.crNumber}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentReq.entity.city}</span>
                <span aria-hidden="true">·</span>
                <span>العملة: الريال السعودي (ر.س)</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 md:text-left space-y-1 shrink-0">
              <div className="font-semibold text-slate-900">
                مقارنة السنة المالية{' '}
                <span className="font-mono-num text-blue-700">
                  {bundle.currentYearLabel}
                </span>{' '}
                مقابل{' '}
                <span className="font-mono-num text-slate-700">
                  {bundle.priorYearLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                حالة التوازن: {bundle.currentYearLabel} (
                {bundle.currentStatements.isBalanced ? 'متوازنة' : 'تحتاج مراجعة'}) ·{' '}
                {bundle.priorYearLabel} (
                {bundle.priorStatements.isBalanced ? 'متوازنة' : 'تحتاج مراجعة'})
              </div>
            </div>
          </header>

          {/* 5 Comparative Key Performance Indicators */}
          <section className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700">
              ملخص المؤشرات المالية المقارنة
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {bundle.ratios.map((kpi) => {
                const deltaColor =
                  kpi.impact === 'favorable'
                    ? 'text-emerald-700'
                    : kpi.impact === 'unfavorable'
                      ? 'text-rose-700'
                      : 'text-slate-600';
                return (
                  <div
                    key={kpi.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-1.5"
                  >
                    <div className="text-[11px] font-semibold text-slate-500">
                      {kpi.label}
                    </div>
                    <div
                      className="text-sm font-bold font-mono-num text-slate-900"
                      dir="ltr"
                    >
                      {kpi.currentDisplay}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                      <span>سنة {bundle.priorYearLabel}:</span>
                      <span className="font-mono-num" dir="ltr">
                        {kpi.priorDisplay}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] font-mono-num font-semibold pt-1 border-t border-slate-200/70 ${deltaColor}`}
                      dir="ltr"
                    >
                      {kpi.deltaDisplay}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Variance Drivers Narrative */}
          {bundle.drivers.length > 0 && (
            <section className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 print-avoid-break">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  أبرز محركات الانحراف المالي بين {bundle.priorYearLabel} و{' '}
                  {bundle.currentYearLabel}
                </span>
              </div>
              <div className="divide-y divide-slate-200/70">
                {bundle.drivers.map((drv) => {
                  const tone =
                    drv.impact === 'favorable'
                      ? 'text-emerald-700'
                      : drv.impact === 'unfavorable'
                        ? 'text-rose-700'
                        : 'text-blue-700';
                  return (
                    <div
                      key={drv.id}
                      className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">
                          {drv.statementLabel}:
                        </span>{' '}
                        {drv.narrative}
                      </div>
                      <span
                        className={`font-mono-num font-bold shrink-0 ${tone}`}
                        dir="ltr"
                      >
                        {formatSignedSar(drv.varianceHalalas)} ر.س (
                        {formatVariancePercent(drv.variancePercent)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Comparative Tables for All Selected Statements */}
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
              <FileSpreadsheet className="w-7 h-7 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">
                لا توجد بنود مطابقة لمرشحات البحث الحالية
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVarianceFilter('all');
                  setSectionFilter('all');
                }}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {visibleSections.map((sec) => {
                const secItems = filteredItems.filter(
                  (item) => item.section === sec.id
                );
                if (secItems.length === 0) return null;

                return (
                  <section
                    key={sec.id}
                    className="space-y-2.5 print-avoid-break"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200 pb-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {sec.title}
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {sec.subtitle}
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5 text-right font-semibold">
                              البند المحاسبي
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">
                              السنة الحالية ({bundle.currentYearLabel})
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">
                              السنة السابقة ({bundle.priorYearLabel})
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">
                              الانحراف (ر.س)
                            </th>
                            <th className="px-3.5 py-2.5 text-left font-semibold whitespace-nowrap">
                              التغير (%)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {secItems.map((item) => {
                            const rowClass = item.isTotal
                              ? 'bg-slate-100/90 font-bold text-slate-900 border-t border-b border-slate-300'
                              : item.isSubtotal
                                ? 'bg-slate-50/90 font-semibold text-slate-900'
                                : 'hover:bg-slate-50/60 text-slate-800';

                            return (
                              <tr key={item.id} className={rowClass}>
                                <td className="px-3.5 py-2.5">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    <span>{item.arabicLabel}</span>
                                    {item.xbrlCode && (
                                      <span className="text-[10px] font-mono-num text-slate-400">
                                        {item.xbrlCode}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className="px-3.5 py-2.5 font-mono-num text-left whitespace-nowrap font-semibold text-slate-900"
                                  dir="ltr"
                                >
                                  {formatNumber(item.currentHalalas)}
                                </td>
                                <td
                                  className="px-3.5 py-2.5 font-mono-num text-left whitespace-nowrap text-slate-600"
                                  dir="ltr"
                                >
                                  {formatNumber(item.priorHalalas)}
                                </td>
                                <td className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                  {renderVarianceCell(item)}
                                </td>
                                <td className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                  {renderPercentCell(item)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Footer Quick Links to Inspect Either Statement */}
          <footer className="no-print pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              تم احتساب الفروقات تلقائياً بالهللات الدقيقة وفق أرقام كل سنة مالية مسجلة في حسابك.
            </span>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenStatement(currentReq.id, 4)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>مراجعة أرقام {bundle.currentYearLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenStatement(priorReq.id, 4)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>مراجعة أرقام {bundle.priorYearLabel}</span>
              </button>
            </div>
          </footer>
        </article>
      )}
    </section>
  );
};
