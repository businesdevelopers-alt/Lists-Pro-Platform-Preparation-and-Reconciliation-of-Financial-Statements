import * as XLSX from 'xlsx';
import type {
  ComputedStatements,
  StatementRequestRecord,
} from '../types/qawaem';
import {
  computeFinancialStatements,
  formatNumber,
  formatSar,
  halalasToSar,
} from './accounting';

export type ComparativeStatementSectionId =
  | 'balance_sheet'
  | 'income_statement'
  | 'equity'
  | 'cash_flow';

export interface ComparativeLineItem {
  id: string;
  xbrlCode?: string;
  section: ComparativeStatementSectionId;
  groupLabel?: string;
  arabicLabel: string;
  currentHalalas: number;
  priorHalalas: number;
  varianceHalalas: number;
  variancePercent: number | null;
  direction: 'increase' | 'decrease' | 'unchanged';
  impact: 'favorable' | 'unfavorable' | 'neutral';
  isSubtotal?: boolean;
  isTotal?: boolean;
  isMaterial: boolean;
}

export interface ComparativeRatioKpi {
  id: string;
  label: string;
  currentDisplay: string;
  priorDisplay: string;
  deltaDisplay: string;
  impact: 'favorable' | 'unfavorable' | 'neutral';
}

export interface VarianceDriverInsight {
  id: string;
  statementLabel: string;
  itemLabel: string;
  varianceHalalas: number;
  variancePercent: number | null;
  impact: 'favorable' | 'unfavorable' | 'neutral';
  narrative: string;
}

export interface ComparativeStatementsBundle {
  currentYearLabel: string;
  priorYearLabel: string;
  currentStatements: ComputedStatements;
  priorStatements: ComputedStatements;
  items: ComparativeLineItem[];
  ratios: ComparativeRatioKpi[];
  drivers: VarianceDriverInsight[];
}

function buildLine(params: {
  id: string;
  xbrlCode?: string;
  section: ComparativeStatementSectionId;
  groupLabel?: string;
  arabicLabel: string;
  currentHalalas: number;
  priorHalalas: number;
  higherIsBetter?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
}): ComparativeLineItem {
  const varianceHalalas = params.currentHalalas - params.priorHalalas;
  let variancePercent: number | null = 0;
  if (params.priorHalalas === 0 && params.currentHalalas === 0) {
    variancePercent = 0;
  } else if (params.priorHalalas === 0) {
    variancePercent = null;
  } else {
    variancePercent =
      ((params.currentHalalas - params.priorHalalas) /
        Math.abs(params.priorHalalas)) *
      100;
  }

  const direction: ComparativeLineItem['direction'] =
    varianceHalalas > 0
      ? 'increase'
      : varianceHalalas < 0
        ? 'decrease'
        : 'unchanged';

  let impact: ComparativeLineItem['impact'] = 'neutral';
  if (typeof params.higherIsBetter === 'boolean' && varianceHalalas !== 0) {
    if (params.higherIsBetter) {
      impact = varianceHalalas > 0 ? 'favorable' : 'unfavorable';
    } else {
      impact = varianceHalalas < 0 ? 'favorable' : 'unfavorable';
    }
  }

  const isMaterial =
    Math.abs(varianceHalalas) >= 100_000 &&
    (variancePercent === null || Math.abs(variancePercent) >= 15);

  return {
    id: params.id,
    xbrlCode: params.xbrlCode,
    section: params.section,
    groupLabel: params.groupLabel,
    arabicLabel: params.arabicLabel,
    currentHalalas: params.currentHalalas,
    priorHalalas: params.priorHalalas,
    varianceHalalas,
    variancePercent,
    direction,
    impact,
    isSubtotal: params.isSubtotal,
    isTotal: params.isTotal,
    isMaterial,
  };
}

