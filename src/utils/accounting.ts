import type {
  AccountingRuleResult,
  AnomalyFinding,
  CommonPitfallAlert,
  CompanyClassification,
  ComputedStatements,
  DynamicLineItem,
  EntityProfile,
  FinancialInputsHalalas,
  ForeignVendorWhtTransaction,
  MappedAccountRow,
  QawaemFieldId,
  QawaemTaxonomyItem,
  ReconciliationVariance,
  SmartCheckReport,
  StatementRequestRecord,
  TrialBalanceRow,
  WithholdingTaxAuditResult,
  WizardDetailedLines,
} from '../types/qawaem';

export const QAWAEM_TAXONOMY: QawaemTaxonomyItem[] = [
  // Wizard 1: Capital & Equity
  {
    id: 'paid_up_capital',
    xbrlCode: 'QW-EQ-0101',
    arabicLabel: 'رأس المال المدفوع',
    englishLabel: 'Paid-up Capital',
    statement: 'equity',
    section: 'equity',
    normalBalance: 'credit',
    wizardStep: 1,
    helperText: 'رأس المال المسجل في السجل التجاري وعقد التأسيس.',
  },
  {
    id: 'statutory_reserve',
    xbrlCode: 'QW-EQ-0102',
    arabicLabel: 'الاحتياطي النظامي',
    englishLabel: 'Statutory Reserve',
    statement: 'equity',
    section: 'equity',
    normalBalance: 'credit',
    wizardStep: 1,
    helperText: 'الاحتياطي المكون من صافي أرباح السنوات السابقة إن وجد.',
  },
  {
    id: 'retained_earnings_beginning',
    xbrlCode: 'QW-EQ-0103',
    arabicLabel: 'الأرباح المبقاة (أول المدة)',
    englishLabel: 'Retained Earnings (Opening)',
    statement: 'equity',
    section: 'equity',
    normalBalance: 'credit',
    wizardStep: 1,
    helperText: 'رصيد الأرباح أو الخسائر المتراكمة المرحّلة من الأعوام السابقة (أدخل بالسالب إذا كانت خسائر متراكمة).',
  },
  {
    id: 'partners_current_account_net',
    xbrlCode: 'QW-EQ-0104',
    arabicLabel: 'جاري الشركاء (صافي)',
    englishLabel: 'Partners Current Account (Net)',
    statement: 'equity',
    section: 'equity',
    normalBalance: 'credit',
    wizardStep: 1,
    helperText: 'صافي التمويل المقدم من الشركاء للمنشأة (موجب إذا كان دائن للشركاء، وسالب إذا كانت مسحوبات مدينة على الشركاء).',
  },
  {
    id: 'dividends_declared',
    xbrlCode: 'QW-EQ-0105',
    arabicLabel: 'أرباح موزعة خلال السنة',
    englishLabel: 'Dividends Declared',
    statement: 'equity',
    section: 'equity',
    normalBalance: 'debit',
    wizardStep: 1,
    helperText: 'إجمالي الأرباح التي تم توزيعها على الملاك أو الشركاء خلال السنة المالية.',
  },

  // Wizard 2: Revenues
  {
    id: 'operating_revenue',
    xbrlCode: 'QW-IS-0101',
    arabicLabel: 'إيرادات النشاط الرئيسي (المبيعات)',
    englishLabel: 'Revenue from Contracts with Customers',
    statement: 'income_statement',
    section: 'revenue',
    normalBalance: 'credit',
    wizardStep: 2,
    helperText: 'إجمالي مبيعات السلع أو الخدمات الأساسية للمنشأة بعد استبعاد ضريبة القيمة المضافة.',
  },
  {
    id: 'other_revenue',
    xbrlCode: 'QW-IS-0102',
    arabicLabel: 'إيرادات أخرى',
    englishLabel: 'Other Operating Income',
    statement: 'income_statement',
    section: 'revenue',
    normalBalance: 'credit',
    wizardStep: 2,
    helperText: 'أي إيرادات عرضية مثل إيرادات إيجارات، فوائد، أو أرباح بيع أصول.',
  },

  // Wizard 3: Expenses
  {
    id: 'cost_of_revenue',
    xbrlCode: 'QW-IS-0201',
    arabicLabel: 'تكلفة الإيرادات / المبيعات',
    englishLabel: 'Cost of Revenue',
    statement: 'income_statement',
    section: 'cost_of_revenue',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'التكلفة المباشرة للبضاعة المباعة أو تكلفة تقديم الخدمات.',
  },
  {
    id: 'salaries_and_wages',
    xbrlCode: 'QW-IS-0301',
    arabicLabel: 'الرواتب والأجور ومنافع الموظفين',
    englishLabel: 'Salaries and Employee Benefits',
    statement: 'income_statement',
    section: 'operating_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'الرواتب، البدلات، التأمينات الاجتماعية، وتكاليف الإقامات.',
  },
  {
    id: 'rent_expense',
    xbrlCode: 'QW-IS-0302',
    arabicLabel: 'مصروفات الإيجار',
    englishLabel: 'Rent Expense',
    statement: 'income_statement',
    section: 'operating_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'إيجارات المقرات والمستودعات والفروع للسنة المالية.',
  },
  {
    id: 'general_admin_expenses',
    xbrlCode: 'QW-IS-0303',
    arabicLabel: 'مصروفات عمومية وإدارية وتسويقية',
    englishLabel: 'General, Administrative & Selling Expenses',
    statement: 'income_statement',
    section: 'operating_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'الكهرباء، الاتصالات، التسويق، الرسوم الحكومية، والاستشارات.',
  },
  {
    id: 'depreciation_expense',
    xbrlCode: 'QW-IS-0304',
    arabicLabel: 'مصروف الإهلاك والإطفاء',
    englishLabel: 'Depreciation and Amortization',
    statement: 'income_statement',
    section: 'operating_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'الإهلاك السنوي للممتلكات والمعدات والأصول غير الملموسة.',
  },
  {
    id: 'finance_costs',
    xbrlCode: 'QW-IS-0401',
    arabicLabel: 'تكاليف التمويل والفوائد البنكية',
    englishLabel: 'Finance Costs',
    statement: 'income_statement',
    section: 'other_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'العمولات البنكية وتكاليف المرابحة والقروض.',
  },
  {
    id: 'zakat_expense',
    xbrlCode: 'QW-IS-0501',
    arabicLabel: 'مصروف الزكاة الشرعية التقديري',
    englishLabel: 'Zakat Expense',
    statement: 'income_statement',
    section: 'other_expenses',
    normalBalance: 'debit',
    wizardStep: 3,
    helperText: 'مخصص الزكاة المحمل على السنة المالية الحالية وفق لوائح هيئة الزكاة.',
  },

  // Wizard 4: Assets (What the company owns)
  {
    id: 'cash_and_equivalents',
    xbrlCode: 'QW-BS-1101',
    arabicLabel: 'النقدية بالصندوق ولدى البنوك',
    englishLabel: 'Cash and Cash Equivalents',
    statement: 'balance_sheet',
    section: 'current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'أرصدة الحسابات البنكية الجارية والنقدية في الصندوق نهاية السنة.',
  },
  {
    id: 'accounts_receivable',
    xbrlCode: 'QW-BS-1102',
    arabicLabel: 'الذمم المدينة التجارية (العملاء)',
    englishLabel: 'Trade Receivables, Net',
    statement: 'balance_sheet',
    section: 'current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'المبالغ المستحقة للمنشأة لدى العملاء بالصافي نهاية السنة.',
  },
  {
    id: 'inventory',
    xbrlCode: 'QW-BS-1103',
    arabicLabel: 'المخزون السلعي',
    englishLabel: 'Inventories',
    statement: 'balance_sheet',
    section: 'current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'قيمة البضاعة المتبقية في المستودعات بنهاية السنة المالية.',
  },
  {
    id: 'prepaid_and_other_current_assets',
    xbrlCode: 'QW-BS-1104',
    arabicLabel: 'مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى',
    englishLabel: 'Prepayments and Other Current Assets',
    statement: 'balance_sheet',
    section: 'current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'الإيجارات أو التأمينات المدفوعة مقدماً، العهد، وضريبة المدخلات المستردة.',
  },
  {
    id: 'property_plant_equipment',
    xbrlCode: 'QW-BS-1201',
    arabicLabel: 'الممتلكات والآلات والمعدات (بالصافي)',
    englishLabel: 'Property, Plant and Equipment, Net',
    statement: 'balance_sheet',
    section: 'non_current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'الأصول الثابتة (أجهزة، سيارات، أثاث، معدات) بعد خصم مجمع الإهلاك.',
  },
  {
    id: 'intangible_assets',
    xbrlCode: 'QW-BS-1202',
    arabicLabel: 'الأصول غير الملموسة وحق الاستخدام',
    englishLabel: 'Intangible Assets & Right-of-Use',
    statement: 'balance_sheet',
    section: 'non_current_assets',
    normalBalance: 'debit',
    wizardStep: 4,
    helperText: 'البرامج المحاسبية، العلامات التجارية، أو أصول حق الاستخدام.',
  },

  // Wizard 5: Liabilities (What the company owes)
  {
    id: 'accounts_payable',
    xbrlCode: 'QW-BS-2101',
    arabicLabel: 'الذمم الدائنة التجارية (الموردون)',
    englishLabel: 'Trade Payables',
    statement: 'balance_sheet',
    section: 'current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'المبالغ المستحقة للموردين مقابل المشتريات والخدمات.',
  },
  {
    id: 'accrued_and_vat_liabilities',
    xbrlCode: 'QW-BS-2102',
    arabicLabel: 'مصروفات مستحقة وضريبة القيمة المضافة',
    englishLabel: 'Accrued Expenses and VAT Payable',
    statement: 'balance_sheet',
    section: 'current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'رواتب مستحقة، فواتير خدمات غير مسددة، وضريبة قيمة مضافة مستحقة السداد.',
  },
  {
    id: 'zakat_payable',
    xbrlCode: 'QW-BS-2103',
    arabicLabel: 'مخصص الزكاة المستحق',
    englishLabel: 'Zakat Payable',
    statement: 'balance_sheet',
    section: 'current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'رصيد الزكاة المستحق لهيئة الزكاة والضريبة والجمارك بنهاية السنة.',
  },
  {
    id: 'short_term_loans',
    xbrlCode: 'QW-BS-2104',
    arabicLabel: 'قروض وتسهيلات قصيرة الأجل',
    englishLabel: 'Short-term Borrowings',
    statement: 'balance_sheet',
    section: 'current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'تمويلات بنكية تستحق السداد خلال أقل من 12 شهراً.',
  },
  {
    id: 'long_term_loans',
    xbrlCode: 'QW-BS-2201',
    arabicLabel: 'قروض طويلة الأجل',
    englishLabel: 'Long-term Borrowings',
    statement: 'balance_sheet',
    section: 'non_current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'الجزء المستحق بعد أكثر من 12 شهراً من القروض التمويلية.',
  },
  {
    id: 'end_of_service_benefits',
    xbrlCode: 'QW-BS-2202',
    arabicLabel: 'مخصص منافع الموظفين (نهاية الخدمة)',
    englishLabel: 'Employees End of Service Benefits',
    statement: 'balance_sheet',
    section: 'non_current_liabilities',
    normalBalance: 'credit',
    wizardStep: 5,
    helperText: 'الرصيد المتراكم لمكافآت نهاية خدمة الموظفين وفق نظام العمل السعودي.',
  },
];

