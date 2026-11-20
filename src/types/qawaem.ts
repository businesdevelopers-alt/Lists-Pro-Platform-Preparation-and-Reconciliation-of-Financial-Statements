export type CompanyClassification = 'micro' | 'small' | 'medium_large';

export type WizardSubStep = 1 | 2 | 3 | 4 | 5 | 6;

export type MainStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type QawaemFieldId =
  // Assets - Current
  | 'cash_and_equivalents'
  | 'accounts_receivable'
  | 'inventory'
  | 'prepaid_and_other_current_assets'
  // Assets - Non-Current
  | 'property_plant_equipment'
  | 'intangible_assets'
  // Liabilities - Current
  | 'accounts_payable'
  | 'accrued_and_vat_liabilities'
  | 'zakat_payable'
  | 'short_term_loans'
  // Liabilities - Non-Current
  | 'long_term_loans'
  | 'end_of_service_benefits'
  // Equity
  | 'paid_up_capital'
  | 'statutory_reserve'
  | 'retained_earnings_beginning'
  | 'partners_current_account_net'
  | 'dividends_declared'
  // Income Statement - Revenues
  | 'operating_revenue'
  | 'other_revenue'
  // Income Statement - Expenses
  | 'cost_of_revenue'
  | 'salaries_and_wages'
  | 'rent_expense'
  | 'general_admin_expenses'
  | 'depreciation_expense'
  | 'finance_costs'
  | 'zakat_expense';

export interface QawaemTaxonomyItem {
  id: QawaemFieldId;
  xbrlCode: string;
  arabicLabel: string;
  englishLabel: string;
  statement: 'balance_sheet' | 'income_statement' | 'equity';
  section:
    | 'current_assets'
    | 'non_current_assets'
    | 'current_liabilities'
    | 'non_current_liabilities'
    | 'equity'
    | 'revenue'
    | 'cost_of_revenue'
    | 'operating_expenses'
    | 'other_expenses';
  normalBalance: 'debit' | 'credit';
  wizardStep: Exclude<WizardSubStep, 6>;
  helperText: string;
}

export interface EntityProfile {
  crNumber: string;
  unifiedNumber: string;
  entityName: string;
  legalForm: string;
  isicCode: string;
  isicDescription: string;
  paidUpCapitalSar: number;
  legalRepresentative: string;
  fiscalPeriodRange: string;
  statementType: 'active' | 'dormant';
  fiscalYearEnd: string;
  fiscalYearLabel: string;
  vatNumber: string;
  city: string;
  classification: CompanyClassification;
  annualRevenueMillions: number;
  totalAssetsMillions: number;
  employeesCount: number;
  wathqVerified: boolean;
}

export interface LegalDeclaration {
  acceptedTerms: boolean;
  signatoryName: string;
  signatoryId: string;
  signatoryRole: string;
  signatoryMobile: string;
  otpVerified: boolean;
  signatureDataUrl: string;
  signedAtIso: string;
  clientIp: string;
}

export type DocumentCategory =
  | 'commercial_register'
  | 'articles_of_association'
  | 'trial_balance'
  | 'bank_or_vat';

export interface UploadedDocument {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileSizeBytes: number;
  uploadedAtIso: string;
  parsedRowCount?: number;
}

/**
 * All monetary amounts are stored strictly as integer HALALAS (1 SAR = 100 Halalas)
 * to eliminate IEEE-754 floating-point precision drift.
 */
export type FinancialInputsHalalas = Record<QawaemFieldId, number>;

export interface ComputedStatements {
  // Income Statement
  operatingRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  costOfRevenue: number;
  grossProfit: number;
  salariesAndWages: number;
  rentExpense: number;
  generalAdminExpenses: number;
  depreciationExpense: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  financeCosts: number;
  profitBeforeZakat: number;
  zakatExpense: number;
  netProfit: number;

  // Balance Sheet - Assets
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  prepaidAndOtherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipment: number;
  intangibleAssets: number;
  totalNonCurrentAssets: number;
  totalAssets: number;

