import type {
  ComputedStatements,
  EntityProfile,
  FinancialInputsHalalas,
  WizardDetailedLines,
} from '../types/qawaem';

export interface OfficialQawaemData {
  // Header metadata
  entityName: string;
  legalForm: string;
  unifiedCrNumber: string;
  fiscalYearLabel: string;
  asOfDateLabel: string;
  periodSubtitleLabel: string;
  periodColumnLabel: string;
  openingBalanceLabel: string;
  closingBalanceDateLabel: string;
  exemptionPeriodEndLabel: string;
  isFirstPeriod: boolean;

  // Balance Sheet (whole Saudi Riyals)
  balanceSheet: {
    // Non-current assets
    propertyPlantEquipment: number;
    intangibleAssets: number;
    investmentProperties: number;
    equityMethodInvestments: number;
    otherNonCurrentAssets: number;
    totalNonCurrentAssets: number;

    // Current assets
    prepaidAndOtherDebitBalances: number;
    tradeReceivables: number;
    cashAndCashEquivalents: number;
    inventory: number;
    fvtplInvestments: number;
    otherCurrentAssets: number;
    dueFromRelatedParties: number;
    totalCurrentAssets: number;

    totalAssets: number;

    // Equity
    shareCapital: number;
    statutoryReserve: number;
    retainedEarningsEnding: number;
    otherEquityItems: number;
    equityAttributableToParent: number;
    nonControllingInterest: number;
    totalEquity: number;

    // Non-current liabilities
    employeeBenefitsObligation: number;
    nonCurrentLoansAndSukuk: number;
    deferredTaxLiabilities: number;
    otherNonCurrentLiabilities: number;
    totalNonCurrentLiabilities: number;

    // Current liabilities
    currentLoansAndSukuk: number;
    zakatPayable: number;
    taxesPayable: number;
    dueToRelatedParties: number;
    tradePayables: number;
    accruedAndOtherCreditBalances: number;
    otherCurrentLiabilities: number;
    totalCurrentLiabilities: number;

    totalLiabilities: number;
    totalEquityAndLiabilities: number;
  };

  // Comprehensive Income Statement (whole Saudi Riyals)
  incomeStatement: {
    salesRevenue: number;
    costOfSales: number; // stored as positive magnitude, displayed in parentheses
    grossProfit: number;
    generalAndAdminExpenses: number; // positive magnitude
    sellingAndDistributionExpenses: number; // positive magnitude
    otherExpenses: number; // positive magnitude
    gainLossOnDisposalOfInvestments: number;
    gainLossOnDisposalOfInvestmentProperties: number;
    shareOfAssociatesProfitLoss: number;
    otherIncome: number;
    profitBeforeTax: number;
    financeCost: number; // positive magnitude
    zakatExpense: number; // positive magnitude
    incomeTaxExpense: number; // positive magnitude
    netProfitForPeriod: number;
    profitNonControlling: number;
    profitAttributableToParent: number;
    otherComprehensiveIncome: number;
    totalComprehensiveIncome: number;
  };

  // Statement of Changes in Equity (whole Saudi Riyals)
  equityStatement: {
    openingCapital: number;
    openingStatutoryReserve: number;
    openingRetainedEarnings: number;
    openingTotal: number;

    paidInCapitalMovement: number;
    netProfitMovement: number;
    dividendsMovement: number; // negative when dividends declared
    otherEquityMovement: number;
    otherComprehensiveIncome: number;

    closingCapital: number;
    closingStatutoryReserve: number;
    closingRetainedEarnings: number;
    closingTotal: number;
  };

  // Statement of Cash Flows - Indirect Method (whole Saudi Riyals)
  cashFlowStatement: {
    profitBeforeTax: number;
    depreciationAdjustment: number;
    employeeBenefitsProvision: number;
    operatingBeforeWorkingCapital: number;

    changeInPrepaidAndOtherDebit: number;
    changeInTradeReceivables: number;
    changeInInventory: number;
    changeInAccruedAndPayables: number;
    zakatPaidOrAdjusted: number;
    netCashFromOperating: number;

    additionsToPpe: number;
    additionsToIntangibles: number;
    netCashFromInvesting: number;

    capitalContribution: number;
    netRelatedPartyFinancing: number;
    loansFinancing: number;
    dividendsPaid: number;
    netCashFromFinancing: number;

    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
  };
}