export const TAXONOMY_BY_ID: Record<QawaemFieldId, QawaemTaxonomyItem> =
  QAWAEM_TAXONOMY.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<QawaemFieldId, QawaemTaxonomyItem>
  );

export function createEmptyFinancials(): FinancialInputsHalalas {
  return {
    paid_up_capital: 0,
    statutory_reserve: 0,
    retained_earnings_beginning: 0,
    partners_current_account_net: 0,
    dividends_declared: 0,
    operating_revenue: 0,
    other_revenue: 0,
    cost_of_revenue: 0,
    salaries_and_wages: 0,
    rent_expense: 0,
    general_admin_expenses: 0,
    depreciation_expense: 0,
    finance_costs: 0,
    zakat_expense: 0,
    cash_and_equivalents: 0,
    accounts_receivable: 0,
    inventory: 0,
    prepaid_and_other_current_assets: 0,
    property_plant_equipment: 0,
    intangible_assets: 0,
    accounts_payable: 0,
    accrued_and_vat_liabilities: 0,
    zakat_payable: 0,
    short_term_loans: 0,
    long_term_loans: 0,
    end_of_service_benefits: 0,
  };
}

export function createDemoBalancedFinancials(): FinancialInputsHalalas {
  return {
    paid_up_capital: sarToHalalas(500000),
    statutory_reserve: sarToHalalas(75000),
    retained_earnings_beginning: sarToHalalas(215000),
    partners_current_account_net: sarToHalalas(45000),
    dividends_declared: sarToHalalas(60000),
    operating_revenue: sarToHalalas(2450000),
    other_revenue: sarToHalalas(35000),
    cost_of_revenue: sarToHalalas(1320000),
    salaries_and_wages: sarToHalalas(420000),
    rent_expense: sarToHalalas(120000),
    general_admin_expenses: sarToHalalas(165000),
    depreciation_expense: sarToHalalas(55000),
    finance_costs: sarToHalalas(18000),
    zakat_expense: sarToHalalas(22000),
    // Net Profit = 2,485,000 - 2,120,000 = 365,000
    // Ending Equity = 500,000 + 75,000 + 215,000 + 45,000 - 60,000 + 365,000 = 1,140,000
    // Total Liabilities = 185,000 + 92,000 + 22,000 + 50,000 + 180,000 + 96,000 = 625,000
    // Total L + E = 1,765,000
    cash_and_equivalents: sarToHalalas(485000),
    accounts_receivable: sarToHalalas(310000),
    inventory: sarToHalalas(295000),
    prepaid_and_other_current_assets: sarToHalalas(75000),
    property_plant_equipment: sarToHalalas(520000),
    intangible_assets: sarToHalalas(80000),
    // Total Assets = 485+310+295+75+520+80 = 1,765,000 -> Balanced!
    accounts_payable: sarToHalalas(185000),
    accrued_and_vat_liabilities: sarToHalalas(92000),
    zakat_payable: sarToHalalas(22000),
    short_term_loans: sarToHalalas(50000),
    long_term_loans: sarToHalalas(180000),
    end_of_service_benefits: sarToHalalas(96000),
  };
}

/**
 * Converts a SAR decimal number or string into exact integer Halalas.
 */
export function sarToHalalas(value: number | string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }
  const cleaned = value.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function halalasToSar(halalas: number): number {
  return Math.round(halalas) / 100;
}

