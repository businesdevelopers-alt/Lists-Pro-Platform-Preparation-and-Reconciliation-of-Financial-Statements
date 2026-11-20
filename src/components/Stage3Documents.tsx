import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type {
  DocumentCategory,
  FinancialInputsHalalas,
  TrialBalanceRow,
  UploadedDocument,
} from '../types/qawaem';
import {
  SAMPLE_TRIAL_BALANCE_ROWS,
  formatSar,
  halalasToSar,
} from '../utils/accounting';
import { parseTrialBalanceFile } from '../utils/trialBalanceParser';

interface Stage3DocumentsProps {
  documents: UploadedDocument[];
  trialBalanceCount: number;
  financials: FinancialInputsHalalas;
  onAddDocument: (doc: UploadedDocument) => void;
  onRemoveDocument: (id: string) => void;
  onTrialBalanceParsed: (rows: TrialBalanceRow[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Stage3Documents: React.FC<Stage3DocumentsProps> = ({
  documents,
  trialBalanceCount,
  financials,
  onAddDocument,
  onRemoveDocument,
  onTrialBalanceParsed,
  onPrev,
  onNext,
}) => {
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingFileName, setParsingFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

  // Compute the 5-category classification totals extracted from the uploaded file
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            المرحلة 3: رفع المستندات المالية واستخراج الحسابات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ارفع ميزان المراجعة من برنامجك المحاسبي، فتُقرأ حساباته وتُوزّع تلقائياً على التصنيفات الخمسة لتراجعها قبل الحفظ. هذه الخطوة اختيارية — يمكنك إدخال الأرقام يدوياً في المرحلة التالية.
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

      {/* Prominent Drag-and-Drop Zone matching reference UI */}
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
        className={`block w-full py-12 px-6 rounded-xl border-2 border-dashed text-center transition-colors cursor-pointer ${
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
              : 'اسحب ميزان المراجعة (PDF أو Excel / CSV) وأفلته هنا، أو اضغط للاختيار'}
          </div>
          <div className="text-xs text-slate-500">
            يدعم ملفات PDF متعددة الصفحات (قيود، زوهو، دفترة، وافق، أودو)، وملفات Excel (.xlsx) وCSV والصور — حتى 15 ميجابايت
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
        <div className="space-y-3">
          {tbDocs.map((doc) => (
            <div
              key={doc.id}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {doc.fileName}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {doc.parsedRowCount !== undefined && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
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

      {/* Automatic 5-Category Classification Preview after extraction */}
      {trialBalanceCount > 0 && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>
                تم تصنيف وتوزيع الحسابات المستخرجة تلقائياً على بنود المرحلة 4 (وبانتظار الخطوة 6 للمراجعة)
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
          متابعة إلى البيانات المالية
        </button>
      </div>
    </div>
  );
};
