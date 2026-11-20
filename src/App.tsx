import { useEffect, useMemo, useRef, useState } from 'react';
import { ClientDashboard } from './components/ClientDashboard';
import { ImbalanceToast } from './components/ImbalanceToast';
import { LiveBalanceSidebar } from './components/LiveBalanceSidebar';
import { AuditTrailModal, TaxonomyModal } from './components/Modals';
import { NewStatementSetup } from './components/NewStatementSetup';
import { OnboardingFlow } from './components/OnboardingFlow';
import { Stage1Entity } from './components/Stage1Entity';
import { Stage2Declaration } from './components/Stage2Declaration';
import { Stage3Documents } from './components/Stage3Documents';
import { Stage4FinancialWizard } from './components/Stage4FinancialWizard';
import { Stage5SmartCheck } from './components/Stage5SmartCheck';
import { Stage6PaymentInvoice } from './components/Stage6PaymentInvoice';
import { Stage7Export } from './components/Stage7Export';
import { StepperHeader } from './components/StepperHeader';
import { TopBar } from './components/TopBar';
import type {
  AuditLogEntry,
  FinancialInputsHalalas,
  MainStage,
  MappedAccountRow,
  QawaemFieldId,
  SavedCompanyAccount,
  StatementRequestRecord,
  StatementRequestStatus,
  SupportTicket,
  TrialBalanceRow,
  WizardDetailedLines,
  WorkflowState,
} from './types/qawaem';
import {
  TAXONOMY_BY_ID,
  aggregateMappedRowsToFinancials,
  buildDetailedLinesFromMappedAccounts,
  buildRollForwardFromPriorYear,
  computeFinancialStatements,
  createEmptyDetailedLines,
  createEmptyFinancials,
  evaluateFourAccountingRules,
  formatSar,
  runSmartCheckEngine,
  sarToHalalas,
  syncDetailedLinesToFinancials,
} from './utils/accounting';
import {
  mapTrialBalanceWithPriorityEngine,
  normalizeAccountText,
} from './utils/accountMappingEngine';

const STORAGE_KEY = 'qawaem_pro_workspace_v3';

const DEFAULT_SAVED_COMPANIES: SavedCompanyAccount[] = [
  {
    id: 'comp-bizdev',
    createdYears: ['2025'],
    profile: {
      crNumber: '7050124192',
      unifiedNumber: '7050124192',
      entityName: 'شركة بيزنس ديفلوبرز',
      legalForm: 'شركة ذات مسؤولية محدودة',
      isicCode: '620101',
      isicDescription: 'تطوير البرمجيات وتقنية المعلومات والحلول السحابية',
      paidUpCapitalSar: 20000,
      legalRepresentative: 'آيات عبدالحميد السيد — مدير الشركة',
      fiscalPeriodRange: 'من 18/05/2025 إلى 31/12/2026',
      statementType: 'active',
      fiscalYearEnd: '12-31',
      fiscalYearLabel: '2026',
      vatNumber: '310705012410003',
      city: 'جدة',
      classification: 'small',
      annualRevenueMillions: 0.2,
      totalAssetsMillions: 0.12,
      employeesCount: 4,
      wathqVerified: true,
    },
  },
  {
    id: 'comp-afaq',
    createdYears: ['2025'],
    profile: {
      crNumber: '1010543210',
      unifiedNumber: '7001543210',
      entityName: 'شركة آفاق التقنية والتجارة المحدودة',
      legalForm: 'شركة ذات مسؤولية محدودة',
      isicCode: '620101',
      isicDescription: 'تصميم وبرمجة البرمجيات الخاصة والتجارة الإلكترونية',
      paidUpCapitalSar: 500000,
      legalRepresentative: 'خالد بن محمد العتيبي — مدير الشركة',
      fiscalPeriodRange: 'من 01/01/2026 إلى 31/12/2026',
      statementType: 'active',
      fiscalYearEnd: '12-31',
      fiscalYearLabel: '2026',
      vatNumber: '310154321000003',
      city: 'الرياض',
      classification: 'small',
      annualRevenueMillions: 2.48,
      totalAssetsMillions: 1.76,
      employeesCount: 14,
      wathqVerified: true,
    },
  },
];