export function formatVariancePercent(percent: number | null): string {
  if (percent === null) return 'جديد';
  const rounded = Math.round(percent * 10) / 10;
  if (Object.is(rounded, -0) || rounded === 0) return '0.0%';
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded.toFixed(1)}%`;
}

export function formatSignedSar(halalas: number): string {
  if (halalas === 0) return '0.00';
  const prefix = halalas > 0 ? '+' : '-';
  return `${prefix}${formatNumber(Math.abs(halalas))}`;
}

export function buildComparativeStatements(
  currentReq: StatementRequestRecord,
  priorReq: StatementRequestRecord
): ComparativeStatementsBundle {
  const cur = computeFinancialStatements(currentReq.financials);
  const pri = computeFinancialStatements(priorReq.financials);

  const items: ComparativeLineItem[] = [
    // 1. Balance Sheet — Assets
    buildLine({
      id: 'bs-cash',
      xbrlCode: 'QW-BS-1101',
      section: 'balance_sheet',
      groupLabel: 'الأصول المتداولة',
      arabicLabel: 'النقدية بالصندوق ولدى البنوك',
      currentHalalas: cur.cashAndEquivalents,
      priorHalalas: pri.cashAndEquivalents,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'bs-ar',
      xbrlCode: 'QW-BS-1102',
      section: 'balance_sheet',
      groupLabel: 'الأصول المتداولة',
      arabicLabel: 'الذمم المدينة التجارية (العملاء)',
      currentHalalas: cur.accountsReceivable,
      priorHalalas: pri.accountsReceivable,
    }),
    buildLine({
      id: 'bs-inv',
      xbrlCode: 'QW-BS-1103',
      section: 'balance_sheet',
      groupLabel: 'الأصول المتداولة',
      arabicLabel: 'المخزون السلعي',
      currentHalalas: cur.inventory,
      priorHalalas: pri.inventory,
    }),
    buildLine({
      id: 'bs-prepaid',
      xbrlCode: 'QW-BS-1104',
      section: 'balance_sheet',
      groupLabel: 'الأصول المتداولة',
      arabicLabel: 'مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى',
      currentHalalas: cur.prepaidAndOtherCurrentAssets,
      priorHalalas: pri.prepaidAndOtherCurrentAssets,
    }),
    buildLine({
      id: 'bs-total-ca',
      section: 'balance_sheet',
      groupLabel: 'الأصول المتداولة',
      arabicLabel: 'مجموع الأصول المتداولة',
      currentHalalas: cur.totalCurrentAssets,
      priorHalalas: pri.totalCurrentAssets,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'bs-ppe',
      xbrlCode: 'QW-BS-1201',
      section: 'balance_sheet',
      groupLabel: 'الأصول غير المتداولة',
      arabicLabel: 'الممتلكات والآلات والمعدات (بالصافي)',
      currentHalalas: cur.propertyPlantEquipment,
      priorHalalas: pri.propertyPlantEquipment,
    }),
    buildLine({
      id: 'bs-intangible',
      xbrlCode: 'QW-BS-1202',
      section: 'balance_sheet',
      groupLabel: 'الأصول غير المتداولة',
      arabicLabel: 'الأصول غير الملموسة وحق الاستخدام',
      currentHalalas: cur.intangibleAssets,
      priorHalalas: pri.intangibleAssets,
    }),
    buildLine({
      id: 'bs-total-nca',
      section: 'balance_sheet',
      groupLabel: 'الأصول غير المتداولة',
      arabicLabel: 'مجموع الأصول غير المتداولة',
      currentHalalas: cur.totalNonCurrentAssets,
      priorHalalas: pri.totalNonCurrentAssets,
      isSubtotal: true,
    }),
    buildLine({
      id: 'bs-total-assets',
      section: 'balance_sheet',
      groupLabel: 'إجمالي الأصول',
      arabicLabel: 'إجمالي الأصول',
      currentHalalas: cur.totalAssets,
      priorHalalas: pri.totalAssets,
      higherIsBetter: true,
      isTotal: true,
    }),

    // Balance Sheet — Liabilities & Equity
    buildLine({
      id: 'bs-ap',
      xbrlCode: 'QW-BS-2101',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات المتداولة',
      arabicLabel: 'الذمم الدائنة التجارية (الموردون)',
      currentHalalas: cur.accountsPayable,
      priorHalalas: pri.accountsPayable,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-accrued',
      xbrlCode: 'QW-BS-2102',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات المتداولة',
      arabicLabel: 'مصروفات مستحقة وضريبة القيمة المضافة',
      currentHalalas: cur.accruedAndVatLiabilities,
      priorHalalas: pri.accruedAndVatLiabilities,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-zakat-payable',
      xbrlCode: 'QW-BS-2103',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات المتداولة',
      arabicLabel: 'مخصص الزكاة المستحق',
      currentHalalas: cur.zakatPayable,
      priorHalalas: pri.zakatPayable,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-st-loans',
      xbrlCode: 'QW-BS-2104',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات المتداولة',
      arabicLabel: 'قروض وتسهيلات قصيرة الأجل',
      currentHalalas: cur.shortTermLoans,
      priorHalalas: pri.shortTermLoans,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-total-cl',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات المتداولة',
      arabicLabel: 'مجموع الالتزامات المتداولة',
      currentHalalas: cur.totalCurrentLiabilities,
      priorHalalas: pri.totalCurrentLiabilities,
      higherIsBetter: false,
      isSubtotal: true,
    }),
    buildLine({
      id: 'bs-lt-loans',
      xbrlCode: 'QW-BS-2201',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات غير المتداولة',
      arabicLabel: 'قروض طويلة الأجل',
      currentHalalas: cur.longTermLoans,
      priorHalalas: pri.longTermLoans,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-eosb',
      xbrlCode: 'QW-BS-2202',
      section: 'balance_sheet',
      groupLabel: 'الالتزامات غير المتداولة',
      arabicLabel: 'مخصص منافع الموظفين (نهاية الخدمة)',
      currentHalalas: cur.endOfServiceBenefits,
      priorHalalas: pri.endOfServiceBenefits,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'bs-total-liab',
      section: 'balance_sheet',
      groupLabel: 'إجمالي الالتزامات',
      arabicLabel: 'مجموع الالتزامات',
      currentHalalas: cur.totalLiabilities,
      priorHalalas: pri.totalLiabilities,
      higherIsBetter: false,
      isSubtotal: true,
    }),
    buildLine({
      id: 'bs-total-equity',
      section: 'balance_sheet',
      groupLabel: 'حقوق الملكية',
      arabicLabel: 'مجموع حقوق الملكية',
      currentHalalas: cur.totalEquity,
      priorHalalas: pri.totalEquity,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'bs-total-le',
      section: 'balance_sheet',
      groupLabel: 'إجمالي الالتزامات وحقوق الملكية',
      arabicLabel: 'إجمالي الالتزامات وحقوق الملكية',
      currentHalalas: cur.totalLiabilitiesAndEquity,
      priorHalalas: pri.totalLiabilitiesAndEquity,
      isTotal: true,
    }),

    // 2. Income Statement
    buildLine({
      id: 'is-op-rev',
      xbrlCode: 'QW-IS-0101',
      section: 'income_statement',
      groupLabel: 'الإيرادات وتكلفة النشاط',
      arabicLabel: 'إيرادات النشاط الرئيسي (المبيعات)',
      currentHalalas: cur.operatingRevenue,
      priorHalalas: pri.operatingRevenue,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'is-cogs',
      xbrlCode: 'QW-IS-0201',
      section: 'income_statement',
      groupLabel: 'الإيرادات وتكلفة النشاط',
      arabicLabel: 'تكلفة الإيرادات / المبيعات',
      currentHalalas: cur.costOfRevenue,
      priorHalalas: pri.costOfRevenue,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-gross-profit',
      section: 'income_statement',
      groupLabel: 'الإيرادات وتكلفة النشاط',
      arabicLabel: 'مجمل الربح',
      currentHalalas: cur.grossProfit,
      priorHalalas: pri.grossProfit,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'is-other-rev',
      xbrlCode: 'QW-IS-0102',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'إيرادات تشغيلية أخرى',
      currentHalalas: cur.otherRevenue,
      priorHalalas: pri.otherRevenue,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'is-salaries',
      xbrlCode: 'QW-IS-0301',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'الرواتب والأجور ومنافع الموظفين',
      currentHalalas: cur.salariesAndWages,
      priorHalalas: pri.salariesAndWages,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-rent',
      xbrlCode: 'QW-IS-0302',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'مصروفات الإيجار',
      currentHalalas: cur.rentExpense,
      priorHalalas: pri.rentExpense,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-ga',
      xbrlCode: 'QW-IS-0303',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'مصروفات عمومية وإدارية وتسويقية',
      currentHalalas: cur.generalAdminExpenses,
      priorHalalas: pri.generalAdminExpenses,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-depr',
      xbrlCode: 'QW-IS-0304',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'مصروف الإهلاك والإطفاء',
      currentHalalas: cur.depreciationExpense,
      priorHalalas: pri.depreciationExpense,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-total-opex',
      section: 'income_statement',
      groupLabel: 'الإيرادات والمصاريف التشغيلية',
      arabicLabel: 'مجموع المصروفات التشغيلية',
      currentHalalas: cur.totalOperatingExpenses,
      priorHalalas: pri.totalOperatingExpenses,
      higherIsBetter: false,
      isSubtotal: true,
    }),
    buildLine({
      id: 'is-op-profit',
      section: 'income_statement',
      groupLabel: 'صافي النتائج',
      arabicLabel: 'الربح / (الخسارة) التشغيلية',
      currentHalalas: cur.operatingProfit,
      priorHalalas: pri.operatingProfit,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'is-finance',
      xbrlCode: 'QW-IS-0401',
      section: 'income_statement',
      groupLabel: 'صافي النتائج',
      arabicLabel: 'تكاليف التمويل والفوائد البنكية',
      currentHalalas: cur.financeCosts,
      priorHalalas: pri.financeCosts,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-zakat',
      xbrlCode: 'QW-IS-0501',
      section: 'income_statement',
      groupLabel: 'صافي النتائج',
      arabicLabel: 'مصروف الزكاة الشرعية التقديري',
      currentHalalas: cur.zakatExpense,
      priorHalalas: pri.zakatExpense,
      higherIsBetter: false,
    }),
    buildLine({
      id: 'is-net-profit',
      section: 'income_statement',
      groupLabel: 'صافي النتائج',
      arabicLabel: 'صافي الربح / (الخسارة) للسنة',
      currentHalalas: cur.netProfit,
      priorHalalas: pri.netProfit,
      higherIsBetter: true,
      isTotal: true,
    }),

    // 3. Changes in Equity
    buildLine({
      id: 'eq-capital',
      xbrlCode: 'QW-EQ-0101',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'رأس المال المدفوع',
      currentHalalas: cur.paidUpCapital,
      priorHalalas: pri.paidUpCapital,
    }),
    buildLine({
      id: 'eq-reserve',
      xbrlCode: 'QW-EQ-0102',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'الاحتياطي النظامي',
      currentHalalas: cur.statutoryReserve,
      priorHalalas: pri.statutoryReserve,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'eq-re-open',
      xbrlCode: 'QW-EQ-0103',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'الأرباح المبقاة (أول المدة)',
      currentHalalas: cur.retainedEarningsBeginning,
      priorHalalas: pri.retainedEarningsBeginning,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'eq-net-profit',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'صافي ربح / (خسارة) السنة',
      currentHalalas: cur.netProfit,
      priorHalalas: pri.netProfit,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'eq-dividends',
      xbrlCode: 'QW-EQ-0105',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'أرباح موزعة خلال السنة',
      currentHalalas: cur.dividendsDeclared,
      priorHalalas: pri.dividendsDeclared,
    }),
    buildLine({
      id: 'eq-re-end',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'الأرباح المبقاة (آخر المدة)',
      currentHalalas: cur.retainedEarningsEnding,
      priorHalalas: pri.retainedEarningsEnding,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'eq-partners',
      xbrlCode: 'QW-EQ-0104',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'جاري الشركاء (صافي)',
      currentHalalas: cur.partnersCurrentAccountNet,
      priorHalalas: pri.partnersCurrentAccountNet,
    }),
    buildLine({
      id: 'eq-total',
      section: 'equity',
      groupLabel: 'بنود حقوق الملكية',
      arabicLabel: 'إجمالي حقوق الملكية (آخر المدة)',
      currentHalalas: cur.totalEquity,
      priorHalalas: pri.totalEquity,
      higherIsBetter: true,
      isTotal: true,
    }),

    // 4. Cash Flow Statement
    buildLine({
      id: 'cf-operating',
      section: 'cash_flow',
      groupLabel: 'التدفقات النقدية',
      arabicLabel: 'صافي التدفقات النقدية من الأنشطة التشغيلية',
      currentHalalas: cur.cashFlowOperating,
      priorHalalas: pri.cashFlowOperating,
      higherIsBetter: true,
    }),
    buildLine({
      id: 'cf-investing',
      section: 'cash_flow',
      groupLabel: 'التدفقات النقدية',
      arabicLabel: 'صافي التدفقات النقدية من الأنشطة الاستثمارية',
      currentHalalas: cur.cashFlowInvesting,
      priorHalalas: pri.cashFlowInvesting,
    }),
    buildLine({
      id: 'cf-financing',
      section: 'cash_flow',
      groupLabel: 'التدفقات النقدية',
      arabicLabel: 'صافي التدفقات النقدية من الأنشطة التمويلية',
      currentHalalas: cur.cashFlowFinancing,
      priorHalalas: pri.cashFlowFinancing,
    }),
    buildLine({
      id: 'cf-net-change',
      section: 'cash_flow',
      groupLabel: 'التدفقات النقدية',
      arabicLabel: 'صافي التغير في النقدية وما في حكمها',
      currentHalalas: cur.netChangeInCash,
      priorHalalas: pri.netChangeInCash,
      higherIsBetter: true,
      isSubtotal: true,
    }),
    buildLine({
      id: 'cf-ending-cash',
      section: 'cash_flow',
      groupLabel: 'التدفقات النقدية',
      arabicLabel: 'النقدية وما في حكمها في نهاية السنة',
      currentHalalas: cur.cashAndEquivalents,
      priorHalalas: pri.cashAndEquivalents,
      higherIsBetter: true,
      isTotal: true,
    }),
  ];

  // Key Comparative Financial Ratios
  const currentRatio =
    cur.totalCurrentLiabilities > 0
      ? cur.totalCurrentAssets / cur.totalCurrentLiabilities
      : null;
  const priorRatio =
    pri.totalCurrentLiabilities > 0
      ? pri.totalCurrentAssets / pri.totalCurrentLiabilities
      : null;

  const curGrossMargin =
    cur.operatingRevenue > 0
      ? (cur.grossProfit / cur.operatingRevenue) * 100
      : null;
  const priGrossMargin =
    pri.operatingRevenue > 0
      ? (pri.grossProfit / pri.operatingRevenue) * 100
      : null;

  const ratios: ComparativeRatioKpi[] = [
    {
      id: 'kpi-total-assets',
      label: 'إجمالي الأصول',
      currentDisplay: formatSar(cur.totalAssets),
      priorDisplay: formatSar(pri.totalAssets),
      deltaDisplay: `${formatSignedSar(cur.totalAssets - pri.totalAssets)} ر.س (${formatVariancePercent(
        pri.totalAssets === 0
          ? cur.totalAssets === 0
            ? 0
            : null
          : ((cur.totalAssets - pri.totalAssets) / Math.abs(pri.totalAssets)) *
              100
      )})`,
      impact:
        cur.totalAssets > pri.totalAssets
          ? 'favorable'
          : cur.totalAssets < pri.totalAssets
            ? 'unfavorable'
            : 'neutral',
    },
    {
      id: 'kpi-total-revenue',
      label: 'إجمالي الإيرادات (النشاط + أخرى)',
      currentDisplay: formatSar(cur.totalRevenue),
      priorDisplay: formatSar(pri.totalRevenue),
      deltaDisplay: `${formatSignedSar(cur.totalRevenue - pri.totalRevenue)} ر.س (${formatVariancePercent(
        pri.totalRevenue === 0
          ? cur.totalRevenue === 0
            ? 0
            : null
          : ((cur.totalRevenue - pri.totalRevenue) /
              Math.abs(pri.totalRevenue)) *
              100
      )})`,
      impact:
        cur.totalRevenue > pri.totalRevenue
          ? 'favorable'
          : cur.totalRevenue < pri.totalRevenue
            ? 'unfavorable'
            : 'neutral',
    },
    {
      id: 'kpi-net-profit',
      label: 'صافي الربح / (الخسارة)',
      currentDisplay: formatSar(cur.netProfit),
      priorDisplay: formatSar(pri.netProfit),
      deltaDisplay: `${formatSignedSar(cur.netProfit - pri.netProfit)} ر.س (${formatVariancePercent(
        pri.netProfit === 0
          ? cur.netProfit === 0
            ? 0
            : null
          : ((cur.netProfit - pri.netProfit) / Math.abs(pri.netProfit)) * 100
      )})`,
      impact:
        cur.netProfit > pri.netProfit
          ? 'favorable'
          : cur.netProfit < pri.netProfit
            ? 'unfavorable'
            : 'neutral',
    },
    {
      id: 'kpi-current-ratio',
      label: 'نسبة التداول (السيولة قصيرة الأجل)',
      currentDisplay: currentRatio !== null ? `${currentRatio.toFixed(2)}×` : '—',
      priorDisplay: priorRatio !== null ? `${priorRatio.toFixed(2)}×` : '—',
      deltaDisplay:
        currentRatio !== null && priorRatio !== null
          ? `${currentRatio - priorRatio >= 0 ? '+' : ''}${(currentRatio - priorRatio).toFixed(2)}×`
          : curGrossMargin !== null
            ? `هامش مجمل الربح: ${curGrossMargin.toFixed(1)}%`
            : 'تُحسب عند توفر التزامات متداولة',
      impact:
        currentRatio !== null && priorRatio !== null
          ? currentRatio >= priorRatio
            ? 'favorable'
            : 'unfavorable'
          : 'neutral',
    },
    {
      id: 'kpi-gross-margin',
      label: 'هامش مجمل الربح',
      currentDisplay:
        curGrossMargin !== null ? `${curGrossMargin.toFixed(1)}%` : '—',
      priorDisplay:
        priGrossMargin !== null ? `${priGrossMargin.toFixed(1)}%` : '—',
      deltaDisplay:
        curGrossMargin !== null && priGrossMargin !== null
          ? `${curGrossMargin - priGrossMargin >= 0 ? '+' : ''}${(curGrossMargin - priGrossMargin).toFixed(1)} نقطة مئوية`
          : curGrossMargin !== null
            ? 'نشاط جديد في السنة الحالية'
            : 'لا توجد إيرادات نشاط',
      impact:
        curGrossMargin !== null && priGrossMargin !== null
          ? curGrossMargin >= priGrossMargin
            ? 'favorable'
            : 'unfavorable'
          : 'neutral',
    },
  ];

  // Top Variance Drivers (non-subtotal items sorted by absolute variance)
  const sectionTitles: Record<ComparativeStatementSectionId, string> = {
    balance_sheet: 'المركز المالي',
    income_statement: 'قائمة الدخل',
    equity: 'حقوق الملكية',
    cash_flow: 'التدفقات النقدية',
  };

  const candidateDrivers = items
    .filter(
      (item) =>
        !item.isSubtotal &&
        !item.isTotal &&
        item.section !== 'equity' &&
        item.section !== 'cash_flow' &&
        item.varianceHalalas !== 0
    )
    .sort((a, b) => Math.abs(b.varianceHalalas) - Math.abs(a.varianceHalalas))
    .slice(0, 5);

  const drivers: VarianceDriverInsight[] = candidateDrivers.map((item) => {
    const verb = item.varianceHalalas > 0 ? 'ارتفع بند' : 'انخفض بند';
    const pctText =
      item.variancePercent === null
        ? 'بظهور رصيد جديد مقارنة بصفر في السنة السابقة'
        : `بنسبة ${formatVariancePercent(item.variancePercent)}`;
    return {
      id: `drv-${item.id}`,
      statementLabel: sectionTitles[item.section],
      itemLabel: item.arabicLabel,
      varianceHalalas: item.varianceHalalas,
      variancePercent: item.variancePercent,
      impact: item.impact,
      narrative: `${verb} «${item.arabicLabel}» بمقدار ${formatSar(Math.abs(item.varianceHalalas))} (${pctText}) ليصل إلى ${formatSar(item.currentHalalas)} مقابل ${formatSar(item.priorHalalas)} في سنة ${priorReq.entity.fiscalYearLabel}.`,
    };
  });

  return {
    currentYearLabel: currentReq.entity.fiscalYearLabel,
    priorYearLabel: priorReq.entity.fiscalYearLabel,
    currentStatements: cur,
    priorStatements: pri,
    items,
    ratios,
    drivers,
  };
}

export function exportComparativeStatementsExcel(params: {
  entityName: string;
  crNumber: string;
  currentYearLabel: string;
  priorYearLabel: string;
  items: ComparativeLineItem[];
  filename: string;
}): void {
  const sectionTitles: Record<ComparativeStatementSectionId, string> = {
    balance_sheet: 'قائمة المركز المالي',
    income_statement: 'قائمة الدخل',
    equity: 'قائمة التغيرات في حقوق الملكية',
    cash_flow: 'قائمة التدفقات النقدية',
  };

  const rows: (string | number)[][] = [
    ['تقرير القوائم المالية المقارنة وتحليل الانحرافات (SOCPA Comparative Statements)'],
    ['اسم المنشأة', params.entityName, 'السجل التجاري', params.crNumber],
    ['السنة الحالية', params.currentYearLabel, 'السنة السابقة', params.priorYearLabel],
    [],
    [
      'القائمة المالية',
      'رمز قوائم',
      'البند',
      `السنة الحالية (${params.currentYearLabel}) (ر.س)`,
      `السنة السابقة (${params.priorYearLabel}) (ر.س)`,
      'الانحراف / التغير (ر.س)',
      'نسبة التغير (%)',
    ],
    ...params.items.map((item) => [
      sectionTitles[item.section],
      item.xbrlCode || '—',
      item.arabicLabel,
      halalasToSar(item.currentHalalas).toFixed(2),
      halalasToSar(item.priorHalalas).toFixed(2),
      halalasToSar(item.varianceHalalas).toFixed(2),
      formatVariancePercent(item.variancePercent),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comparative_Statements');
  XLSX.writeFile(wb, params.filename);
}