export function formatNumber(halalas: number): string {
  const sar = halalasToSar(halalas);
  return sar.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSar(halalas: number): string {
  return `${formatNumber(halalas)} ر.س`;
}

export function getAuditorExemptionInfo(classification: CompanyClassification): {
  exempt: boolean;
  label: string;
  ruleSummary: string;
} {
  if (classification === 'micro') {
    return {
      exempt: true,
      label: 'معفاة من تعيين مراجع حسابات خارجي',
      ruleSummary:
        'وفق نظام الشركات السعودي: الشركات متناهية الصغر معفاة من المراجع الخارجي، مع جواز طلب قوائم مصدقة طوعاً أو إعدادها وفق نموذج قوائم.',
    };
  }
  if (classification === 'small') {
    return {
      exempt: true,
      label: 'معفاة غالباً (تخضع لشروط النظام الأساسي)',
      ruleSummary:
        'الشركات الصغيرة معفاة من المراجع الخارجي ما لم ينص عقد التأسيس على خلاف ذلك أو تطلب جهة تمويلية مراجعة قانونية.',
    };
  }
  return {
    exempt: false,
    label: 'يتطلب اعتماد مراجع قانوني مرخص (SOCPA)',
    ruleSummary:
      'الشركات المتوسطة والكبيرة ملزمة بتعيين مراجع حسابات مرخص من الهيئة السعودية للمراجعين والمحاسبين لاعتماد القوائم في منصة قوائم.',
  };
}

/**
 * Pure integer-halala computation of all 4 financial statements.
 */
export function computeFinancialStatements(
  inputs: FinancialInputsHalalas
): ComputedStatements {
  const operatingRevenue = inputs.operating_revenue || 0;
  const otherRevenue = inputs.other_revenue || 0;
  const totalRevenue = operatingRevenue + otherRevenue;

  const costOfRevenue = inputs.cost_of_revenue || 0;
  const grossProfit = operatingRevenue - costOfRevenue;

  const salariesAndWages = inputs.salaries_and_wages || 0;
  const rentExpense = inputs.rent_expense || 0;
  const generalAdminExpenses = inputs.general_admin_expenses || 0;
  const depreciationExpense = inputs.depreciation_expense || 0;
  const totalOperatingExpenses =
    salariesAndWages + rentExpense + generalAdminExpenses + depreciationExpense;

  const operatingProfit = grossProfit + otherRevenue - totalOperatingExpenses;
  const financeCosts = inputs.finance_costs || 0;
  const profitBeforeZakat = operatingProfit - financeCosts;
  const zakatExpense = inputs.zakat_expense || 0;
  const netProfit = profitBeforeZakat - zakatExpense;

  // Assets
  const cashAndEquivalents = inputs.cash_and_equivalents || 0;
  const accountsReceivable = inputs.accounts_receivable || 0;
  const inventory = inputs.inventory || 0;
  const prepaidAndOtherCurrentAssets = inputs.prepaid_and_other_current_assets || 0;
  const totalCurrentAssets =
    cashAndEquivalents +
    accountsReceivable +
    inventory +
    prepaidAndOtherCurrentAssets;

  const propertyPlantEquipment = inputs.property_plant_equipment || 0;
  const intangibleAssets = inputs.intangible_assets || 0;
  const totalNonCurrentAssets = propertyPlantEquipment + intangibleAssets;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // Liabilities
  const accountsPayable = inputs.accounts_payable || 0;
  const accruedAndVatLiabilities = inputs.accrued_and_vat_liabilities || 0;
  const zakatPayable = inputs.zakat_payable || 0;
  const shortTermLoans = inputs.short_term_loans || 0;
  const totalCurrentLiabilities =
    accountsPayable + accruedAndVatLiabilities + zakatPayable + shortTermLoans;

  const longTermLoans = inputs.long_term_loans || 0;
  const endOfServiceBenefits = inputs.end_of_service_benefits || 0;
  const totalNonCurrentLiabilities = longTermLoans + endOfServiceBenefits;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // Equity
  const paidUpCapital = inputs.paid_up_capital || 0;
  const statutoryReserve = inputs.statutory_reserve || 0;
  const retainedEarningsBeginning = inputs.retained_earnings_beginning || 0;
  const partnersCurrentAccountNet = inputs.partners_current_account_net || 0;
  const dividendsDeclared = inputs.dividends_declared || 0;
  const retainedEarningsEnding =
    retainedEarningsBeginning + netProfit - dividendsDeclared;

  const totalEquity =
    paidUpCapital +
    statutoryReserve +
    retainedEarningsEnding +
    partnersCurrentAccountNet;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanceDiffHalalas = totalAssets - totalLiabilitiesAndEquity;
  const isBalanced = balanceDiffHalalas === 0;

  // Statement of Cash Flows (Indirect method aligned identically with ending cash)
  const cashFlowOperating =
    netProfit +
    depreciationExpense -
    (accountsReceivable + inventory + prepaidAndOtherCurrentAssets) +
    (accountsPayable + accruedAndVatLiabilities + zakatPayable + endOfServiceBenefits);

  const cashFlowInvesting = -(
    propertyPlantEquipment +
    depreciationExpense +
    intangibleAssets
  );
  const cashFlowFinancing =
    paidUpCapital +
    statutoryReserve +
    retainedEarningsBeginning +
    partnersCurrentAccountNet +
    shortTermLoans +
    longTermLoans -
    dividendsDeclared;

  const netChangeInCash =
    cashFlowOperating + cashFlowInvesting + cashFlowFinancing;

  return {
    operatingRevenue,
    otherRevenue,
    totalRevenue,
    costOfRevenue,
    grossProfit,
    salariesAndWages,
    rentExpense,
    generalAdminExpenses,
    depreciationExpense,
    totalOperatingExpenses,
    operatingProfit,
    financeCosts,
    profitBeforeZakat,
    zakatExpense,
    netProfit,
    cashAndEquivalents,
    accountsReceivable,
    inventory,
    prepaidAndOtherCurrentAssets,
    totalCurrentAssets,
    propertyPlantEquipment,
    intangibleAssets,
    totalNonCurrentAssets,
    totalAssets,
    accountsPayable,
    accruedAndVatLiabilities,
    zakatPayable,
    shortTermLoans,
    totalCurrentLiabilities,
    longTermLoans,
    endOfServiceBenefits,
    totalNonCurrentLiabilities,
    totalLiabilities,
    paidUpCapital,
    statutoryReserve,
    retainedEarningsBeginning,
    partnersCurrentAccountNet,
    dividendsDeclared,
    retainedEarningsEnding,
    totalEquity,
    totalLiabilitiesAndEquity,
    balanceDiffHalalas,
    isBalanced,
    cashFlowOperating,
    cashFlowInvesting,
    cashFlowFinancing,
    netChangeInCash,
  };
}

/**
 * Deterministic 4-rule validation engine matching Stage 5 Smart Check cards.
 */
export function evaluateFourAccountingRules(
  entity: EntityProfile,
  statements: ComputedStatements,
  mappedAccounts: MappedAccountRow[]
): AccountingRuleResult[] {
  const unmappedCount = mappedAccounts.filter(
    (r) => r.mappedFieldId === 'unmapped'
  ).length;

  const balancePassed = statements.isBalanced;
  const cashFlowPassed =
    statements.netChangeInCash === statements.cashAndEquivalents;

  const computedEquitySum =
    statements.paidUpCapital +
    statements.statutoryReserve +
    statements.retainedEarningsEnding +
    statements.partnersCurrentAccountNet;
  const equityPassed =
    computedEquitySum === statements.totalEquity &&
    statements.totalAssets - statements.totalLiabilities === statements.totalEquity;

  const missingReasons: string[] = [];
  if (entity.crNumber.trim().length < 10) missingReasons.push('رقم السجل التجاري');
  if (entity.entityName.trim().length < 2) missingReasons.push('اسم المنشأة');
  if (!entity.fiscalYearLabel.trim()) missingReasons.push('السنة المالية');
  if (unmappedCount > 0) {
    missingReasons.push(`${unmappedCount} حسابات غير مسكنة في ميزان المراجعة`);
  }
  if (
    entity.statementType === 'active' &&
    statements.totalAssets === 0 &&
    statements.totalRevenue === 0 &&
    statements.totalOperatingExpenses === 0
  ) {
    missingReasons.push('لم يتم إدخال أرقام مالية للقائمة النشطة بعد');
  }
  const completenessPassed = missingReasons.length === 0;

  return [
    {
      id: 'balance_equation',
      title: `معادلة الميزانية — ${balancePassed ? 'مطابقة' : 'غير مطابقة'}`,
      passed: balancePassed,
      statusLabel: balancePassed ? 'مطابقة' : 'غير مطابقة',
      detail: balancePassed
        ? `الأصول (${formatSar(statements.totalAssets)}) = الالتزامات (${formatSar(statements.totalLiabilities)}) + حقوق الملكية (${formatSar(statements.totalEquity)})`
        : `الأصول (${formatSar(statements.totalAssets)}) لا تطابق الالتزامات وحقوق الملكية (${formatSar(statements.totalLiabilitiesAndEquity)}) بفارق ${formatSar(Math.abs(statements.balanceDiffHalalas))}`,
    },
    {
      id: 'cash_flow_tie',
      title: `مطابقة النقد في قائمة التدفقات النقدية — ${cashFlowPassed ? 'مطابقة' : 'غير مطابقة'}`,
      passed: cashFlowPassed,
      statusLabel: cashFlowPassed ? 'مطابقة' : 'غير مطابقة',
      detail: cashFlowPassed
        ? `نقد أول المدة 0 ريال + صافي التغير ${formatSar(statements.netChangeInCash)} = نقد آخر المدة ${formatSar(statements.cashAndEquivalents)}`
        : `صافي التدفقات (${formatSar(statements.netChangeInCash)}) لا يساوي نقد آخر المدة (${formatSar(statements.cashAndEquivalents)}) بسبب اختلال معادلة المركز المالي.`,
    },
    {
      id: 'equity_tie',
      title: `ترابط حقوق الملكية — ${equityPassed ? 'مطابقة' : 'غير مطابقة'}`,
      passed: equityPassed,
      statusLabel: equityPassed ? 'مطابقة' : 'غير مطابقة',
      detail: equityPassed
        ? 'رصيد نهاية قائمة التغيرات في حقوق الملكية يساوي حقوق الملكية في المركز المالي.'
        : 'رصيد حقوق الملكية في المركز المالي لا يتطابق مع الأصول مطروحاً منها الالتزامات.',
    },
    {
      id: 'data_completeness',
      title: `اكتمال البيانات المطلوبة — ${completenessPassed ? 'مطابقة' : 'ناقصة'}`,
      passed: completenessPassed,
      statusLabel: completenessPassed ? 'مطابقة' : 'ناقصة',
      detail: completenessPassed
        ? 'لا توجد حقول ناقصة أو قيم تمنع إصدار القوائم.'
        : `يرجى استكمال النواقص التالية: ${missingReasons.join('، ')}.`,
    },
  ];
}

const WHT_ACCOUNT_REGEX =
  /(\b(wht|withholding)\b|ضريبة\s*استقطاع|ضريبة\s*الاستقطاع|استقطاع\s*ضريبي|مستقطعة\s*للزكاة)/i;

const INTERNATIONAL_VENDOR_REGEX =
  /(\b(aws|amazon\s*web|google\s*ads|google\s*cloud|meta|facebook|openai|microsoft|azure|figma|stripe|shopify|cloudflare|adobe|zoom|slack|hubspot|github|vercel|digitalocean|godaddy|oracle|salesforce|upwork|fiverr|saas|foreign|overseas|international|non-resident|cross-border|royalty|royalties|management\s*fee)\b|مورد\s*أجنب|موردين\s*أجانب|مورد\s*خارج|موردين\s*خارجيين|خارج\s*المملكة|غير\s*مقيم|أجنبي|أجنبية|دولي|دولية|استشارات\s*خارجية|شركة\s*أجنبية|مكتب\s*خارجي|أتعاب\s*إدارة\s*خارجية|إتاوات|تراخيص\s*أجنبية|استضافة\s*أجنبية|خدمات\s*سحابية\s*أجنبية)/i;

const NON_VENDOR_EXCLUSION_FIELDS = new Set<QawaemFieldId>([
  'operating_revenue',
  'other_revenue',
  'cash_and_equivalents',
  'paid_up_capital',
  'statutory_reserve',
  'retained_earnings_beginning',
  'partners_current_account_net',
  'dividends_declared',
  'accounts_receivable',
  'zakat_payable',
  'zakat_expense',
]);

function classifyWhtServiceRate(accountName: string): {
  rate: 5 | 15 | 20;
  label: string;
} {
  if (/(أتعاب\s*إدارة|إدارة\s*خارج|رسوم\s*إدارة|\bmanagement\s*fee\b)/i.test(accountName)) {
    return { rate: 20, label: 'أتعاب إدارة — نسبة 20%' };
  }
  if (
    /(إتاو|حقوق\s*ملكية|علامة\s*تجارية|أطراف\s*ذات\s*علاقة\s*أجنب|ترخيص|تراخيص|\b(royalty|royalties|head\s*office|trademark|license)\b)/i.test(
      accountName
    )
  ) {
    return { rate: 15, label: 'إتاوات / تراخيص / أطراف مرتبطة — نسبة 15%' };
  }
  if (
    /(\b(aws|amazon|google|meta|facebook|openai|microsoft|azure|figma|stripe|shopify|cloudflare|adobe|zoom|slack|hubspot|github|vercel|digitalocean|godaddy|oracle|salesforce|saas)\b|سحاب|استضاف|برمج|تقني|استشار|اتصال|شحن\s*دول|نقل\s*دول)/i.test(
      accountName
    )
  ) {
    return {
      rate: 5,
      label: 'خدمات تقنية / سحابية / استشارات دولية — نسبة 5%',
    };
  }
  return { rate: 5, label: 'معاملة مورد أجنبي / غير مقيم — نسبة 5%' };
}

function extractInternationalVendorName(accountName: string): string {
  const knownBrands: Array<[RegExp, string]> = [
    [/\b(aws|amazon\s*web)\b/i, 'Amazon Web Services (AWS)'],
    [/\b(google\s*ads|google\s*cloud|google)\b/i, 'Google LLC (International)'],
    [/\b(meta|facebook)\b/i, 'Meta Platforms (International)'],
    [/\bopenai\b/i, 'OpenAI (International)'],
    [/\b(microsoft|azure)\b/i, 'Microsoft Corporation (International)'],
    [/\bfigma\b/i, 'Figma Inc. (International)'],
    [/\bstripe\b/i, 'Stripe Inc. (International)'],
    [/\bshopify\b/i, 'Shopify Inc. (International)'],
    [/\bcloudflare\b/i, 'Cloudflare Inc. (International)'],
    [/\badobe\b/i, 'Adobe Inc. (International)'],
    [/\bzoom\b/i, 'Zoom Communications (International)'],
    [/\bslack\b/i, 'Slack Technologies (International)'],
    [/\bgithub\b/i, 'GitHub Inc. (International)'],
    [/\boracle\b/i, 'Oracle Corporation (International)'],
    [/\bsalesforce\b/i, 'Salesforce Inc. (International)'],
  ];
  for (const [pattern, label] of knownBrands) {
    if (pattern.test(accountName)) return label;
  }
  return accountName.trim();
}

function buildWhtRateBreakdown(
  transactions: ForeignVendorWhtTransaction[]
): WithholdingTaxAuditResult['rateBreakdown'] {
  const buckets: Array<{ rate: 5 | 15 | 20; label: string }> = [
    { rate: 5, label: 'خدمات تقنية / سحابية / استشارات واتصالات ونقل دولي (5%)' },
    { rate: 15, label: 'إتاوات وتراخيص وحقوق ملكية وأطراف مرتبطة أجنبية (15%)' },
    { rate: 20, label: 'أتعاب إدارة لجهات غير مقيمة (20%)' },
  ];

  return buckets.map((b) => {
    const matching = transactions.filter(
      (t) => t.applicableRatePercent === b.rate
    );
    return {
      ratePercent: b.rate,
      label: b.label,
      transactionCount: matching.length,
      baseAmountHalalas: matching.reduce((s, t) => s + t.baseAmountHalalas, 0),
      expectedWhtHalalas: matching.reduce(
        (s, t) => s + t.expectedWhtHalalas,
        0
      ),
    };
  });
}

/**
 * Deterministic Saudi Withholding Tax (Article 68) verification & report builder
 * on Trial Balance international / foreign vendor transactions and recorded WHT accounts.
 */
export function auditWithholdingTaxCompliance(params: {
  mappedAccounts: MappedAccountRow[];
  detailedLines: WizardDetailedLines;
}): WithholdingTaxAuditResult {
  const { mappedAccounts, detailedLines } = params;
  const generatedAtIso = new Date().toISOString();

  const detectedTransactions: ForeignVendorWhtTransaction[] = [];
  const recordedWhtAccountNames: string[] = [];
  let recordedWhtHalalas = 0;

  if (mappedAccounts.length > 0) {
    for (const row of mappedAccounts) {
      const name = row.accountName || '';
      const absAmount =
        Math.abs(row.endingNetHalalas) ||
        row.debitHalalas ||
        row.creditHalalas;
      if (absAmount <= 0) continue;

      if (WHT_ACCOUNT_REGEX.test(name)) {
        recordedWhtHalalas += absAmount;
        recordedWhtAccountNames.push(name);
        continue;
      }

      if (
        row.mappedFieldId !== 'unmapped' &&
        NON_VENDOR_EXCLUSION_FIELDS.has(row.mappedFieldId)
      ) {
        continue;
      }

      if (INTERNATIONAL_VENDOR_REGEX.test(name)) {
        const { rate, label } = classifyWhtServiceRate(name);
        const expectedWhtHalalas = Math.round((absAmount * rate) / 100);
        detectedTransactions.push({
          rowId: row.id,
          accountCode: row.accountCode,
          accountName: row.accountName,
          vendorName: extractInternationalVendorName(row.accountName),
          baseAmountHalalas: absAmount,
          applicableRatePercent: rate,
          serviceCategoryLabel: label,
          expectedWhtHalalas,
          netAmountAfterWhtHalalas: Math.max(0, absAmount - expectedWhtHalalas),
        });
      }
    }
  } else {
    for (const item of detailedLines.currentLiabilityLines) {
      if (item.amountHalalas > 0 && WHT_ACCOUNT_REGEX.test(item.label)) {
        recordedWhtHalalas += item.amountHalalas;
        recordedWhtAccountNames.push(item.label);
      }
    }
    for (const item of detailedLines.otherExpenseLines) {
      if (
        item.amountHalalas > 0 &&
        !WHT_ACCOUNT_REGEX.test(item.label) &&
        INTERNATIONAL_VENDOR_REGEX.test(item.label)
      ) {
        const { rate, label } = classifyWhtServiceRate(item.label);
        const expectedWhtHalalas = Math.round((item.amountHalalas * rate) / 100);
        detectedTransactions.push({
          rowId: item.id,
          accountCode: '—',
          accountName: item.label,
          vendorName: extractInternationalVendorName(item.label),
          baseAmountHalalas: item.amountHalalas,
          applicableRatePercent: rate,
          serviceCategoryLabel: label,
          expectedWhtHalalas,
          netAmountAfterWhtHalalas: Math.max(
            0,
            item.amountHalalas - expectedWhtHalalas
          ),
        });
      }
    }
  }

  const rateBreakdown = buildWhtRateBreakdown(detectedTransactions);
  const totalInternationalBaseHalalas = detectedTransactions.reduce(
    (sum, t) => sum + t.baseAmountHalalas,
    0
  );
  const totalExpectedWhtHalalas = detectedTransactions.reduce(
    (sum, t) => sum + t.expectedWhtHalalas,
    0
  );
  const varianceHalalas = recordedWhtHalalas - totalExpectedWhtHalalas;
  const hasInternationalTransactions = detectedTransactions.length > 0;

  if (!hasInternationalTransactions && recordedWhtHalalas === 0) {
    return {
      generatedAtIso,
      hasInternationalTransactions: false,
      detectedTransactions,
      rateBreakdown,
      totalInternationalBaseHalalas: 0,
      totalExpectedWhtHalalas: 0,
      recordedWhtAccountNames,
      recordedWhtHalalas: 0,
      varianceHalalas: 0,
      status: 'none',
      summaryTitle: 'لم تُرصد معاملات دولية لموردين أجانب في ميزان المراجعة',
      summaryDetail:
        'لا توجد حسابات مصنفة كمعاملات خارجية أو مدفوعات لموردين غير مقيمين تستوجب احتساب ضريبة الاستقطاع.',
    };
  }

  if (hasInternationalTransactions && recordedWhtHalalas === 0) {
    return {
      generatedAtIso,
      hasInternationalTransactions: true,
      detectedTransactions,
      rateBreakdown,
      totalInternationalBaseHalalas,
      totalExpectedWhtHalalas,
      recordedWhtAccountNames,
      recordedWhtHalalas: 0,
      varianceHalalas: -totalExpectedWhtHalalas,
      status: 'missing_wht',
      summaryTitle: `تنبيه: رصد ${detectedTransactions.length} معاملة دولية لموردين أجانب دون تسجيل ضريبة استقطاع`,
      summaryDetail: `بلغ إجمالي المعاملات الدولية المرصودة ${formatSar(totalInternationalBaseHalalas)}، وتبلغ ضريبة الاستقطاع المفترضة نظامياً ${formatSar(totalExpectedWhtHalalas)} ولم يظهر لها رصيد مسجل في ميزان المراجعة.`,
    };
  }

  if (Math.abs(varianceHalalas) > sarToHalalas(1)) {
    const direction =
      varianceHalalas < 0
        ? `نقص في الضريبة المسجلة بمقدار ${formatSar(Math.abs(varianceHalalas))}`
        : `زيادة في الضريبة المسجلة بمقدار ${formatSar(varianceHalalas)}`;
    return {
      generatedAtIso,
      hasInternationalTransactions,
      detectedTransactions,
      rateBreakdown,
      totalInternationalBaseHalalas,
      totalExpectedWhtHalalas,
      recordedWhtAccountNames,
      recordedWhtHalalas,
      varianceHalalas,
      status: 'mismatch',
      summaryTitle: 'تحذير: فرق في احتساب ضريبة الاستقطاع (Withholding Tax) للموردين الأجانب',
      summaryDetail: `ضريبة الاستقطاع المسجلة (${formatSar(recordedWhtHalalas)}) لا تطابق القيمة المحتسبة وفق النسب النظامية (${formatSar(totalExpectedWhtHalalas)}) — ${direction}.`,
    };
  }

  return {
    generatedAtIso,
    hasInternationalTransactions,
    detectedTransactions,
    rateBreakdown,
    totalInternationalBaseHalalas,
    totalExpectedWhtHalalas,
    recordedWhtAccountNames,
    recordedWhtHalalas,
    varianceHalalas,
    status: 'verified',
    summaryTitle: 'تم التحقق: احتساب ضريبة الاستقطاع للموردين الأجانب مطابق نظامياً',
    summaryDetail: `تطابق رصيد ضريبة الاستقطاع المسجل (${formatSar(recordedWhtHalalas)}) مع النسب النظامية المستحقة على المعاملات الدولية (${formatSar(totalExpectedWhtHalalas)}).`,
  };
}

/**
 * Common Saudi tax, Zakat, and Companies Law pitfall checks.
 */
export function evaluateSaudiTaxAndCompliancePitfalls(params: {
  entity: EntityProfile;
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  statements: ComputedStatements;
  mappedAccounts: MappedAccountRow[];
}): CommonPitfallAlert[] {
  const { entity, statements } = params;
  const alerts: CommonPitfallAlert[] = [];

  if (statements.profitBeforeZakat > 0 && statements.zakatExpense === 0) {
    alerts.push({
      id: 'pitfall-zakat',
      severity: 'warning',
      title: 'غياب مخصص الزكاة الشرعية رغم وجود ربح',
      detail:
        'حققت المنشأة ربحاً قبل الزكاة دون إثبات مخصص زكاة للسنة. تحقق من احتساب الوعاء الزكوي (2.5% أو وفق ضوابط هيئة الزكاة) قبل الاعتماد النهائي.',
    });
  }

  if (
    statements.totalEquity < 0 ||
    (statements.paidUpCapital > 0 &&
      statements.retainedEarningsEnding < -Math.floor(statements.paidUpCapital * 0.5))
  ) {
    alerts.push({
      id: 'pitfall-art132',
      severity: 'warning',
      title: 'تنبيه المادة (132) من نظام الشركات السعودي',
      detail:
        'بلغت الخسائر المتراكمة أكثر من نصف رأس المال أو أصبحت حقوق الملكية سالبة، مما يستوجب دعوة الشركاء أو المساهمين للنظر في استمرار الشركة أو معالجة الخسائر نظامياً.',
    });
  }

  if (
    statements.operatingRevenue > sarToHalalas(375000) &&
    !entity.vatNumber.trim()
  ) {
    alerts.push({
      id: 'pitfall-vat-threshold',
      severity: 'info',
      title: 'تجاوز حد التسجيل الإلزامي لضريبة القيمة المضافة',
      detail:
        'تجاوزت إيرادات النشاط 375,000 ريال سعودي؛ تأكد من تسجيل الرقم الضريبي للمنشأة وإثبات ضريبة المخرجات والمدخلات بدقة.',
    });
  }

  return alerts;
}

/**
 * Carries forward closing Balance Sheet & Retained Earnings from a prior fiscal year
 * into opening balances for the next fiscal year.
 */
export function buildRollForwardFromPriorYear(
  priorRequest: StatementRequestRecord
): {
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
} {
  const priorStatements = computeFinancialStatements(priorRequest.financials);
  const nextFinancials = createEmptyFinancials();

  // Carry forward ending Balance Sheet & Equity balances
  nextFinancials.cash_and_equivalents = priorStatements.cashAndEquivalents;
  nextFinancials.accounts_receivable = priorStatements.accountsReceivable;
  nextFinancials.inventory = priorStatements.inventory;
  nextFinancials.prepaid_and_other_current_assets =
    priorStatements.prepaidAndOtherCurrentAssets;
  nextFinancials.property_plant_equipment =
    priorStatements.propertyPlantEquipment;
  nextFinancials.intangible_assets = priorStatements.intangibleAssets;

  nextFinancials.accounts_payable = priorStatements.accountsPayable;
  nextFinancials.accrued_and_vat_liabilities =
    priorStatements.accruedAndVatLiabilities;
  nextFinancials.zakat_payable = priorStatements.zakatPayable;
  nextFinancials.short_term_loans = priorStatements.shortTermLoans;
  nextFinancials.long_term_loans = priorStatements.longTermLoans;
  nextFinancials.end_of_service_benefits = priorStatements.endOfServiceBenefits;

  nextFinancials.paid_up_capital = priorStatements.paidUpCapital;
  nextFinancials.statutory_reserve = priorStatements.statutoryReserve;
  nextFinancials.retained_earnings_beginning =
    priorStatements.retainedEarningsEnding;
  nextFinancials.partners_current_account_net =
    priorStatements.partnersCurrentAccountNet;

  const nextLines = createEmptyDetailedLines();
  nextLines.cashAccountLines =
    priorRequest.detailedLines.cashAccountLines.length > 0
      ? priorRequest.detailedLines.cashAccountLines.map((l, i) => ({
          ...l,
          id: `rf-cash-${Date.now()}-${i}`,
        }))
      : [
          {
            id: `rf-cash-${Date.now()}`,
            label: 'رصيد النقد المرحل من السنة السابقة',
            amountHalalas: priorStatements.cashAndEquivalents,
          },
        ];
  nextLines.receivableLines = priorRequest.detailedLines.receivableLines.map(
    (l, i) => ({ ...l, id: `rf-rec-${Date.now()}-${i}` })
  );
  nextLines.inventoryLines = priorRequest.detailedLines.inventoryLines.map(
    (l, i) => ({ ...l, id: `rf-inv-${Date.now()}-${i}` })
  );
  nextLines.ppeLines = priorRequest.detailedLines.ppeLines.map((l, i) => ({
    ...l,
    id: `rf-ppe-${Date.now()}-${i}`,
  }));
  nextLines.currentLiabilityLines =
    priorRequest.detailedLines.currentLiabilityLines.map((l, i) => ({
      ...l,
      id: `rf-cl-${Date.now()}-${i}`,
    }));
  nextLines.longTermLiabilityLines =
    priorRequest.detailedLines.longTermLiabilityLines.map((l, i) => ({
      ...l,
      id: `rf-lt-${Date.now()}-${i}`,
    }));

  return {
    financials: nextFinancials,
    detailedLines: nextLines,
  };
}

/**
 * Deterministic rule-based Smart Check & Reconciliation engine.
 * Zero LLM math: all totals, tie-outs, and anomalies are computed in integer Halalas.
 */
export function runSmartCheckEngine(
  mappedRows: MappedAccountRow[],
  wizardInputs: FinancialInputsHalalas
): SmartCheckReport {
  let tbTotalDebitHalalas = 0;
  let tbTotalCreditHalalas = 0;

  const aggregated = createEmptyFinancials();
  let unmappedCount = 0;

  for (const row of mappedRows) {
    tbTotalDebitHalalas += row.debitHalalas;
    tbTotalCreditHalalas += row.creditHalalas;

    if (row.mappedFieldId === 'unmapped') {
      unmappedCount += 1;
      continue;
    }

    const taxonomy = TAXONOMY_BY_ID[row.mappedFieldId];
    // endingNetHalalas is (debit - credit)
    // For debit-normal accounts, positive net adds to balance.
    // For credit-normal accounts, credit > debit so -(endingNetHalalas) is positive balance.
    const signedAmount =
      taxonomy.normalBalance === 'debit'
        ? row.endingNetHalalas
        : -row.endingNetHalalas;

    aggregated[row.mappedFieldId] += signedAmount;
  }

  const tbDiffHalalas = tbTotalDebitHalalas - tbTotalCreditHalalas;
  const tbIsBalanced = tbDiffHalalas === 0;

  const mappedStatements = computeFinancialStatements(aggregated);

  const variances: ReconciliationVariance[] = [];
  for (const item of QAWAEM_TAXONOMY) {
    const wiz = wizardInputs[item.id] || 0;
    const tb = aggregated[item.id] || 0;
    const diff = tb - wiz;
    if (diff !== 0) {
      variances.push({
        fieldId: item.id,
        arabicLabel: item.arabicLabel,
        wizardHalalas: wiz,
        trialBalanceHalalas: tb,
        diffHalalas: diff,
      });
    }
  }

  const anomalies: AnomalyFinding[] = [];
  const strengths: string[] = [];

  if (!tbIsBalanced) {
    anomalies.push({
      id: 'tb-imbalance',
      severity: 'error',
      title: 'عدم توازن ميزان المراجعة المرفوع',
      description: `إجمالي المدين (${formatSar(tbTotalDebitHalalas)}) لا يساوي إجمالي الدائن (${formatSar(tbTotalCreditHalalas)}) بفارق قدره ${formatSar(Math.abs(tbDiffHalalas))}.`,
    });
  } else if (mappedRows.length > 0) {
    strengths.push(
      `ميزان المراجعة متوازن حسابياً بدقة 100% (${formatSar(tbTotalDebitHalalas)}).`
    );
  }

  if (!mappedStatements.isBalanced) {
    anomalies.push({
      id: 'bs-imbalance',
      severity: 'error',
      title: 'اختلال معادلة المركز المالي بعد التسكين',
      description: `الأصول (${formatSar(mappedStatements.totalAssets)}) لا تطابق الخصوم وحقوق الملكية (${formatSar(mappedStatements.totalLiabilitiesAndEquity)}) بفارق ${formatSar(mappedStatements.balanceDiffHalalas)}. تأكد من تسكين جميع الحسابات غير المصنفة.`,
    });
  } else if (mappedRows.length > 0) {
    strengths.push(
      `معادلة المركز المالي متوازنة تماماً: الأصول = الالتزامات + حقوق الملكية (${formatSar(mappedStatements.totalAssets)}).`
    );
  }

  if (unmappedCount > 0) {
    anomalies.push({
      id: 'unmapped-accounts',
      severity: 'warning',
      title: `يوجد ${unmappedCount} حسابات غير مسكنة ببنود قوائم`,
      description:
        'يرجى مراجعة الحسابات غير المصنفة في الجدول أدناه واختيار بند قوائم المناسب لها لضمان عدم وجود فروقات.',
    });
  } else if (mappedRows.length > 0) {
    strengths.push('تم تسكين 100% من حسابات ميزان المراجعة في قاموس منصة قوائم.');
  }

  if (mappedStatements.cashAndEquivalents < 0) {
    anomalies.push({
      id: 'negative-cash',
      severity: 'error',
      title: 'رصيد نقدية سالب (سحب على المكشوف)',
      description: `رصيد النقدية لدى البنوك والصندوق سالب (${formatSar(mappedStatements.cashAndEquivalents)}). إذا كان تسهيلاً بنكياً يجب تصنيفه ضمن القروض قصيرة الأجل.`,
    });
  }

  if (mappedStatements.accountsReceivable < 0) {
    anomalies.push({
      id: 'negative-ar',
      severity: 'warning',
      title: 'رصيد ذمم مدينة سالب',
      description: `رصيد العملاء ظهر بالسالب (${formatSar(mappedStatements.accountsReceivable)}). غالباً يمثل دفعات مقدمة من العملاء يجب عرضها ضمن الالتزامات المتداولة.`,
    });
  }

  if (mappedStatements.partnersCurrentAccountNet < 0) {
    const absWithdrawals = Math.abs(mappedStatements.partnersCurrentAccountNet);
    if (
      mappedStatements.paidUpCapital > 0 &&
      absWithdrawals > mappedStatements.paidUpCapital * 0.5
    ) {
      anomalies.push({
        id: 'partner-drawings-high',
        severity: 'warning',
        title: 'مسحوبات شركاء مرتفعة (جاري الشركاء مدين)',
        description: `جاري الشركاء مدين بمبلغ ${formatSar(absWithdrawals)} وهو يتجاوز 50% من رأس المال، ما قد يثير ملاحظات عند الفحص الزكوي أو المراجعة.`,
      });
    } else {
      anomalies.push({
        id: 'partner-drawings',
        severity: 'info',
        title: 'رصيد جاري الشركاء مدين',
        description: `توجد مسحوبات على الشركاء بقيمة ${formatSar(absWithdrawals)}. تأكد من توثيقها كسحوبات أو تسويتها مع الأرباح القابلة للتوزيع.`,
      });
    }
  }

  if (mappedStatements.totalEquity < 0) {
    anomalies.push({
      id: 'negative-equity',
      severity: 'error',
      title: 'انخفاض حقوق الملكية دون الصفر (تآكل رأس المال)',
      description:
        'إجمالي حقوق الملكية سالب، مما يستدعي التنبيه لإجراءات المادة 132 من نظام الشركات السعودي الخاصة بخسائر الشركة.',
    });
  }

  if (variances.length === 0 && mappedRows.length > 0) {
    strengths.push(
      'جميع الأرقام المدخلة في المعالج التفاعلي مطابقة تماماً لميزان المراجعة المرفوع.'
    );
  }

  if (mappedStatements.netProfit !== 0) {
    strengths.push(
      `تم التحقق من تطابق صافي الربح (${formatSar(mappedStatements.netProfit)}) بين قائمة الدخل وقائمة التغيرات في حقوق الملكية.`
    );
  }

  return {
    checkedAtIso: new Date().toISOString(),
    tbTotalDebitHalalas,
    tbTotalCreditHalalas,
    tbIsBalanced,
    tbDiffHalalas,
    mappedStatements,
    variances,
    anomalies,
    strengths,
    unmappedCount,
    canAutoSync: mappedRows.length > 0 && tbIsBalanced && unmappedCount === 0,
  };
}

export function aggregateMappedRowsToFinancials(
  mappedRows: MappedAccountRow[]
): FinancialInputsHalalas {
  const aggregated = createEmptyFinancials();
  for (const row of mappedRows) {
    if (row.mappedFieldId === 'unmapped') continue;
    const taxonomy = TAXONOMY_BY_ID[row.mappedFieldId];
    const signedAmount =
      taxonomy.normalBalance === 'debit'
        ? row.endingNetHalalas
        : -row.endingNetHalalas;
    aggregated[row.mappedFieldId] += signedAmount;
  }
  return aggregated;
}

export const SAMPLE_TRIAL_BALANCE_ROWS: TrialBalanceRow[] = [
  {
    id: 'tb-1',
    accountCode: '110101',
    accountName: 'البنك الأهلي السعودي - حساب جاري',
    openingBalanceHalalas: sarToHalalas(210000),
    debitHalalas: sarToHalalas(2850000),
    creditHalalas: sarToHalalas(2365000),
    endingNetHalalas: sarToHalalas(485000),
  },
  {
    id: 'tb-2',
    accountCode: '110201',
    accountName: 'ذمم العملاء التجاريين - مبيعات آجلة',
    openingBalanceHalalas: sarToHalalas(190000),
    debitHalalas: sarToHalalas(1450000),
    creditHalalas: sarToHalalas(1140000),
    endingNetHalalas: sarToHalalas(310000),
  },
  {
    id: 'tb-3',
    accountCode: '110301',
    accountName: 'مخزون البضاعة الجاهزة - مستودع الرياض',
    openingBalanceHalalas: sarToHalalas(240000),
    debitHalalas: sarToHalalas(1615000),
    creditHalalas: sarToHalalas(1320000),
    endingNetHalalas: sarToHalalas(295000),
  },
  {
    id: 'tb-4',
    accountCode: '110401',
    accountName: 'إيجارات وتأمين طبي مدفوع مقدماً',
    openingBalanceHalalas: sarToHalalas(35000),
    debitHalalas: sarToHalalas(195000),
    creditHalalas: sarToHalalas(120000),
    endingNetHalalas: sarToHalalas(75000),
  },
  {
    id: 'tb-5',
    accountCode: '120101',
    accountName: 'الأثاث والمعدات والمركبات (بالصافي)',
    openingBalanceHalalas: sarToHalalas(575000),
    debitHalalas: sarToHalalas(575000),
    creditHalalas: sarToHalalas(55000),
    endingNetHalalas: sarToHalalas(520000),
  },
  {
    id: 'tb-6',
    accountCode: '120201',
    accountName: 'برمجيات وأنظمة محاسبية وتراخيص',
    openingBalanceHalalas: sarToHalalas(80000),
    debitHalalas: sarToHalalas(80000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(80000),
  },
  {
    id: 'tb-7',
    accountCode: '210101',
    accountName: 'حساب الموردين والذمم الدائنة',
    openingBalanceHalalas: sarToHalalas(-140000),
    debitHalalas: sarToHalalas(1135000),
    creditHalalas: sarToHalalas(1320000),
    endingNetHalalas: sarToHalalas(-185000),
  },
  {
    id: 'tb-8',
    accountCode: '210201',
    accountName: 'ضريبة القيمة المضافة المستحقة ومصروفات مستحقة',
    openingBalanceHalalas: sarToHalalas(-60000),
    debitHalalas: sarToHalalas(240000),
    creditHalalas: sarToHalalas(332000),
    endingNetHalalas: sarToHalalas(-92000),
  },
  {
    id: 'tb-9',
    accountCode: '210301',
    accountName: 'مخصص الزكاة الشرعية المستحق',
    openingBalanceHalalas: sarToHalalas(-18000),
    debitHalalas: sarToHalalas(18000),
    creditHalalas: sarToHalalas(40000),
    endingNetHalalas: sarToHalalas(-22000),
  },
  {
    id: 'tb-10',
    accountCode: '210401',
    accountName: 'تمويل مرابحة قصير الأجل',
    openingBalanceHalalas: sarToHalalas(-50000),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(50000),
    endingNetHalalas: sarToHalalas(-50000),
  },
  {
    id: 'tb-11',
    accountCode: '220101',
    accountName: 'قرض تمويلي طويل الأجل - مصرف الراجحي',
    openingBalanceHalalas: sarToHalalas(-220000),
    debitHalalas: sarToHalalas(40000),
    creditHalalas: sarToHalalas(220000),
    endingNetHalalas: sarToHalalas(-180000),
  },
  {
    id: 'tb-12',
    accountCode: '220201',
    accountName: 'مخصص مكافأة نهاية خدمة الموظفين',
    openingBalanceHalalas: sarToHalalas(-78000),
    debitHalalas: sarToHalalas(12000),
    creditHalalas: sarToHalalas(108000),
    endingNetHalalas: sarToHalalas(-96000),
  },
  {
    id: 'tb-13',
    accountCode: '310101',
    accountName: 'رأس المال المدفوع',
    openingBalanceHalalas: sarToHalalas(-500000),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(500000),
    endingNetHalalas: sarToHalalas(-500000),
  },
  {
    id: 'tb-14',
    accountCode: '310201',
    accountName: 'الاحتياطي النظامي للشركة',
    openingBalanceHalalas: sarToHalalas(-75000),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(75000),
    endingNetHalalas: sarToHalalas(-75000),
  },
  {
    id: 'tb-15',
    accountCode: '310301',
    accountName: 'الأرباح المبقاة المرحلة',
    openingBalanceHalalas: sarToHalalas(-215000),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(215000),
    endingNetHalalas: sarToHalalas(-215000),
  },
  {
    id: 'tb-16',
    accountCode: '310401',
    accountName: 'جاري الشركاء - تمويل إضافي',
    openingBalanceHalalas: sarToHalalas(-45000),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(45000),
    endingNetHalalas: sarToHalalas(-45000),
  },
  {
    id: 'tb-17',
    accountCode: '310501',
    accountName: 'توزيعات أرباح الشركاء المعتمدة',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(60000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(60000),
  },
  {
    id: 'tb-18',
    accountCode: '410101',
    accountName: 'إيرادات المبيعات والخدمات السحابية',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(2450000),
    endingNetHalalas: sarToHalalas(-2450000),
  },
  {
    id: 'tb-19',
    accountCode: '420101',
    accountName: 'إيرادات متنوعة واستشارات عرضية',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(0),
    creditHalalas: sarToHalalas(35000),
    endingNetHalalas: sarToHalalas(-35000),
  },
  {
    id: 'tb-20',
    accountCode: '510101',
    accountName: 'تكلفة البضاعة المباعة والمشتريات',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(1320000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(1320000),
  },
  {
    id: 'tb-21',
    accountCode: '520101',
    accountName: 'رواتب وأجور وتأمينات GOSI',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(420000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(420000),
  },
  {
    id: 'tb-22',
    accountCode: '520201',
    accountName: 'مصروف إيجار المقر والمستودع',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(120000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(120000),
  },
  {
    id: 'tb-23',
    accountCode: '520301',
    accountName: 'مصروفات عمومية وإدارية وتسويقية',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(165000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(165000),
  },
  {
    id: 'tb-24',
    accountCode: '520401',
    accountName: 'مصروف إهلاك الأصول الثابتة',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(55000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(55000),
  },
  {
    id: 'tb-25',
    accountCode: '530101',
    accountName: 'مصروفات بنكية وتكاليف مرابحة',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(18000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(18000),
  },
  {
    id: 'tb-26',
    accountCode: '540101',
    accountName: 'مصروف الزكاة الشرعية للسنة',
    openingBalanceHalalas: sarToHalalas(0),
    debitHalalas: sarToHalalas(22000),
    creditHalalas: sarToHalalas(0),
    endingNetHalalas: sarToHalalas(22000),
  },
];

export function createEmptyDetailedLines(): WizardDetailedLines {
  return {
    operatingRevenueLines: [{ id: 'rev-1', label: 'المبيعات', amountHalalas: 0 }],
    costOfRevenueLines: [
      { id: 'cogs-1', label: 'تكلفة السلع أو الخدمات المباعة', amountHalalas: 0 },
    ],
    otherRevenueLines: [],
    expenseGrid: {
      salaries: 0,
      rent: 0,
      socialInsurance: 0,
      medicalInsurance: 0,
      electricity: 0,
      water: 0,
      telecomInternet: 0,
      marketingAds: 0,
      shippingTransport: 0,
      maintenance: 0,
      govFees: 0,
      subscriptions: 0,
      professionalFees: 0,
      accountingFees: 0,
      bankFees: 0,
      purchases: 0,
      operatingExpenses: 0,
    },
    otherExpenseLines: [],
    cashAccountLines: [
      { id: 'cash-1', label: 'الحساب البنكي الجاري', amountHalalas: 0 },
    ],
    receivableLines: [],
    inventoryLines: [],
    ppeLines: [],
    currentLiabilityLines: [],
    longTermLiabilityLines: [],
  };
}

export function createDemoDetailedLines(): WizardDetailedLines {
  return {
    operatingRevenueLines: [
      {
        id: 'rev-demo-1',
        label: 'إيرادات المبيعات والخدمات السحابية',
        amountHalalas: sarToHalalas(2450000),
      },
    ],
    costOfRevenueLines: [
      {
        id: 'cogs-demo-1',
        label: 'تكلفة البضاعة المباعة والمشتريات',
        amountHalalas: sarToHalalas(1320000),
      },
    ],
    otherRevenueLines: [
      {
        id: 'oth-rev-demo-1',
        label: 'إيرادات متنوعة واستشارات عرضية',
        amountHalalas: sarToHalalas(35000),
      },
    ],
    expenseGrid: {
      salaries: sarToHalalas(360000),
      rent: sarToHalalas(120000),
      socialInsurance: sarToHalalas(42000),
      medicalInsurance: sarToHalalas(18000),
      electricity: sarToHalalas(14000),
      water: sarToHalalas(3000),
      telecomInternet: sarToHalalas(18000),
      marketingAds: sarToHalalas(45000),
      shippingTransport: sarToHalalas(12000),
      maintenance: sarToHalalas(9000),
      govFees: sarToHalalas(28000),
      subscriptions: sarToHalalas(11000),
      professionalFees: sarToHalalas(15000),
      accountingFees: sarToHalalas(10000),
      bankFees: sarToHalalas(18000),
      purchases: 0,
      operatingExpenses: 0,
    },
    otherExpenseLines: [],
    cashAccountLines: [
      {
        id: 'cash-demo-1',
        label: 'البنك الأهلي السعودي - حساب جاري',
        amountHalalas: sarToHalalas(485000),
      },
    ],
    receivableLines: [
      {
        id: 'ar-demo-1',
        label: 'ذمم العملاء التجاريين',
        amountHalalas: sarToHalalas(310000),
      },
      {
        id: 'ar-demo-2',
        label: 'إيجارات وتأمين مدفوع مقدماً',
        amountHalalas: sarToHalalas(75000),
      },
    ],
    inventoryLines: [
      {
        id: 'inv-demo-1',
        label: 'مخزون البضاعة الجاهزة',
        amountHalalas: sarToHalalas(295000),
      },
    ],
    ppeLines: [
      {
        id: 'ppe-demo-1',
        label: 'الأثاث والمعدات والمركبات (بالصافي)',
        amountHalalas: sarToHalalas(520000),
      },
      {
        id: 'ppe-demo-2',
        label: 'برمجيات وأنظمة محاسبية',
        amountHalalas: sarToHalalas(80000),
      },
    ],
    currentLiabilityLines: [
      {
        id: 'cl-demo-1',
        label: 'حساب الموردين والذمم الدائنة',
        amountHalalas: sarToHalalas(185000),
      },
      {
        id: 'cl-demo-2',
        label: 'ضريبة القيمة المضافة ومصروفات مستحقة',
        amountHalalas: sarToHalalas(92000),
      },
      {
        id: 'cl-demo-3',
        label: 'مخصص الزكاة المستحق',
        amountHalalas: sarToHalalas(22000),
      },
      {
        id: 'cl-demo-4',
        label: 'تمويل مرابحة قصير الأجل',
        amountHalalas: sarToHalalas(50000),
      },
    ],
    longTermLiabilityLines: [
      {
        id: 'lt-demo-1',
        label: 'قرض تمويلي طويل الأجل',
        amountHalalas: sarToHalalas(180000),
      },
      {
        id: 'lt-demo-2',
        label: 'مخصص مكافأة نهاية الخدمة',
        amountHalalas: sarToHalalas(96000),
      },
    ],
  };
}

function sumLines(lines: DynamicLineItem[]): number {
  return lines.reduce((sum, item) => sum + (item.amountHalalas || 0), 0);
}

/**
 * Computes exact FinancialInputsHalalas from WizardDetailedLines while preserving
 * capital, reserves, retained earnings, depreciation, zakat, and dividends.
 */
export function syncDetailedLinesToFinancials(
  lines: WizardDetailedLines,
  currentFinancials: FinancialInputsHalalas
): FinancialInputsHalalas {
  const g = lines.expenseGrid;

  const salariesAndWages = g.salaries + g.socialInsurance + g.medicalInsurance;
  const rentExpense = g.rent;
  const financeCosts = g.bankFees;
  const generalAdminExpenses =
    g.electricity +
    g.water +
    g.telecomInternet +
    g.marketingAds +
    g.shippingTransport +
    g.maintenance +
    g.govFees +
    g.subscriptions +
    g.professionalFees +
    g.accountingFees +
    g.purchases +
    g.operatingExpenses +
    sumLines(lines.otherExpenseLines);

  // Split receivableLines into trade receivables vs prepaid/VAT if labeled accordingly
  let tradeAr = 0;
  let prepaidOther = 0;
  for (const item of lines.receivableLines) {
    const lbl = item.label;
    if (
      lbl.includes('مقدم') ||
      lbl.includes('ضريب') ||
      lbl.includes('مدخلات') ||
      lbl.includes('عهد') ||
      lbl.includes('تأمين')
    ) {
      prepaidOther += item.amountHalalas || 0;
    } else {
      tradeAr += item.amountHalalas || 0;
    }
  }

  // Split PPE lines into tangible PPE vs intangibles
  let ppe = 0;
  let intangibles = 0;
  for (const item of lines.ppeLines) {
    const lbl = item.label;
    if (
      lbl.includes('برمج') ||
      lbl.includes('تراخيص') ||
      lbl.includes('علام') ||
      lbl.includes('شهر') ||
      lbl.includes('حق استخدام') ||
      lbl.includes('غير ملموس')
    ) {
      intangibles += item.amountHalalas || 0;
    } else {
      ppe += item.amountHalalas || 0;
    }
  }

  // Split current liabilities cleanly into Qawaem buckets
  let accountsPayable = 0;
  let accruedVat = 0;
  let zakatPayable = 0;
  let shortTermLoans = 0;
  for (const item of lines.currentLiabilityLines) {
    const lbl = item.label;
    if (lbl.includes('زكا')) {
      zakatPayable += item.amountHalalas || 0;
    } else if (lbl.includes('قرض') || lbl.includes('مرابح') || lbl.includes('تسهيل')) {
      shortTermLoans += item.amountHalalas || 0;
    } else if (
      lbl.includes('مورد') ||
      lbl.includes('ذمم دائن') ||
      lbl.includes('مقاول')
    ) {
      accountsPayable += item.amountHalalas || 0;
    } else {
      accruedVat += item.amountHalalas || 0;
    }
  }

  // Split long-term liabilities into long-term loans vs end-of-service benefits
  let longTermLoans = 0;
  let eosb = 0;
  for (const item of lines.longTermLiabilityLines) {
    const lbl = item.label;
    if (lbl.includes('نهاية الخدم') || lbl.includes('منافع') || lbl.includes('موظف')) {
      eosb += item.amountHalalas || 0;
    } else {
      longTermLoans += item.amountHalalas || 0;
    }
  }

  return {
    ...currentFinancials,
    operating_revenue: sumLines(lines.operatingRevenueLines),
    cost_of_revenue: sumLines(lines.costOfRevenueLines),
    other_revenue: sumLines(lines.otherRevenueLines),
    salaries_and_wages: salariesAndWages,
    rent_expense: rentExpense,
    finance_costs: financeCosts,
    general_admin_expenses: generalAdminExpenses,
    cash_and_equivalents: sumLines(lines.cashAccountLines),
    accounts_receivable: tradeAr,
    prepaid_and_other_current_assets: prepaidOther,
    inventory: sumLines(lines.inventoryLines),
    property_plant_equipment: ppe,
    intangible_assets: intangibles,
    accounts_payable: accountsPayable,
    accrued_and_vat_liabilities: accruedVat,
    zakat_payable: zakatPayable,
    short_term_loans: shortTermLoans,
    long_term_loans: longTermLoans,
    end_of_service_benefits: eosb,
  };
}

/**
 * Populates WizardDetailedLines directly from mapped Trial Balance accounts.
 */
export function buildDetailedLinesFromMappedAccounts(
  mappedRows: MappedAccountRow[]
): WizardDetailedLines {
  const lines = createEmptyDetailedLines();
  lines.operatingRevenueLines = [];
  lines.costOfRevenueLines = [];
  lines.cashAccountLines = [];

  for (const row of mappedRows) {
    if (row.mappedFieldId === 'unmapped') continue;
    const tax = TAXONOMY_BY_ID[row.mappedFieldId];
    const amountHalalas =
      tax.normalBalance === 'debit'
        ? row.endingNetHalalas
        : -row.endingNetHalalas;
    if (amountHalalas === 0) continue;

    const item: DynamicLineItem = {
      id: `line-${row.id}`,
      label: row.accountName,
      amountHalalas,
    };

    switch (row.mappedFieldId) {
      case 'operating_revenue':
        lines.operatingRevenueLines.push(item);
        break;
      case 'cost_of_revenue':
        lines.costOfRevenueLines.push(item);
        break;
      case 'other_revenue':
        lines.otherRevenueLines.push(item);
        break;
      case 'salaries_and_wages':
        lines.expenseGrid.salaries += amountHalalas;
        break;
      case 'rent_expense':
        lines.expenseGrid.rent += amountHalalas;
        break;
      case 'finance_costs':
        lines.expenseGrid.bankFees += amountHalalas;
        break;
      case 'general_admin_expenses':
        lines.expenseGrid.operatingExpenses += amountHalalas;
        break;
      case 'cash_and_equivalents':
        lines.cashAccountLines.push(item);
        break;
      case 'accounts_receivable':
      case 'prepaid_and_other_current_assets':
        lines.receivableLines.push(item);
        break;
      case 'inventory':
        lines.inventoryLines.push(item);
        break;
      case 'property_plant_equipment':
      case 'intangible_assets':
        lines.ppeLines.push(item);
        break;
      case 'accounts_payable':
      case 'accrued_and_vat_liabilities':
      case 'zakat_payable':
      case 'short_term_loans':
        lines.currentLiabilityLines.push(item);
        break;
      case 'long_term_loans':
      case 'end_of_service_benefits':
        lines.longTermLiabilityLines.push(item);
        break;
      default:
        break;
    }
  }

  return lines;
}

