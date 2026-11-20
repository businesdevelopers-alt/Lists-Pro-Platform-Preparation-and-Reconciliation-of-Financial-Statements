import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type {
  DocumentCategory,
  FinancialInputsHalalas,
  MappedAccountRow,
  QawaemFieldId,
  TrialBalanceRow,
  UploadedDocument,
} from '../types/qawaem';
import {
  QAWAEM_TAXONOMY,
  SAMPLE_TRIAL_BALANCE_ROWS,
  formatNumber,
  formatSar,
  halalasToSar,
} from '../utils/accounting';
import { parseTrialBalanceFile } from '../utils/trialBalanceParser';

interface Stage3DocumentsProps {
  documents: UploadedDocument[];
  trialBalanceCount: number;
  mappedAccounts: MappedAccountRow[];
  financials: FinancialInputsHalalas;
  onAddDocument: (doc: UploadedDocument) => void;
  onRemoveDocument: (id: string) => void;
  onTrialBalanceParsed: (rows: TrialBalanceRow[]) => void;
  onMappingsUpdated: (mapped: MappedAccountRow[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

const TAXONOMY_GROUPS: Array<{
  label: string;
  sections: Array<
    | 'current_assets'
    | 'non_current_assets'
    | 'current_liabilities'
    | 'non_current_liabilities'
    | 'equity'
    | 'revenue'
    | 'cost_of_revenue'
    | 'operating_expenses'
    | 'other_expenses'
  >;
}> = [
  { label: 'الأصول (ما تملكه المنشأة)', sections: ['current_assets', 'non_current_assets'] },
  { label: 'الالتزامات (ما على المنشأة)', sections: ['current_liabilities', 'non_current_liabilities'] },
  { label: 'رأس المال وحقوق الملكية', sections: ['equity'] },
  { label: 'الإيرادات', sections: ['revenue'] },
  { label: 'تكلفة الإيرادات والمصروفات', sections: ['cost_of_revenue', 'operating_expenses', 'other_expenses'] },
];

export const Stage3Documents: React.FC<Stage3DocumentsProps> = ({
  documents,
  trialBalanceCount,
  mappedAccounts,
  financials,
  onAddDocument,
  onRemoveDocument,
  onTrialBalanceParsed,
  onMappingsUpdated,
  onPrev,
  onNext,
}) => {
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingFileName, setParsingFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unmapped'>('all');

  const handleTrialBalanceFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setParsing(true);
    setParsingFileName(file.name);
    try {
      const rows = await parseTrialBalanceFile(file);
      onTrialBalanceParsed(rows);
      onAddDocument({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: 'trial_balance',
        fileName: file.name,
        fileSizeBytes: file.size,
        uploadedAtIso: new Date().toISOString(),
        parsedRowCount: rows.length,
      });
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : 'تعذر قراءة ملف ميزان المراجعة.'
      );
    } finally {
      setParsing(false);
      setParsingFileName(null);
    }
  };

  const handleSupportingDoc = (
    category: Exclude<DocumentCategory, 'trial_balance'>,
    file: File | undefined
  ) => {
    if (!file) return;
    onAddDocument({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      fileName: file.name,
      fileSizeBytes: file.size,
      uploadedAtIso: new Date().toISOString(),
    });
  };

  const handleDownloadSampleExcel = () => {
    const aoa = [
      ['رقم الحساب', 'اسم الحساب', 'رصيد أول المدة', 'مدين', 'دائن'],
      ...SAMPLE_TRIAL_BALANCE_ROWS.map((r) => [
        r.accountCode,
        r.accountName,
        halalasToSar(r.openingBalanceHalalas),
        halalasToSar(r.debitHalalas),
        halalasToSar(r.creditHalalas),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TrialBalance');
    XLSX.writeFile(wb, 'sample_saudi_trial_balance.xlsx');
  };

  const handleLoadSampleDirectly = () => {
    setParseError(null);
    onTrialBalanceParsed(SAMPLE_TRIAL_BALANCE_ROWS);
    onAddDocument({
      id: `doc-sample-${Date.now()}`,
      category: 'trial_balance',
      fileName: 'ميزان_المراجعة.xlsx',
      fileSizeBytes: 24680,
      uploadedAtIso: new Date().toISOString(),
      parsedRowCount: SAMPLE_TRIAL_BALANCE_ROWS.length,
    });
  };

  const handleRowMappingChange = (
    rowId: string,
    nextField: QawaemFieldId | 'unmapped'
  ) => {
    const nextMapped: MappedAccountRow[] = mappedAccounts.map((row) =>
      row.id === rowId
        ? {
            ...row,
            mappedFieldId: nextField,
            matchSource: nextField === 'unmapped' ? 'unmapped' : 'manual',
            confidence: nextField === 'unmapped' ? 'low' : 'high',
            manualOverride: true,
          }
        : row
    );
    onMappingsUpdated(nextMapped);
  };

  const fiveCategorySummary = useMemo(() => {
    const capitalAndEquity =
      (financials.paid_up_capital || 0) +
      (financials.statutory_reserve || 0) +
      (financials.retained_earnings_beginning || 0) +
      (financials.partners_current_account_net || 0) -
      (financials.dividends_declared || 0);

    const revenues =
      (financials.operating_revenue || 0) + (financials.other_revenue || 0);

    const expenses =
      (financials.cost_of_revenue || 0) +
      (financials.salaries_and_wages || 0) +
      (financials.rent_expense || 0) +
      (financials.general_admin_expenses || 0) +
      (financials.depreciation_expense || 0) +
      (financials.finance_costs || 0) +
      (financials.zakat_expense || 0);

    const assetsOwned =
      (financials.cash_and_equivalents || 0) +
      (financials.accounts_receivable || 0) +
      (financials.inventory || 0) +
      (financials.prepaid_and_other_current_assets || 0) +
      (financials.property_plant_equipment || 0) +
      (financials.intangible_assets || 0);

    const liabilitiesOwed =
      (financials.accounts_payable || 0) +
      (financials.accrued_and_vat_liabilities || 0) +
      (financials.zakat_payable || 0) +
      (financials.short_term_loans || 0) +
      (financials.long_term_loans || 0) +
      (financials.end_of_service_benefits || 0);

    return [
      { idx: '1', label: 'رأس المال', totalHalalas: capitalAndEquity },
      { idx: '2', label: 'الإيرادات', totalHalalas: revenues },
      { idx: '3', label: 'المصروفات', totalHalalas: expenses },
      { idx: '4', label: 'ما تملكه المنشأة', totalHalalas: assetsOwned },
      { idx: '5', label: 'ما على المنشأة', totalHalalas: liabilitiesOwed },
    ];
  }, [financials]);

  const tbDocs = documents.filter((d) => d.category === 'trial_balance');
  const otherDocs = documents.filter((d) => d.category !== 'trial_balance');
  const latestTbDoc = tbDocs[0];
  const isPdfOrImageSource = Boolean(
    latestTbDoc && /\.(pdf|png|jpe?g|webp)$/i.test(latestTbDoc.fileName)
  );

  const tbTotals = useMemo(() => {
    const totalDebit = mappedAccounts.reduce((s, r) => s + r.debitHalalas, 0);
    const totalCredit = mappedAccounts.reduce((s, r) => s + r.creditHalalas, 0);
    const diff = totalDebit - totalCredit;
    const unmappedCount = mappedAccounts.filter(
      (r) => r.mappedFieldId === 'unmapped'
    ).length;
    return {
      totalDebit,
      totalCredit,
      diff,
      isBalanced: Math.abs(diff) <= 100,
      unmappedCount,
    };
  }, [mappedAccounts]);

  const visibleAccounts = useMemo(() => {
    if (filterMode === 'unmapped') {
      return mappedAccounts.filter((r) => r.mappedFieldId === 'unmapped');
    }
    return mappedAccounts;
  }, [mappedAccounts, filterMode]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            المرحلة 3: رفع المستندات المالية واستخراج الحسابات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ارفع ميزان المراجعة من برنامجك المحاسبي، فتُقرأ حساباته وتُوزّع على بنود القوائم لتراجعها قبل الحفظ. هذه الخطوة اختيارية — يمكنك إدخال الأرقام يدوياً في المرحلة التالية.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label
            className={`px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              parsing ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            {parsing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>رفع ميزان PDF</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={parsing}
              onChange={(e) => {
                void handleTrialBalanceFile(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={handleDownloadSampleExcel}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            تنزيل قالب Excel
          </button>
          <button
            type="button"
            onClick={handleLoadSampleDirectly}
            className="px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            تجربة ملف ميزان مراجعة جاهز
          </button>
        </div>
      </div>

      {/* Prominent Drag-and-Drop Zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          void handleTrialBalanceFile(e.dataTransfer.files?.[0]);
        }}
        className={`block w-full py-10 px-6 rounded-xl border-2 border-dashed text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-blue-600 bg-blue-50/60'
            : 'border-blue-300/80 hover:border-blue-500 bg-slate-50/30'
        }`}
      >
        <div className="flex flex-col items-center gap-2.5">
          {parsing ? (
            <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-blue-700" />
          )}
          <div className="text-sm font-bold text-slate-900">
            {parsing
              ? `جاري قراءة المستند (${parsingFileName || ''}) واستخراج الحسابات وتصنيفها تلقائياً...`
              : 'اسحب ميزان المراجعة وأفلته هنا، أو اضغط للاختيار'}
          </div>
          <div className="text-xs text-slate-500">
            ملف Excel (.xlsx) أو CSV، أو PDF متعددة الصفحات أو صورة للميزان — حتى 15 ميجابايت
          </div>
        </div>
        <input
          type="file"
          accept=".pdf,application/pdf,.xlsx,.xls,.csv,image/*"
          disabled={parsing}
          onChange={(e) => {
            void handleTrialBalanceFile(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="sr-only"
        />
      </label>

      {parseError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {parseError}
        </div>
      )}

      {/* Uploaded Trial Balance File Row */}
      {tbDocs.length > 0 && (
        <div className="space-y-2.5">
          {tbDocs.map((doc) => (
            <div
              key={doc.id}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {doc.fileName}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {doc.parsedRowCount !== undefined && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    تم استيراد {doc.parsedRowCount} حساباً
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveDocument(doc.id)}
                  aria-label="حذف الملف"
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Per-Account Classification Review Table (matches customer workflow) */}
      {mappedAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-800 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>صنّفها المحرك الذكي</span>
              </span>
              {isPdfOrImageSource && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  <span>قُرئ من PDF — طابق المبالغ مع المستند</span>
                </span>
              )}
              {tbTotals.isBalanced ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    الميزان متوازن ({formatNumber(tbTotals.totalDebit)} ر.س)
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-800 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    فرق توازن الميزان: {formatSar(Math.abs(tbTotals.diff))}
                  </span>
                </span>
              )}
            </div>

            {tbTotals.unmappedCount > 0 && (
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  كل الحسابات ({mappedAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('unmapped')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    filterMode === 'unmapped'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  لا يُستورد ({tbTotals.unmappedCount})
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600">
            راجع البند المقترح لكل حساب وغيّره إن لزم. الحسابات المعلّمة «لا يُستورد» لن تُنقل — مثل أرصدة أول المدة أو الحسابات الوسيطة التي تُدخل يدوياً.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">الحساب</th>
                    <th className="px-4 py-3 text-center font-semibold">الرصيد</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      البند في القوائم
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAccounts.map((row) => {
                    const isUnmapped = row.mappedFieldId === 'unmapped';
                    const isDebit = row.endingNetHalalas >= 0;
                    const absBalance = Math.abs(row.endingNetHalalas);
                    return (
                      <tr
                        key={row.id}
                        className={
                          isUnmapped
                            ? 'bg-amber-50/55 hover:bg-amber-50'
                            : 'hover:bg-slate-50/70'
                        }
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">
                            {row.accountName}
                          </div>
                          {row.accountCode && (
                            <div className="text-[10px] font-mono-num text-slate-400">
                              {row.accountCode}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          <span
                            className="font-mono-num font-bold text-slate-900"
                            dir="ltr"
                          >
                            {formatNumber(absBalance)}
                          </span>{' '}
                          <span className="text-[11px] text-slate-500">
                            {isDebit ? 'مدين' : 'دائن'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 min-w-[230px]">
                          <select
                            value={row.mappedFieldId}
                            onChange={(e) =>
                              handleRowMappingChange(
                                row.id,
                                e.target.value as QawaemFieldId | 'unmapped'
                              )
                            }
                            aria-label={`تصنيف حساب ${row.accountName}`}
                            className={`w-full h-9 px-3 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                              isUnmapped
                                ? 'bg-white border-amber-300 text-amber-900'
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="unmapped">لا يُستورد</option>
                            {TAXONOMY_GROUPS.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {QAWAEM_TAXONOMY.filter((t) =>
                                  group.sections.includes(t.section)
                                ).map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.arabicLabel}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-600">
                {tbTotals.unmappedCount > 0
                  ? `${tbTotals.unmappedCount} حسابات لن تُستورد — غيّر بندها إن أردت نقلها.`
                  : 'تم تصنيف جميع الحسابات وهي جاهزة للنقل إلى المرحلة 4.'}
              </span>
              <button
                type="button"
                onClick={onNext}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد التصنيف ونقله إلى البيانات المالية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automatic 5-Category Classification Summary */}
      {trialBalanceCount > 0 && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>
                ملخص توزيع الحسابات المستخرجة على خطوات المرحلة 4
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {fiveCategorySummary.map((cat) => (
              <div
                key={cat.idx}
                className="p-3 rounded-lg bg-white border border-slate-200 space-y-1"
              >
                <div className="text-[11px] font-bold text-slate-600">
                  {cat.idx}. {cat.label}
                </div>
                <div
                  className="text-xs font-bold font-mono-num text-slate-900"
                  dir="ltr"
                >
                  {formatSar(cat.totalHalalas)}
                </div>
              </div>
            ))}
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1">
              <div className="text-[11px] font-bold text-blue-900">
                6. المراجعة
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                جاهزة في المرحلة التالية
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optional Supporting Attachments */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="text-xs font-bold text-slate-800">
          مرفقات إضافية اختيارية (السجل التجاري، عقد التأسيس، كشوفات البنك/الزكاة)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { cat: 'commercial_register' as const, label: 'نسخة السجل التجاري' },
            { cat: 'articles_of_association' as const, label: 'عقد التأسيس' },
            { cat: 'bank_or_vat' as const, label: 'كشوفات البنك / الضريبة' },
          ].map((item) => (
            <label
              key={item.cat}
              className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 flex items-center justify-between gap-2 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                إرفاق
              </span>
              <input
                type="file"
                accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png"
                onChange={(e) => {
                  handleSupportingDoc(item.cat, e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>
          ))}
        </div>

        {otherDocs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherDocs.map((doc) => (
              <div
                key={doc.id}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center gap-2"
              >
                <span className="text-slate-700 font-medium">{doc.fileName}</span>
                <button
                  type="button"
                  onClick={() => onRemoveDocument(doc.id)}
                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          السابق
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          {mappedAccounts.length > 0
            ? 'متابعة إلى البيانات المالية'
            : 'تخطّي والإدخال يدوياً ←'}
        </button>
      </div>
    </div>
  );
};
