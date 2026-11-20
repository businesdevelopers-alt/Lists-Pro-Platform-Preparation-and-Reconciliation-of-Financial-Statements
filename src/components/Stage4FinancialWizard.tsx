import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  ComputedStatements,
  DynamicLineItem,
  EntityProfile,
  ExpenseGridHalalas,
  FinancialInputsHalalas,
  QawaemFieldId,
  WizardDetailedLines,
  WizardSubStep,
} from '../types/qawaem';
import {
  createDemoBalancedFinancials,
  createDemoDetailedLines,
  formatNumber,
  formatSar,
  halalasToSar,
  sarToHalalas,
} from '../utils/accounting';

interface Stage4FinancialWizardProps {
  entity: EntityProfile;
  subStep: WizardSubStep;
  onSelectSubStep: (step: WizardSubStep) => void;
  financials: FinancialInputsHalalas;
  detailedLines: WizardDetailedLines;
  statements: ComputedStatements;
  onUpdateField: (fieldId: QawaemFieldId, newHalalas: number) => void;
  onUpdateDetailedLines: (updated: WizardDetailedLines) => void;
  onLoadDemoFinancials: (
    demoFinancials: FinancialInputsHalalas,
    demoLines: WizardDetailedLines
  ) => void;
  onPrevStage: () => void;
  onNextStage: () => void;
}

const SUB_STEPS: Array<{ step: WizardSubStep; title: string }> = [
  { step: 1, title: 'رأس المال' },
  { step: 2, title: 'الإيرادات' },
  { step: 3, title: 'المصروفات' },
  { step: 4, title: 'ما تملكه المنشأة' },
  { step: 5, title: 'ما على المنشأة' },
  { step: 6, title: 'المراجعة' },
];

const EXPENSE_GRID_FIELDS: Array<{
  key: keyof ExpenseGridHalalas;
  label: string;
}> = [
  { key: 'salaries', label: 'الرواتب والأجور' },
  { key: 'rent', label: 'الإيجارات' },
  { key: 'socialInsurance', label: 'التأمينات الاجتماعية' },
  { key: 'medicalInsurance', label: 'التأمين الطبي' },
  { key: 'electricity', label: 'الكهرباء' },
  { key: 'water', label: 'المياه' },
  { key: 'telecomInternet', label: 'الاتصالات والإنترنت' },
  { key: 'marketingAds', label: 'التسويق والإعلانات' },
  { key: 'shippingTransport', label: 'النقل والشحن' },
  { key: 'maintenance', label: 'الصيانة' },
  { key: 'govFees', label: 'الرسوم الحكومية' },
  { key: 'subscriptions', label: 'الاشتراكات' },
  { key: 'professionalFees', label: 'الخدمات المهنية' },
  { key: 'accountingFees', label: 'المحاسبة' },
  { key: 'bankFees', label: 'المصاريف البنكية' },
  { key: 'purchases', label: 'المشتريات' },
  { key: 'operatingExpenses', label: 'مصروفات التشغيل' },
];

interface SarInputBoxProps {
  valueHalalas: number;
  onCommit: (halalas: number) => void;
  placeholder?: string;
}

const SarInputBox: React.FC<SarInputBoxProps> = ({
  valueHalalas,
  onCommit,
  placeholder = '0',
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const displayed = focused
    ? draft
    : valueHalalas === 0
      ? ''
      : String(halalasToSar(valueHalalas));

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={displayed}
        placeholder={placeholder}
        onFocus={() => {
          setFocused(true);
          setDraft(
            valueHalalas === 0 ? '' : String(halalasToSar(valueHalalas))
          );
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === '' || raw === '-') {
            onCommit(0);
          } else {
            const parsed = Number(raw.replace(/,/g, ''));
            if (Number.isFinite(parsed)) {
              onCommit(sarToHalalas(parsed));
            }
          }
        }}
        onBlur={() => setFocused(false)}
        className="w-full h-10 pl-11 pr-3 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
        ريال
      </span>
    </div>
  );
};

interface RepeatingSectionProps {
  title: string;
  subtitle: string;
  addLabel: string;
  lines: DynamicLineItem[];
  onChangeLines: (next: DynamicLineItem[]) => void;
  defaultLabel: string;
}

