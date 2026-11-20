import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardPaste,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Globe,
  Lightbulb,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import type {
  AiInterpretationInsight,
  AlternativeMappingSuggestion,
  ComputedStatements,
  EntityProfile,
  FinancialInputsHalalas,
  MappedAccountRow,
  QawaemFieldId,
  SmartCheckReport,
  TrialBalanceRow,
  WizardDetailedLines,
} from '../types/qawaem';
import {
  QAWAEM_TAXONOMY,
  SAMPLE_TRIAL_BALANCE_ROWS,
  TAXONOMY_BY_ID,
  auditWithholdingTaxCompliance,
  evaluateFourAccountingRules,
  evaluateSaudiTaxAndCompliancePitfalls,
  formatSar,
  halalasToSar,
} from '../utils/accounting';
import {
  buildFallbackAlternatives,
  mapTrialBalanceWithPriorityEngine,
  parseRawAccountNamesToRows,
} from '../utils/accountMappingEngine';
import {
  exportWithholdingTaxReportExcel,
  parseTrialBalanceFile,
} from '../utils/trialBalanceParser';

interface Stage5SmartCheckProps {
  entity: EntityProfile;
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  statements: ComputedStatements;
  savedCompanyMappings?: Record<string, QawaemFieldId>;
  trialBalanceRows: TrialBalanceRow[];
  mappedAccounts: MappedAccountRow[];
  report: SmartCheckReport | null;
  onTrialBalanceLoaded: (rows: TrialBalanceRow[]) => void;
  onMappingsUpdated: (mapped: MappedAccountRow[]) => void;
  onAutoSyncFinancials: () => void;
  onPrev: () => void;
  onNext: () => void;
}

type Stage5Tab = 'smart_check' | 'tb_mapping' | 'wht_report';
type MappingFilter = 'all' | 'unmapped' | 'needs_review' | 'high';

const SAMPLE_PASTE_ACCOUNTS = `110101\tمصرف الإنماء - الحساب الجاري\t320000\t0
110205\tالعملاء والذمم المدينة\t145000\t0
210204\tضريبة القيمة المضافة المستحقة\t0\t48000
210209\tضريبة الاستقطاع المستحقة (WHT)\t0\t1200
410102\tإيرادات المبيعات والخدمات\t0\t680000
520103\tرواتب الموظفين والتأمينات\t210000\t0
520410\tاشتراكات سحابية AWS ومورد أجنبي (خدمات تقنية)\t40000\t0
990001\tحساب تسوية معلق تحت الفحص\t18500\t0
990002\tمصاريف متفرقة غير مصنفة\t9200\t0`;