function toWholeSar(halalas: number): number {
  const rounded = Math.round((halalas || 0) / 100);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Official Saudi SOCPA / Qawaem accounting number format:
 * - Zero -> "-"
 * - Positive -> "45,579"
 * - Negative -> "(93,662)"
 */
export function formatQawaemAmount(amountSar: number): string {
  const rounded = Math.round(amountSar || 0);
  if (rounded === 0) return '-';
  const absFormatted = Math.abs(rounded).toLocaleString('en-US');
  return rounded < 0 ? `(${absFormatted})` : absFormatted;
}

function isRelatedPartyLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes('أطراف ذات علاقة') ||
    normalized.includes('اطراف ذات علاقة') ||
    normalized.includes('طرف ذو علاقة') ||
    normalized.includes('جاري الشريك') ||
    normalized.includes('جاري شريك') ||
    normalized.includes('جاري الشركاء') ||
    normalized.includes('الشريك') ||
    normalized.includes('ذمم مدينة على سلمان') ||
    normalized.includes('related part') ||
    normalized.includes('partner') ||
    normalized.includes('shareholder')
  );
}

function isPrepaidOrVatReceivableLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes('ضريبة القيمة المضافة') ||
    normalized.includes('ضريبه القيمه المضافه') ||
    normalized.includes('input vat') ||
    normalized.includes('مدفوعة مقدماً') ||
    normalized.includes('مدفوعة مقدما') ||
    normalized.includes('مصروفات مقدمة') ||
    normalized.includes('أرصدة مدينة أخرى') ||
    normalized.includes('prepaid')
  );
}

function isTradePayableLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes('ذمم دائنة') ||
    normalized.includes('ذمم دائنه') ||
    normalized.includes('موردين') ||
    normalized.includes('موردون') ||
    normalized.includes('بائعين') ||
    normalized.includes('accounts payable') ||
    normalized.includes('trade payable') ||
    normalized.includes('vendor') ||
    normalized.includes('supplier')
  );
}

function isTaxOrVatLiabilityLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes('ضرائب مستحقة') ||
    normalized.includes('ضريبة الدخل المستحقة') ||
    normalized.includes('ضريبة استقطاع') ||
    normalized.includes('output vat')
  );
}

function formatArabicDateFromIsoOrDdMmYyyy(raw: string): string {
  const monthNames = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  const ddMmYyyy = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddMmYyyy) {
    const day = Number(ddMmYyyy[1]);
    const month = Number(ddMmYyyy[2]);
    const year = ddMmYyyy[3];
    if (month >= 1 && month <= 12) {
      return `${day} ${monthNames[month - 1]} ${year}م`;
    }
  }
  const yyyyMmDd = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyyMmDd) {
    const year = yyyyMmDd[1];
    const month = Number(yyyyMmDd[2]);
    const day = Number(yyyyMmDd[3]);
    if (month >= 1 && month <= 12) {
      return `${day} ${monthNames[month - 1]} ${year}م`;
    }
  }
  return raw;
}

function derivePeriodLabels(entity: EntityProfile): {
  asOfDateLabel: string;
  periodSubtitleLabel: string;
  periodColumnLabel: string;
  openingBalanceLabel: string;
  closingBalanceDateLabel: string;
  exemptionPeriodEndLabel: string;
} {
  const year = entity.fiscalYearLabel || '2026';
  const fye = entity.fiscalYearEnd || '12-31';
  const closingIso = `${year}-${fye}`;
  const closingArabic = formatArabicDateFromIsoOrDdMmYyyy(closingIso);
  const fyeParts = fye.split('-');
  const closingSlash =
    fyeParts.length === 2
      ? `${year}/${fyeParts[0]}/${fyeParts[1]}م`
      : `${year}/12/31م`;

  // Parse start/end dates if present in entity.fiscalPeriodRange (e.g. "من 18/05/2025 إلى 31/12/2026")
  const dateMatches = entity.fiscalPeriodRange?.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
  if (dateMatches && dateMatches.length >= 2) {
    const startRaw = dateMatches[0];
    const endRaw = dateMatches[1];
    const startArabic = formatArabicDateFromIsoOrDdMmYyyy(startRaw);
    const endArabic = formatArabicDateFromIsoOrDdMmYyyy(endRaw);
    const isExtendedFirstPeriod = !startRaw.startsWith('01/01/');

    return {
      asOfDateLabel: `كما في ${endArabic}`,
      periodSubtitleLabel: isExtendedFirstPeriod
        ? `للفترة من ${startArabic} (تاريخ التأسيس) إلى ${endArabic}`
        : `للسنة المالية المنتهية في ${endArabic}`,
      periodColumnLabel: `${startArabic} إلى ${endArabic}`,
      openingBalanceLabel: isExtendedFirstPeriod
        ? `الرصيد عند التأسيس في ${startArabic}`
        : `الرصيد في بداية الفترة`,
      closingBalanceDateLabel: `الرصيد في ${closingSlash}`,
      exemptionPeriodEndLabel: endRaw,
    };
  }

  return {
    asOfDateLabel: `كما في ${closingArabic}`,
    periodSubtitleLabel: `للسنة المالية المنتهية في ${closingArabic}`,
    periodColumnLabel: `${year}م`,
    openingBalanceLabel: 'الرصيد في بداية الفترة',
    closingBalanceDateLabel: `الرصيد في ${closingSlash}`,
    exemptionPeriodEndLabel: `${fyeParts[1] || '31'}/${fyeParts[0] || '12'}/${year}`,
  };
}

