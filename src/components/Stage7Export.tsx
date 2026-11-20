import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Printer,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import type {
  ComputedStatements,
  EntityProfile,
  FinancialInputsHalalas,
  LegalDeclaration,
  PaymentAndInvoice,
  WizardDetailedLines,
} from '../types/qawaem';
import {
  QAWAEM_TAXONOMY,
  formatNumber,
  formatSar,
  halalasToSar,
} from '../utils/accounting';
import { exportQawaemCsv } from '../utils/trialBalanceParser';
import { downloadFinancialStatementsDocx } from '../utils/wordExport';
import { OfficialQawaemPackage } from './OfficialQawaemPackage';
import { Stage7PdfPreviewSplit } from './Stage7PdfPreviewSplit';
import { ZatcaTaxInvoice } from './ZatcaTaxInvoice';

interface Stage7ExportProps {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  statements: ComputedStatements;
  payment: PaymentAndInvoice;
  onPrev: () => void;
}

export const Stage7Export: React.FC<Stage7ExportProps> = ({
  entity,
  declaration,
  financials,
  detailedLines,
  statements,
  payment,
  onPrev,
}) => {
  const [activeTab, setActiveTab] = useState<
    'preview_mode' | 'socpa_pdf' | 'qawaem_matrix' | 'zatca_invoice'
  >('preview_mode');
  const [printTarget, setPrintTarget] = useState<'socpa' | 'invoice'>('socpa');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);

  const handlePrintSocpaPdf = () => {
    setPrintTarget('socpa');
    if (activeTab !== 'preview_mode') {
      setActiveTab('socpa_pdf');
    }
    setTimeout(() => window.print(), 140);
  };

  const handlePrintZatcaInvoicePdf = () => {
    setPrintTarget('invoice');
    if (activeTab !== 'preview_mode') {
      setActiveTab('zatca_invoice');
    }
    setTimeout(() => window.print(), 160);
  };

  const handleCopyValue = async (id: string, valueText: string) => {
    try {
      await navigator.clipboard.writeText(valueText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  };

  const handleExportQawaemExcel = () => {
    const rows = QAWAEM_TAXONOMY.map((item) => ({
      xbrlCode: item.xbrlCode,
      arabicLabel: item.arabicLabel,
      englishLabel: item.englishLabel,
      sarFormatted: halalasToSar(financials[item.id] || 0).toFixed(2),
    }));
    exportQawaemCsv(
      rows,
      `qawaem_submission_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.xlsx`
    );
  };

  const handleExportWord = async () => {
    setDocxLoading(true);
    try {
      await downloadFinancialStatementsDocx({
        entity,
        declaration,
        financials,
        detailedLines,
        statements,
      });
    } finally {
      setDocxLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              المرحلة 7: الإصدار النهائي وقوالب منصة قوائم (SOCPA & XBRL)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              صدّر حزمة القوائم المالية الرسمية (الإقرار السنوي للمادة 19 + القوائم الأربع) بصيغة PDF أو Word، أو استخدم جدول النسخ الإرشادي لإدخال الأرقام في بوابة قوائم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setActiveTab((prev) =>
                  prev === 'preview_mode' ? 'socpa_pdf' : 'preview_mode'
                )
              }
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'preview_mode'
                  ? 'bg-slate-900 text-white'
                  : 'bg-sky-50 hover:bg-sky-100 border border-sky-200 text-blue-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {activeTab === 'preview_mode'
                  ? 'عرض الصفحات كاملة'
                  : 'وضع المعاينة قبل التحميل'}
              </span>
            </button>
            <button
              type="button"
              disabled={docxLoading}
              onClick={() => void handleExportWord()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              {docxLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>تصدير Word (.docx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportQawaemExcel}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSocpaPdf}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة / حفظ القوائم PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrintZatcaInvoicePdf}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فاتورة ضريبية ZATCA (PDF)</span>
            </button>
          </div>
        </div>

        {/* Statutory Management Non-Audited Disclaimer */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/75 flex items-start gap-3 text-xs text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <div className="font-bold">
              تنبيه المسؤولية النظامية: قوائم مالية معدّة من قِبل الإدارة وغير مراجعة
            </div>
            <p className="text-amber-900/90">
              إعداد القوائم المالية وفق المعايير المعتمدة في المملكة العربية السعودية (SOCPA) مسؤولية نظامية تقع على إدارة المنشأة. هذه القوائم معدّة آلياً من البيانات المدخلة وهي غير مراجعة من مراجع حسابات قانوني خارجي.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="inline-flex flex-wrap p-1 bg-slate-100 rounded-lg gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('preview_mode')}
            className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'preview_mode'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-700" />
            <span>معاينة PDF قبل التحميل (تقسيم الشاشة)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPrintTarget('socpa');
              setActiveTab('socpa_pdf');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'socpa_pdf'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ملف القوائم المالية الكامل (6 صفحات رسمية)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qawaem_matrix')}
            className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'qawaem_matrix'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>جدول النسخ الإرشادي لمنصة قوائم</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPrintTarget('invoice');
              setActiveTab('zatca_invoice');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'zatca_invoice'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-700" />
            <span>الفاتورة الضريبية (ZATCA PDF)</span>
          </button>
        </div>
      </div>

      {/* Preview Mode: Split-Screen PDF Layout Mock-up & Data Verification */}
      {activeTab === 'preview_mode' && (
        <Stage7PdfPreviewSplit
          entity={entity}
          declaration={declaration}
          financials={financials}
          detailedLines={detailedLines}
          statements={statements}
          payment={payment}
          docxLoading={docxLoading}
          onDownloadDocx={() => void handleExportWord()}
          onDownloadExcel={handleExportQawaemExcel}
          onPrintSocpaPdf={handlePrintSocpaPdf}
          onPrintZatcaInvoicePdf={handlePrintZatcaInvoicePdf}
          onGoToPayment={onPrev}
        />
      )}

      {/* Tab 1: Qawaem Copy-Paste Matrix */}
      {activeTab === 'qawaem_matrix' && (
        <div className="no-print bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  جدول الإدخال الإرشادي المطابق لخانات منصة قوائم الحكومية (line_items)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  انسخ كل رقم بالهللات الدقيقة وألصقه مباشرة في الخانة المقابلة ببوابة قوائم بعد الدخول عبر النفاذ الوطني.
                </p>
              </div>
              <span className="text-xs font-mono-num font-semibold text-emerald-700">
                {statements.isBalanced
                  ? 'الحالة: متوازنة وجاهزة للإيداع'
                  : `تنبيه: فرق ${formatSar(statements.balanceDiffHalalas)}`}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] text-blue-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                <strong>صيغة الرفع الرسمية في منصة قوائم:</strong> تقبل بوابة «قوائم» تعبئة بنود التصنيف الموحد مباشرة في نماذج الموقع الإلكترونية مع إرفاق نسخة القوائم المالية الكاملة بصيغة <strong>PDF</strong> (وتعتمدها مكاتب المراجعة إلكترونياً للشركات غير المعفاة).
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">رمز قوائم</th>
                  <th className="px-4 py-3 text-right font-semibold">البند في منصة قوائم</th>
                  <th className="px-4 py-3 text-right font-semibold">القائمة</th>
                  <th className="px-4 py-3 text-left font-semibold">القيمة (ر.س)</th>
                  <th className="px-4 py-3 text-center font-semibold">نسخ سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {QAWAEM_TAXONOMY.map((item) => {
                  const valHalalas = financials[item.id] || 0;
                  const plainVal = halalasToSar(valHalalas).toFixed(2);
                  const isCopied = copiedId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono-num text-slate-500 whitespace-nowrap">
                        {item.xbrlCode}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">
                          {item.arabicLabel}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.englishLabel}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {item.statement === 'balance_sheet'
                          ? 'المركز المالي'
                          : item.statement === 'income_statement'
                            ? 'قائمة الدخل'
                            : 'حقوق الملكية'}
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num font-bold text-slate-900 text-left whitespace-nowrap"
                        dir="ltr"
                      >
                        {formatNumber(valHalalas)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleCopyValue(item.id, plainVal)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-200 hover:border-emerald-500 text-slate-700'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Full Official 6-Page Qawaem / SOCPA Financial Statements Package (also print target) */}
      <div
        className={`${
          activeTab === 'socpa_pdf'
            ? 'block'
            : printTarget === 'socpa'
              ? 'hidden print:block'
              : 'hidden'
        } bg-white border border-slate-200 rounded-xl p-8 print:border-0 print:p-0`}
      >
        <OfficialQawaemPackage
          entity={entity}
          declaration={declaration}
          financials={financials}
          detailedLines={detailedLines}
          statements={statements}
          payment={payment}
          pageFilter="all"
        />
      </div>

      {/* Tab 3: ZATCA Phase 1 Arabic Tax Invoice PDF (isolated when printing invoice) */}
      <div
        className={
          activeTab === 'zatca_invoice'
            ? 'block'
            : printTarget === 'invoice'
              ? 'hidden print:block'
              : 'hidden'
        }
      >
        <ZatcaTaxInvoice
          entity={entity}
          payment={payment}
          onPrintPdf={handlePrintZatcaInvoicePdf}
          onGoToPayment={onPrev}
        />
      </div>

      {/* Navigation */}
      <div className="no-print flex items-center justify-start">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          العودة للدفع والفاتورة
        </button>
      </div>
    </div>
  );
};