function buildBizDev2026Lines(): {
  detailedLines: WizardDetailedLines;
  financials: FinancialInputsHalalas;
} {
  const detailedLines = createEmptyDetailedLines();
  detailedLines.operatingRevenueLines = [
    { id: 'rev-bd-1', label: 'المبيعات', amountHalalas: sarToHalalas(33383) },
  ];
  detailedLines.costOfRevenueLines = [
    {
      id: 'cogs-bd-1',
      label: 'تكلفة السلع المباعة',
      amountHalalas: sarToHalalas(10454),
    },
  ];
  detailedLines.otherRevenueLines = [
    {
      id: 'orev-bd-1',
      label: 'إيرادات المنح والدعم الحكومي',
      amountHalalas: sarToHalalas(169497.36),
    },
  ];
  detailedLines.expenseGrid = {
    salaries: sarToHalalas(27312),
    rent: sarToHalalas(51800),
    socialInsurance: sarToHalalas(17643),
    medicalInsurance: sarToHalalas(9930),
    electricity: sarToHalalas(6557),
    water: 0,
    telecomInternet: sarToHalalas(26261),
    marketingAds: sarToHalalas(11201),
    shippingTransport: sarToHalalas(2905),
    maintenance: sarToHalalas(2780),
    govFees: sarToHalalas(58036),
    subscriptions: 0,
    professionalFees: sarToHalalas(3479),
    accountingFees: 0,
    bankFees: sarToHalalas(1332),
    purchases: 0,
    operatingExpenses: sarToHalalas(32864),
  };
  detailedLines.otherExpenseLines = [
    { id: 'ox-1', label: 'المصروفات الأخرى', amountHalalas: sarToHalalas(26164) },
    { id: 'ox-2', label: 'مصروفات السفر', amountHalalas: sarToHalalas(301) },
    { id: 'ox-3', label: 'الطعام والترفيه', amountHalalas: sarToHalalas(1569) },
    {
      id: 'ox-4',
      label: 'مصروفات الإقامة أثناء السفر',
      amountHalalas: sarToHalalas(373),
    },
    { id: 'ox-5', label: 'مصروفات المواقف', amountHalalas: sarToHalalas(612) },
    { id: 'ox-6', label: 'مصروفات متنوعة', amountHalalas: sarToHalalas(5) },
    {
      id: 'ox-7',
      label: 'مصروفات ما قبل التأسيس',
      amountHalalas: sarToHalalas(4358),
    },
  ];
  detailedLines.cashAccountLines = [
    { id: 'cash-1', label: 'STC BANK', amountHalalas: sarToHalalas(408.71) },
    { id: 'cash-2', label: 'بنك ساب', amountHalalas: sarToHalalas(21699.28) },
    { id: 'cash-3', label: 'نقدية رأس المال', amountHalalas: sarToHalalas(20000) },
    { id: 'cash-4', label: 'HALA', amountHalalas: sarToHalalas(4.51) },
    { id: 'cash-5', label: 'SIFI', amountHalalas: sarToHalalas(839.64) },
    { id: 'cash-6', label: 'فيجن', amountHalalas: sarToHalalas(13000) },
  ];
  detailedLines.receivableLines = [
    {
      id: 'rec-1',
      label: 'الذمم المدينة / مبالغ مستحقة من أطراف ذات علاقة',
      amountHalalas: sarToHalalas(8600),
    },
    {
      id: 'rec-2',
      label: 'ضريبة القيمة المضافة المستردة',
      amountHalalas: sarToHalalas(10145),
    },
  ];
  detailedLines.ppeLines = [
    {
      id: 'ppe-1',
      label: 'الأجهزة والأثاث والمعدات',
      amountHalalas: sarToHalalas(45579.48),
    },
  ];
  detailedLines.currentLiabilityLines = [
    {
      id: 'cl-1',
      label: 'الإيرادات غير المستحقة',
      amountHalalas: sarToHalalas(1035),
    },
    { id: 'cl-2', label: 'بدلات الموظف', amountHalalas: sarToHalalas(11) },
    {
      id: 'cl-3',
      label: 'حسابات الذمم الدائنة',
      amountHalalas: sarToHalalas(1278.26),
    },
    {
      id: 'cl-4',
      label: 'جاري الشريك - آيات',
      amountHalalas: sarToHalalas(189614),
    },
    {
      id: 'cl-5',
      label: 'جاري الشريك سلمان',
      amountHalalas: sarToHalalas(2000),
    },
  ];

  const base = createEmptyFinancials();
  base.paid_up_capital = sarToHalalas(20000);
  base.depreciation_expense = sarToHalalas(606);
  const financials = syncDetailedLinesToFinancials(detailedLines, base);

  return { detailedLines, financials };
}

function createDefaultPayment() {
  const totalHalalas = sarToHalalas(1399);
  const vatHalalas = Math.round((totalHalalas * 15) / 115);
  const subtotalHalalas = totalHalalas - vatHalalas;
  return {
    packageId: 'small_pkg' as const,
    packageName: 'إعداد القوائم المالية + المراجعة والاعتماد',
    paymentMethod: 'tap' as const,
    includeAuditorReview: true,
    includeQawaemFilingService: false,
    promoCode: '',
    discountHalalas: 0,
    subtotalHalalas,
    vatHalalas,
    totalHalalas,
    paid: false,
    paidAtIso: '',
    invoiceNumber: '',
    invoiceUuid: '',
    zatcaQrBase64: '',
    zatcaQrImageUrl: '',
  };
}

