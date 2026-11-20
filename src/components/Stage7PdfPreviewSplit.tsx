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
} from '../types/qawaem';
import {
  QAWAEM_TAXONOMY,
  formatNumber,
  formatSar,
  getAuditorExemptionInfo,
} from '../utils/accounting';
import { ZatcaTaxInvoice } from './ZatcaTaxInvoice';

interface Stage7PdfPreviewSplitProps {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  financials: FinancialInputsHalalas;
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
type PageFocus = 'all' | 1 | 2 | 3;

export const Stage7PdfPreviewSplit: React.FC<Stage7PdfPreviewSplitProps> = ({
  entity,
  declaration,
  financials,
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
  const [pageFocus, setPageFocus] = useState<PageFocus>('all');
  const [zoomPercent, setZoomPercent] = useState<75 | 90 | 100>(90);
  const [showMarginGuides, setShowMarginGuides] = useState<boolean>(true);
  const [lineSearch, setLineSearch] = useState<string>('');
  const [verifiedAck, setVerifiedAck] = useState<boolean>(false);

  const exemption = getAuditorExemptionInfo(entity.classification);

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
        label: 'الإقرار والتوقيع الإلكتروني',
        detail: declaration.otpVerified
          ? `موقّع: ${declaration.signatoryName || 'المدير المفوض'}`
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
      ? `SOCPA_Statements_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.pdf`
      : `ZATCA_Invoice_${payment.invoiceNumber || entity.crNumber}.pdf`;

  const totalPages = docKind === 'socpa_package' ? 3 : 1;

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
                {totalPages === 1 ? 'صفحة 1' : '3 صفحات A4'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              راجع مطابقة الأرقام وهوية المنشأة وهوامش صفحات PDF في نافذة المعاينة المجاورة قبل تأكيد التحميل.
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
                <span>القوائم (SOCPA)</span>
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
                خيارات معاينة التنسيق
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
                {[
                  { id: 'all' as const, label: 'كل الصفحات (3)' },
                  { id: 1 as const, label: 'ص 1: المركز المالي' },
                  { id: 2 as const, label: 'ص 2: قائمة الدخل' },
                  { id: 3 as const, label: 'ص 3: الحقوق والتدفقات' },
                ].map((pg) => (
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

            <div className="max-h-[250px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
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
        <div className="flex-1 max-h-[780px] overflow-y-auto overflow-x-auto p-5 sm:p-6 space-y-6 bg-slate-800/80">
          {docKind === 'zatca_invoice' ? (
            <div
              className="mx-auto transition-transform origin-top"
              style={{
                width: `${Math.round(720 * zoomScale)}px`,
              }}
            >
              <div
                className={`bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden ${
                  showMarginGuides
                    ? 'p-5 ring-1 ring-slate-300'
                    : 'p-4'
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
            <div className="space-y-6">
              {/* PAGE 1: Cover, Management Report & Balance Sheet */}
              {(pageFocus === 'all' || pageFocus === 1) && (
                <div
                  className="mx-auto bg-white text-slate-900 shadow-2xl rounded-sm transition-all"
                  style={{
                    width: `${Math.round(720 * zoomScale)}px`,
                    minHeight: `${Math.round(980 * zoomScale)}px`,
                    padding: `${Math.round(36 * zoomScale)}px`,
                  }}
                >
                  <div
                    className={`h-full flex flex-col justify-between gap-6 ${
                      showMarginGuides
                        ? 'border border-dashed border-sky-300/80 p-4'
                        : ''
                    }`}
                  >
                    <div className="space-y-5">
                      {!payment.paid && (
                        <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center justify-between">
                          <span>حالة المستند: نسخة معاينة قبل إتمام السداد</span>
                          <span>قوائم برو</span>
                        </div>
                      )}

                      {/* Cover Header */}
                      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-emerald-800">
                            المملكة العربية السعودية · القوائم المالية السنوية (SOCPA SMEs)
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {entity.entityName}
                          </h3>
                          <div className="text-[11px] text-slate-600">
                            {entity.legalForm} · سجل تجاري{' '}
                            <span className="font-mono-num">
                              {entity.crNumber}
                            </span>{' '}
                            · {entity.city}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 text-left shrink-0">
                          <div>السنة المالية المنتهية في</div>
                          <div className="font-mono-num font-bold text-slate-900 text-xs">
                            {entity.fiscalYearLabel}-{entity.fiscalYearEnd}
                          </div>
                          <div>العملة: الريال السعودي (ر.س)</div>
                        </div>
                      </div>

                      {/* Management Report Box */}
                      <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-700 leading-relaxed">
                        <div className="font-bold text-slate-900">
                          تقرير الإدارة والوضع النظامي للمراجعة
                        </div>
                        <p>
                          تقدم إدارة {entity.entityName} القوائم المالية المعدّة وفق معيار التقرير المالي للمنشآت الصغيرة ومتوسطة الحجم المعتمد من الهيئة السعودية للمراجعين والمحاسبين (SOCPA).
                        </p>
                        <p className="font-semibold text-slate-800">
                          {exemption.label}
                          {entity.classification !== 'medium_large'
                            ? ' — قوائم معدّة من قِبل الإدارة وغير مراجعة.'
                            : '.'}
                        </p>
                      </div>

                      {/* Statement 1: Balance Sheet */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                          1. قائمة المركز المالي كما في {entity.fiscalYearLabel}-
                          {entity.fiscalYearEnd}
                        </h4>
                        <table className="w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="px-2.5 py-1.5 text-right font-semibold">
                                البند
                              </th>
                              <th className="px-2.5 py-1.5 text-left font-semibold">
                                القيمة (ر.س)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="px-2.5 py-1.5">
                                النقدية بالصندوق ولدى البنوك
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.cashAndEquivalents)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">
                                الذمم المدينة التجارية بالصافي
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.accountsReceivable)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">المخزون السلعي</td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.inventory)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">
                                مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(
                                  statements.prepaidAndOtherCurrentAssets
                                )}
                              </td>
                            </tr>
                            <tr className="bg-slate-50 font-semibold">
                              <td className="px-2.5 py-1.5">
                                مجموع الأصول المتداولة
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.totalCurrentAssets)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">
                                الممتلكات والآلات والمعدات والأصول غير الملموسة
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.totalNonCurrentAssets)}
                              </td>
                            </tr>
                            <tr className="bg-emerald-50 font-bold text-emerald-950 border-y border-emerald-200">
                              <td className="px-2.5 py-2">إجمالي الأصول</td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.totalAssets)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">
                                الالتزامات المتداولة
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(
                                  statements.totalCurrentLiabilities
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-1.5">
                                الالتزامات غير المتداولة
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(
                                  statements.totalNonCurrentLiabilities
                                )}
                              </td>
                            </tr>
                            <tr className="bg-slate-50 font-semibold">
                              <td className="px-2.5 py-1.5">
                                مجموع الالتزامات
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.totalLiabilities)}
                              </td>
                            </tr>
                            <tr className="bg-slate-50 font-semibold">
                              <td className="px-2.5 py-1.5">
                                مجموع حقوق الملكية
                              </td>
                              <td
                                className="px-2.5 py-1.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.totalEquity)}
                              </td>
                            </tr>
                            <tr className="bg-emerald-50 font-bold text-emerald-950 border-y border-emerald-200">
                              <td className="px-2.5 py-2">
                                إجمالي الالتزامات وحقوق الملكية
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(
                                  statements.totalLiabilitiesAndEquity
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* PDF Page 1 Footer */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{entity.entityName} — قوائم SOCPA</span>
                      <span className="font-mono-num">صفحة 1 من 3</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 2: Income Statement */}
              {(pageFocus === 'all' || pageFocus === 2) && (
                <div
                  className="mx-auto bg-white text-slate-900 shadow-2xl rounded-sm transition-all"
                  style={{
                    width: `${Math.round(720 * zoomScale)}px`,
                    minHeight: `${Math.round(980 * zoomScale)}px`,
                    padding: `${Math.round(36 * zoomScale)}px`,
                  }}
                >
                  <div
                    className={`h-full flex flex-col justify-between gap-6 ${
                      showMarginGuides
                        ? 'border border-dashed border-sky-300/80 p-4'
                        : ''
                    }`}
                  >
                    <div className="space-y-5">
                      {/* Running Page Header */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2.5">
                        <span className="font-semibold text-slate-800">
                          {entity.entityName}
                        </span>
                        <span className="font-mono-num">
                          السنة المالية {entity.fiscalYearLabel}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                          2. قائمة الدخل عن السنة المالية المنتهية في{' '}
                          {entity.fiscalYearLabel}-{entity.fiscalYearEnd}
                        </h4>
                        <table className="w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="px-2.5 py-1.5 text-right font-semibold">
                                البند
                              </th>
                              <th className="px-2.5 py-1.5 text-left font-semibold">
                                القيمة (ر.س)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="px-2.5 py-2">
                                إيرادات النشاط الرئيسي (المبيعات)
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.operatingRevenue)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">تكلفة الإيرادات</td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.costOfRevenue)})
                              </td>
                            </tr>
                            <tr className="bg-slate-50 font-semibold">
                              <td className="px-2.5 py-2">مجمل الربح</td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.grossProfit)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">
                                إيرادات تشغيلية أخرى
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.otherRevenue)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">
                                الرواتب والأجور ومنافع الموظفين
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.salariesAndWages)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">مصروفات الإيجار</td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.rentExpense)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">
                                مصروفات عمومية وإدارية وتسويقية
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.generalAdminExpenses)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">
                                مصروف الإهلاك والإطفاء
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.depreciationExpense)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">تكاليف التمويل</td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.financeCosts)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-2.5 py-2">
                                مخصص الزكاة الشرعية للسنة
                              </td>
                              <td
                                className="px-2.5 py-2 font-mono-num text-left"
                                dir="ltr"
                              >
                                ({formatNumber(statements.zakatExpense)})
                              </td>
                            </tr>
                            <tr className="bg-emerald-50 font-bold text-emerald-950 border-y border-emerald-200">
                              <td className="px-2.5 py-2.5">
                                صافي الربح / (الخسارة) للسنة
                              </td>
                              <td
                                className="px-2.5 py-2.5 font-mono-num text-left"
                                dir="ltr"
                              >
                                {formatNumber(statements.netProfit)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* PDF Page 2 Footer */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{entity.entityName} — قائمة الدخل</span>
                      <span className="font-mono-num">صفحة 2 من 3</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: Equity, Cash Flows & Notes */}
              {(pageFocus === 'all' || pageFocus === 3) && (
                <div
                  className="mx-auto bg-white text-slate-900 shadow-2xl rounded-sm transition-all"
                  style={{
                    width: `${Math.round(720 * zoomScale)}px`,
                    minHeight: `${Math.round(980 * zoomScale)}px`,
                    padding: `${Math.round(36 * zoomScale)}px`,
                  }}
                >
                  <div
                    className={`h-full flex flex-col justify-between gap-6 ${
                      showMarginGuides
                        ? 'border border-dashed border-sky-300/80 p-4'
                        : ''
                    }`}
                  >
                    <div className="space-y-6">
                      {/* Running Page Header */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2.5">
                        <span className="font-semibold text-slate-800">
                          {entity.entityName}
                        </span>
                        <span className="font-mono-num">
                          السنة المالية {entity.fiscalYearLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Equity */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                            3. قائمة التغيرات في حقوق الملكية
                          </h4>
                          <table className="w-full text-[11px]">
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="py-1.5">رأس المال المدفوع</td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.paidUpCapital)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">الاحتياطي النظامي</td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.statutoryReserve)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">
                                  الأرباح المبقاة أول المدة
                                </td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(
                                    statements.retainedEarningsBeginning
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">صافي ربح / (خسارة) السنة</td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.netProfit)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">توزيعات الأرباح</td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  ({formatNumber(statements.dividendsDeclared)})
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">جاري الشركاء (صافي)</td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(
                                    statements.partnersCurrentAccountNet
                                  )}
                                </td>
                              </tr>
                              <tr className="font-bold bg-slate-50">
                                <td className="py-2">إجمالي حقوق الملكية</td>
                                <td
                                  className="py-2 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.totalEquity)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Cash Flow */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                            4. قائمة التدفقات النقدية (الطريقة غير المباشرة)
                          </h4>
                          <table className="w-full text-[11px]">
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="py-1.5">
                                  صافي التدفق من الأنشطة التشغيلية
                                </td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.cashFlowOperating)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">
                                  صافي التدفق من الأنشطة الاستثمارية
                                </td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.cashFlowInvesting)}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5">
                                  صافي التدفق من الأنشطة التمويلية
                                </td>
                                <td
                                  className="py-1.5 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.cashFlowFinancing)}
                                </td>
                              </tr>
                              <tr className="font-bold bg-slate-50">
                                <td className="py-2">
                                  النقدية وما في حكمها نهاية السنة
                                </td>
                                <td
                                  className="py-2 font-mono-num text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(statements.cashAndEquivalents)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2 text-[11px] text-slate-700 border-t border-slate-200 pt-4 leading-relaxed">
                        <h4 className="text-xs font-bold text-slate-900">
                          5. الإيضاحات المتممة للقوائم المالية
                        </h4>
                        <p>
                          <strong>1. التعريف والنشاط:</strong>{' '}
                          {entity.entityName}، {entity.legalForm}، مسجلة بالسجل
                          التجاري رقم {entity.crNumber}، وتزاول نشاط{' '}
                          {entity.isicDescription} (رمز ISIC: {entity.isicCode}).
                        </p>
                        <p>
                          <strong>2. أسس الإعداد:</strong> أُعدت هذه القوائم
                          المالية بالريال السعودي وفق المعيار الدولي للتقرير
                          المالي للمنشآت الصغيرة ومتوسطة الحجم المعتمد في
                          المملكة العربية السعودية (SOCPA).
                        </p>
                        <p>
                          <strong>3. الزكاة الشرعية:</strong> تم احتساب مخصص
                          الزكاة التقديري بمبلغ{' '}
                          {formatSar(statements.zakatExpense)} وتقديمه ضمن
                          الالتزامات المتداولة.
                        </p>
                      </div>

                      {declaration.signatoryName && (
                        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4 text-[11px] text-slate-700">
                          <div>
                            <div className="font-semibold text-slate-900">
                              اعتماد الإدارة: {declaration.signatoryName}
                            </div>
                            <div className="text-slate-500">
                              الصفة: {declaration.signatoryRole}
                            </div>
                          </div>
                          {declaration.signatureDataUrl &&
                          declaration.signatureDataUrl.startsWith('data:') ? (
                            <img
                              src={declaration.signatureDataUrl}
                              alt="التوقيع الإلكتروني المعتمد"
                              className="h-12 border border-slate-200 rounded bg-white px-2"
                            />
                          ) : declaration.otpVerified ? (
                            <span className="text-[11px] font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded">
                              توقيع إلكتروني موثق (OTP)
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* PDF Page 3 Footer */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{entity.entityName} — الإيضاحات والاعتماد</span>
                      <span className="font-mono-num">صفحة 3 من 3</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
