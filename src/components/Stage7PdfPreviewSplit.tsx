import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Maximize2,
  Printer,
  Receipt,
  Search,
  ZoomIn,
  ZoomOut,
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
} from '../utils/accounting';
import {
  OfficialQawaemPackage,
  type OfficialQawaemPageFilter,
} from './OfficialQawaemPackage';
import { ZatcaTaxInvoice } from './ZatcaTaxInvoice';

interface Stage7PdfPreviewSplitProps {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  financials: FinancialInputsHalalas;
  detailedLines?: WizardDetailedLines;
  statements: ComputedStatements;
  payment: PaymentAndInvoice;
  docxLoading: boolean;
  onDownloadDocx: () => void;
  onDownloadExcel: () => void;
  onPrintSocpaPdf: () => void;
  onPrintZatcaInvoicePdf: () => void;
  onGoToPayment: () => void;
}

type PreviewDocKind = 'socpa_package' | 'zatca_invoice';

export const Stage7PdfPreviewSplit: React.FC<Stage7PdfPreviewSplitProps> = ({
  entity,
  declaration,
  financials,
  detailedLines,
  statements,
  payment,
  docxLoading,
  onDownloadDocx,
  onDownloadExcel,
  onPrintSocpaPdf,
  onPrintZatcaInvoicePdf,
  onGoToPayment,
}) => {
  const [docKind, setDocKind] = useState<PreviewDocKind>('socpa_package');
  const [pageFocus, setPageFocus] = useState<OfficialQawaemPageFilter>('all');
  const [zoomPercent, setZoomPercent] = useState<75 | 90 | 100>(90);
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(true);
  const [lineSearch, setLineSearch] = useState<string>('');
  const [verifiedAck, setVerifiedAck] = useState<boolean>(false);

  const readinessChecks = useMemo(
    () => [
      {
        id: 'chk-entity',
        label: 'بيانات المنشأة والسجل التجاري',
        detail: `${entity.entityName} · ${entity.crNumber}`,
        ok:
          entity.crNumber.trim().length >= 10 &&
          entity.entityName.trim().length > 2,
      },
      {
        id: 'chk-balance',
        label: 'توازن المركز المالي',
        detail: statements.isBalanced
          ? `متوازنة (${formatSar(statements.totalAssets)})`
          : `فارق ${formatSar(Math.abs(statements.balanceDiffHalalas))}`,
        ok: statements.isBalanced,
      },
      {
        id: 'chk-declaration',
        label: 'إقرار المادة 19 والتوقيع الإلكتروني',
        detail: declaration.otpVerified
          ? `موقّع: ${declaration.signatoryName || 'مدير الشركة'}`
          : 'بانتظار استكمال التوقيع في المرحلة 2',
        ok: declaration.otpVerified && Boolean(declaration.signatureDataUrl),
      },
      {
        id: 'chk-payment',
        label: 'حالة السداد والفاتورة الضريبية',
        detail: payment.paid
          ? `مسددة · فاتورة ${payment.invoiceNumber}`
          : 'نسخة معاينة قبل السداد',
        ok: payment.paid,
      },
    ],
    [entity, statements, declaration, payment]
  );

  const filteredTaxonomy = useMemo(() => {
    const q = lineSearch.trim().toLowerCase();
    return QAWAEM_TAXONOMY.filter((item) => {
      if (!q) return true;
      return (
        item.arabicLabel.toLowerCase().includes(q) ||
        item.xbrlCode.toLowerCase().includes(q)
      );
    });
  }, [lineSearch]);

  const activeFileName =
    docKind === 'socpa_package'
      ? `Qawaem_SOCPA_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.pdf`
      : `ZATCA_Invoice_${payment.invoiceNumber || entity.crNumber}.pdf`;

  const totalPages = docKind === 'socpa_package' ? 6 : 1;
  const zoomScale = zoomPercent / 100;

  return (
    <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* LEFT / START PANE (5 cols): Data & Layout Verification Inspector */}
      <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-5 min-w-0">
        <div className="space-y-5">
          {/* Inspector Header & Document Switcher */}
          <div className="space-y-3 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                لوحة التحقق قبل التصدير النهائي
              </h2>
              <span className="text-[11px] font-mono-num text-slate-500">
                {totalPages === 1 ? 'صفحة 1' : '6 صفحات A4 رسمية'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              راجع مطابقة الإقرار السنوي (المادة 19) والقوائم المالية الأربع بتنسيق قوائم الرسمي قبل تأكيد التحميل أو الطباعة.
            </p>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setDocKind('socpa_package');
                  setPageFocus('all');
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  docKind === 'socpa_package'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>القوائم الرسمية (6 صفحات)</span>
              </button>
              <button
                type="button"
                onClick={() => setDocKind('zatca_invoice')}
                className={`px-3 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  docKind === 'zatca_invoice'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>فاتورة ZATCA</span>
              </button>
            </div>
          </div>

          {/* 4 Readiness Checks */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">
              فحص جاهزية البيانات في المستند
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {readinessChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="px-3 py-2.5 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {chk.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {chk.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {chk.detail}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                      chk.ok ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {chk.ok ? 'مكتمل' : 'تنبيه'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Layout & Page Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                التنقل بين صفحات المخرج النهائي
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showMarginGuides}
                  onChange={(e) => setShowMarginGuides(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>إظهار حدود هوامش A4</span>
              </label>
            </div>

            {docKind === 'socpa_package' && (
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'كل الصفحات (6)' },
                    { id: 1, label: 'ص 1: إقرار المادة 19' },
                    { id: 2, label: 'ص 2: المركز المالي (1)' },
                    { id: 3, label: 'ص 3: المركز المالي (2)' },
                    { id: 4, label: 'ص 4: الدخل الشامل' },
                    { id: 5, label: 'ص 5: حقوق الملكية' },
                    { id: 6, label: 'ص 6: التدفقات النقدية' },
                  ] as Array<{ id: OfficialQawaemPageFilter; label: string }>
                ).map((pg) => (
                  <button
                    key={String(pg.id)}
                    type="button"
                    onClick={() => setPageFocus(pg.id)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      pageFocus === pg.id
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {pg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cross-check Qawaem Figures Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                مطابقة أرصدة البنود المصدرة
              </span>
              <span className="text-[11px] text-slate-400 font-mono-num">
                {filteredTaxonomy.length} بند
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={lineSearch}
                onChange={(e) => setLineSearch(e.target.value)}
                placeholder="تصفية سريعة باسم البند أو الرمز..."
                className="w-full h-9 pr-8 pl-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredTaxonomy.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {item.arabicLabel}
                    </div>
                    <div className="text-[10px] font-mono-num text-slate-400">
                      {item.xbrlCode}
                    </div>
                  </div>
                  <span
                    className="font-mono-num font-bold text-slate-900 shrink-0"
                    dir="ltr"
                  >
                    {formatNumber(financials[item.id] || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final Verification & Download Actions */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedAck}
              onChange={(e) => setVerifiedAck(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>
              تحققت من صحة الأرقام وتنسيق الصفحات في نافذة المعاينة وأؤكد جاهزية التصدير النهائي.
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={
                docKind === 'socpa_package'
                  ? onPrintSocpaPdf
                  : onPrintZatcaInvoicePdf
              }
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {docKind === 'socpa_package'
                  ? verifiedAck
                    ? 'تحميل / حفظ القوائم المالية النهائية (PDF)'
                    : 'طباعة / حفظ ملف القوائم المالية (PDF)'
                  : 'طباعة / حفظ الفاتورة الضريبية (ZATCA PDF)'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={docxLoading}
                onClick={onDownloadDocx}
                className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {docxLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                )}
                <span>تحميل Word</span>
              </button>

              <button
                type="button"
                onClick={onDownloadExcel}
                className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>تحميل Excel</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT / END PANE (7 cols): In-Browser PDF Paper Mock-up Viewer */}
      <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden min-w-0">
        {/* PDF Viewer Top Chrome */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono-num text-[11px] truncate text-slate-100">
              {activeFileName}
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {payment.paid ? 'نسخة نهائية معتمدة' : 'نسخة معاينة قبل السداد'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setZoomPercent((z) => (z === 100 ? 90 : z === 90 ? 75 : 75))
              }
              aria-label="تصغير المعاينة"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono-num text-[11px] text-slate-300 min-w-[46px] text-center">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoomPercent((z) => (z === 75 ? 90 : z === 90 ? 100 : 100))
              }
              aria-label="تكبير المعاينة"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              aria-label="الحجم الكامل"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="عرض 100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Paper Canvas */}
        <div className="flex-1 max-h-[820px] overflow-y-auto overflow-x-auto p-5 sm:p-6 bg-slate-800/80">
          {docKind === 'zatca_invoice' ? (
            <div
              className="mx-auto transition-transform origin-top"
              style={{
                width: `${Math.round(740 * zoomScale)}px`,
              }}
            >
              <div
                className={`bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden ${
                  showMarginGuides ? 'p-5 ring-1 ring-slate-300' : 'p-4'
                }`}
              >
                <div
                  className={
                    showMarginGuides
                      ? 'border border-dashed border-sky-300 p-3'
                      : ''
                  }
                >
                  <ZatcaTaxInvoice
                    entity={entity}
                    payment={payment}
                    onPrintPdf={onPrintZatcaInvoicePdf}
                    onGoToPayment={onGoToPayment}
                  />
                </div>
              </div>
            </div>
          ) : (
            <OfficialQawaemPackage
              entity={entity}
              declaration={declaration}
              financials={financials}
              detailedLines={detailedLines}
              statements={statements}
              payment={payment}
              pageFilter={pageFocus}
              paperMode
              showMarginGuides={showMarginGuides}
              zoomScale={zoomScale}
            />
          )}
        </div>
      </div>
    </div>
  );
};