export const Stage5SmartCheck: React.FC<Stage5SmartCheckProps> = ({
  entity,
  financials,
  detailedLines,
  statements,
  savedCompanyMappings,
  trialBalanceRows,
  mappedAccounts,
  report,
  onTrialBalanceLoaded,
  onMappingsUpdated,
  onAutoSyncFinancials,
  onPrev,
  onNext,
}) => {
  const [activeTab, setActiveTab] = useState<Stage5Tab>('smart_check');

  // AI Interpretive Commentary state
  const [insights, setInsights] = useState<AiInterpretationInsight[]>([]);
  const [interpLoading, setInterpLoading] = useState(false);
  const [interpError, setInterpError] = useState<string | null>(null);
  const lastFetchedSigRef = useRef<string>('');

  // Trial Balance Mapping Engine state
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(
    null
  );
  const [tbDragActive, setTbDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [filter, setFilter] = useState<MappingFilter>('all');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState(SAMPLE_PASTE_ACCOUNTS);
  const [whtPdfPrinting, setWhtPdfPrinting] = useState(false);

  const rules = useMemo(
    () => evaluateFourAccountingRules(entity, statements, mappedAccounts),
    [entity, statements, mappedAccounts]
  );

  const commonPitfalls = useMemo(
    () =>
      evaluateSaudiTaxAndCompliancePitfalls({
        entity,
        financials,
        detailedLines,
        statements,
        mappedAccounts,
      }),
    [entity, financials, detailedLines, statements, mappedAccounts]
  );

  const passedRulesCount = useMemo(
    () => rules.filter((r) => r.passed).length,
    [rules]
  );

  const hasFinancialFigures =
    statements.totalAssets !== 0 ||
    statements.totalRevenue !== 0 ||
    statements.totalOperatingExpenses !== 0 ||
    statements.totalLiabilities !== 0 ||
    statements.paidUpCapital !== 0;

  const statementSummary = useMemo(
    () => ({
      operatingRevenueSar: halalasToSar(statements.operatingRevenue),
      otherRevenueSar: halalasToSar(statements.otherRevenue),
      totalRevenueSar: halalasToSar(statements.totalRevenue),
      costOfRevenueSar: halalasToSar(statements.costOfRevenue),
      grossProfitSar: halalasToSar(statements.grossProfit),
      salariesAndWagesSar: halalasToSar(statements.salariesAndWages),
      rentExpenseSar: halalasToSar(statements.rentExpense),
      generalAdminExpensesSar: halalasToSar(statements.generalAdminExpenses),
      depreciationExpenseSar: halalasToSar(statements.depreciationExpense),
      totalOperatingExpensesSar: halalasToSar(statements.totalOperatingExpenses),
      operatingProfitSar: halalasToSar(statements.operatingProfit),
      financeCostsSar: halalasToSar(statements.financeCosts),
      zakatExpenseSar: halalasToSar(statements.zakatExpense),
      netProfitSar: halalasToSar(statements.netProfit),
      cashAndEquivalentsSar: halalasToSar(statements.cashAndEquivalents),
      accountsReceivableSar: halalasToSar(statements.accountsReceivable),
      inventorySar: halalasToSar(statements.inventory),
      totalCurrentAssetsSar: halalasToSar(statements.totalCurrentAssets),
      propertyPlantEquipmentSar: halalasToSar(statements.propertyPlantEquipment),
      totalAssetsSar: halalasToSar(statements.totalAssets),
      totalCurrentLiabilitiesSar: halalasToSar(statements.totalCurrentLiabilities),
      totalNonCurrentLiabilitiesSar: halalasToSar(statements.totalNonCurrentLiabilities),
      totalLiabilitiesSar: halalasToSar(statements.totalLiabilities),
      paidUpCapitalSar: halalasToSar(statements.paidUpCapital),
      retainedEarningsEndingSar: halalasToSar(statements.retainedEarningsEnding),
      partnersCurrentAccountNetSar: halalasToSar(statements.partnersCurrentAccountNet),
      totalEquitySar: halalasToSar(statements.totalEquity),
      isBalanced: statements.isBalanced,
    }),
    [statements]
  );

  const statementSignature = useMemo(
    () =>
      JSON.stringify({
        entityName: entity.entityName,
        statementType: entity.statementType,
        fiscalYearLabel: entity.fiscalYearLabel,
        summary: statementSummary,
      }),
    [entity.entityName, entity.statementType, entity.fiscalYearLabel, statementSummary]
  );

  const fetchAiInterpretation = useCallback(
    async (force = false) => {
      if (!hasFinancialFigures && !force) return;
      setInterpLoading(true);
      setInterpError(null);
      try {
        const res = await fetch('/api/ai/interpret-statements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: {
              entityName: entity.entityName,
              legalForm: entity.legalForm,
              classification: entity.classification,
              statementType: entity.statementType,
              fiscalYearLabel: entity.fiscalYearLabel,
              isicDescription: entity.isicDescription,
            },
            summary: statementSummary,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'تعذر توليد القراءة التفسيرية.');
        }
        const parsedInsights = Array.isArray(data.insights)
          ? (data.insights as AiInterpretationInsight[])
          : [];
        setInsights(parsedInsights);
        lastFetchedSigRef.current = statementSignature;
      } catch (err) {
        setInterpError(
          err instanceof Error
            ? err.message
            : 'تعذر الاتصال بخدمة القراءة التفسيرية للذكاء الاصطناعي.'
        );
      } finally {
        setInterpLoading(false);
      }
    },
    [
      entity.classification,
      entity.entityName,
      entity.fiscalYearLabel,
      entity.isicDescription,
      entity.legalForm,
      entity.statementType,
      hasFinancialFigures,
      statementSignature,
      statementSummary,
    ]
  );

  useEffect(() => {
    if (
      activeTab === 'smart_check' &&
      hasFinancialFigures &&
      lastFetchedSigRef.current !== statementSignature &&
      !interpLoading
    ) {
      void fetchAiInterpretation(false);
    }
  }, [
    activeTab,
    hasFinancialFigures,
    statementSignature,
    interpLoading,
    fetchAiInterpretation,
  ]);

  const handleUploadFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    setSyncSuccess(false);
    setUploadLoading(true);
    setUploadingFileName(file.name);
    try {
      const rows = await parseTrialBalanceFile(file);
      onTrialBalanceLoaded(rows);
      setLastUploadedFileName(file.name);
      setSyncSuccess(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر قراءة ملف ميزان المراجعة.'
      );
    } finally {
      setUploadLoading(false);
      setUploadingFileName(null);
    }
  };

  const handleImportPastedList = () => {
    setErrorMsg(null);
    setSyncSuccess(false);
    const rows = parseRawAccountNamesToRows(pasteText);
    if (rows.length === 0) {
      setErrorMsg('يرجى إدخال اسم حساب واحد على الأقل.');
      return;
    }
    onTrialBalanceLoaded(rows);
    setShowPasteBox(false);
    setSyncSuccess(true);
  };

  const handleRunPriorityRulesOnly = () => {
    if (trialBalanceRows.length === 0) return;
    setErrorMsg(null);
    setSyncSuccess(false);
    const mapped = mapTrialBalanceWithPriorityEngine(
      trialBalanceRows,
      savedCompanyMappings
    );
    onMappingsUpdated(mapped);
  };

  const handleRunAiMapping = async () => {
    if (trialBalanceRows.length === 0) return;
    setAiLoading(true);
    setErrorMsg(null);
    setSyncSuccess(false);

    const priorityBaseline = mapTrialBalanceWithPriorityEngine(
      trialBalanceRows,
      savedCompanyMappings
    );

    try {
      const payload = trialBalanceRows.map((r) => ({
        id: r.id,
        accountCode: r.accountCode,
        accountName: r.accountName,
        endingNetSar: halalasToSar(r.endingNetHalalas),
      }));

      const res = await fetch('/api/ai/map-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تصنيف الحسابات.');
      }

      const mapById = new Map<
        string,
        {
          mappedFieldId: QawaemFieldId | 'unmapped';
          confidence: 'high' | 'medium' | 'low';
          reason: string;
          alternativeFieldIds: QawaemFieldId[];
        }
      >();

      for (const m of data.mappings || []) {
        mapById.set(m.id, {
          mappedFieldId: m.mappedFieldId,
          confidence: m.confidence,
          reason: m.reason,
          alternativeFieldIds: Array.isArray(m.alternativeFieldIds)
            ? m.alternativeFieldIds
            : [],
        });
      }

      const updated: MappedAccountRow[] = priorityBaseline.map((baseRow) => {
        const aiResult = mapById.get(baseRow.id);
        const usePriority =
          baseRow.matchSource === 'priority_rule' && baseRow.confidence === 'high';

        const chosenFieldId = usePriority
          ? baseRow.mappedFieldId
          : (aiResult?.mappedFieldId ?? baseRow.mappedFieldId);

        const aiAlternatives: AlternativeMappingSuggestion[] = (
          aiResult?.alternativeFieldIds || []
        )
          .filter((fid) => fid !== chosenFieldId && Boolean(TAXONOMY_BY_ID[fid]))
          .slice(0, 3)
          .map((fid) => ({
            fieldId: fid,
            reason: 'بديل مقترح بواسطة التحليل الدلالي (AI)',
          }));

        const mergedAlternatives =
          aiAlternatives.length > 0
            ? aiAlternatives
            : baseRow.alternatives.length > 0
              ? baseRow.alternatives
              : buildFallbackAlternatives(baseRow, chosenFieldId);

        return {
          ...baseRow,
          mappedFieldId: chosenFieldId,
          confidence: usePriority
            ? baseRow.confidence
            : (aiResult?.confidence ?? baseRow.confidence),
          matchSource:
            chosenFieldId === 'unmapped'
              ? 'unmapped'
              : usePriority
                ? 'priority_rule'
                : 'ai_semantic',
          aiReason: usePriority
            ? baseRow.aiReason
            : (aiResult?.reason ?? baseRow.aiReason),
          alternatives: mergedAlternatives,
          manualOverride: false,
        };
      });

      onMappingsUpdated(updated);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'تعذر الاتصال بخدمة التسكين الذكي.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleAssignMapping = (
    rowId: string,
    newFieldId: QawaemFieldId | 'unmapped',
    sourceLabel = 'اختيار يدوي من المستخدم'
  ) => {
    setSyncSuccess(false);
    const updated = mappedAccounts.map((row) =>
      row.id === rowId
        ? {
            ...row,
            mappedFieldId: newFieldId,
            confidence: newFieldId === 'unmapped' ? ('low' as const) : ('high' as const),
            matchSource:
              newFieldId === 'unmapped' ? ('unmapped' as const) : ('manual' as const),
            aiReason: sourceLabel,
            manualOverride: true,
          }
        : row
    );
    onMappingsUpdated(updated);
  };

  const activeRows: MappedAccountRow[] = useMemo(() => {
    if (mappedAccounts.length > 0) return mappedAccounts;
    return mapTrialBalanceWithPriorityEngine(
      trialBalanceRows,
      savedCompanyMappings
    );
  }, [mappedAccounts, trialBalanceRows, savedCompanyMappings]);

  const whtAudit = useMemo(
    () =>
      auditWithholdingTaxCompliance({
        mappedAccounts: activeRows,
        detailedLines,
      }),
    [activeRows, detailedLines]
  );

  const counts = useMemo(() => {
    let unmapped = 0;
    let needsReview = 0;
    let high = 0;
    for (const r of activeRows) {
      if (r.mappedFieldId === 'unmapped') unmapped += 1;
      else if (r.confidence !== 'high') needsReview += 1;
      else high += 1;
    }
    return { all: activeRows.length, unmapped, needsReview, high };
  }, [activeRows]);

  const filteredRows = useMemo(() => {
    if (filter === 'unmapped') {
      return activeRows.filter((r) => r.mappedFieldId === 'unmapped');
    }
    if (filter === 'needs_review') {
      return activeRows.filter(
        (r) => r.mappedFieldId !== 'unmapped' && r.confidence !== 'high'
      );
    }
    if (filter === 'high') {
      return activeRows.filter(
        (r) => r.mappedFieldId !== 'unmapped' && r.confidence === 'high'
      );
    }
    return activeRows;
  }, [activeRows, filter]);

  const unmappedRows = useMemo(
    () => activeRows.filter((r) => r.mappedFieldId === 'unmapped'),
    [activeRows]
  );

  const handleExportWhtExcel = () => {
    exportWithholdingTaxReportExcel({
      entityName: entity.entityName,
      crNumber: entity.crNumber,
      vatNumber: entity.vatNumber,
      fiscalYearLabel: entity.fiscalYearLabel,
      transactions: whtAudit.detectedTransactions.map((tx) => ({
        accountCode: tx.accountCode,
        vendorName: tx.vendorName,
        accountName: tx.accountName,
        serviceCategoryLabel: tx.serviceCategoryLabel,
        baseSar: halalasToSar(tx.baseAmountHalalas).toFixed(2),
        ratePercent: tx.applicableRatePercent,
        deductedWhtSar: halalasToSar(tx.expectedWhtHalalas).toFixed(2),
        netAfterWhtSar: halalasToSar(tx.netAmountAfterWhtHalalas).toFixed(2),
      })),
      totalBaseSar: halalasToSar(whtAudit.totalInternationalBaseHalalas).toFixed(2),
      totalExpectedWhtSar: halalasToSar(whtAudit.totalExpectedWhtHalalas).toFixed(2),
      recordedWhtSar: halalasToSar(whtAudit.recordedWhtHalalas).toFixed(2),
      varianceSar: halalasToSar(whtAudit.varianceHalalas).toFixed(2),
      filename: `WHT_Report_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.xlsx`,
    });
  };

  const handlePrintWhtPdf = () => {
    setWhtPdfPrinting(true);
    setActiveTab('wht_report');
    const prevTitle = document.title;
    document.title = `WHT_Report_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}`;
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.title = prevTitle;
        setWhtPdfPrinting(false);
      }, 350);
    }, 140);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 print:border-0 print:p-0">
        {/* Top Stage Header matching design */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              المرحلة 5: الفحص الذكي ورفع ميزان المراجعة
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ارفع ميزان المراجعة لتتسجل البيانات المالية تلقائياً في القوائم، مع التحقق من قواعد المحرك الحسابي وقراءة الذكاء الاصطناعي التفسيرية.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 ${
              passedRulesCount === 4
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {passedRulesCount === 4 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span className="font-mono-num">
              اجتازت {passedRulesCount} من 4 قواعد
            </span>
          </div>
        </div>

        {/* Clean View Switcher between Smart Check, Trial Balance Workbench, and WHT Report */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap p-1 bg-slate-100 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('smart_check')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'smart_check'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>نتائج الفحص الذكي</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tb_mapping')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'tb_mapping'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>
                ربط ومطابقة ميزان المراجعة
                {trialBalanceRows.length > 0 ? ` (${trialBalanceRows.length})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wht_report')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'wht_report'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-700" />
              <span>
                تقرير ضريبة الاستقطاع (WHT)
                {whtAudit.detectedTransactions.length > 0
                  ? ` (${whtAudit.detectedTransactions.length})`
                  : ''}
              </span>
            </button>
          </div>

          {activeTab === 'smart_check' &&
            (counts.unmapped > 0 || (report && report.variances.length > 0)) && (
              <button
                type="button"
                onClick={() => setActiveTab('tb_mapping')}
                className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {counts.unmapped > 0
                  ? `يوجد ${counts.unmapped} حسابات غير مربوطة في الميزان — عرض للمعالجة`
                  : `توجد فروقات (${report?.variances.length}) عن ميزان المراجعة — عرض للمواءمة`}
              </button>
            )}
        </div>

        {/* TAB 1: Primary Smart Check Design (Trial Balance Auto-Registration + 4 Fixed Rules + Interpretive AI Commentary) */}
        {activeTab === 'smart_check' && (
          <div className="space-y-7">
            {/* Section 0: Direct Trial Balance Upload (PDF / Excel / CSV) & Auto-Registration */}
            <section
              onDragOver={(e) => {
                e.preventDefault();
                setTbDragActive(true);
              }}
              onDragLeave={() => setTbDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setTbDragActive(false);
                void handleUploadFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-xl border p-4 sm:p-5 space-y-4 transition-colors ${
                tbDragActive
                  ? 'border-blue-500 bg-blue-50/70'
                  : 'border-slate-200 bg-slate-50/75'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    <h2>رفع ميزان المراجعة (PDF أو Excel) وتسجيل البيانات المالية تلقائياً</h2>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    اسحب ملف ميزان المراجعة وأفلته هنا أو اختره بصيغة <strong>PDF</strong> أو <strong>Excel / CSV</strong> (أو صورة)، وسيستخرج المحرك الحسابات ويربطها ببنود «قوائم» ويسجّل الأرقام فوراً.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <label
                    className={`px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      uploadLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                    }`}
                  >
                    {uploadLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>رفع ميزان PDF</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={uploadLoading}
                      onChange={(e) => {
                        void handleUploadFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                  <label
                    className={`px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      uploadLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رفع Excel / CSV</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf,image/*"
                      disabled={uploadLoading}
                      onChange={(e) => {
                        void handleUploadFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox((v) => !v)}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>لصق حسابات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setLastUploadedFileName('ميزان_المراجعة_التجريبي.xlsx');
                      onTrialBalanceLoaded(SAMPLE_TRIAL_BALANCE_ROWS);
                      setSyncSuccess(true);
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    تجربة ميزان مراجعة
                  </button>
                </div>
              </div>

              {uploadLoading && (
                <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs font-semibold text-blue-900">
                  <Loader2 className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
                  <span>
                    جاري قراءة الملف ({uploadingFileName}) واستخراج حسابات ميزان المراجعة وتسكينها تلقائياً...
                  </span>
                </div>
              )}

              {showPasteBox && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-900">
                      لصق حسابات ميزان المراجعة لتسجيلها مباشرة
                    </div>
                    <span className="text-[11px] text-slate-500">
                      سطر لكل حساب: (رقم الحساب TAB الاسم TAB مدين TAB دائن)
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleImportPastedList}
                      className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      تحليل وتسجيل البيانات المالية
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
                  {errorMsg}
                </div>
              )}

              {trialBalanceRows.length > 0 && (
                <div
                  className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    syncSuccess || counts.unmapped === 0
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        counts.unmapped === 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    />
                    <div>
                      <div className="font-bold">
                        تمت قراءة {activeRows.length} حساباً من ميزان المراجعة
                        {lastUploadedFileName ? ` (${lastUploadedFileName})` : ''} وتسجيل البيانات المالية في القوائم
                      </div>
                      <div className="text-[11px] opacity-85 mt-0.5 font-mono-num">
                        مرتبطة ببنود قوائم: {counts.high + counts.needsReview} · غير مرتبطة: {counts.unmapped}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tb_mapping')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  >
                    {counts.unmapped > 0
                      ? `مراجعة الحسابات غير المرتبطة (${counts.unmapped})`
                      : 'استعراض جدول ربط الحسابات'}
                  </button>
                </div>
              )}
            </section>

            {/* Section 1: Fixed Accounting Engine Rules */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h2>قواعد المحرك الحسابي</h2>
              </div>

              <div className="space-y-2.5">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`rounded-xl border px-4 py-3.5 transition-colors ${
                      rule.passed
                        ? 'bg-emerald-50/75 border-emerald-200'
                        : 'bg-red-50/75 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {rule.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div
                          className={`text-xs font-bold ${
                            rule.passed ? 'text-emerald-950' : 'text-red-950'
                          }`}
                        >
                          {rule.title}
                        </div>
                        <p
                          className={`text-xs leading-relaxed ${
                            rule.passed ? 'text-emerald-900/85' : 'text-red-900/90'
                          }`}
                        >
                          {rule.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Saudi Withholding Tax (WHT) Verification for Foreign Vendors */}
            {(whtAudit.status !== 'none' || trialBalanceRows.length > 0) && (
              <section className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Globe className="w-4 h-4 text-blue-700" />
                    <h2>التحقق من ضريبة الاستقطاع (Withholding Tax) للموردين الأجانب</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      المادة 68 — نظام ضريبة الدخل
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('wht_report')}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>إنشاء تقرير ضريبة الاستقطاع</span>
                    </button>
                  </div>
                </div>

                {whtAudit.status === 'none' ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-start gap-2.5 text-xs text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{whtAudit.summaryTitle}</div>
                      <p className="text-emerald-900/85 mt-0.5">
                        {whtAudit.summaryDetail}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border p-4 space-y-4 ${
                      whtAudit.status === 'verified'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : whtAudit.status === 'missing_wht'
                          ? 'bg-red-50/70 border-red-200'
                          : 'bg-amber-50/75 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 text-xs">
                      {whtAudit.status === 'verified' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            whtAudit.status === 'missing_wht'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        />
                      )}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div
                          className={`font-bold ${
                            whtAudit.status === 'verified'
                              ? 'text-emerald-950'
                              : whtAudit.status === 'missing_wht'
                                ? 'text-red-950'
                                : 'text-amber-950'
                          }`}
                        >
                          {whtAudit.summaryTitle}
                        </div>
                        <p className="leading-relaxed text-slate-700">
                          {whtAudit.summaryDetail}
                        </p>
                      </div>
                    </div>

                    {/* WHT Summary Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                        <div className="text-[11px] text-slate-500">
                          إجمالي المعاملات الدولية المرصودة
                        </div>
                        <div
                          className="font-mono-num font-bold text-slate-900 mt-0.5"
                          dir="ltr"
                        >
                          {formatSar(whtAudit.totalInternationalBaseHalalas)}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                        <div className="text-[11px] text-slate-500">
                          ضريبة الاستقطاع المستحقة نظامياً
                        </div>
                        <div
                          className="font-mono-num font-bold text-blue-700 mt-0.5"
                          dir="ltr"
                        >
                          {formatSar(whtAudit.totalExpectedWhtHalalas)}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                        <div className="text-[11px] text-slate-500">
                          ضريبة الاستقطاع المسجلة بالميزان
                        </div>
                        <div
                          className={`font-mono-num font-bold mt-0.5 ${
                            whtAudit.status === 'verified'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                          dir="ltr"
                        >
                          {formatSar(whtAudit.recordedWhtHalalas)}
                        </div>
                      </div>
                    </div>

                    {/* Detected International Transactions Breakdown Table */}
                    {whtAudit.detectedTransactions.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-right font-semibold">
                                الحساب / المعاملة الدولية
                              </th>
                              <th className="px-3 py-2 text-right font-semibold">
                                التصنيف النظامي (ZATCA)
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                قيمة المعاملة
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                النسبة
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                الاستقطاع المتوقع
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {whtAudit.detectedTransactions.map((tx) => (
                              <tr key={tx.rowId}>
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  <span className="font-mono-num text-slate-400 ml-1.5">
                                    {tx.accountCode}
                                  </span>
                                  {tx.accountName}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {tx.serviceCategoryLabel}
                                </td>
                                <td
                                  className="px-3 py-2 font-mono-num text-left whitespace-nowrap"
                                  dir="ltr"
                                >
                                  {formatSar(tx.baseAmountHalalas)}
                                </td>
                                <td className="px-3 py-2 font-mono-num font-bold text-center">
                                  {tx.applicableRatePercent}%
                                </td>
                                <td
                                  className="px-3 py-2 font-mono-num font-bold text-slate-900 text-left whitespace-nowrap"
                                  dir="ltr"
                                >
                                  {formatSar(tx.expectedWhtHalalas)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600">
                      ملاحظة نظامية: يجب إقرار وسداد ضريبة الاستقطاع لهيئة الزكاة والضريبة والجمارك خلال أول 10 أيام من الشهر التالي لتاريخ الدفع للمورد غير المقيم.
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Saudi Tax & Compliance Common Pitfall Checks */}
            {commonPitfalls.length > 0 && (
              <section className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h2>فحوصات الأخطاء الضريبية والنظامية الشائعة</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    تنبيهات استباقية (ضريبة الاستقطاع · الزكاة · نظام الشركات)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {commonPitfalls.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl border px-4 py-3.5 ${
                        alert.severity === 'warning'
                          ? 'bg-amber-50/75 border-amber-200'
                          : 'bg-sky-50/70 border-sky-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            alert.severity === 'warning'
                              ? 'text-amber-600'
                              : 'text-blue-700'
                          }`}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-slate-900">
                            {alert.title}
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700">
                            {alert.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: AI Interpretive Commentary */}
            <section className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    قراءة الذكاء الاصطناعي للأرقام
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-semibold">
                    تفسيرية — لا تغيّر أي رقم
                  </span>
                </div>

                <button
                  type="button"
                  disabled={interpLoading}
                  onClick={() => void fetchAiInterpretation(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {interpLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-violet-600" />
                  )}
                  <span>
                    {interpLoading ? 'جاري التحليل...' : 'تحديث القراءة الذكية'}
                  </span>
                </button>
              </div>

              {interpError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-medium text-red-800">
                    {interpError}
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchAiInterpretation(true)}
                    className="px-3 py-1.5 bg-white hover:bg-red-100 border border-red-200 text-red-900 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {interpLoading && insights.length === 0 ? (
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-4 flex items-center gap-2.5 text-xs font-medium text-violet-900">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 shrink-0" />
                    <span>
                      يقوم محرك الذكاء الاصطناعي حالياً بقراءة وتفسير المؤشرات المالية للشركة...
                    </span>
                  </div>
                  <div className="h-16 rounded-xl border border-slate-200 bg-slate-50/70" />
                  <div className="h-16 rounded-xl border border-slate-200 bg-slate-50/70" />
                </div>
              ) : !hasFinancialFigures && insights.length === 0 && !interpError ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-700">
                    لا توجد أرقام مالية مدخلة بعد لإجراء القراءة التفسيرية.
                  </p>
                  <button
                    type="button"
                    onClick={onPrev}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    العودة لإدخال البيانات المالية في المرحلة 4
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {insights.map((insight, idx) => {
                    const isWarning = insight.type === 'warning';
                    return (
                      <div
                        key={`${insight.type}-${idx}`}
                        className={`rounded-xl border px-4 py-3.5 ${
                          isWarning
                            ? 'bg-amber-50/75 border-amber-200'
                            : 'bg-violet-50/75 border-violet-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <Lightbulb className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div
                              className={`text-xs font-bold ${
                                isWarning ? 'text-amber-950' : 'text-violet-950'
                              }`}
                            >
                              {insight.title}
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                isWarning
                                  ? 'text-amber-900/90'
                                  : 'text-violet-900/90'
                              }`}
                            >
                              {insight.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: Trial Balance Mapping & Reconciliation Workbench */}
        {activeTab === 'tb_mapping' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-xs text-slate-600">
                ارفع ميزان المراجعة بصيغة <strong>PDF</strong> أو <strong>Excel / CSV</strong>؛ يربط المحرك الحسابات الشائعة أولاً ثم يعالج الحسابات الغامضة بالذكاء الاصطناعي مع اقتراح بدائل ذكية.
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label
                  className={`px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    uploadLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  {uploadLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>رفع ميزان PDF</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={uploadLoading}
                    onChange={(e) => {
                      void handleUploadFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
                <label
                  className={`px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    uploadLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع Excel / CSV</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,image/*"
                    disabled={uploadLoading}
                    onChange={(e) => {
                      void handleUploadFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasteBox((v) => !v)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>لصق أسماء حسابات</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSyncSuccess(false);
                    setLastUploadedFileName('ميزان_المراجعة_التجريبي.xlsx');
                    onTrialBalanceLoaded(SAMPLE_TRIAL_BALANCE_ROWS);
                  }}
                  className="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  تحميل ميزان تجريبي
                </button>
              </div>
            </div>

            {uploadLoading && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs font-semibold text-blue-900">
                <Loader2 className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
                <span>
                  جاري قراءة الملف ({uploadingFileName}) واستخراج حسابات ميزان المراجعة وتسكينها تلقائياً...
                </span>
              </div>
            )}

            {showPasteBox && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">
                    إدخال قائمة أسماء حسابات ميزان المراجعة مباشرة
                  </div>
                  <span className="text-[11px] text-slate-500">
                    سطر لكل حساب: (اسم الحساب) أو (رقم الحساب TAB الاسم TAB مدين TAB دائن)
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleImportPastedList}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    تحليل وربط الحسابات المدخلة
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
                {errorMsg}
              </div>
            )}

            {trialBalanceRows.length === 0 ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setTbDragActive(true);
                }}
                onDragLeave={() => setTbDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setTbDragActive(false);
                  void handleUploadFile(e.dataTransfer.files?.[0]);
                }}
                className={`block py-12 px-6 text-center border-2 border-dashed rounded-xl space-y-3 transition-colors cursor-pointer ${
                  tbDragActive
                    ? 'border-blue-500 bg-blue-50/70'
                    : 'border-slate-300 bg-slate-50/50 hover:border-blue-400'
                }`}
              >
                {uploadLoading ? (
                  <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto" />
                ) : (
                  <FileText className="w-10 h-10 text-blue-700 mx-auto" />
                )}
                <div className="text-sm font-bold text-slate-900">
                  {uploadLoading
                    ? `جاري استخراج حسابات ميزان المراجعة من (${uploadingFileName})...`
                    : 'اسحب ميزان المراجعة (PDF أو Excel / CSV) وأفلته هنا، أو اضغط للاختيار'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  يدعم ملفات PDF متعددة الصفحات من الأنظمة المحاسبية (قيود، زوهو، دفترة، وافق، أودو) وملفات Excel وCSV حتى 15 ميجابايت.
                </p>
                <input
                  type="file"
                  accept=".pdf,application/pdf,.xlsx,.xls,.csv,image/*"
                  disabled={uploadLoading}
                  onChange={(e) => {
                    void handleUploadFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
              </label>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900">
                      تمت معالجة {activeRows.length} حساباً · مرتبطة بثقة ({counts.high}) · غير مرتبطة ({counts.unmapped})
                    </div>
                    <div className="text-slate-500">
                      أولوية المطابقة: الحسابات المالية الشائعة أولاً، ثم التحليل الدلالي والبدائل المقترحة للحسابات غير المرتبطة.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRunPriorityRulesOnly}
                      className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>إعادة مطابقة الحسابات الشائعة</span>
                    </button>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleRunAiMapping}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                      <span>
                        {aiLoading
                          ? 'جاري التصنيف عبر Gemini...'
                          : 'ربط ذكي شامل (AI + بدائل)'}
                      </span>
                    </button>
                  </div>
                </div>

                {unmappedRows.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>
                        معالجة الحسابات غير المرتبطة ({unmappedRows.length}) — اختر البديل المقترح بنقرة واحدة
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {unmappedRows.map((row) => (
                        <div
                          key={row.id}
                          className="p-3 bg-white border border-amber-200 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900">
                              <span className="font-mono-num text-slate-500 ml-2">
                                {row.accountCode}
                              </span>
                              {row.accountName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {row.aiReason}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500 ml-1">
                              بدائل مقترحة:
                            </span>
                            {row.alternatives.map((alt) => {
                              const target = TAXONOMY_BY_ID[alt.fieldId];
                              if (!target) return null;
                              return (
                                <button
                                  key={alt.fieldId}
                                  type="button"
                                  title={alt.reason}
                                  onClick={() =>
                                    handleAssignMapping(
                                      row.id,
                                      alt.fieldId,
                                      `تم الاختيار من البديل المقترح: ${alt.reason}`
                                    )
                                  }
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                                >
                                  {target.arabicLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report && report.variances.length > 0 && (
                  <div className="border border-amber-200 rounded-xl overflow-hidden">
                    <div className="bg-amber-50 px-4 py-3 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs font-bold text-amber-950">
                        فروقات بين البيانات المدخلة في المعالج (المرحلة 4) وميزان المراجعة ({report.variances.length} بند)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAutoSyncFinancials();
                          setSyncSuccess(true);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>مواءمة وتحديث أرقام القوائم آلياً</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5 text-right font-semibold">البند في قوائم</th>
                            <th className="px-4 py-2.5 text-left font-semibold">مدخلات المعالج</th>
                            <th className="px-4 py-2.5 text-left font-semibold">ميزان المراجعة</th>
                            <th className="px-4 py-2.5 text-left font-semibold">الفرق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.variances.map((v) => (
                            <tr key={v.fieldId}>
                              <td className="px-4 py-2.5 font-medium text-slate-800">
                                {v.arabicLabel}
                              </td>
                              <td className="px-4 py-2.5 font-mono-num text-left" dir="ltr">
                                {formatSar(v.wizardHalalas)}
                              </td>
                              <td className="px-4 py-2.5 font-mono-num text-left" dir="ltr">
                                {formatSar(v.trialBalanceHalalas)}
                              </td>
                              <td
                                className="px-4 py-2.5 font-mono-num font-bold text-amber-700 text-left"
                                dir="ltr"
                              >
                                {formatSar(v.diffHalalas)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {syncSuccess && (
                  <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>
                      تم تحديث كافة بنود القوائم المالية من ميزان المراجعة وتوثيق التغييرات في سجل التعديلات (Audit Trail).
                    </span>
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-bold text-slate-900">
                      جدول حسابات ميزان المراجعة وتسكينها في قاموس منصة قوائم
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                      {[
                        { id: 'all' as const, label: `الكل (${counts.all})` },
                        {
                          id: 'unmapped' as const,
                          label: `غير مرتبطة (${counts.unmapped})`,
                        },
                        {
                          id: 'needs_review' as const,
                          label: `مراجعة (${counts.needsReview})`,
                        },
                        { id: 'high' as const, label: `مرتبطة (${counts.high})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFilter(tab.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            filter === tab.id
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[480px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-right font-semibold">الرمز</th>
                          <th className="px-3 py-2.5 text-right font-semibold">اسم الحساب والبدائل المقترحة</th>
                          <th className="px-3 py-2.5 text-left font-semibold">مدين</th>
                          <th className="px-3 py-2.5 text-left font-semibold">دائن</th>
                          <th className="px-3 py-2.5 text-right font-semibold">بند منصة قوائم المربوط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 align-top">
                            <td className="px-3 py-2.5 font-mono-num text-slate-600 whitespace-nowrap">
                              {row.accountCode}
                            </td>
                            <td className="px-3 py-2.5 space-y-1.5">
                              <div className="font-semibold text-slate-900">
                                {row.accountName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {row.aiReason}
                              </div>
                              {row.alternatives.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <span className="text-[10px] text-slate-400">
                                    بدائل:
                                  </span>
                                  {row.alternatives.slice(0, 2).map((alt) => {
                                    const tax = TAXONOMY_BY_ID[alt.fieldId];
                                    if (!tax) return null;
                                    return (
                                      <button
                                        key={alt.fieldId}
                                        type="button"
                                        onClick={() =>
                                          handleAssignMapping(
                                            row.id,
                                            alt.fieldId,
                                            `تطبيق البديل المقترح: ${alt.reason}`
                                          )
                                        }
                                        className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                                      >
                                        {tax.arabicLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap" dir="ltr">
                              {formatSar(row.debitHalalas)}
                            </td>
                            <td className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap" dir="ltr">
                              {formatSar(row.creditHalalas)}
                            </td>
                            <td className="px-3 py-2.5 min-w-[230px]">
                              <select
                                value={row.mappedFieldId}
                                onChange={(e) =>
                                  handleAssignMapping(
                                    row.id,
                                    e.target.value as QawaemFieldId | 'unmapped'
                                  )
                                }
                                className={`w-full h-9 px-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                                  row.mappedFieldId === 'unmapped'
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              >
                                <option value="unmapped">— غير مرتبط —</option>
                                {QAWAEM_TAXONOMY.map((tax) => (
                                  <option key={tax.id} value={tax.id}>
                                    {tax.arabicLabel} ({tax.xbrlCode})
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: Dedicated Withholding Tax Report (WHT Report) */}
        {activeTab === 'wht_report' && (
          <div className="space-y-6">
            {/* Report Toolbar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-slate-900">
                  تقرير ضريبة الاستقطاع الخاص بالموردين الدوليين
                </div>
                <p className="text-xs text-slate-500">
                  تقرير مستخرج تلقائياً من بيانات ميزان المراجعة لتحديد الموردين الدوليين المتأثرين والمبالغ المقتطعة واجبة الإقرار لهيئة الزكاة والضريبة والجمارك.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('smart_check')}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  العودة للفحص الذكي
                </button>
                <button
                  type="button"
                  disabled={whtAudit.detectedTransactions.length === 0}
                  onClick={handleExportWhtExcel}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  disabled={whtPdfPrinting}
                  onClick={handlePrintWhtPdf}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة / حفظ التقرير PDF</span>
                </button>
              </div>
            </div>

            {trialBalanceRows.length === 0 && !whtAudit.hasInternationalTransactions ? (
              <div className="no-print py-12 px-6 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/50 space-y-3">
                <Globe className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-900">
                  ارفع ميزان المراجعة أولاً لتوليد تقرير ضريبة الاستقطاع
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  بمجرد رفع ملف ميزان المراجعة أو لصق الحسابات، يقوم الفحص الذكي باستخراج جميع الموردين الدوليين المتأثرين وحساب المبالغ المقتطعة تلقائياً.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('smart_check')}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  الانتقال لرفع ميزان المراجعة
                </button>
              </div>
            ) : (
              <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 print:border-0 print:p-0">
                {/* Report Header */}
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-blue-700">
                      المملكة العربية السعودية · هيئة الزكاة والضريبة والجمارك (ZATCA)
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      تقرير ضريبة الاستقطاع (Withholding Tax Report)
                    </h2>
                    <div className="text-xs text-slate-600">
                      {entity.entityName} · سجل تجاري:{' '}
                      <span className="font-mono-num">{entity.crNumber}</span>
                      {entity.vatNumber
                        ? ` · الرقم الضريبي: ${entity.vatNumber}`
                        : ''}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 sm:text-left space-y-1">
                    <div>
                      السنة المالية:{' '}
                      <span className="font-mono-num font-bold text-slate-900">
                        {entity.fiscalYearLabel}
                      </span>
                    </div>
                    <div>
                      تاريخ التقرير:{' '}
                      <span className="font-semibold text-slate-900">
                        {new Date(whtAudit.generatedAtIso).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                          whtAudit.status === 'verified'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : whtAudit.status === 'missing_wht'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : whtAudit.status === 'mismatch'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {whtAudit.status === 'verified'
                          ? 'الحالة: مطابق نظامياً'
                          : whtAudit.status === 'missing_wht'
                            ? 'الحالة: لم يُسجل حساب الاستقطاع'
                            : whtAudit.status === 'mismatch'
                              ? 'الحالة: يوجد فارق في الاحتساب'
                              : 'الحالة: لا توجد معاملات دولية'}
                      </span>
                    </div>
                  </div>
                </header>

                {/* Executive 4 KPI Strip */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">الموردون الدوليون المتأثرون</div>
                    <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                      {whtAudit.detectedTransactions.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">إجمالي المعاملات الدولية</div>
                    <div
                      className="text-base font-bold font-mono-num text-slate-900 mt-1"
                      dir="ltr"
                    >
                      {formatSar(whtAudit.totalInternationalBaseHalalas)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="text-blue-900 font-semibold">
                      المبالغ المقتطعة تلقائياً (المستحقة)
                    </div>
                    <div
                      className="text-base font-bold font-mono-num text-blue-800 mt-1"
                      dir="ltr"
                    >
                      {formatSar(whtAudit.totalExpectedWhtHalalas)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">
                      المسجل بالميزان / الفارق
                    </div>
                    <div
                      className={`text-base font-bold font-mono-num mt-1 ${
                        whtAudit.status === 'verified'
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                      dir="ltr"
                    >
                      {formatSar(whtAudit.recordedWhtHalalas)}
                    </div>
                  </div>
                </section>

                {/* Rate Breakdown Summary (ZATCA Categories) */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900">
                    1. ملخص المبالغ المقتطعة حسب نسب المادة (68) من نظام ضريبة الدخل
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            فئة الخدمة الدولية
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold">
                            عدد المعاملات
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold">
                            النسبة
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold">
                            إجمالي قيمة المعاملات
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold">
                            الضريبة المقتطعة تلقائياً
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {whtAudit.rateBreakdown.map((bucket) => (
                          <tr key={bucket.ratePercent}>
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {bucket.label}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono-num">
                              {bucket.transactionCount}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono-num font-bold">
                              {bucket.ratePercent}%
                            </td>
                            <td
                              className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatSar(bucket.baseAmountHalalas)}
                            </td>
                            <td
                              className="px-3 py-2.5 font-mono-num font-bold text-slate-900 text-left whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatSar(bucket.expectedWhtHalalas)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Detailed Affected International Vendors Table */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900">
                    2. تفاصيل الموردين الدوليين المتأثرين والمبالغ المقتطعة تلقائياً
                  </h3>
                  {whtAudit.detectedTransactions.length === 0 ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-900">
                      لا توجد معاملات موردين دوليين في ميزان المراجعة الحالي تستوجب اقتطاع ضريبة استقطاع.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              الرمز
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              المورد الدولي المتأثر
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              الحساب في ميزان المراجعة
                            </th>
                            <th className="px-3 py-2.5 text-left font-semibold">
                              قيمة المعاملة
                            </th>
                            <th className="px-3 py-2.5 text-center font-semibold">
                              نسبة الاستقطاع
                            </th>
                            <th className="px-3 py-2.5 text-left font-semibold">
                              المبلغ المقتطع تلقائياً
                            </th>
                            <th className="px-3 py-2.5 text-left font-semibold">
                              الصافي للمورد
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {whtAudit.detectedTransactions.map((tx) => (
                            <tr key={tx.rowId}>
                              <td className="px-3 py-2.5 font-mono-num text-slate-500 whitespace-nowrap">
                                {tx.accountCode}
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-900">
                                {tx.vendorName}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                <div>{tx.accountName}</div>
                                <div className="text-[11px] text-slate-400">
                                  {tx.serviceCategoryLabel}
                                </div>
                              </td>
                              <td
                                className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                                dir="ltr"
                              >
                                {formatSar(tx.baseAmountHalalas)}
                              </td>
                              <td className="px-3 py-2.5 font-mono-num font-bold text-center">
                                {tx.applicableRatePercent}%
                              </td>
                              <td
                                className="px-3 py-2.5 font-mono-num font-bold text-blue-700 text-left whitespace-nowrap"
                                dir="ltr"
                              >
                                {formatSar(tx.expectedWhtHalalas)}
                              </td>
                              <td
                                className="px-3 py-2.5 font-mono-num text-slate-800 text-left whitespace-nowrap"
                                dir="ltr"
                              >
                                {formatSar(tx.netAmountAfterWhtHalalas)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                            <td className="px-3 py-2.5" colSpan={3}>
                              الإجمالي التلقائي للموردين الدوليين المتأثرين
                            </td>
                            <td
                              className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatSar(whtAudit.totalInternationalBaseHalalas)}
                            </td>
                            <td className="px-3 py-2.5 text-center">—</td>
                            <td
                              className="px-3 py-2.5 font-mono-num text-blue-700 text-left whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatSar(whtAudit.totalExpectedWhtHalalas)}
                            </td>
                            <td
                              className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatSar(
                                Math.max(
                                  0,
                                  whtAudit.totalInternationalBaseHalalas -
                                    whtAudit.totalExpectedWhtHalalas
                                )
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Accounting Reconciliation & ZATCA Filing Guidance */}
                <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-700 leading-relaxed">
                  <div className="font-bold text-slate-900">
                    3. نتيجة المطابقة مع حسابات ميزان المراجعة والتوجيه المحاسبي
                  </div>
                  <p>{whtAudit.summaryDetail}</p>
                  {whtAudit.recordedWhtAccountNames.length > 0 && (
                    <p>
                      <strong>حسابات ضريبة الاستقطاع المرصودة بالميزان:</strong>{' '}
                      {whtAudit.recordedWhtAccountNames.join('، ')}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    * التوجيه النظامي: تُقتطع الضريبة عند السداد للمورد غير المقيم وتُورّد عبر بوابة هيئة الزكاة والضريبة والجمارك خلال أول 10 أيام من الشهر التالي وفق النموذج الشهري لضريبة الاستقطاع.
                  </p>
                </section>
              </article>
            )}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="no-print pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onPrev}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>متابعة إلى الدفع والفاتورة</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
