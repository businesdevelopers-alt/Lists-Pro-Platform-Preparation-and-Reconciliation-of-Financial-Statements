import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileDown,
  Lock,
  Printer,
  RotateCcw,
  Upload,
  Wallet,
} from 'lucide-react';
import type { EntityProfile, PaymentAndInvoice } from '../types/qawaem';
import { halalasToSar, sarToHalalas } from '../utils/accounting';
import {
  QAWAEM_SELLER_INFO,
  buildZatcaTlvBase64,
  generateZatcaQrImage,
} from '../utils/zatca';
import { ZatcaTaxInvoice } from './ZatcaTaxInvoice';

interface Stage6PaymentInvoiceProps {
  entity: EntityProfile;
  payment: PaymentAndInvoice;
  onUpdatePayment: (updated: PaymentAndInvoice) => void;
  onPrev: () => void;
  onNext: () => void;
}

const BASE_PREP_FEE_SAR = 399;
const AUDITOR_REVIEW_FEE_SAR = 1000;
const QAWAEM_FILING_FEE_SAR = 65;

const PROMO_CODES: Record<string, { label: string; percentOff: number }> = {
  QAWAEM10: { label: 'خصم 10%', percentOff: 10 },
  SOCPA15: { label: 'خصم 15%', percentOff: 15 },
  BIZ20: { label: 'خصم 20%', percentOff: 20 },
};

const PAYMENT_METHODS: Array<{
  id: 'tap' | 'bank_transfer' | 'tamara';
  title: string;
  description: string;
  icon: typeof CreditCard;
}> = [
  {
    id: 'tap',
    title: 'الدفع الإلكتروني (عبر Tap)',
    description: 'دفع فوري، وتُفتح النسخة النهائية مباشرة بعد التأكيد.',
    icon: CreditCard,
  },
  {
    id: 'bank_transfer',
    title: 'تحويل بنكي',
    description: 'حوّل المبلغ ثم ارفع الإيصال، وتُفتح النسخة النهائية بعد مراجعته.',
    icon: Building2,
  },
  {
    id: 'tamara',
    title: 'تمارا — ادفع الآن أو بالتقسيط',
    description: 'دفع آمن عبر تمارا، مع خيارات الدفع المتاحة حسب أهلية العميل.',
    icon: Wallet,
  },
];