  // Balance Sheet - Liabilities
  accountsPayable: number;
  accruedAndVatLiabilities: number;
  zakatPayable: number;
  shortTermLoans: number;
  totalCurrentLiabilities: number;
  longTermLoans: number;
  endOfServiceBenefits: number;
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;

  // Balance Sheet - Equity
  paidUpCapital: number;
  statutoryReserve: number;
  retainedEarningsBeginning: number;
  partnersCurrentAccountNet: number;
  dividendsDeclared: number;
  retainedEarningsEnding: number;
  totalEquity: number;

  // Equilibrium
  totalLiabilitiesAndEquity: number;
  balanceDiffHalalas: number; // totalAssets - totalLiabilitiesAndEquity
  isBalanced: boolean;

  // Cash Flow Statement (Indirect Method)
  cashFlowOperating: number;
  cashFlowInvesting: number;
  cashFlowFinancing: number;
  netChangeInCash: number;
}

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  openingBalanceHalalas: number;
  debitHalalas: number;
  creditHalalas: number;
  endingNetHalalas: number; // debit - credit (positive = debit, negative = credit)
}

export interface AlternativeMappingSuggestion {
  fieldId: QawaemFieldId;
  reason: string;
}

export interface MappedAccountRow extends TrialBalanceRow {
  mappedFieldId: QawaemFieldId | 'unmapped';
  confidence: 'high' | 'medium' | 'low';
  matchSource: 'priority_rule' | 'ai_semantic' | 'manual' | 'unmapped';
  aiReason: string;
  alternatives: AlternativeMappingSuggestion[];
  manualOverride?: boolean;
}

export interface ReconciliationVariance {
  fieldId: QawaemFieldId;
  arabicLabel: string;
  wizardHalalas: number;
  trialBalanceHalalas: number;
  diffHalalas: number;
}

export interface AnomalyFinding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface SmartCheckReport {
  checkedAtIso: string;
  tbTotalDebitHalalas: number;
  tbTotalCreditHalalas: number;
  tbIsBalanced: boolean;
  tbDiffHalalas: number;
  mappedStatements: ComputedStatements;
  variances: ReconciliationVariance[];
  anomalies: AnomalyFinding[];
  strengths: string[];
  unmappedCount: number;
  canAutoSync: boolean;
}

export interface AccountingRuleResult {
  id: 'balance_equation' | 'cash_flow_tie' | 'equity_tie' | 'data_completeness';
  title: string;
  passed: boolean;
  statusLabel: string;
  detail: string;
}

export interface AiInterpretationInsight {
  type: 'warning' | 'positive';
  title: string;
  detail: string;
}

export interface PaymentAndInvoice {
  packageId: 'micro_pkg' | 'small_pkg' | 'enterprise_pkg';
  packageName: string;
  paymentMethod:
    | 'tap'
    | 'bank_transfer'
    | 'tamara'
    | 'mada'
    | 'apple_pay'
    | 'card';
  includeAuditorReview?: boolean;
  includeQawaemFilingService?: boolean;
  promoCode?: string;
  discountHalalas?: number;
  bankReceiptName?: string;
  subtotalHalalas: number;
  vatHalalas: number;
  totalHalalas: number;
  paid: boolean;
  paidAtIso: string;
  invoiceNumber: string;
  invoiceUuid: string;
  zatcaQrBase64: string;
  zatcaQrImageUrl: string;
}

export interface AuditLogEntry {
  id: string;
  timestampIso: string;
  stage: MainStage;
  actor: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  note: string;
}

export interface DynamicLineItem {
  id: string;
  label: string;
  amountHalalas: number;
}

export interface ExpenseGridHalalas {
  salaries: number;
  rent: number;
  socialInsurance: number;
  medicalInsurance: number;
  electricity: number;
  water: number;
  telecomInternet: number;
  marketingAds: number;
  shippingTransport: number;
  maintenance: number;
  govFees: number;
  subscriptions: number;
  professionalFees: number;
  accountingFees: number;
  bankFees: number;
  purchases: number;
  operatingExpenses: number;
}