function createSeededStatementRequests(): StatementRequestRecord[] {
  const bizdev2026 = buildBizDev2026Lines();

  const cap20kFinancials = createEmptyFinancials();
  cap20kFinancials.paid_up_capital = sarToHalalas(20000);
  cap20kFinancials.cash_and_equivalents = sarToHalalas(20000);
  const cap20kLines = createEmptyDetailedLines();
  cap20kLines.cashAccountLines = [
    { id: 'cash-20k', label: 'نقدية رأس المال', amountHalalas: sarToHalalas(20000) },
  ];

  const afaq2025Financials = createEmptyFinancials();
  afaq2025Financials.paid_up_capital = sarToHalalas(500000);
  afaq2025Financials.cash_and_equivalents = sarToHalalas(500000);
  const afaq2025Lines = createEmptyDetailedLines();
  afaq2025Lines.cashAccountLines = [
    { id: 'cash-500k', label: 'نقدية رأس المال', amountHalalas: sarToHalalas(500000) },
  ];

  return [
    {
      id: 'stmt-bizdev-2026',
      companyId: 'comp-bizdev',
      entity: { ...DEFAULT_SAVED_COMPANIES[0].profile },
      currentStage: 5,
      wizardSubStep: 6,
      declaration: {
        acceptedTerms: true,
        signatoryName: 'آيات عبدالحميد السيد',
        signatoryId: '2027728225',
        signatoryRole: 'مدير الشركة',
        signatoryMobile: '0551234567',
        otpVerified: true,
        signatureDataUrl: 'verified-signature',
        signedAtIso: '2026-11-16T06:33:00.000Z',
        clientIp: '127.0.0.1',
      },
      documents: [],
      financials: bizdev2026.financials,
      detailedLines: bizdev2026.detailedLines,
      trialBalanceRows: [],
      mappedAccounts: [],
      smartCheckReport: null,
      payment: createDefaultPayment(),
      status: 'ready_for_review',
      updatedAtIso: '2026-11-16T10:30:00.000Z',
    },
    {
      id: 'stmt-bizdev-2025',
      companyId: 'comp-bizdev',
      entity: {
        ...DEFAULT_SAVED_COMPANIES[0].profile,
        fiscalYearLabel: '2025',
        fiscalPeriodRange: 'من 01/01/2025 إلى 31/12/2025',
      },
      currentStage: 4,
      wizardSubStep: 1,
      declaration: {
        acceptedTerms: false,
        signatoryName: '',
        signatoryId: '',
        signatoryRole: 'المدير العام',
        signatoryMobile: '',
        otpVerified: false,
        signatureDataUrl: '',
        signedAtIso: '',
        clientIp: '',
      },
      documents: [],
      financials: cap20kFinancials,
      detailedLines: cap20kLines,
      trialBalanceRows: [],
      mappedAccounts: [],
      smartCheckReport: null,
      payment: createDefaultPayment(),
      status: 'awaiting_data',
      updatedAtIso: '2026-11-15T14:20:00.000Z',
    },
    {
      id: 'stmt-afaq-2025',
      companyId: 'comp-afaq',
      entity: {
        ...DEFAULT_SAVED_COMPANIES[1].profile,
        fiscalYearLabel: '2025',
        fiscalPeriodRange: 'من 01/01/2025 إلى 31/12/2025',
      },
      currentStage: 1,
      wizardSubStep: 1,
      declaration: {
        acceptedTerms: false,
        signatoryName: '',
        signatoryId: '',
        signatoryRole: 'المدير العام',
        signatoryMobile: '',
        otpVerified: false,
        signatureDataUrl: '',
        signedAtIso: '',
        clientIp: '',
      },
      documents: [],
      financials: afaq2025Financials,
      detailedLines: afaq2025Lines,
      trialBalanceRows: [],
      mappedAccounts: [],
      smartCheckReport: null,
      payment: createDefaultPayment(),
      status: 'awaiting_data',
      updatedAtIso: '2026-11-15T09:10:00.000Z',
    },
  ];
}

function createInitialWorkflowState(): WorkflowState {
  const seededRequests = createSeededStatementRequests();
  const primary = seededRequests[0];
  return {
    onboardingCompleted: true,
    activeScreen: 'dashboard',
    activeStatementId: primary.id,
    savedCompanies: DEFAULT_SAVED_COMPANIES,
    statementRequests: seededRequests,
    supportTickets: [
      {
        id: 'tkt-1',
        subject: 'تجهيز قوائم شركة بيزنس ديفلوبرز 2026',
        category: 'accounting',
        message:
          'تم التحقق من توازن المركز المالي وقائمة التدفقات النقدية بنجاح، والملف جاهز للمتابعة إلى الدفع وإصدار النسخة المعتمدة.',
        createdAtIso: '2026-11-16T08:00:00.000Z',
        status: 'answered',
        reply:
          'تمت مراجعة الفحص الحسابي بنجاح (4 من 4 قواعد). يمكنك إتمام السداد في أي وقت لتصدير حزمة SOCPA وجدول منصة قوائم.',
      },
    ],
    completedReminderIds: [],
    selectedFiscalYears: ['2026'],
    accountOwner: {
      fullName: 'Business Developers',
      email: 'businesdevelopers@gmail.com',
      mobile: '0551234567',
      jobTitle: 'المدير العام / المالك',
    },
    currentStage: primary.currentStage,
    wizardSubStep: primary.wizardSubStep,
    entity: primary.entity,
    declaration: primary.declaration,
    documents: primary.documents,
    financials: primary.financials,
    detailedLines: primary.detailedLines,
    trialBalanceRows: primary.trialBalanceRows,
    mappedAccounts: primary.mappedAccounts,
    smartCheckReport: primary.smartCheckReport,
    payment: primary.payment,
    tbMappingsByCompany: {},
    auditTrail: [],
    lastSavedAtIso: new Date().toISOString(),
  };
}