export const Stage6PaymentInvoice: React.FC<Stage6PaymentInvoiceProps> = ({
  entity,
  payment,
  onUpdatePayment,
  onPrev,
  onNext,
}) => {
  const [processing, setProcessing] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [promoInput, setPromoInput] = useState(payment.promoCode || '');
  const [promoFeedback, setPromoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(
    payment.promoCode && PROMO_CODES[payment.promoCode.toUpperCase()]
      ? {
          type: 'success',
          message: `تم تفعيل كود ${payment.promoCode.toUpperCase()} (${PROMO_CODES[payment.promoCode.toUpperCase()].label}).`,
        }
      : null
  );
  const [bankError, setBankError] = useState<string | null>(null);

  const includeAuditorReview = payment.includeAuditorReview ?? true;
  const includeQawaemFilingService = payment.includeQawaemFilingService ?? false;

  const activeMethod: 'tap' | 'bank_transfer' | 'tamara' =
    payment.paymentMethod === 'bank_transfer'
      ? 'bank_transfer'
      : payment.paymentMethod === 'tamara'
        ? 'tamara'
        : 'tap';

  const pricing = useMemo(() => {
    const baseHalalas = sarToHalalas(BASE_PREP_FEE_SAR);
    const auditorHalalas = includeAuditorReview
      ? sarToHalalas(AUDITOR_REVIEW_FEE_SAR)
      : 0;
    const filingHalalas = includeQawaemFilingService
      ? sarToHalalas(QAWAEM_FILING_FEE_SAR)
      : 0;

    const grossSubtotalHalalas = baseHalalas + auditorHalalas + filingHalalas;
    const appliedPromoKey = (payment.promoCode || '').trim().toUpperCase();
    const promo = PROMO_CODES[appliedPromoKey];
    const discountHalalas = promo
      ? Math.round((grossSubtotalHalalas * promo.percentOff) / 100)
      : 0;

    // Prices displayed in Saudi SaaS checkout are VAT-inclusive (15% extracted for ZATCA)
    const finalTotalHalalas = Math.max(0, grossSubtotalHalalas - discountHalalas);
    const vatIncludedHalalas = Math.round((finalTotalHalalas * 15) / 115);
    const netBeforeVatHalalas = finalTotalHalalas - vatIncludedHalalas;

    return {
      baseHalalas,
      auditorHalalas,
      filingHalalas,
      grossSubtotalHalalas,
      discountHalalas,
      finalTotalHalalas,
      vatIncludedHalalas,
      netBeforeVatHalalas,
    };
  }, [includeAuditorReview, includeQawaemFilingService, payment.promoCode]);

  const syncPricingUpdate = (overrides: Partial<PaymentAndInvoice>) => {
    const nextAuditor =
      overrides.includeAuditorReview ?? includeAuditorReview;
    const nextFiling =
      overrides.includeQawaemFilingService ?? includeQawaemFilingService;
    const nextPromo = (overrides.promoCode ?? payment.promoCode ?? '')
      .trim()
      .toUpperCase();

    const gross =
      sarToHalalas(BASE_PREP_FEE_SAR) +
      (nextAuditor ? sarToHalalas(AUDITOR_REVIEW_FEE_SAR) : 0) +
      (nextFiling ? sarToHalalas(QAWAEM_FILING_FEE_SAR) : 0);
    const promo = PROMO_CODES[nextPromo];
    const discount = promo ? Math.round((gross * promo.percentOff) / 100) : 0;
    const total = Math.max(0, gross - discount);
    const vat = Math.round((total * 15) / 115);
    const netSubtotal = total - vat;

    onUpdatePayment({
      ...payment,
      ...overrides,
      includeAuditorReview: nextAuditor,
      includeQawaemFilingService: nextFiling,
      promoCode: nextPromo,
      discountHalalas: discount,
      subtotalHalalas: netSubtotal,
      vatHalalas: vat,
      totalHalalas: total,
    });
  };

  const handleApplyPromo = () => {
    const normalized = promoInput.trim().toUpperCase();
    if (!normalized) {
      setPromoFeedback(null);
      syncPricingUpdate({ promoCode: '' });
      return;
    }
    const found = PROMO_CODES[normalized];
    if (!found) {
      setPromoFeedback({
        type: 'error',
        message: 'كود الخصم غير صالح. (للتجربة: QAWAEM10 أو SOCPA15)',
      });
      return;
    }
    setPromoFeedback({
      type: 'success',
      message: `تم تطبيق الكود ${normalized} (${found.label}).`,
    });
    syncPricingUpdate({ promoCode: normalized });
  };

  const handleConfirmPayment = async () => {
    setBankError(null);
    if (activeMethod === 'bank_transfer' && !payment.bankReceiptName) {
      setBankError('يرجى إرفاق إيصال التحويل البنكي قبل تأكيد الطلب.');
      return;
    }

    setProcessing(true);
    try {
      const nowIso = new Date().toISOString();
      const invoiceNumber = `INV-QW-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const invoiceUuid = crypto.randomUUID
        ? crypto.randomUUID()
        : `uuid-${Date.now()}`;

      const sellerName = QAWAEM_SELLER_INFO.name;
      const sellerVat = QAWAEM_SELLER_INFO.vatNumber;
      const totalSarStr = halalasToSar(pricing.finalTotalHalalas).toFixed(2);
      const vatSarStr = halalasToSar(pricing.vatIncludedHalalas).toFixed(2);

      const tlvBase64 = buildZatcaTlvBase64({
        sellerName,
        vatNumber: sellerVat,
        timestampIso: nowIso,
        invoiceTotalSar: totalSarStr,
        vatTotalSar: vatSarStr,
      });

      const qrUrl = await generateZatcaQrImage(tlvBase64);

      onUpdatePayment({
        ...payment,
        paymentMethod: activeMethod,
        includeAuditorReview,
        includeQawaemFilingService,
        discountHalalas: pricing.discountHalalas,
        subtotalHalalas: pricing.netBeforeVatHalalas,
        vatHalalas: pricing.vatIncludedHalalas,
        totalHalalas: pricing.finalTotalHalalas,
        paid: true,
        paidAtIso: nowIso,
        invoiceNumber,
        invoiceUuid,
        zatcaQrBase64: tlvBase64,
        zatcaQrImageUrl: qrUrl,
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCleanSarLabel = (halalas: number) => {
    const sar = halalasToSar(halalas);
    const hasFraction = Math.round((sar % 1) * 100) !== 0;
    return `${sar.toLocaleString('en-US', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })} ريال`;
  };

  const generateInvoicePdf = async () => {
    setPdfGenerating(true);
    const previousTitle = document.title;
    try {
      // Ensure TLV Base64 & QR image exist on payment record before generating PDF
      let nextPayment = payment;
      if (!payment.zatcaQrBase64 || !payment.zatcaQrImageUrl) {
        const tsIso = payment.paidAtIso || new Date().toISOString();
        const tlvBase64 =
          payment.zatcaQrBase64 ||
          buildZatcaTlvBase64({
            sellerName: QAWAEM_SELLER_INFO.name,
            vatNumber: QAWAEM_SELLER_INFO.vatNumber,
            timestampIso: tsIso,
            invoiceTotalSar: halalasToSar(payment.totalHalalas).toFixed(2),
            vatTotalSar: halalasToSar(payment.vatHalalas).toFixed(2),
          });
        const qrUrl =
          payment.zatcaQrImageUrl || (await generateZatcaQrImage(tlvBase64));
        nextPayment = {
          ...payment,
          zatcaQrBase64: tlvBase64,
          zatcaQrImageUrl: qrUrl,
        };
        onUpdatePayment(nextPayment);
      }

      document.title = `ZATCA_Invoice_${nextPayment.invoiceNumber || entity.crNumber}`;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      window.print();
    } finally {
      window.setTimeout(() => {
        document.title = previousTitle;
        setPdfGenerating(false);
      }, 400);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 print:border-0 print:p-0 print:rounded-none">
      {/* Stage Header matching screenshot */}
      <div className="no-print border-b border-slate-100 pb-5">
        <h1 className="text-xl font-bold text-slate-900">
          المرحلة 6: الدفع والفاتورة
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          اختر طريقة الدفع، وتظهر قوائمك المالية مباشرة بعد إتمامه. تصدر فاتورتك تلقائياً بعد تأكيد الدفع.
        </p>
      </div>

      {!payment.paid ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Right Column (RTL first): Order Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">ملخص الطلب</h2>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                آمن ومشفر
              </span>
            </div>

            <div className="space-y-3 text-xs border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">الخدمة</span>
                <span className="font-bold text-slate-900">إعداد القوائم المالية</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">المنشأة</span>
                <span className="font-bold text-slate-900 text-left">
                  {entity.entityName}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                السنوات المالية
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="font-mono-num text-slate-700">
                  {entity.fiscalYearLabel}
                </span>
                <span className="font-mono-num font-bold text-slate-900">
                  {formatCleanSarLabel(pricing.baseHalalas)}
                </span>
              </div>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeAuditorReview}
                    onChange={(e) =>
                      syncPricingUpdate({
                        includeAuditorReview: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>
                    المراجعة والاعتماد من محاسب قانوني —{' '}
                    <span className="font-mono-num">{entity.fiscalYearLabel}</span>
                  </span>
                </span>
                <span className="font-mono-num font-bold text-slate-900 shrink-0">
                  {includeAuditorReview
                    ? formatCleanSarLabel(sarToHalalas(AUDITOR_REVIEW_FEE_SAR))
                    : '0 ريال'}
                </span>
              </label>

              {/* Qawaem Ministry Upload Add-on Box */}
              <label
                className={`block rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  includeQawaemFilingService
                    ? 'bg-blue-50/50 border-blue-300'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={includeQawaemFilingService}
                    onChange={(e) =>
                      syncPricingUpdate({
                        includeQawaemFilingService: e.target.checked,
                      })
                    }
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      نرفع قوائمك في منصة وزارة التجارة (قوائم) — 65 ريال عن كل سنة
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      يتولى فريقنا رفع القوائم المعتمدة في منصة «قوائم» نيابةً عنك، ونؤكد لك هنا عند اكتمال الرفع.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Optional Promo Code */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-medium text-slate-700">
                كود الخصم (اختياري)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="أدخل كود الخصم"
                  className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  تطبيق
                </button>
              </div>
              {promoFeedback && (
                <p
                  className={`text-[11px] font-medium ${
                    promoFeedback.type === 'success'
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {promoFeedback.message}
                </p>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">المجموع الفرعي</span>
                <span className="font-mono-num font-semibold text-slate-800">
                  {formatCleanSarLabel(pricing.grossSubtotalHalalas)}
                </span>
              </div>

              {pricing.discountHalalas > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>الخصم</span>
                  <span className="font-mono-num font-semibold">
                    - {formatCleanSarLabel(pricing.discountHalalas)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">
                  الإجمالي النهائي
                </span>
                <span className="text-base font-bold font-mono-num text-blue-700">
                  {formatCleanSarLabel(pricing.finalTotalHalalas)}
                </span>
              </div>
            </div>
          </div>

          {/* Left Column (RTL second): Payment Method Selection Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  اختر طريقة الدفع
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ادفع إلكترونياً بأمان عبر Tap أو اختر الوسيلة الأنسب لمنشأتك.
                </p>
              </div>
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
            </div>

            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = activeMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setBankError(null);
                      onUpdatePayment({ ...payment, paymentMethod: method.id });
                    }}
                    className={`w-full rounded-xl border p-3.5 text-right flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/75 border-blue-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white border-blue-200 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          {method.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {method.description}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Method-specific details panel */}
            {activeMethod === 'bank_transfer' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3 text-xs">
                <div className="font-bold text-slate-900">
                  بيانات الحساب البنكي للتحويل
                </div>
                <div className="space-y-1 text-slate-600">
                  <div>البنك: مصرف الإنماء — شركة منصة قوائم برو للتقنية المالية</div>
                  <div className="font-mono-num" dir="ltr">
                    IBAN: SA44 0500 0068 2019 4412 8000
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {payment.bankReceiptName
                        ? `تم إرفاق: ${payment.bankReceiptName}`
                        : 'إرفاق إيصال التحويل (PDF / صورة)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBankError(null);
                          onUpdatePayment({
                            ...payment,
                            paymentMethod: 'bank_transfer',
                            bankReceiptName: file.name,
                          });
                        }
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
                {bankError && (
                  <p className="text-[11px] font-semibold text-red-700">
                    {bankError}
                  </p>
                )}
              </div>
            )}

            {activeMethod === 'tamara' && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 text-xs text-violet-950 space-y-1">
                <div className="font-bold">خطة التقسيط الميسرة عبر تمارا</div>
                <p className="text-[11px] text-violet-900">
                  قسّم المبلغ على 4 دفعات شهرية بدون رسوم أو فوائد بقيمة{' '}
                  <span className="font-mono-num font-bold">
                    {formatCleanSarLabel(Math.round(pricing.finalTotalHalalas / 4))}
                  </span>{' '}
                  لكل دفعة.
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
              <div className="text-xs font-bold text-slate-900">دفع آمن</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                أكمل الدفع عبر بوابة الدفع الآمنة. تُدخل بيانات البطاقة في صفحة البوابة، ولا تُحفظ في المنصة.
              </p>
            </div>

            {/* Pay CTA Button */}
            <button
              type="button"
              disabled={processing}
              onClick={handleConfirmPayment}
              className="w-full py-3.5 px-5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold rounded-full inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {processing
                  ? 'جاري تأكيد السداد وإصدار الفاتورة...'
                  : `ادفع ${formatCleanSarLabel(pricing.finalTotalHalalas)}`}
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>تُفتح نسختك النهائية (Word و PDF و Excel) فور تأكيد الدفع</span>
            </div>
          </div>
        </div>
      ) : (
        /* Issued ZATCA Electronic Tax Invoice */
        <div className="space-y-6">
          <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <div className="font-bold">تم السداد وإصدار الفاتورة الضريبية بنجاح</div>
                <div className="text-emerald-800 mt-0.5">
                  يمكنك طباعة الفاتورة أو حفظها بصيغة PDF الآن، أو المتابعة إلى المرحلة 7 لتصدير القوائم المالية وجدول منصة قوائم.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onUpdatePayment({
                    ...payment,
                    paid: false,
                  })
                }
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تعديل خيارات الطلب</span>
              </button>
              <button
                type="button"
                onClick={() => void generateInvoicePdf()}
                disabled={pdfGenerating}
                className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-emerald-100 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة مباشرة</span>
              </button>
              <button
                type="button"
                onClick={() => void generateInvoicePdf()}
                disabled={pdfGenerating}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>
                  {pdfGenerating
                    ? 'جاري تجهيز ملف PDF...'
                    : 'توليد وحفظ PDF'}
                </span>
              </button>
            </div>
          </div>

          <ZatcaTaxInvoice
            entity={entity}
            payment={payment}
            onPrintPdf={() => void generateInvoicePdf()}
            hidePrintButton
          />
        </div>
      )}

      {/* Navigation */}
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
          <span>المتابعة للإصدار والتصدير</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