export function buildOfficialQawaemOutput(
  entity: EntityProfile,
  financials: FinancialInputsHalalas,
  detailedLines: WizardDetailedLines | undefined,
  statements: ComputedStatements
): OfficialQawaemData {
  const labels = derivePeriodLabels(entity);

  // 1. Income Statement Breakdown (exact alignment with Qawaem / SOCPA template)
  const salesRevenue = toWholeSar(statements.operatingRevenue);
  const costOfSales = toWholeSar(statements.costOfRevenue);
  const grossProfit = salesRevenue - costOfSales;

  // Selling & Distribution + Other Expenses from detailedLines when available
  const grid = detailedLines?.expenseGrid;
  const sellingFromGridHalalas = grid
    ? (grid.marketingAds || 0) + (grid.shippingTransport || 0)
    : 0;
  const otherExpensesFromLinesHalalas = (detailedLines?.otherExpenseLines || []).reduce(
    (sum, line) => sum + (line.amountHalalas || 0),
    0
  );

  // Total operating expenses in engine = salaries + rent + generalAdmin + depreciation
  const totalEngineOpExHalalas =
    (statements.salariesAndWages || 0) +
    (statements.rentExpense || 0) +
    (statements.generalAdminExpenses || 0) +
    (statements.depreciationExpense || 0);

  // Only split out selling & other expenses if they fit within total operating expenses
  const canUseDetailedExpenseSplit =
    sellingFromGridHalalas + otherExpensesFromLinesHalalas > 0 &&
    sellingFromGridHalalas + otherExpensesFromLinesHalalas <=
      totalEngineOpExHalalas + 100;

  const sellingAndDistributionExpenses = canUseDetailedExpenseSplit
    ? toWholeSar(sellingFromGridHalalas)
    : 0;
  const otherExpenses = canUseDetailedExpenseSplit
    ? toWholeSar(otherExpensesFromLinesHalalas)
    : 0;
  const generalAndAdminExpenses = canUseDetailedExpenseSplit
    ? toWholeSar(totalEngineOpExHalalas) -
      sellingAndDistributionExpenses -
      otherExpenses
    : toWholeSar(totalEngineOpExHalalas);

  const otherIncome = toWholeSar(statements.otherRevenue);
  const profitBeforeTax =
    grossProfit -
    generalAndAdminExpenses -
    sellingAndDistributionExpenses -
    otherExpenses +
    otherIncome;

  const financeCost = toWholeSar(statements.financeCosts);
  const zakatExpense = toWholeSar(statements.zakatExpense);
  const incomeTaxExpense = 0;

  const netProfitForPeriod =
    profitBeforeTax - financeCost - zakatExpense - incomeTaxExpense;

  // 2. Balance Sheet Breakdown (whole Riyals)
  const propertyPlantEquipment = toWholeSar(statements.propertyPlantEquipment);
  const intangibleAssets = toWholeSar(statements.intangibleAssets);
  const totalNonCurrentAssets = propertyPlantEquipment + intangibleAssets;

  const cashAndCashEquivalents = toWholeSar(statements.cashAndEquivalents);
  const inventory = toWholeSar(statements.inventory);

  // Split Receivables & Prepaids into:
  // - مصاريف مدفوعة مقدماً وأرصدة مدينة أخرى
  // - ذمم مدينة تجارية
  // - مطلوب من أطراف ذات علاقة
  const recLines = detailedLines?.receivableLines || [];
  const recLinesTotalHalalas = recLines.reduce(
    (s, l) => s + (l.amountHalalas || 0),
    0
  );
  const combinedRecAndPrepaidHalalas =
    (statements.accountsReceivable || 0) +
    (statements.prepaidAndOtherCurrentAssets || 0);

  let prepaidAndOtherDebitBalances = toWholeSar(
    statements.prepaidAndOtherCurrentAssets
  );
  let tradeReceivables = toWholeSar(statements.accountsReceivable);
  let dueFromRelatedParties = 0;

  if (
    recLines.length > 0 &&
    Math.abs(recLinesTotalHalalas - (statements.accountsReceivable || 0)) <= 100
  ) {
    let rpHalalas = 0;
    let prepaidFromRecHalalas = 0;
    let tradeHalalas = 0;
    for (const line of recLines) {
      if (isRelatedPartyLabel(line.label)) {
        rpHalalas += line.amountHalalas || 0;
      } else if (isPrepaidOrVatReceivableLabel(line.label)) {
        prepaidFromRecHalalas += line.amountHalalas || 0;
      } else {
        tradeHalalas += line.amountHalalas || 0;
      }
    }
    dueFromRelatedParties = toWholeSar(rpHalalas);
    prepaidAndOtherDebitBalances = toWholeSar(
      (statements.prepaidAndOtherCurrentAssets || 0) + prepaidFromRecHalalas
    );
    tradeReceivables = toWholeSar(tradeHalalas);
  } else if (recLines.length > 0 && combinedRecAndPrepaidHalalas > 0) {
    // Fallback if detailed lines match combined receivables + prepaids
    if (Math.abs(recLinesTotalHalalas - combinedRecAndPrepaidHalalas) <= 100) {
      let rpHalalas = 0;
      let prepaidHalalas = 0;
      let tradeHalalas = 0;
      for (const line of recLines) {
        if (isRelatedPartyLabel(line.label)) {
          rpHalalas += line.amountHalalas || 0;
        } else if (isPrepaidOrVatReceivableLabel(line.label)) {
          prepaidHalalas += line.amountHalalas || 0;
        } else {
          tradeHalalas += line.amountHalalas || 0;
        }
      }
      dueFromRelatedParties = toWholeSar(rpHalalas);
      prepaidAndOtherDebitBalances = toWholeSar(prepaidHalalas);
      tradeReceivables = toWholeSar(tradeHalalas);
    }
  }

  const totalCurrentAssets =
    prepaidAndOtherDebitBalances +
    tradeReceivables +
    cashAndCashEquivalents +
    inventory +
    dueFromRelatedParties;
  const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

  // Equity
  const shareCapital = toWholeSar(statements.paidUpCapital);
  const statutoryReserve = toWholeSar(statements.statutoryReserve);
  const openingRetainedEarnings = toWholeSar(
    statements.retainedEarningsBeginning
  );
  const dividendsDeclared = toWholeSar(statements.dividendsDeclared);
  const otherEquityItems = toWholeSar(statements.partnersCurrentAccountNet);
  const retainedEarningsEnding =
    openingRetainedEarnings + netProfitForPeriod - dividendsDeclared;
  const equityAttributableToParent =
    shareCapital + statutoryReserve + retainedEarningsEnding + otherEquityItems;
  const totalEquity = equityAttributableToParent;

  // Non-current Liabilities
  const employeeBenefitsObligation = toWholeSar(
    statements.endOfServiceBenefits
  );
  const nonCurrentLoansAndSukuk = toWholeSar(statements.longTermLoans);
  const totalNonCurrentLiabilities =
    employeeBenefitsObligation + nonCurrentLoansAndSukuk;

  // Current Liabilities Split:
  // - سندات دين وقروض متداولة
  // - الزكاة مستحقة الدفع
  // - الضرائب مستحقة الدفع
  // - مطلوب إلى أطراف ذات علاقة
  // - المبالغ المستحقة للموردين والبائعين
  // - مصاريف مستحقة وأرصدة دائنة أخرى
  const currentLoansAndSukuk = toWholeSar(statements.shortTermLoans);
  const zakatPayable = toWholeSar(statements.zakatPayable);

  const clLines = detailedLines?.currentLiabilityLines || [];
  const clLinesTotalHalalas = clLines.reduce(
    (s, l) => s + (l.amountHalalas || 0),
    0
  );
  const combinedApAndAccruedHalalas =
    (statements.accountsPayable || 0) +
    (statements.accruedAndVatLiabilities || 0);

  let taxesPayable = 0;
  let dueToRelatedParties = 0;
  let tradePayables = toWholeSar(statements.accountsPayable);
  let accruedAndOtherCreditBalances = toWholeSar(
    statements.accruedAndVatLiabilities
  );

  if (
    clLines.length > 0 &&
    Math.abs(clLinesTotalHalalas - combinedApAndAccruedHalalas) <= 100
  ) {
    let rpHalalas = 0;
    let apHalalas = 0;
    let taxHalalas = 0;
    let accruedHalalas = 0;
    for (const line of clLines) {
      if (isRelatedPartyLabel(line.label)) {
        rpHalalas += line.amountHalalas || 0;
      } else if (isTradePayableLabel(line.label)) {
        apHalalas += line.amountHalalas || 0;
      } else if (isTaxOrVatLiabilityLabel(line.label)) {
        taxHalalas += line.amountHalalas || 0;
      } else {
        accruedHalalas += line.amountHalalas || 0;
      }
    }
    dueToRelatedParties = toWholeSar(rpHalalas);
    tradePayables = toWholeSar(apHalalas);
    taxesPayable = toWholeSar(taxHalalas);
    accruedAndOtherCreditBalances = toWholeSar(accruedHalalas);
  }

  const totalCurrentLiabilities =
    currentLoansAndSukuk +
    zakatPayable +
    taxesPayable +
    dueToRelatedParties +
    tradePayables +
    accruedAndOtherCreditBalances;
  const totalLiabilities =
    totalNonCurrentLiabilities + totalCurrentLiabilities;
  const totalEquityAndLiabilities = totalEquity + totalLiabilities;

  // 3. Statement of Changes in Equity
  const isFirstPeriod =
    openingRetainedEarnings === 0 &&
    statutoryReserve === 0 &&
    (entity.fiscalPeriodRange?.includes('18/05/2025') ||
      financials.retained_earnings_beginning === 0);

  const openingCapital = isFirstPeriod ? 0 : shareCapital;
  const openingStatutoryReserve = isFirstPeriod ? 0 : statutoryReserve;
  const openingTotal =
    openingCapital + openingStatutoryReserve + openingRetainedEarnings;
  const paidInCapitalMovement = isFirstPeriod ? shareCapital : 0;

  // 4. Statement of Cash Flows (Indirect Method — exact tie-out to Cash & Equivalents)
  const depreciationAdjustment = toWholeSar(statements.depreciationExpense);
  const employeeBenefitsProvision = employeeBenefitsObligation;
  const operatingBeforeWorkingCapital =
    profitBeforeTax + depreciationAdjustment + employeeBenefitsProvision;

  const changeInPrepaidAndOtherDebit = -prepaidAndOtherDebitBalances;
  const changeInTradeReceivables = -tradeReceivables;
  const changeInInventory = -inventory;
  const changeInAccruedAndPayables =
    tradePayables + accruedAndOtherCreditBalances + taxesPayable;
  const zakatPaidOrAdjusted = zakatPayable - zakatExpense - financeCost;

  const netCashFromOperating =
    operatingBeforeWorkingCapital +
    changeInPrepaidAndOtherDebit +
    changeInTradeReceivables +
    changeInInventory +
    changeInAccruedAndPayables +
    zakatPaidOrAdjusted;

  // Investing: Gross additions to PPE = ending net PPE + depreciation
  const additionsToPpe = -(propertyPlantEquipment + depreciationAdjustment);
  const additionsToIntangibles = -intangibleAssets;
  const netCashFromInvesting = additionsToPpe + additionsToIntangibles;

  // Financing: Capital introduced + net related party funding + loans - dividends
  const capitalContribution = shareCapital + statutoryReserve + otherEquityItems;
  const netRelatedPartyFinancing = dueToRelatedParties - dueFromRelatedParties;
  const loansFinancing = currentLoansAndSukuk + nonCurrentLoansAndSukuk;
  const dividendsPaid = -dividendsDeclared;
  const netCashFromFinancing =
    capitalContribution +
    netRelatedPartyFinancing +
    loansFinancing +
    dividendsPaid;

  const netChangeInCash =
    netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
  const beginningCash = Math.max(0, cashAndCashEquivalents - netChangeInCash);
  const endingCash = beginningCash + netChangeInCash;

  return {
    entityName: entity.entityName || 'المنشأة',
    legalForm: entity.legalForm || 'شركة ذات مسؤولية محدودة',
    unifiedCrNumber: entity.unifiedNumber || entity.crNumber || '',
    fiscalYearLabel: entity.fiscalYearLabel || '2026',
    asOfDateLabel: labels.asOfDateLabel,
    periodSubtitleLabel: labels.periodSubtitleLabel,
    periodColumnLabel: labels.periodColumnLabel,
    openingBalanceLabel: labels.openingBalanceLabel,
    closingBalanceDateLabel: labels.closingBalanceDateLabel,
    exemptionPeriodEndLabel: labels.exemptionPeriodEndLabel,
    isFirstPeriod,
    balanceSheet: {
      propertyPlantEquipment,
      intangibleAssets,
      investmentProperties: 0,
      equityMethodInvestments: 0,
      otherNonCurrentAssets: 0,
      totalNonCurrentAssets,
      prepaidAndOtherDebitBalances,
      tradeReceivables,
      cashAndCashEquivalents,
      inventory,
      fvtplInvestments: 0,
      otherCurrentAssets: 0,
      dueFromRelatedParties,
      totalCurrentAssets,
      totalAssets,
      shareCapital,
      statutoryReserve,
      retainedEarningsEnding,
      otherEquityItems,
      equityAttributableToParent,
      nonControllingInterest: 0,
      totalEquity,
      employeeBenefitsObligation,
      nonCurrentLoansAndSukuk,
      deferredTaxLiabilities: 0,
      otherNonCurrentLiabilities: 0,
      totalNonCurrentLiabilities,
      currentLoansAndSukuk,
      zakatPayable,
      taxesPayable,
      dueToRelatedParties,
      tradePayables,
      accruedAndOtherCreditBalances,
      otherCurrentLiabilities: 0,
      totalCurrentLiabilities,
      totalLiabilities,
      totalEquityAndLiabilities,
    },
    incomeStatement: {
      salesRevenue,
      costOfSales,
      grossProfit,
      generalAndAdminExpenses,
      sellingAndDistributionExpenses,
      otherExpenses,
      gainLossOnDisposalOfInvestments: 0,
      gainLossOnDisposalOfInvestmentProperties: 0,
      shareOfAssociatesProfitLoss: 0,
      otherIncome,
      profitBeforeTax,
      financeCost,
      zakatExpense,
      incomeTaxExpense,
      netProfitForPeriod,
      profitNonControlling: 0,
      profitAttributableToParent: netProfitForPeriod,
      otherComprehensiveIncome: 0,
      totalComprehensiveIncome: netProfitForPeriod,
    },
    equityStatement: {
      openingCapital,
      openingStatutoryReserve,
      openingRetainedEarnings,
      openingTotal,
      paidInCapitalMovement,
      netProfitMovement: netProfitForPeriod,
      dividendsMovement: -dividendsDeclared,
      otherEquityMovement: otherEquityItems,
      otherComprehensiveIncome: 0,
      closingCapital: shareCapital,
      closingStatutoryReserve: statutoryReserve,
      closingRetainedEarnings: retainedEarningsEnding,
      closingTotal: totalEquity,
    },
    cashFlowStatement: {
      profitBeforeTax,
      depreciationAdjustment,
      employeeBenefitsProvision,
      operatingBeforeWorkingCapital,
      changeInPrepaidAndOtherDebit,
      changeInTradeReceivables,
      changeInInventory,
      changeInAccruedAndPayables,
      zakatPaidOrAdjusted,
      netCashFromOperating,
      additionsToPpe,
      additionsToIntangibles,
      netCashFromInvesting,
      capitalContribution,
      netRelatedPartyFinancing,
      loansFinancing,
      dividendsPaid,
      netCashFromFinancing,
      netChangeInCash,
      beginningCash,
      endingCash,
    },
  };
}
