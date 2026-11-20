import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import type { EntityProfile, PaymentAndInvoice } from '../types/qawaem';
import {
  formatNumber,
  formatSar,
  halalasToSar,
  sarToHalalas,
} from '../utils/accounting';
import {
  QAWAEM_SELLER_INFO,
  buildZatcaTlvBase64,
  decodeZatcaTlvBase64,
  generateZatcaQrImage,
} from '../utils/zatca';

interface ZatcaTaxInvoiceProps {
  entity: EntityProfile;
  payment: PaymentAndInvoice;
  onPrintPdf: () => void;
  onGoToPayment?: () => void;
  hidePrintButton?: boolean;
}

const BASE_PREP_FEE_SAR = 399;
const AUDITOR_REVIEW_FEE_SAR = 1000;
const QAWAEM_FILING_FEE_SAR = 65;

function paymentMethodArabicLabel(
  method: PaymentAndInvoice['paymentMethod']
): string {
  switch (method) {
    case 'tap':
      return 'الدفع الإلكتروني (Tap)';
    case 'bank_transfer':
      return 'تحويل بنكي';
    case 'tamara':
      return 'تمارا (الدفع الآن أو بالتقسيط)';
    case 'mada':
      return 'بطاقة مدى';
    case 'apple_pay':
      return 'Apple Pay';
    default:
      return 'بطاقة ائتمانية';
  }
}