export interface WizardDetailedLines {
  operatingRevenueLines: DynamicLineItem[];
  costOfRevenueLines: DynamicLineItem[];
  otherRevenueLines: DynamicLineItem[];
  expenseGrid: ExpenseGridHalalas;
  otherExpenseLines: DynamicLineItem[];
  cashAccountLines: DynamicLineItem[];
  receivableLines: DynamicLineItem[];
  inventoryLines: DynamicLineItem[];
  ppeLines: DynamicLineItem[];
  currentLiabilityLines: DynamicLineItem[];
  longTermLiabilityLines: DynamicLineItem[];
}

export interface AccountOwnerProfile {
  fullName: string;
  email: string;
  mobile: string;
  jobTitle: string;
}

export interface SavedCompanyAccount {
  id: string;
  profile: EntityProfile;
  createdYears: string[];
}

export type StatementRequestStatus =
  | 'awaiting_data'
  | 'ready_for_review'
  | 'awaiting_payment'
  | 'issued';

export interface StatementRequestRecord {
  id: string;
  companyId: string;
  entity: EntityProfile;
  currentStage: MainStage;
  wizardSubStep: WizardSubStep;
  declaration: LegalDeclaration;
  documents: UploadedDocument[];
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  trialBalanceRows: TrialBalanceRow[];
  mappedAccounts: MappedAccountRow[];
  smartCheckReport: SmartCheckReport | null;
  payment: PaymentAndInvoice;
  status: StatementRequestStatus;
  updatedAtIso: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'accounting' | 'qawaem_portal' | 'billing' | 'technical';
  message: string;
  createdAtIso: string;
  status: 'open' | 'answered';
  reply?: string;
}

export interface CommonPitfallAlert {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
}

export interface ForeignVendorWhtTransaction {
  rowId: string;
  accountCode: string;
  accountName: string;
  vendorName: string;
  baseAmountHalalas: number;
  applicableRatePercent: 5 | 15 | 20;
  serviceCategoryLabel: string;
  expectedWhtHalalas: number;
  netAmountAfterWhtHalalas: number;
}

export interface WhtRateBreakdown {
  ratePercent: 5 | 15 | 20;
  label: string;
  transactionCount: number;
  baseAmountHalalas: number;
  expectedWhtHalalas: number;
}

export interface WithholdingTaxAuditResult {
  generatedAtIso: string;
  hasInternationalTransactions: boolean;
  detectedTransactions: ForeignVendorWhtTransaction[];
  rateBreakdown: WhtRateBreakdown[];
  totalInternationalBaseHalalas: number;
  totalExpectedWhtHalalas: number;
  recordedWhtAccountNames: string[];
  recordedWhtHalalas: number;
  varianceHalalas: number; // recorded - expected
  status: 'none' | 'missing_wht' | 'mismatch' | 'verified';
  summaryTitle: string;
  summaryDetail: string;
}

export interface WorkflowState {
  onboardingCompleted: boolean;
  activeScreen: 'dashboard' | 'new_statement' | 'workspace';
  activeStatementId: string;
  savedCompanies: SavedCompanyAccount[];
  statementRequests: StatementRequestRecord[];
  tbMappingsByCompany: Record<string, Record<string, QawaemFieldId>>;
  supportTickets: SupportTicket[];
  completedReminderIds: string[];
  selectedFiscalYears: string[];
  accountOwner: AccountOwnerProfile;
  currentStage: MainStage;
  wizardSubStep: WizardSubStep;
  entity: EntityProfile;
  declaration: LegalDeclaration;
  documents: UploadedDocument[];
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  trialBalanceRows: TrialBalanceRow[];
  mappedAccounts: MappedAccountRow[];
  smartCheckReport: SmartCheckReport | null;
  payment: PaymentAndInvoice;
  auditTrail: AuditLogEntry[];
  lastSavedAtIso: string;
}