function deriveStatementStatus(req: {
  payment: WorkflowState['payment'];
  declaration: WorkflowState['declaration'];
  financials: FinancialInputsHalalas;
}): StatementRequestStatus {
  if (req.payment.paid) return 'issued';
  const st = computeFinancialStatements(req.financials);
  if (
    st.isBalanced &&
    (st.totalAssets > 0 || st.totalRevenue > 0) &&
    req.declaration.otpVerified
  ) {
    return 'ready_for_review';
  }
  return 'awaiting_data';
}

export default function App() {
  const [state, setState] = useState<WorkflowState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WorkflowState>;
        const base = createInitialWorkflowState();
        return {
          ...base,
          ...parsed,
          entity: { ...base.entity, ...(parsed.entity || {}) },
          accountOwner: { ...base.accountOwner, ...(parsed.accountOwner || {}) },
          detailedLines: {
            ...base.detailedLines,
            ...(parsed.detailedLines || {}),
            expenseGrid: {
              ...base.detailedLines.expenseGrid,
              ...(parsed.detailedLines?.expenseGrid || {}),
            },
          },
          savedCompanies:
            Array.isArray(parsed.savedCompanies) && parsed.savedCompanies.length > 0
              ? parsed.savedCompanies
              : base.savedCompanies,
          statementRequests:
            Array.isArray(parsed.statementRequests) &&
            parsed.statementRequests.length > 0
              ? parsed.statementRequests
              : base.statementRequests,
          supportTickets: Array.isArray(parsed.supportTickets)
            ? parsed.supportTickets
            : base.supportTickets,
          completedReminderIds: Array.isArray(parsed.completedReminderIds)
            ? parsed.completedReminderIds
            : [],
          selectedFiscalYears:
            Array.isArray(parsed.selectedFiscalYears) &&
            parsed.selectedFiscalYears.length > 0
              ? parsed.selectedFiscalYears
              : base.selectedFiscalYears,
          tbMappingsByCompany: parsed.tbMappingsByCompany ?? {},
          activeScreen: parsed.activeScreen ?? 'dashboard',
          onboardingCompleted: parsed.onboardingCompleted ?? true,
        };
      }
    } catch {
      // Ignore corrupted local storage
    }
    return createInitialWorkflowState();
  });

  const [preselectedCompanyId, setPreselectedCompanyId] = useState<
    string | undefined
  >(undefined);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [taxonomyModalOpen, setTaxonomyModalOpen] = useState(false);
  const [imbalanceToastVisible, setImbalanceToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showImbalanceToast = () => {
    setImbalanceToastVisible(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setImbalanceToastVisible(false);
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Auto-save to localStorage whenever state updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  // Helper to update workspace state and mirror changes into the active StatementRequestRecord
  const updateActiveWorkspace = (
    updater: (prev: WorkflowState) => WorkflowState
  ) => {
    setState((prev) => {
      const next = updater(prev);
      const nowIso = new Date().toISOString();
      const updatedRequests = next.statementRequests.map((req) =>
        req.id === next.activeStatementId
          ? {
              ...req,
              entity: next.entity,
              currentStage: next.currentStage,
              wizardSubStep: next.wizardSubStep,
              declaration: next.declaration,
              documents: next.documents,
              financials: next.financials,
              detailedLines: next.detailedLines,
              trialBalanceRows: next.trialBalanceRows,
              mappedAccounts: next.mappedAccounts,
              smartCheckReport: next.smartCheckReport,
              payment: next.payment,
              status: deriveStatementStatus({
                payment: next.payment,
                declaration: next.declaration,
                financials: next.financials,
              }),
              updatedAtIso: nowIso,
            }
          : req
      );
      return {
        ...next,
        statementRequests: updatedRequests,
        lastSavedAtIso: nowIso,
      };
    });
  };

  const statements = useMemo(
    () => computeFinancialStatements(state.financials),
    [state.financials]
  );

  // Auto-hide toast once balance is restored
  useEffect(() => {
    if (statements.isBalanced && imbalanceToastVisible) {
      setImbalanceToastVisible(false);
    }
  }, [statements.isBalanced, imbalanceToastVisible]);

  const stage5AllRulesPassed = useMemo(
    () =>
      evaluateFourAccountingRules(
        state.entity,
        statements,
        state.mappedAccounts
      ).every((rule) => rule.passed),
    [state.entity, statements, state.mappedAccounts]
  );

  const completedStages: Record<MainStage, boolean> = useMemo(
    () => ({
      1:
        state.entity.crNumber.length >= 10 &&
        state.entity.entityName.trim().length > 2,
      2:
        state.declaration.acceptedTerms &&
        Boolean(state.declaration.signatureDataUrl) &&
        state.declaration.otpVerified,
      3: state.documents.length > 0 || state.trialBalanceRows.length > 0,
      4:
        statements.totalAssets > 0 ||
        statements.totalRevenue > 0 ||
        statements.isBalanced,
      5:
        stage5AllRulesPassed &&
        (statements.totalAssets > 0 ||
          statements.totalRevenue > 0 ||
          state.trialBalanceRows.length > 0),
      6: state.payment.paid,
      7: state.payment.paid && statements.isBalanced,
    }),
    [state, statements, stage5AllRulesPassed]
  );

  const setStage = (stage: MainStage) => {
    if (
      state.activeScreen === 'workspace' &&
      stage !== state.currentStage &&
      stage !== 5 &&
      !statements.isBalanced
    ) {
      showImbalanceToast();
    } else if (stage === 5) {
      setImbalanceToastVisible(false);
    }

    updateActiveWorkspace((prev) => ({
      ...prev,
      activeScreen: 'workspace',
      currentStage: stage,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateFinancialField = (
    fieldId: QawaemFieldId,
    newHalalas: number
  ) => {
    updateActiveWorkspace((prev) => {
      const oldHalalas = prev.financials[fieldId] || 0;
      if (oldHalalas === newHalalas) return prev;

      const updatedFinancials = {
        ...prev.financials,
        [fieldId]: newHalalas,
      };

      const shouldLog =
        prev.declaration.otpVerified || prev.smartCheckReport !== null;
      const newAuditEntries = shouldLog
        ? [
            {
              id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              timestampIso: new Date().toISOString(),
              stage: prev.currentStage,
              actor: prev.declaration.signatoryName || 'المستخدم',
              fieldLabel: TAXONOMY_BY_ID[fieldId].arabicLabel,
              oldValue: formatSar(oldHalalas),
              newValue: formatSar(newHalalas),
              note: 'تعديل يدوي في المعالج التفاعلي',
            } satisfies AuditLogEntry,
            ...prev.auditTrail,
          ].slice(0, 120)
        : prev.auditTrail;

      const nextReport =
        prev.mappedAccounts.length > 0
          ? runSmartCheckEngine(prev.mappedAccounts, updatedFinancials)
          : prev.smartCheckReport;

      return {
        ...prev,
        financials: updatedFinancials,
        smartCheckReport: nextReport,
        auditTrail: newAuditEntries,
      };
    });
  };

  const handleUpdateDetailedLines = (updatedLines: WizardDetailedLines) => {
    updateActiveWorkspace((prev) => {
      const updatedFinancials = syncDetailedLinesToFinancials(
        updatedLines,
        prev.financials
      );
      const nextReport =
        prev.mappedAccounts.length > 0
          ? runSmartCheckEngine(prev.mappedAccounts, updatedFinancials)
          : prev.smartCheckReport;
      return {
        ...prev,
        detailedLines: updatedLines,
        financials: updatedFinancials,
        smartCheckReport: nextReport,
      };
    });
  };

  const handleTrialBalanceLoaded = (rows: TrialBalanceRow[]) => {
    updateActiveWorkspace((prev) => {
      const crKey = prev.entity.crNumber || 'default';
      const savedCompanyMappings = prev.tbMappingsByCompany[crKey];
      const mapped = mapTrialBalanceWithPriorityEngine(
        rows,
        savedCompanyMappings
      );
      const nextFinancials = aggregateMappedRowsToFinancials(mapped);
      const nextLines = buildDetailedLinesFromMappedAccounts(mapped);
      const report = runSmartCheckEngine(mapped, nextFinancials);

      const updatedCompanyMap: Record<string, QawaemFieldId> = {
        ...(savedCompanyMappings || {}),
      };
      for (const r of mapped) {
        if (r.mappedFieldId !== 'unmapped') {
          updatedCompanyMap[normalizeAccountText(r.accountName)] =
            r.mappedFieldId;
        }
      }

      const uploadAuditEntry: AuditLogEntry = {
        id: `aud-tb-${Date.now()}`,
        timestampIso: new Date().toISOString(),
        stage: prev.currentStage,
        actor: prev.declaration.signatoryName || 'الفحص الذكي',
        fieldLabel: 'ميزان المراجعة',
        oldValue: `${prev.trialBalanceRows.length} حساب`,
        newValue: `${rows.length} حساب`,
        note: 'رفع ميزان المراجعة وتسجيل البيانات المالية تلقائياً',
      };

      return {
        ...prev,
        trialBalanceRows: rows,
        mappedAccounts: mapped,
        financials: nextFinancials,
        detailedLines: nextLines,
        smartCheckReport: report,
        auditTrail: [uploadAuditEntry, ...prev.auditTrail].slice(0, 150),
        tbMappingsByCompany: {
          ...prev.tbMappingsByCompany,
          [crKey]: updatedCompanyMap,
        },
      };
    });
  };

  const handleMappingsUpdated = (mapped: MappedAccountRow[]) => {
    updateActiveWorkspace((prev) => {
      const crKey = prev.entity.crNumber || 'default';
      const updatedCompanyMap: Record<string, QawaemFieldId> = {
        ...(prev.tbMappingsByCompany[crKey] || {}),
      };
      for (const r of mapped) {
        const normKey = normalizeAccountText(r.accountName);
        if (r.mappedFieldId !== 'unmapped') {
          updatedCompanyMap[normKey] = r.mappedFieldId;
        } else {
          delete updatedCompanyMap[normKey];
        }
      }

      const syncedFinancials = aggregateMappedRowsToFinancials(mapped);
      const syncedLines = buildDetailedLinesFromMappedAccounts(mapped);
      const report = runSmartCheckEngine(mapped, syncedFinancials);
      return {
        ...prev,
        mappedAccounts: mapped,
        financials: syncedFinancials,
        detailedLines: syncedLines,
        smartCheckReport: report,
        tbMappingsByCompany: {
          ...prev.tbMappingsByCompany,
          [crKey]: updatedCompanyMap,
        },
      };
    });
  };

  const handleAutoSyncFinancials = () => {
    updateActiveWorkspace((prev) => {
      if (prev.mappedAccounts.length === 0) return prev;
      const synced = aggregateMappedRowsToFinancials(prev.mappedAccounts);
      const syncedLines = buildDetailedLinesFromMappedAccounts(
        prev.mappedAccounts
      );
      const newEntries: AuditLogEntry[] = [];

      for (const key of Object.keys(synced) as QawaemFieldId[]) {
        if (synced[key] !== prev.financials[key]) {
          newEntries.push({
            id: `aud-${Date.now()}-${key}`,
            timestampIso: new Date().toISOString(),
            stage: 5,
            actor: 'محرك المواءمة الآلي',
            fieldLabel: TAXONOMY_BY_ID[key].arabicLabel,
            oldValue: formatSar(prev.financials[key]),
            newValue: formatSar(synced[key]),
            note: 'مواءمة تلقائية من ميزان المراجعة',
          });
        }
      }

      const nextReport = runSmartCheckEngine(prev.mappedAccounts, synced);
      return {
        ...prev,
        financials: synced,
        detailedLines: syncedLines,
        smartCheckReport: nextReport,
        auditTrail: [...newEntries, ...prev.auditTrail].slice(0, 150),
      };
    });
  };

  const handleAddCompany = (company: SavedCompanyAccount) => {
    setState((prev) => ({
      ...prev,
      savedCompanies: [company, ...prev.savedCompanies],
      lastSavedAtIso: new Date().toISOString(),
    }));
  };

  const handleStartStatement = (params: {
    company: SavedCompanyAccount;
    statementType: 'active' | 'dormant';
    selectedYears: string[];
    rollForwardFromRequestId?: string;
  }) => {
    const primaryYear = params.selectedYears[0] || '2026';
    const priorRequest = params.rollForwardFromRequestId
      ? state.statementRequests.find(
          (r) => r.id === params.rollForwardFromRequestId
        )
      : undefined;

    let freshFinancials = createEmptyFinancials();
    let freshDetailedLines = createEmptyDetailedLines();

    if (priorRequest) {
      const rolled = buildRollForwardFromPriorYear(priorRequest);
      freshFinancials = rolled.financials;
      freshDetailedLines = rolled.detailedLines;
    } else {
      const capitalHalalas = sarToHalalas(
        params.company.profile.paidUpCapitalSar
      );
      freshFinancials.paid_up_capital = capitalHalalas;
      freshFinancials.cash_and_equivalents = capitalHalalas;

      if (capitalHalalas > 0) {
        freshDetailedLines.cashAccountLines = [
          {
            id: `cash-cap-${Date.now()}`,
            label: 'نقدية رأس المال',
            amountHalalas: capitalHalalas,
          },
        ];
      }
    }

    const nowIso = new Date().toISOString();
    const newRequestId = `stmt-${params.company.profile.crNumber}-${primaryYear}-${Date.now()}`;
    const newEntity = {
      ...params.company.profile,
      statementType: params.statementType,
      fiscalYearLabel: primaryYear,
      fiscalPeriodRange: `من 01/01/${primaryYear} إلى 31/12/${primaryYear}`,
    };
    const freshDeclaration = {
      acceptedTerms: false,
      signatoryName: '',
      signatoryId: '',
      signatoryRole: 'المدير العام',
      signatoryMobile: '',
      otpVerified: false,
      signatureDataUrl: '',
      signedAtIso: '',
      clientIp: '',
    };
    const freshPayment = createDefaultPayment();

    const newRecord: StatementRequestRecord = {
      id: newRequestId,
      companyId: params.company.id,
      entity: newEntity,
      currentStage: 1,
      wizardSubStep: 1,
      declaration: freshDeclaration,
      documents: [],
      financials: freshFinancials,
      detailedLines: freshDetailedLines,
      trialBalanceRows: [],
      mappedAccounts: [],
      smartCheckReport: null,
      payment: freshPayment,
      status: 'awaiting_data',
      updatedAtIso: nowIso,
    };

    setState((prev) => ({
      ...prev,
      activeScreen: 'workspace',
      activeStatementId: newRequestId,
      selectedFiscalYears: params.selectedYears,
      statementRequests: [newRecord, ...prev.statementRequests],
      currentStage: 1,
      wizardSubStep: 1,
      entity: newEntity,
      declaration: freshDeclaration,
      documents: [],
      financials: freshFinancials,
      detailedLines: freshDetailedLines,
      trialBalanceRows: [],
      mappedAccounts: [],
      smartCheckReport: null,
      payment: freshPayment,
      lastSavedAtIso: nowIso,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStatement = (requestId: string, targetStage?: MainStage) => {
    setState((prev) => {
      const target = prev.statementRequests.find((r) => r.id === requestId);
      if (!target) return prev;
      return {
        ...prev,
        activeScreen: 'workspace',
        activeStatementId: target.id,
        currentStage: targetStage ?? target.currentStage,
        wizardSubStep: target.wizardSubStep,
        entity: target.entity,
        declaration: target.declaration,
        documents: target.documents,
        financials: target.financials,
        detailedLines: target.detailedLines,
        trialBalanceRows: target.trialBalanceRows,
        mappedAccounts: target.mappedAccounts,
        smartCheckReport: target.smartCheckReport,
        payment: target.payment,
        lastSavedAtIso: new Date().toISOString(),
      };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveDraft = state.statementRequests.length > 0;

  if (!state.onboardingCompleted) {
    return (
      <OnboardingFlow
        accountOwner={state.accountOwner}
        entity={state.entity}
        onUpdateOwner={(accountOwner) =>
          setState((prev) => ({
            ...prev,
            accountOwner,
            lastSavedAtIso: new Date().toISOString(),
          }))
        }
        onUpdateEntity={(entity) =>
          updateActiveWorkspace((prev) => ({
            ...prev,
            entity,
          }))
        }
        onCompleteOnboarding={(targetStage) => {
          setState((prev) => {
            const exists = prev.savedCompanies.some(
              (c) => c.profile.crNumber === prev.entity.crNumber
            );
            const nextSaved = exists
              ? prev.savedCompanies
              : [
                  {
                    id: `comp-${prev.entity.crNumber}-${Date.now()}`,
                    profile: prev.entity,
                    createdYears: [],
                  },
                  ...prev.savedCompanies,
                ];
            return {
              ...prev,
              onboardingCompleted: true,
              activeScreen: 'workspace',
              savedCompanies: nextSaved,
              currentStage: targetStage,
              declaration: {
                ...prev.declaration,
                signatoryName:
                  prev.declaration.signatoryName || prev.accountOwner.fullName,
                signatoryMobile:
                  prev.declaration.signatoryMobile || prev.accountOwner.mobile,
              },
              lastSavedAtIso: new Date().toISOString(),
            };
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeScreen={state.activeScreen}
        currentStage={state.currentStage}
        onSelectStage={setStage}
        onOpenDashboard={() =>
          setState((prev) => ({ ...prev, activeScreen: 'dashboard' }))
        }
        onOpenNewStatement={() => {
          setPreselectedCompanyId(undefined);
          setState((prev) => ({ ...prev, activeScreen: 'new_statement' }));
        }}
        onOpenOnboarding={() =>
          setState((prev) => ({ ...prev, onboardingCompleted: false }))
        }
        onOpenAuditTrail={() => setAuditModalOpen(true)}
        onOpenTaxonomy={() => setTaxonomyModalOpen(true)}
        auditCount={state.auditTrail.length}
      />

      {state.activeScreen === 'dashboard' && (
        <main className="flex-1">
          <ClientDashboard
            accountOwner={state.accountOwner}
            savedCompanies={state.savedCompanies}
            statementRequests={state.statementRequests}
            supportTickets={state.supportTickets}
            completedReminderIds={state.completedReminderIds}
            onStartNewStatement={(companyId) => {
              setPreselectedCompanyId(companyId);
              setState((prev) => ({ ...prev, activeScreen: 'new_statement' }));
            }}
            onAddCompany={handleAddCompany}
            onOpenStatement={handleOpenStatement}
            onToggleReminder={(reminderId) =>
              setState((prev) => ({
                ...prev,
                completedReminderIds: prev.completedReminderIds.includes(
                  reminderId
                )
                  ? prev.completedReminderIds.filter((id) => id !== reminderId)
                  : [...prev.completedReminderIds, reminderId],
              }))
            }
            onSendSupportTicket={({ subject, category, message }) =>
              setState((prev) => ({
                ...prev,
                supportTickets: [
                  {
                    id: `tkt-${Date.now()}`,
                    subject,
                    category,
                    message,
                    createdAtIso: new Date().toISOString(),
                    status: 'open',
                  },
                  ...prev.supportTickets,
                ],
              }))
            }
          />
        </main>
      )}

      {state.activeScreen === 'new_statement' && (
        <main className="flex-1">
          <NewStatementSetup
            savedCompanies={state.savedCompanies}
            statementRequests={state.statementRequests}
            activeCompanyId={
              preselectedCompanyId ??
              state.savedCompanies.find(
                (c) => c.profile.crNumber === state.entity.crNumber
              )?.id
            }
            hasActiveDraft={hasActiveDraft}
            onAddCompany={handleAddCompany}
            onStartStatement={handleStartStatement}
            onResumeWorkspace={() =>
              setState((prev) => ({ ...prev, activeScreen: 'workspace' }))
            }
          />
        </main>
      )}

      {state.activeScreen === 'workspace' && (
        <>
          <div className="no-print bg-white border-b border-slate-100">
            <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        activeScreen: 'dashboard',
                      }))
                    }
                    className="hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    لوحة تحكم العميل
                  </button>{' '}
                  / إعداد القوائم المالية
                </div>
                <div className="text-lg font-bold text-slate-900">
                  مسار إعداد القوائم المالية — {state.entity.entityName} ·{' '}
                  <span className="font-mono-num">
                    {state.entity.fiscalYearLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <StepperHeader
            currentStage={state.currentStage}
            completedStages={completedStages}
            onSelectStage={setStage}
          />

          <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
            <div className="flex flex-col xl:flex-row items-start gap-6">
              {/* Primary Active Stage Workspace */}
              <div className="flex-1 min-w-0 w-full">
                {state.currentStage === 1 && (
                  <Stage1Entity
                    entity={state.entity}
                    onChange={(entity) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        entity,
                      }))
                    }
                    onNext={() => setStage(2)}
                  />
                )}

                {state.currentStage === 2 && (
                  <Stage2Declaration
                    entity={state.entity}
                    declaration={state.declaration}
                    onChange={(declaration) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        declaration,
                      }))
                    }
                    onPrev={() => setStage(1)}
                    onNext={() => setStage(3)}
                  />
                )}

                {state.currentStage === 3 && (
                  <Stage3Documents
                    documents={state.documents}
                    trialBalanceCount={state.trialBalanceRows.length}
                    financials={state.financials}
                    onAddDocument={(doc) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        documents: [doc, ...prev.documents],
                      }))
                    }
                    onRemoveDocument={(id) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        documents: prev.documents.filter((d) => d.id !== id),
                      }))
                    }
                    onTrialBalanceParsed={(rows) =>
                      handleTrialBalanceLoaded(rows)
                    }
                    onPrev={() => setStage(2)}
                    onNext={() => setStage(4)}
                  />
                )}

                {state.currentStage === 4 && (
                  <Stage4FinancialWizard
                    entity={state.entity}
                    subStep={state.wizardSubStep}
                    onSelectSubStep={(wizardSubStep) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        wizardSubStep,
                      }))
                    }
                    financials={state.financials}
                    detailedLines={state.detailedLines}
                    statements={statements}
                    onUpdateField={handleUpdateFinancialField}
                    onUpdateDetailedLines={handleUpdateDetailedLines}
                    onLoadDemoFinancials={(demoFinancials, demoLines) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        financials: demoFinancials,
                        detailedLines: demoLines,
                        wizardSubStep: 6,
                      }))
                    }
                    onPrevStage={() => setStage(3)}
                    onNextStage={() => setStage(5)}
                  />
                )}

                {state.currentStage === 5 && (
                  <Stage5SmartCheck
                    entity={state.entity}
                    financials={state.financials}
                    detailedLines={state.detailedLines}
                    statements={statements}
                    savedCompanyMappings={
                      state.tbMappingsByCompany[
                        state.entity.crNumber || 'default'
                      ]
                    }
                    trialBalanceRows={state.trialBalanceRows}
                    mappedAccounts={state.mappedAccounts}
                    report={state.smartCheckReport}
                    onTrialBalanceLoaded={handleTrialBalanceLoaded}
                    onMappingsUpdated={handleMappingsUpdated}
                    onAutoSyncFinancials={handleAutoSyncFinancials}
                    onPrev={() => setStage(4)}
                    onNext={() => setStage(6)}
                  />
                )}

                {state.currentStage === 6 && (
                  <Stage6PaymentInvoice
                    entity={state.entity}
                    payment={state.payment}
                    onUpdatePayment={(payment) =>
                      updateActiveWorkspace((prev) => ({
                        ...prev,
                        payment,
                      }))
                    }
                    onPrev={() => setStage(5)}
                    onNext={() => setStage(7)}
                  />
                )}

                {state.currentStage === 7 && (
                  <Stage7Export
                    entity={state.entity}
                    declaration={state.declaration}
                    financials={state.financials}
                    statements={statements}
                    payment={state.payment}
                    onPrev={() => setStage(6)}
                  />
                )}
              </div>

              {/* Persistent Live Balance & Regulatory Sidebar */}
              <LiveBalanceSidebar
                entity={state.entity}
                statements={statements}
                lastSavedAtIso={state.lastSavedAtIso}
                auditCount={state.auditTrail.length}
                currentStage={state.currentStage}
                onOpenAuditTrail={() => setAuditModalOpen(true)}
                onGoToStage={setStage}
              />
            </div>
          </main>
        </>
      )}

      <footer className="no-print border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        منصة قوائم برو — إعداد ومطابقة القوائم المالية وفق معايير الهيئة السعودية للمراجعين والمحاسبين (SOCPA) وبنود منصة قوائم
      </footer>

      <AuditTrailModal
        open={auditModalOpen}
        entries={state.auditTrail}
        onClose={() => setAuditModalOpen(false)}
      />
      <TaxonomyModal
        open={taxonomyModalOpen}
        onClose={() => setTaxonomyModalOpen(false)}
      />
      <ImbalanceToast
        visible={imbalanceToastVisible}
        balanceDiffHalalas={statements.balanceDiffHalalas}
        onGoToSmartCheck={() => setStage(5)}
        onDismiss={() => setImbalanceToastVisible(false)}
      />
    </div>
  );
}