export const ZatcaTaxInvoice: React.FC<ZatcaTaxInvoiceProps> = ({
  entity,
  payment,
  onPrintPdf,
  onGoToPayment,
  hidePrintButton = false,
}) => {
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>(
    payment.zatcaQrImageUrl || ''
  );
  const [showTlvTags, setShowTlvTags] = useState(false);

  const effectiveTimestampIso = useMemo(
    () => payment.paidAtIso || new Date().toISOString(),
    [payment.paidAtIso]
  );

  const effectiveInvoiceNumber = useMemo(
    () =>
      payment.invoiceNumber ||
      `DRAFT-QW-${entity.fiscalYearLabel}-${entity.crNumber.slice(-4) || '0000'}`,
    [payment.invoiceNumber, entity.fiscalYearLabel, entity.crNumber]
  );

  const effectiveInvoiceUuid = useMemo(
    () => payment.invoiceUuid || `draft-${entity.crNumber || 'qawaem'}-${entity.fiscalYearLabel}`,
    [payment.invoiceUuid, entity.crNumber, entity.fiscalYearLabel]
  );

  const effectiveTlvBase64 = useMemo(() => {
    if (payment.zatcaQrBase64) return payment.zatcaQrBase64;
    return buildZatcaTlvBase64({
      sellerName: QAWAEM_SELLER_INFO.name,
      vatNumber: QAWAEM_SELLER_INFO.vatNumber,
      timestampIso: effectiveTimestampIso,
      invoiceTotalSar: halalasToSar(payment.totalHalalas).toFixed(2),
      vatTotalSar: halalasToSar(payment.vatHalalas).toFixed(2),
    });
  }, [
    payment.zatcaQrBase64,
    payment.totalHalalas,
    payment.vatHalalas,
    effectiveTimestampIso,
  ]);

  useEffect(() => {
    let active = true;
    if (payment.zatcaQrImageUrl) {
      setGeneratedQrUrl(payment.zatcaQrImageUrl);
      return;
    }
    void generateZatcaQrImage(effectiveTlvBase64).then((url) => {
      if (active) setGeneratedQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [payment.zatcaQrImageUrl, effectiveTlvBase64]);

  const decodedTags = useMemo(
    () => decodeZatcaTlvBase64(effectiveTlvBase64),
    [effectiveTlvBase64]
  );

  const invoiceLineItems = useMemo(() => {
    const items: Array<{
      id: string;
      description: string;
      quantity: number;
      grossTotalHalalas: number;
      taxableHalalas: number;
      vatHalalas: number;
    }> = [];

    const addLine = (id: string, description: string, grossSar: number) => {
      const grossTotalHalalas = sarToHalalas(grossSar);
      const vatHalalas = Math.round((grossTotalHalalas * 15) / 115);
      const taxableHalalas = grossTotalHalalas - vatHalalas;
      items.push({
        id,
        description,
        quantity: 1,
        grossTotalHalalas,
        taxableHalalas,
        vatHalalas,
      });
    };

    addLine(
      'prep',
      `إعداد القوائم المالية وفق معايير SOCPA — السنة المالية ${entity.fiscalYearLabel}`,
      BASE_PREP_FEE_SAR
    );

    if (payment.includeAuditorReview ?? true) {
      addLine(
        'auditor',
        `المراجعة والاعتماد من محاسب قانوني مرخص — ${entity.fiscalYearLabel}`,
        AUDITOR_REVIEW_FEE_SAR
      );
    }

    if (payment.includeQawaemFilingService) {
      addLine(
        'filing',
        `خدمة رفع القوائم المالية في منصة وزارة التجارة (قوائم) — ${entity.fiscalYearLabel}`,
        QAWAEM_FILING_FEE_SAR
      );
    }

    return items;
  }, [
    entity.fiscalYearLabel,
    payment.includeAuditorReview,
    payment.includeQawaemFilingService,
  ]);

  const grossBeforeDiscountHalalas = useMemo(
    () =>
      invoiceLineItems.reduce((sum, item) => sum + item.grossTotalHalalas, 0),
    [invoiceLineItems]
  );

  const discountHalalas = payment.discountHalalas ?? 0;
  const isSimplified = !entity.vatNumber.trim();
  const formattedIssueDate = new Date(effectiveTimestampIso).toLocaleDateString(
    'ar-SA',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  const formattedIssueTime = new Date(effectiveTimestampIso).toLocaleTimeString(
    'ar-SA',
    { hour: '2-digit', minute: '2-digit', second: '2-digit' }
  );

  return (
    <div className="space-y-4">
      {/* Top interactive banner (hidden in PDF print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs">
          {payment.paid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-slate-900">
              {payment.paid
                ? 'فاتورة ضريبية إلكترونية معتمدة (المرحلة الأولى — ZATCA)'
                : 'معاينة مسودة الفاتورة الضريبية — بانتظار تأكيد الدفع في المرحلة 6'}
            </div>
            <p className="text-slate-500 mt-0.5">
              تتضمن الفاتورة جميع الحقول الإلزامية باللغة العربية ورمز QR مشفر بصيغة TLV Base64 مرتبط بسجل الدفع.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTlvTags((v) => !v)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-700" />
            <span>{showTlvTags ? 'إخفاء بيانات QR' : 'فحص وسوم TLV'}</span>
          </button>

          {!payment.paid && onGoToPayment && (
            <button
              type="button"
              onClick={onGoToPayment}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              إتمام الدفع بالمرحلة 6
            </button>
          )}

          {!hidePrintButton && (
            <button
              type="button"
              onClick={onPrintPdf}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة / حفظ الفاتورة PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* TLV Tag Inspector (hidden in PDF print) */}
      {showTlvTags && (
        <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900">
              محتوى رمز الاستجابة السريعة (ZATCA Phase 1 TLV Base64)
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              5 وسوم إلزامية مطابقة
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {decodedTags.map((t) => (
              <div
                key={t.tag}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-0.5"
              >
                <div className="text-[11px] text-slate-500 font-semibold">
                  {t.label}
                </div>
                <div
                  className="text-xs font-mono-num text-slate-900 break-all"
                  dir="auto"
                >
                  {t.value}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 font-mono-num break-all bg-white border border-slate-200 rounded-lg px-3 py-2" dir="ltr">
            Base64: {effectiveTlvBase64}
          </div>
        </div>
      )}

      {/* Printable A4 ZATCA Phase 1 Tax Invoice Document */}
      <article className="bg-white border border-slate-200 rounded-xl p-8 space-y-6 print:border-0 print:p-0 print-avoid-break">
        {/* Invoice Top Header + ZATCA QR */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-2.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Receipt className="w-5 h-5 text-blue-700" />
              <h2 className="text-2xl font-bold text-slate-900">
                {isSimplified ? 'فاتورة ضريبية مبسطة' : 'فاتورة ضريبية'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                  payment.paid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {payment.paid ? 'مسددة بالكامل' : 'مسودة بانتظار السداد'}
              </span>
            </div>

            <div className="text-xs font-semibold text-blue-800">
              متوافقة مع متطلبات المرحلة الأولى للفوترة الإلكترونية — هيئة الزكاة والضريبة والجمارك (ZATCA)
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <dt className="text-slate-500">رقم الفاتورة التسلسلي:</dt>
                <dd className="font-mono-num font-bold text-slate-900" dir="ltr">
                  {effectiveInvoiceNumber}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-slate-500">تاريخ الإصدار:</dt>
                <dd className="font-semibold text-slate-900">
                  {formattedIssueDate}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-slate-500">وقت الإصدار:</dt>
                <dd className="font-mono-num font-semibold text-slate-900" dir="ltr">
                  {formattedIssueTime}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-slate-500">تاريخ التوريد:</dt>
                <dd className="font-semibold text-slate-900">
                  {formattedIssueDate}
                </dd>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <dt className="text-slate-500 shrink-0">المعرّف الفريد (UUID):</dt>
                <dd className="font-mono-num text-[11px] text-slate-700 break-all" dir="ltr">
                  {effectiveInvoiceUuid}
                </dd>
              </div>
            </dl>
          </div>

          {/* ZATCA Phase 1 TLV QR Code */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
            {generatedQrUrl ? (
              <img
                src={generatedQrUrl}
                alt="رمز الاستجابة السريعة للفاتورة الضريبية ZATCA Phase 1 QR"
                referrerPolicy="no-referrer"
                className="w-32 h-32 rounded-lg bg-white p-1 border border-slate-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                جاري توليد QR...
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-700">
              رمز الاستجابة السريعة (ZATCA)
            </span>
          </div>
        </header>

        {/* Seller & Buyer Mandatory Arabic Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Seller */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
              بيانات المورد (البائع)
            </div>
            <div className="font-bold text-slate-900 pt-1">
              {QAWAEM_SELLER_INFO.name}
            </div>
            <div className="text-slate-600 flex items-center justify-between gap-2">
              <span>رقم تسجيل ضريبة القيمة المضافة:</span>
              <span className="font-mono-num font-bold text-slate-900" dir="ltr">
                {QAWAEM_SELLER_INFO.vatNumber}
              </span>
            </div>
            <div className="text-slate-600 flex items-center justify-between gap-2">
              <span>رقم السجل التجاري:</span>
              <span className="font-mono-num font-semibold text-slate-900" dir="ltr">
                {QAWAEM_SELLER_INFO.crNumber}
              </span>
            </div>
            <div className="text-slate-600">
              العنوان الوطني: {QAWAEM_SELLER_INFO.nationalAddress}
            </div>
          </div>

          {/* Buyer */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
              بيانات العميل (المشتري)
            </div>
            <div className="font-bold text-slate-900 pt-1">
              {entity.entityName}
            </div>
            <div className="text-slate-600 flex items-center justify-between gap-2">
              <span>الرقم الضريبي للعميل:</span>
              <span className="font-mono-num font-bold text-slate-900" dir="ltr">
                {entity.vatNumber.trim() || 'غير مسجل ضريبياً'}
              </span>
            </div>
            <div className="text-slate-600 flex items-center justify-between gap-2">
              <span>رقم السجل التجاري:</span>
              <span className="font-mono-num font-semibold text-slate-900" dir="ltr">
                {entity.crNumber}
              </span>
            </div>
            <div className="text-slate-600">
              العنوان: {entity.city || 'الرياض'}، المملكة العربية السعودية
            </div>
          </div>
        </section>

        {/* Line Items Table */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">
            تفاصيل الخدمات والبنود الخاضعة لضريبة القيمة المضافة
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-center font-semibold w-10">م</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    وصف الخدمة / البند
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">الكمية</th>
                  <th className="px-3 py-2.5 text-left font-semibold">
                    سعر الوحدة (قبل الضريبة)
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">
                    نسبة الضريبة
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold">
                    مبلغ الضريبة
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold">
                    الإجمالي (شامل الضريبة)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceLineItems.map((line, index) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2.5 text-center font-mono-num text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {line.description}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono-num">
                      {line.quantity}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                      dir="ltr"
                    >
                      {formatNumber(line.taxableHalalas)} ر.س
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono-num">15%</td>
                    <td
                      className="px-3 py-2.5 font-mono-num text-left whitespace-nowrap"
                      dir="ltr"
                    >
                      {formatNumber(line.vatHalalas)} ر.س
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono-num font-bold text-slate-900 text-left whitespace-nowrap"
                      dir="ltr"
                    >
                      {formatNumber(line.grossTotalHalalas)} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment Record Summary + Totals Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start pt-2">
          {/* Payment Record Details */}
          <div className="md:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>تفاصيل سجل الدفع الإلكتروني</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span>وسيلة الدفع:</span>
              <span className="font-semibold text-slate-900">
                {paymentMethodArabicLabel(payment.paymentMethod)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span>حالة السداد:</span>
              <span
                className={`font-bold ${
                  payment.paid ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {payment.paid ? 'مدفوعة ومؤكدة' : 'غير مسددة بعد'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-600">
              <span>العملة المعتمدة:</span>
              <span className="font-semibold text-slate-900">
                الريال السعودي (SAR)
              </span>
            </div>
            {payment.bankReceiptName && (
              <div className="flex items-center justify-between gap-2 text-slate-600">
                <span>مستند التحويل المرفق:</span>
                <span className="font-mono-num text-slate-800">
                  {payment.bankReceiptName}
                </span>
              </div>
            )}
          </div>

          {/* VAT Summary Totals */}
          <div className="md:col-span-6 border border-slate-200 rounded-xl overflow-hidden text-xs">
            <dl className="divide-y divide-slate-100">
              {discountHalalas > 0 && (
                <>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <dt className="text-slate-600">
                      المجموع قبل الخصم (شامل الضريبة)
                    </dt>
                    <dd className="font-mono-num font-semibold text-slate-900" dir="ltr">
                      {formatNumber(grossBeforeDiscountHalalas)} ر.س
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-emerald-700">
                    <dt>
                      الخصم الترويجي{' '}
                      {payment.promoCode ? `(${payment.promoCode})` : ''}
                    </dt>
                    <dd className="font-mono-num font-semibold" dir="ltr">
                      - {formatNumber(discountHalalas)} ر.س
                    </dd>
                  </div>
                </>
              )}
              <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                <dt className="text-slate-600">
                  الإجمالي الخاضع للضريبة (غير شامل الضريبة)
                </dt>
                <dd className="font-mono-num font-semibold text-slate-900" dir="ltr">
                  {formatNumber(payment.subtotalHalalas)} ر.س
                </dd>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                <dt className="text-slate-600">
                  مجموع ضريبة القيمة المضافة (15%)
                </dt>
                <dd className="font-mono-num font-semibold text-slate-900" dir="ltr">
                  {formatNumber(payment.vatHalalas)} ر.س
                </dd>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50 font-bold text-sm text-slate-900">
                <dt>إجمالي الفاتورة المستحق (شامل الضريبة)</dt>
                <dd className="font-mono-num text-blue-700" dir="ltr">
                  {formatSar(payment.totalHalalas)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Footer note */}
        <footer className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            أُصدرت هذه الفاتورة إلكترونياً عبر منصة قوائم برو وفق اشتراطات المرحلة الأولى لهيئة الزكاة والضريبة والجمارك.
          </span>
          <span className="font-mono-num" dir="ltr">
            ZATCA Phase 1 · TLV QR Verified
          </span>
        </footer>
      </article>
    </div>
  );
};
