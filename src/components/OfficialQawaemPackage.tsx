import React, { useMemo } from 'react';
import type {
  ComputedStatements,
  EntityProfile,
  FinancialInputsHalalas,
  LegalDeclaration,
  PaymentAndInvoice,
  WizardDetailedLines,
} from '../types/qawaem';
import {
  buildOfficialQawaemOutput,
  formatQawaemAmount,
} from '../utils/officialQawaemOutput';

export type OfficialQawaemPageFilter = 'all' | 1 | 2 | 3 | 4 | 5 | 6;

interface OfficialQawaemPackageProps {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  financials: FinancialInputsHalalas;
  detailedLines?: WizardDetailedLines;
  statements: ComputedStatements;
  payment?: PaymentAndInvoice;
  pageFilter?: OfficialQawaemPageFilter;
  paperMode?: boolean;
  showMarginGuides?: boolean;
  zoomScale?: number;
}

interface StatementRowDef {
  label: string;
  amount?: number | null;
  note?: string;
  variant?: 'section' | 'subsection' | 'line' | 'subtotal' | 'total' | 'spacer';
}

const PageFrame: React.FC<{
  paperMode: boolean;
  showMarginGuides: boolean;
  zoomScale: number;
  pageNumber: number;
  isFirstVisible: boolean;
  children: React.ReactNode;
}> = ({
  paperMode,
  showMarginGuides,
  zoomScale,
  pageNumber,
  isFirstVisible,
  children,
}) => {
  if (paperMode) {
    return (
      <div
        className="mx-auto bg-white text-slate-950 shadow-2xl rounded-sm transition-all"
        style={{
          width: `${Math.round(740 * zoomScale)}px`,
          minHeight: `${Math.round(1020 * zoomScale)}px`,
          padding: `${Math.round(40 * zoomScale)}px`,
        }}
      >
        <div
          className={`h-full min-h-[900px] flex flex-col justify-between ${
            showMarginGuides
              ? 'border border-dashed border-sky-300/80 p-5'
              : ''
          }`}
        >
          <div className="flex-1">{children}</div>
          <div className="pt-6 text-center text-[11px] font-mono-num text-slate-700">
            {pageNumber}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`${
        !isFirstVisible ? 'print-break-before border-t border-slate-200 pt-8 print:border-t-0 print:pt-0' : ''
      } bg-white text-slate-950`}
    >
      <div className="max-w-[780px] mx-auto space-y-6">
        {children}
        <div className="pt-4 text-center text-xs font-mono-num text-slate-500">
          {pageNumber}
        </div>
      </div>
    </section>
  );
};

const OfficialHeader: React.FC<{
  entityName: string;
  legalForm: string;
  statementTitle?: string;
  periodLine?: string;
  showCurrency?: boolean;
}> = ({ entityName, legalForm, statementTitle, periodLine, showCurrency = true }) => (
  <div className="space-y-2 mb-6">
    <div className="text-right space-y-0.5">
      <div className="text-sm font-bold text-slate-950">{entityName}</div>
      <div className="text-xs text-slate-800">({legalForm})</div>
    </div>
    <div className="border-b border-slate-900" />
    {statementTitle && (
      <div className="text-right space-y-0.5 pt-1">
        <div className="text-sm font-bold text-slate-950">{statementTitle}</div>
        {periodLine && (
          <div className="text-xs font-bold text-slate-900">{periodLine}</div>
        )}
        {showCurrency && (
          <div className="text-xs text-slate-800">(ريال سعودي)</div>
        )}
      </div>
    )}
  </div>
);