const RepeatingSection: React.FC<RepeatingSectionProps> = ({
  title,
  subtitle,
  addLabel,
  lines,
  onChangeLines,
  defaultLabel,
}) => {
  const subtotal = lines.reduce((sum, l) => sum + (l.amountHalalas || 0), 0);

  const handleAdd = () => {
    onChangeLines([
      ...lines,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: defaultLabel,
        amountHalalas: 0,
      },
    ]);
  };

  const handleUpdate = (
    id: string,
    patch: Partial<Pick<DynamicLineItem, 'label' | 'amountHalalas'>>
  ) => {
    onChangeLines(
      lines.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const handleDelete = (id: string) => {
    onChangeLines(lines.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-xs font-mono-num font-bold text-slate-700 shrink-0">
          {formatNumber(subtotal)} ريال
        </div>
      </div>

      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <input
                type="text"
                value={line.label}
                onChange={(e) =>
                  handleUpdate(line.id, { label: e.target.value })
                }
                placeholder={defaultLabel}
                className="flex-1 h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="w-full sm:w-44 shrink-0">
                <SarInputBox
                  valueHalalas={line.amountHalalas}
                  onCommit={(amountHalalas) =>
                    handleUpdate(line.id, { amountHalalas })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => handleDelete(line.id)}
                aria-label="حذف البند"
                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3.5 py-2 border border-dashed border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 bg-slate-50/50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{addLabel}</span>
        </button>
      </div>
    </div>
  );
};

export const Stage4FinancialWizard: React.FC<Stage4FinancialWizardProps> = ({
  entity,
  subStep,
  onSelectSubStep,
  financials,
  detailedLines,
  statements,
  onUpdateField,
  onUpdateDetailedLines,
  onLoadDemoFinancials,
  onPrevStage,
  onNextStage,
}) => {
  const [showPriorEquity, setShowPriorEquity] = useState(
    financials.statutory_reserve !== 0 ||
      financials.retained_earnings_beginning !== 0 ||
      financials.partners_current_account_net !== 0
  );
  const [showMoreStatements, setShowMoreStatements] = useState(false);

  const totalExpensesDisplay =
    Object.values(detailedLines.expenseGrid).reduce((a, b) => a + b, 0) +
    detailedLines.otherExpenseLines.reduce((a, b) => a + b.amountHalalas, 0) +
    (financials.zakat_expense || 0);

  return (
    <div className="space-y-4">
      {/* Top 6-Substep Progress Row matching screenshots */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {SUB_STEPS.map((s) => {
            const active = subStep === s.step;
            const completed = subStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => onSelectSubStep(s.step)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : completed
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums ${
                    active
                      ? 'bg-white/20 text-white'
                      : completed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {completed ? <Check className="w-3 h-3" /> : s.step}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            onLoadDemoFinancials(
              createDemoBalancedFinancials(),
              createDemoDetailedLines()
            )
          }
          className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>تعبئة بيانات تجريبية متوازنة</span>
        </button>
      </div>

      {/* Main Card Body */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Substep 1: رأس المال */}
        {subStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">رأس المال</h2>
              <p className="text-xs text-slate-500 mt-1">
                نبدأ برأس مال المنشأة كما هو مسجّل. هذا الرقم يظهر في كل قائمة، حتى القائمة الصفرية.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  رأس المال المسجّل
                </label>
                <SarInputBox
                  valueHalalas={financials.paid_up_capital}
                  onCommit={(h) => onUpdateField('paid_up_capital', h)}
                  placeholder="20,000"
                />
                <p className="text-[11px] text-slate-500">
                  كما هو مذكور في السجل التجاري أو عقد التأسيس
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                بما أن{' '}
                <span className="font-mono-num font-bold text-slate-900">
                  {entity.fiscalYearLabel}
                </span>{' '}
                قد تكون سنة تأسيس المنشأة، إذا دُفع رأس المال خلال هذه السنة ولا توجد أرصدة سابقة، تأكد من مطابقته مع رصيد النقدية أو الأصول في خطوة «ما تملكه المنشأة».
              </div>
            </div>

            {/* Expandable Prior-Year Equity Fields */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowPriorEquity((v) => !v)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {showPriorEquity ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>
                  أرصدة حقوق ملكية إضافية من أعوام سابقة (الاحتياطي النظامي، الأرباح المبقاة، جاري الشركاء)
                </span>
              </button>

              {showPriorEquity && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      الاحتياطي النظامي
                    </label>
                    <SarInputBox
                      valueHalalas={financials.statutory_reserve}
                      onCommit={(h) => onUpdateField('statutory_reserve', h)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      الأرباح المبقاة (أول المدة)
                    </label>
                    <SarInputBox
                      valueHalalas={financials.retained_earnings_beginning}
                      onCommit={(h) =>
                        onUpdateField('retained_earnings_beginning', h)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      جاري الشركاء (صافي حقوق الملكية)
                    </label>
                    <SarInputBox
                      valueHalalas={financials.partners_current_account_net}
                      onCommit={(h) =>
                        onUpdateField('partners_current_account_net', h)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Substep 2: الإيرادات */}
        {subStep === 2 && (
          <div className="space-y-7">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                إيرادات {entity.fiscalYearLabel}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                أضف كل ما دخل المنشأة من بيع أو خدمات خلال السنة. يمكنك إضافة أكثر من بند.
              </p>
            </div>

            <RepeatingSection
              title="الإيرادات من النشاط"
              subtitle="قيمة المبيعات أو الخدمات المقدّمة خلال السنة (بدون ضريبة القيمة المضافة)."
              addLabel="إضافة إيراد"
              defaultLabel="المبيعات"
              lines={detailedLines.operatingRevenueLines}
              onChangeLines={(operatingRevenueLines) =>
                onUpdateDetailedLines({
                  ...detailedLines,
                  operatingRevenueLines,
                })
              }
            />

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="تكلفة البضاعة أو الخدمة المباعة"
                subtitle="ما صرفته مباشرة لتحقيق هذه الإيرادات، مثل قيمة البضاعة المباعة أو أجور المقاولين من الباطن."
                addLabel="إضافة بند"
                defaultLabel="تكلفة السلع المباعة"
                lines={detailedLines.costOfRevenueLines}
                onChangeLines={(costOfRevenueLines) =>
                  onUpdateDetailedLines({
                    ...detailedLines,
                    costOfRevenueLines,
                  })
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="إيرادات أخرى"
                subtitle="دخل لا يتعلق بالنشاط الأساسي، مثل إيرادات المنح أو أرباح بيع أصل أو عوائد ودائع."
                addLabel="إضافة بند"
                defaultLabel="إيرادات أخرى"
                lines={detailedLines.otherRevenueLines}
                onChangeLines={(otherRevenueLines) =>
                  onUpdateDetailedLines({
                    ...detailedLines,
                    otherRevenueLines,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Substep 3: المصروفات */}
        {subStep === 3 && (
          <div className="space-y-7">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                مصروفات {entity.fiscalYearLabel}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                أدخل إجمالي ما صُرف خلال السنة في كل بند. اترك البنود التي لا تنطبق عليك فارغة.
              </p>
            </div>

            {/* 2-Column Named Expense Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {EXPENSE_GRID_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    {field.label}
                  </label>
                  <SarInputBox
                    valueHalalas={detailedLines.expenseGrid[field.key]}
                    onCommit={(val) =>
                      onUpdateDetailedLines({
                        ...detailedLines,
                        expenseGrid: {
                          ...detailedLines.expenseGrid,
                          [field.key]: val,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Dynamic Other Expenses */}
            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="مصروفات أخرى"
                subtitle="أي مصروف لا يندرج تحت البنود أعلاه — اكتب اسمه ومبلغه."
                addLabel="إضافة مصروف"
                defaultLabel="مصروفات أخرى"
                lines={detailedLines.otherExpenseLines}
                onChangeLines={(otherExpenseLines) =>
                  onUpdateDetailedLines({
                    ...detailedLines,
                    otherExpenseLines,
                  })
                }
              />
            </div>

            {/* Zakat + Total Summary */}
            <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  إجمالي المصروفات:
                </span>
                <span
                  className="text-sm font-bold font-mono-num text-slate-900"
                  dir="ltr"
                >
                  {formatSar(totalExpensesDisplay)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  الزكاة المستحقة عن السنة
                </label>
                <SarInputBox
                  valueHalalas={financials.zakat_expense}
                  onCommit={(h) => onUpdateField('zakat_expense', h)}
                />
                <p className="text-[11px] text-slate-500">
                  كما في إقرار الزكاة أو اتركه صفراً إن لم تُحتسب بعد
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Substep 4: ما تملكه المنشأة (الأصول) */}
        {subStep === 4 && (
          <div className="space-y-7">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                ما تملكه المنشأة
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                الأرصدة كما هي في آخر يوم من السنة ({entity.fiscalYearLabel}-
                {entity.fiscalYearEnd}). خذ رصيد البنك من كشف الحساب في ذلك التاريخ.
              </p>
            </div>

            <RepeatingSection
              title="النقد في البنوك والصندوق"
              subtitle="أضف بنداً لكل حساب بنكي، وبنداً للنقد في الصندوق إن وجد."
              addLabel="إضافة حساب"
              defaultLabel="حساب بنكي"
              lines={detailedLines.cashAccountLines}
              onChangeLines={(cashAccountLines) =>
                onUpdateDetailedLines({ ...detailedLines, cashAccountLines })
              }
            />

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="مبالغ مستحقة لك عند العملاء"
                subtitle="فواتير أصدرتها ولم تُحصّل حتى نهاية السنة أو ضريبة مدخلات مستردة."
                addLabel="إضافة بند"
                defaultLabel="الذمم المدينة"
                lines={detailedLines.receivableLines}
                onChangeLines={(receivableLines) =>
                  onUpdateDetailedLines({ ...detailedLines, receivableLines })
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="المخزون"
                subtitle="قيمة البضاعة الموجودة لديك في نهاية السنة بسعر التكلفة."
                addLabel="إضافة بند"
                defaultLabel="مخزون البضاعة"
                lines={detailedLines.inventoryLines}
                onChangeLines={(inventoryLines) =>
                  onUpdateDetailedLines({ ...detailedLines, inventoryLines })
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="المعدات والأثاث والسيارات"
                subtitle="القيمة الدفترية في نهاية السنة، أي بعد خصم الإهلاك."
                addLabel="إضافة بند"
                defaultLabel="الأجهزة والأثاث والمعدات"
                lines={detailedLines.ppeLines}
                onChangeLines={(ppeLines) =>
                  onUpdateDetailedLines({ ...detailedLines, ppeLines })
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-5 max-w-sm">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                إهلاك السنة
              </label>
              <SarInputBox
                valueHalalas={financials.depreciation_expense}
                onCommit={(h) => onUpdateField('depreciation_expense', h)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                اتركه صفراً إن لم تكن لديك أصول ثابتة
              </p>
            </div>
          </div>
        )}

        {/* Substep 5: ما على المنشأة (الالتزامات) */}
        {subStep === 5 && (
          <div className="space-y-7">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                ما على المنشأة
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                المبالغ التي كانت على المنشأة ولم تُسدّد حتى {entity.fiscalYearLabel}-
                {entity.fiscalYearEnd}. إذا لم يكن عليك شيء اترك هذه الخطوة فارغة.
              </p>
            </div>

            <RepeatingSection
              title="التزامات تُسدّد خلال سنة"
              subtitle="مثل مبالغ للموردين، رواتب أو إيجار مستحق، ضريبة قيمة مضافة مستحقة، زكاة لم تُدفع، أو جاري الشركاء الدائن."
              addLabel="إضافة بند"
              defaultLabel="حسابات الذمم الدائنة"
              lines={detailedLines.currentLiabilityLines}
              onChangeLines={(currentLiabilityLines) =>
                onUpdateDetailedLines({
                  ...detailedLines,
                  currentLiabilityLines,
                })
              }
            />

            <div className="border-t border-slate-100 pt-5">
              <RepeatingSection
                title="التزامات طويلة الأجل"
                subtitle="قروض تُسدّد بعد أكثر من سنة، أو مبالغ أقرضها الشريك للمنشأة أو مخصص نهاية الخدمة."
                addLabel="إضافة بند"
                defaultLabel="قرض طويل الأجل"
                lines={detailedLines.longTermLiabilityLines}
                onChangeLines={(longTermLiabilityLines) =>
                  onUpdateDetailedLines({
                    ...detailedLines,
                    longTermLiabilityLines,
                  })
                }
              />
            </div>

            <div className="border-t border-slate-100 pt-5 max-w-sm">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                أرباح وُزّعت على الملاك خلال السنة
              </label>
              <SarInputBox
                valueHalalas={financials.dividends_declared}
                onCommit={(h) => onUpdateField('dividends_declared', h)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                اتركه صفراً إن لم توزّع أرباح
              </p>
            </div>
          </div>
        )}

        {/* Substep 6: مراجعة قائمتك */}
        {subStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">مراجعة قائمتك</h2>
              <p className="text-xs text-slate-500 mt-1">
                هذه النتائج محسوبة من الأرقام التي أدخلتها. راجعها، وعالج أي ملاحظة قبل المتابعة.
              </p>
            </div>

            {/* Side-by-side Income Statement & Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Statement */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-900">
                  قائمة الدخل
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">الإيرادات</td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.operatingRevenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        تكلفة الإيرادات
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        ({formatSar(statements.costOfRevenue)})
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        المصاريف الإدارية والعمومية والرواتب
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        (
                        {formatSar(
                          statements.salariesAndWages +
                            statements.rentExpense +
                            statements.generalAdminExpenses
                        )}
                        )
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">الإهلاك</td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        ({formatSar(statements.depreciationExpense)})
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        إيرادات (تكاليف تمويل) أخرى
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(
                          statements.otherRevenue - statements.financeCosts
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">الزكاة</td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.zakatExpense)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="px-4 py-3">صافي الربح (الخسارة)</td>
                      <td
                        className="px-4 py-3 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Balance Sheet */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-900">
                  المركز المالي
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        الأصول المتداولة
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.totalCurrentAssets)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        الأصول غير المتداولة
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.totalNonCurrentAssets)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        إجمالي الخصوم
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.totalLiabilities)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">رأس المال</td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.paidUpCapital)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600">
                        الأرباح (الخسائر) المبقاة
                      </td>
                      <td
                        className="px-4 py-2.5 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.retainedEarningsEnding)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="px-4 py-3">إجمالي الأصول</td>
                      <td
                        className="px-4 py-3 font-mono-num text-left"
                        dir="ltr"
                      >
                        {formatSar(statements.totalAssets)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expandable Equity & Cash Flow Statements */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreStatements((v) => !v)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {showMoreStatements ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>عرض قائمة التغيرات في حقوق الملكية وقائمة التدفقات النقدية</span>
              </button>

              {showMoreStatements && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-900">
                      قائمة التغيرات في حقوق الملكية
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2 text-slate-600">رأس المال</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.paidUpCapital)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">الاحتياطي النظامي</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.statutoryReserve)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">صافي الربح / الخسارة</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.netProfit)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">توزيعات الأرباح</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            ({formatSar(statements.dividendsDeclared)})
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-2.5">إجمالي حقوق الملكية</td>
                          <td className="px-4 py-2.5 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.totalEquity)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-900">
                      قائمة التدفقات النقدية (الطريقة غير المباشرة)
                    </div>
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2 text-slate-600">التدفقات التشغيلية</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.cashFlowOperating)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">التدفقات الاستثمارية</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.cashFlowInvesting)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-600">التدفقات التمويلية</td>
                          <td className="px-4 py-2 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.cashFlowFinancing)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-2.5">النقدية نهاية السنة</td>
                          <td className="px-4 py-2.5 font-mono-num text-left" dir="ltr">
                            {formatSar(statements.cashAndEquivalents)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Balance Confirmation Banner */}
            {statements.isBalanced ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold">
                  ممتاز — قائمتك متوازنة ولا توجد ملاحظات.
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    يوجد فرق في التوازن قدره{' '}
                    <strong className="font-mono-num" dir="ltr">
                      {formatSar(statements.balanceDiffHalalas)}
                    </strong>
                    . يمكنك مراجعة الأرصدة أو الانتقال للفحص الذكي للمواءمة.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (subStep > 1) {
                onSelectSubStep((subStep - 1) as WizardSubStep);
              } else {
                onPrevStage();
              }
            }}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          {subStep < 6 ? (
            <button
              type="button"
              onClick={() => onSelectSubStep((subStep + 1) as WizardSubStep)}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>
                التالي: {SUB_STEPS[subStep]?.title}
              </span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextStage}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>متابعة إلى الفحص الذكي</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