const AccountingTable: React.FC<{
  periodHeader?: string;
  showNoteCol?: boolean;
  rows: StatementRowDef[];
}> = ({ periodHeader, showNoteCol = true, rows }) => (
  <table className="w-full text-[12px] border-collapse">
    {periodHeader !== undefined && (
      <thead>
        <tr>
          <th className="w-[62%] py-2 text-right font-bold text-slate-900" />
          {showNoteCol && (
            <th className="w-[14%] px-2 py-2 text-center font-bold text-slate-900 align-bottom">
              <div className="border-b border-slate-900 pb-1">إيضاح</div>
            </th>
          )}
          <th className="w-[24%] px-2 py-2 text-center font-bold text-slate-900 align-bottom">
            <div className="border-b border-slate-900 pb-1 leading-snug">
              {periodHeader}
            </div>
          </th>
        </tr>
      </thead>
    )}
    <tbody>
      {rows.map((row, idx) => {
        if (row.variant === 'spacer') {
          return (
            <tr key={`sp-${idx}`}>
              <td colSpan={showNoteCol ? 3 : 2} className="h-3" />
            </tr>
          );
        }
        if (row.variant === 'section') {
          return (
            <tr key={`sec-${idx}`}>
              <td
                colSpan={showNoteCol ? 3 : 2}
                className="pt-3 pb-1 text-right font-bold text-slate-950"
              >
                <span className="border-b border-slate-950 pb-0.5">
                  {row.label}
                </span>
              </td>
            </tr>
          );
        }
        if (row.variant === 'subsection') {
          return (
            <tr key={`sub-${idx}`}>
              <td
                colSpan={showNoteCol ? 3 : 2}
                className="pt-2 pb-1 text-right font-bold text-slate-900"
              >
                {row.label}
              </td>
            </tr>
          );
        }

        const isSubtotal = row.variant === 'subtotal';
        const isTotal = row.variant === 'total';
        const formatted =
          row.amount === null || row.amount === undefined
            ? ''
            : formatQawaemAmount(row.amount);

        return (
          <tr key={`row-${idx}`}>
            <td
              className={`py-1 text-right ${
                isSubtotal || isTotal
                  ? 'font-bold text-slate-950'
                  : 'text-slate-900'
              }`}
            >
              {row.label}
            </td>
            {showNoteCol && (
              <td className="px-2 py-1 text-center font-mono-num text-slate-700">
                {row.note || ''}
              </td>
            )}
            <td className="px-2 py-1 text-center font-mono-num" dir="ltr">
              <div
                className={`py-0.5 ${
                  isTotal
                    ? 'font-bold text-slate-950 border-t border-slate-900 border-b-4 border-double'
                    : isSubtotal
                      ? 'font-bold text-slate-950 border-t border-b border-slate-900'
                      : 'text-slate-900'
                }`}
              >
                {formatted}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export const OfficialQawaemPackage: React.FC<OfficialQawaemPackageProps> = ({
  entity,
  declaration,
  financials,
  detailedLines,
  statements,
  payment,
  pageFilter = 'all',
  paperMode = false,
  showMarginGuides = false,
  zoomScale = 1,
}) => {
  const data = useMemo(
    () =>
      buildOfficialQawaemOutput(entity, financials, detailedLines, statements),
    [entity, financials, detailedLines, statements]
  );

  const bs = data.balanceSheet;
  const inc = data.incomeStatement;
  const eq = data.equityStatement;
  const cf = data.cashFlowStatement;

  const signatoryName =
    declaration.signatoryName ||
    entity.legalRepresentative.split('—')[0]?.trim() ||
    'مدير الشركة';
  const signatoryRole = declaration.signatoryRole || 'مدير الشركة';

  const visiblePages: Array<1 | 2 | 3 | 4 | 5 | 6> =
    pageFilter === 'all' ? [1, 2, 3, 4, 5, 6] : [pageFilter];

  const isVisible = (p: 1 | 2 | 3 | 4 | 5 | 6) => visiblePages.includes(p);
  const firstVisible = visiblePages[0];

  const cleanCompanyShortName = data.entityName.replace(/^شركة\s+/, '').trim();

  const balanceSheetPage1Rows: StatementRowDef[] = [
    { label: 'الموجودات', variant: 'section' },
    { label: 'الموجودات غير المتداولة', variant: 'subsection' },
    { label: 'ممتلكات وآلات ومعدات', amount: bs.propertyPlantEquipment },
    {
      label: 'موجودات غير ملموسة باستثناء الشهرة',
      amount: bs.intangibleAssets,
    },
    { label: 'العقارات الاستثمارية', amount: bs.investmentProperties },
    {
      label: 'الاستثمارات المحتسبة باستخدام طريقة حقوق الملكية',
      amount: bs.equityMethodInvestments,
    },
    { label: 'موجودات غير متداولة أخرى', amount: bs.otherNonCurrentAssets },
    {
      label: 'إجمالي الموجودات غير المتداولة',
      amount: bs.totalNonCurrentAssets,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    { label: 'الموجودات المتداولة', variant: 'subsection' },
    {
      label: 'مصاريف مدفوعة مقدماً وأرصدة مدينة أخرى',
      amount: bs.prepaidAndOtherDebitBalances,
    },
    { label: 'ذمم مدينة تجارية', amount: bs.tradeReceivables },
    { label: 'نقد وما في حكمه', amount: bs.cashAndCashEquivalents },
    { label: 'مخزون', amount: bs.inventory },
    {
      label: 'استثمارات القيمة العادلة من خلال الأرباح والخسائر',
      amount: bs.fvtplInvestments,
    },
    { label: 'أصول متداولة أخرى', amount: bs.otherCurrentAssets },
    { label: 'مطلوب من أطراف ذات علاقة', amount: bs.dueFromRelatedParties },
    {
      label: 'إجمالي الموجودات المتداولة',
      amount: bs.totalCurrentAssets,
      variant: 'subtotal',
    },
    {
      label: 'إجمالي الموجودات',
      amount: bs.totalAssets,
      variant: 'total',
    },
    { label: '', variant: 'spacer' },
    { label: 'حقوق الملكية والمطلوبات', variant: 'section' },
    { label: 'حقوق الملكية', variant: 'subsection' },
    { label: 'رأس المال', amount: bs.shareCapital },
    { label: 'احتياطي نظامي', amount: bs.statutoryReserve },
    {
      label: 'أرباح مبقاة (خسائر متراكمة)',
      amount: bs.retainedEarningsEnding,
    },
    { label: 'عناصر أخرى لحقوق الملكية', amount: bs.otherEquityItems },
    {
      label: 'حقوق الملكية المتعلقة بملاك الشركة الأم',
      amount: bs.equityAttributableToParent,
    },
    {
      label: 'حقوق الملكية غير المسيطرة',
      amount: bs.nonControllingInterest,
    },
    {
      label: 'إجمالي حقوق الملكية',
      amount: bs.totalEquity,
      variant: 'subtotal',
    },
    { label: 'المطلوبات', variant: 'subsection' },
    { label: 'المطلوبات غير المتداولة', variant: 'subsection' },
    {
      label: 'التزام منافع الموظفين',
      amount: bs.employeeBenefitsObligation,
    },
    {
      label: 'سندات دين وقروض لأجل وقروض وصكوك مصدرة، غير متداولة',
      amount: bs.nonCurrentLoansAndSukuk,
    },
    { label: 'مطلوبات ضريبية مؤجلة', amount: bs.deferredTaxLiabilities },
    {
      label: 'مطلوبات غير متداولة أخرى',
      amount: bs.otherNonCurrentLiabilities,
    },
    {
      label: 'إجمالي المطلوبات غير المتداولة',
      amount: bs.totalNonCurrentLiabilities,
      variant: 'subtotal',
    },
    { label: 'المطلوبات المتداولة', variant: 'subsection' },
    {
      label: 'سندات دين وقروض لأجل وقروض وصكوك مصدرة، متداولة',
      amount: bs.currentLoansAndSukuk,
    },
    { label: 'الزكاة مستحقة الدفع', amount: bs.zakatPayable },
  ];

  const balanceSheetPage2Rows: StatementRowDef[] = [
    { label: 'الضرائب مستحقة الدفع', amount: bs.taxesPayable },
    { label: 'مطلوب إلى أطراف ذات علاقة', amount: bs.dueToRelatedParties },
    {
      label: 'المبالغ المستحقة للموردين والبائعين',
      amount: bs.tradePayables,
    },
    {
      label: 'مصاريف مستحقة وأرصدة دائنة أخرى',
      amount: bs.accruedAndOtherCreditBalances,
    },
    { label: 'مطلوبات متداولة أخرى', amount: bs.otherCurrentLiabilities },
    {
      label: 'إجمالي المطلوبات المتداولة',
      amount: bs.totalCurrentLiabilities,
      variant: 'subtotal',
    },
    {
      label: 'إجمالي المطلوبات',
      amount: bs.totalLiabilities,
      variant: 'subtotal',
    },
    {
      label: 'إجمالي حقوق الملكية والمطلوبات',
      amount: bs.totalEquityAndLiabilities,
      variant: 'total',
    },
  ];

  const incomeStatementRows: StatementRowDef[] = [
    { label: 'مبيعات/ الإيرادات', amount: inc.salesRevenue },
    {
      label: 'تكلفة المبيعات',
      amount: inc.costOfSales === 0 ? 0 : -Math.abs(inc.costOfSales),
    },
    { label: 'مجمل الربح', amount: inc.grossProfit, variant: 'subtotal' },
    { label: '', variant: 'spacer' },
    {
      label: 'مصاريف إدارية وعمومية',
      amount:
        inc.generalAndAdminExpenses === 0
          ? 0
          : -Math.abs(inc.generalAndAdminExpenses),
    },
    {
      label: 'مصاريف بيع وتوزيع',
      amount:
        inc.sellingAndDistributionExpenses === 0
          ? 0
          : -Math.abs(inc.sellingAndDistributionExpenses),
    },
    {
      label: 'مصاريف أخرى',
      amount: inc.otherExpenses === 0 ? 0 : -Math.abs(inc.otherExpenses),
    },
    {
      label: 'الأرباح (الخسائر) من استبعاد الاستثمارات',
      amount: inc.gainLossOnDisposalOfInvestments,
    },
    {
      label: 'الأرباح (الخسائر) من استبعاد العقارات الاستثمارية',
      amount: inc.gainLossOnDisposalOfInvestmentProperties,
    },
    {
      label: 'حصة الشركة في ربح (خسارة) شركات زميلة',
      amount: inc.shareOfAssociatesProfitLoss,
    },
    { label: 'دخل آخر', amount: inc.otherIncome },
    {
      label: 'صافي ربح الفترة قبل ضريبة الدخل',
      amount: inc.profitBeforeTax,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    {
      label: 'تكلفة مصروف التمويل',
      amount: inc.financeCost === 0 ? 0 : -Math.abs(inc.financeCost),
    },
    {
      label: 'الزكاة',
      amount: inc.zakatExpense === 0 ? 0 : -Math.abs(inc.zakatExpense),
    },
    {
      label: 'ضريبة الدخل',
      amount: inc.incomeTaxExpense === 0 ? 0 : -Math.abs(inc.incomeTaxExpense),
    },
    {
      label: 'صافي ربح الفترة',
      amount: inc.netProfitForPeriod,
      variant: 'subtotal',
    },
    {
      label: 'الربح (الخسارة)، المتعلقة بحقوق الملكية غير المسيطرة',
      amount: inc.profitNonControlling,
    },
    {
      label: 'الربح (الخسارة)، المتعلقة بمساهمي الشركة الأم',
      amount: inc.profitAttributableToParent,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    {
      label: 'الدخل الشامل الآخر',
      amount: inc.otherComprehensiveIncome,
    },
    {
      label: 'إجمالي الربح الشامل للفترة',
      amount: inc.totalComprehensiveIncome,
      variant: 'total',
    },
  ];

  const cashFlowRows: StatementRowDef[] = [
    { label: 'الأنشطة التشغيلية', variant: 'section' },
    { label: 'صافي ربح الفترة قبل ضريبة الدخل', amount: cf.profitBeforeTax },
    { label: 'التعديلات لتسوية البنود غير النقدية :', variant: 'subsection' },
    { label: 'استهلاك ممتلكات وآلات ومعدات', amount: cf.depreciationAdjustment },
    {
      label: 'المكون من مخصص التزامات منافع الموظفين',
      amount: cf.employeeBenefitsProvision,
    },
    {
      label: '',
      amount: cf.operatingBeforeWorkingCapital,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    {
      label: 'التغير في الموجودات والمطلوبات التشغيلية :',
      variant: 'subsection',
    },
    {
      label: 'مصاريف مدفوعة مقدماً وأرصدة مدينة أخرى',
      amount: cf.changeInPrepaidAndOtherDebit,
    },
    { label: 'ذمم مدينة تجارية', amount: cf.changeInTradeReceivables },
    ...(cf.changeInInventory !== 0
      ? [{ label: 'المخزون', amount: cf.changeInInventory }]
      : []),
    {
      label: 'مصاريف مستحقة وأرصدة دائنة أخرى',
      amount: cf.changeInAccruedAndPayables,
    },
    ...(cf.zakatPaidOrAdjusted !== 0
      ? [{ label: 'تعديلات الزكاة وتكاليف التمويل', amount: cf.zakatPaidOrAdjusted }]
      : []),
    {
      label: 'صافي النقد الناتج من الأنشطة التشغيلية',
      amount: cf.netCashFromOperating,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    { label: 'الأنشطة الاستثمارية', variant: 'section' },
    { label: 'إضافة ممتلكات وآلات ومعدات', amount: cf.additionsToPpe },
    ...(cf.additionsToIntangibles !== 0
      ? [{ label: 'إضافة موجودات غير ملموسة', amount: cf.additionsToIntangibles }]
      : []),
    {
      label: 'صافي النقد المستخدم في الأنشطة الاستثمارية',
      amount: cf.netCashFromInvesting,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    { label: 'الأنشطة التمويلية', variant: 'section' },
    { label: 'إضافة رأس المال', amount: cf.capitalContribution },
    { label: 'مطلوب إلى أطراف ذات علاقة', amount: cf.netRelatedPartyFinancing },
    ...(cf.loansFinancing !== 0
      ? [{ label: 'قروض وتسهيلات تمويلية', amount: cf.loansFinancing }]
      : []),
    ...(cf.dividendsPaid !== 0
      ? [{ label: 'توزيعات أرباح مدفوعة', amount: cf.dividendsPaid }]
      : []),
    {
      label: 'صافي النقد الناتج من الأنشطة التمويلية',
      amount: cf.netCashFromFinancing,
      variant: 'subtotal',
    },
    { label: '', variant: 'spacer' },
    {
      label: 'صافي التغير في النقد وما في حكمه',
      amount: cf.netChangeInCash,
      variant: 'line',
    },
    {
      label: 'النقد وما في حكمه في بداية الفترة',
      amount: cf.beginningCash,
      variant: 'line',
    },
    {
      label: 'النقد وما في حكمه في نهاية الفترة',
      amount: cf.endingCash,
      variant: 'total',
    },
  ];

  return (
    <div className={paperMode ? 'space-y-6' : 'space-y-10'}>
      {/* PAGE 1: Annual Statutory Exemption Declaration (Article 19) */}
      {isVisible(1) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={1}
          isFirstVisible={firstVisible === 1}
        >
          <div className="space-y-6 text-right text-[13px] leading-8 text-slate-950">
            {payment && !payment.paid && paperMode && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center justify-between">
                <span>حالة المستند: نسخة معاينة قبل إتمام السداد</span>
                <span>منصة قوائم برو</span>
              </div>
            )}

            <div className="text-center pt-4 pb-2">
              <h2 className="inline-block text-[15px] font-bold text-slate-950 border-b-2 border-slate-950 pb-1">
                إقرار سنوي بعدم سريان متطلب تعيين مراجع حسابات للشركة متناهية الصغر أو صغيرة
              </h2>
            </div>

            <div className="space-y-1.5 font-medium">
              <div>
                <span className="font-bold">شركة:</span> {cleanCompanyShortName}
              </div>
              <div>
                <span className="font-bold">الرقم الموحد للسجل التجاري:</span>{' '}
                <span className="font-mono-num font-bold">
                  {data.unifiedCrNumber}
                </span>
              </div>
            </div>

            <p>
              أقر أنا: {signatoryRole}، بأن الشركة بنهاية العام المالي المنتهي في (
              <span className="font-mono-num">
                {data.exemptionPeriodEndLabel}
              </span>
              ) هي شركة متناهية الصغر أو صغيرة وفقاً لنص المادة التاسعة عشرة من
              نظام الشركات والمادة السابعة من اللائحة التنفيذية للنظام.
            </p>

            <div className="space-y-2">
              <div className="font-semibold">وتكمن دفوعنا في:</div>
              <ol className="list-decimal pr-8 space-y-1.5">
                <li>
                  عدم تجاوز مجموع إيراداتها السنوية مبلغ عشرة ملايين ريال سعودي.
                </li>
                <li>عدم تجاوز أصولها مبلغ عشرة ملايين ريال سعودي.</li>
                <li>عدم تجاوز مجموع عدد موظفيها تسعة وأربعين موظفاً.</li>
              </ol>
            </div>

            <p>
              عدم انطباق الاستثناءات الواردة في الفقرة من المادة التاسعة عشرة من
              نظام الشركات على الشركة.
            </p>

            <p>
              وعدم تقدم أي شريك أو مساهم أو أكثر ممن يمثلون النسبة المقررة
              الواردة في نص الفقرة (3) من المادة التاسعة عشرة من نظام الشركات
              بطلب تعيين مراجع حسابات وفقاً للضوابط المنصوص عليها في المادة
              (الثامنة) من اللائحة التنفيذية لنظام الشركات.
            </p>

            <p>
              وبناءً على ما سبق، لا يسري على الشركة متطلب تعيين مراجع حسابات
              للسنة المالية المذكورة أعلاه، وأتعهد بصحة البيانات والإقرارات
              الواردة أعلاه، وأتحمل كافة المسؤولية والتبعات النظامية حال ثبوت
              خلاف ذلك.
            </p>

            <div className="pt-6 space-y-3">
              <div>
                <span className="font-bold">الاسم:</span> {signatoryName}
              </div>
              <div>
                <span className="font-bold">الصفة:</span> {signatoryRole}
              </div>
              <div className="flex items-center gap-6 pt-4">
                <span className="font-bold">التوقيع:</span>
                {declaration.signatureDataUrl &&
                declaration.signatureDataUrl.startsWith('data:') ? (
                  <img
                    src={declaration.signatureDataUrl}
                    alt="توقيع المفوض"
                    className="h-16 object-contain"
                  />
                ) : declaration.otpVerified ? (
                  <span className="inline-flex items-center px-3 py-1 border border-slate-400 rounded text-xs font-semibold text-slate-800">
                    موقّع إلكترونياً — {signatoryName}
                  </span>
                ) : (
                  <span className="inline-block w-48 border-b border-slate-500 h-6" />
                )}
              </div>
            </div>
          </div>
        </PageFrame>
      )}

      {/* PAGE 2: Balance Sheet (Part 1) */}
      {isVisible(2) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={2}
          isFirstVisible={firstVisible === 2}
        >
          <OfficialHeader
            entityName={data.entityName}
            legalForm={data.legalForm}
            statementTitle="قائمة المركز المالي"
            periodLine={data.asOfDateLabel}
          />
          <AccountingTable
            periodHeader={data.periodColumnLabel}
            rows={balanceSheetPage1Rows}
          />
        </PageFrame>
      )}

      {/* PAGE 3: Balance Sheet (Part 2 - Current Liabilities & Grand Totals) */}
      {isVisible(3) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={3}
          isFirstVisible={firstVisible === 3}
        >
          <OfficialHeader
            entityName={data.entityName}
            legalForm={data.legalForm}
            showCurrency={false}
          />
          <AccountingTable rows={balanceSheetPage2Rows} />
        </PageFrame>
      )}

      {/* PAGE 4: Statement of Comprehensive Income */}
      {isVisible(4) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={4}
          isFirstVisible={firstVisible === 4}
        >
          <OfficialHeader
            entityName={data.entityName}
            legalForm={data.legalForm}
            statementTitle="قائمة الدخل الشامل"
            periodLine={data.periodSubtitleLabel}
          />
          <AccountingTable
            periodHeader={data.periodColumnLabel}
            rows={incomeStatementRows}
          />
        </PageFrame>
      )}

      {/* PAGE 5: Statement of Changes in Equity (5-Column Matrix) */}
      {isVisible(5) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={5}
          isFirstVisible={firstVisible === 5}
        >
          <OfficialHeader
            entityName={data.entityName}
            legalForm={data.legalForm}
            statementTitle="قائمة التغيرات في حقوق الملكية"
            periodLine={data.periodSubtitleLabel}
          />

          <table className="w-full text-[12px] border-separate border-spacing-x-2 border-spacing-y-1">
            <thead>
              <tr>
                <th className="w-[32%] pb-1 text-right font-bold text-slate-950 border-b border-slate-900">
                  {data.fiscalYearLabel}م
                </th>
                <th className="w-[15%] pb-1 text-center font-bold text-slate-950 border-b border-slate-900">
                  رأس المال
                </th>
                <th className="w-[15%] pb-1 text-center font-bold text-slate-950 border-b border-slate-900">
                  احتياطي نظامي
                </th>
                <th className="w-[22%] pb-1 text-center font-bold text-slate-950 border-b border-slate-900">
                  أرباح مبقاة (خسائر متراكمة)
                </th>
                <th className="w-[16%] pb-1 text-center font-bold text-slate-950 border-b border-slate-900">
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-right text-slate-900">
                  {data.openingBalanceLabel}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.openingCapital)}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.openingStatutoryReserve)}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.openingRetainedEarnings)}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.openingTotal)}
                </td>
              </tr>

              {eq.paidInCapitalMovement !== 0 && (
                <tr>
                  <td className="py-2 text-right text-slate-900">
                    رأس المال المدفوع
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    {formatQawaemAmount(eq.paidInCapitalMovement)}
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    {formatQawaemAmount(eq.paidInCapitalMovement)}
                  </td>
                </tr>
              )}

              <tr>
                <td className="py-2 text-right text-slate-900">
                  {eq.netProfitMovement < 0
                    ? 'صافي خسارة الفترة'
                    : 'صافي ربح الفترة'}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  -
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  -
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.netProfitMovement)}
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.netProfitMovement)}
                </td>
              </tr>

              {eq.dividendsMovement !== 0 && (
                <tr>
                  <td className="py-2 text-right text-slate-900">
                    توزيعات الأرباح
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    {formatQawaemAmount(eq.dividendsMovement)}
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    {formatQawaemAmount(eq.dividendsMovement)}
                  </td>
                </tr>
              )}

              {eq.otherEquityMovement !== 0 && (
                <tr>
                  <td className="py-2 text-right text-slate-900">
                    عناصر أخرى لحقوق الملكية (جاري الشركاء)
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    -
                  </td>
                  <td className="py-2 text-center font-mono-num" dir="ltr">
                    {formatQawaemAmount(eq.otherEquityMovement)}
                  </td>
                </tr>
              )}

              <tr>
                <td className="py-2 text-right text-slate-900">
                  الدخل الشامل الآخر
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  -
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  -
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  -
                </td>
                <td className="py-2 text-center font-mono-num" dir="ltr">
                  {formatQawaemAmount(eq.otherComprehensiveIncome)}
                </td>
              </tr>

              <tr className="font-bold text-slate-950">
                <td className="py-2 text-right">
                  {data.closingBalanceDateLabel}
                </td>
                <td
                  className="py-2 text-center font-mono-num border-t border-slate-900 border-b-4 border-double"
                  dir="ltr"
                >
                  {formatQawaemAmount(eq.closingCapital)}
                </td>
                <td
                  className="py-2 text-center font-mono-num border-t border-slate-900 border-b-4 border-double"
                  dir="ltr"
                >
                  {formatQawaemAmount(eq.closingStatutoryReserve)}
                </td>
                <td
                  className="py-2 text-center font-mono-num border-t border-slate-900 border-b-4 border-double"
                  dir="ltr"
                >
                  {formatQawaemAmount(eq.closingRetainedEarnings)}
                </td>
                <td
                  className="py-2 text-center font-mono-num border-t border-slate-900 border-b-4 border-double"
                  dir="ltr"
                >
                  {formatQawaemAmount(eq.closingTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </PageFrame>
      )}

      {/* PAGE 6: Statement of Cash Flows */}
      {isVisible(6) && (
        <PageFrame
          paperMode={paperMode}
          showMarginGuides={showMarginGuides}
          zoomScale={zoomScale}
          pageNumber={6}
          isFirstVisible={firstVisible === 6}
        >
          <OfficialHeader
            entityName={data.entityName}
            legalForm={data.legalForm}
            statementTitle="قائمة التدفقات النقدية"
            periodLine={data.periodSubtitleLabel}
          />
          <AccountingTable
            periodHeader={data.periodColumnLabel}
            showNoteCol={false}
            rows={cashFlowRows}
          />
        </PageFrame>
      )}
    </div>
  );
};
