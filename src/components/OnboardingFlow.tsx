import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Info,
  Landmark,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  AccountOwnerProfile,
  CompanyClassification,
  EntityProfile,
} from '../types/qawaem';
import { getAuditorExemptionInfo } from '../utils/accounting';

interface OnboardingFlowProps {
  accountOwner: AccountOwnerProfile;
  entity: EntityProfile;
  onUpdateOwner: (owner: AccountOwnerProfile) => void;
  onUpdateEntity: (entity: EntityProfile) => void;
  onCompleteOnboarding: (targetStage: 1 | 2 | 4) => void;
}

type OnboardingStep = 1 | 2 | 3;

const ONBOARDING_STEPS: Array<{
  step: OnboardingStep;
  title: string;
  subtitle: string;
}> = [
  {
    step: 1,
    title: 'بيانات الحساب والشركة',
    subtitle: 'التعريف بالسجل التجاري والنشاط',
  },
  {
    step: 2,
    title: 'تصنيف المنشأة النظامي',
    subtitle: 'تحديد الحجم ومتطلب المراجع',
  },
  {
    step: 3,
    title: 'المتطلبات الأولية والجاهزية',
    subtitle: 'المستندات ومسار الإعداد قبل البدء',
  },
];

const QUICK_CRS = [
  { cr: '1010543210', label: '1010543210 (صغيرة)' },
  { cr: '1010889900', label: '1010889900 (متناهية الصغر)' },
  { cr: '2050112233', label: '2050112233 (متوسطة/كبيرة)' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  accountOwner,
  entity,
  onUpdateOwner,
  onUpdateEntity,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [readyChecklist, setReadyChecklist] = useState({
    hasCrAndDocs: false,
    hasTrialBalanceOrFigures: false,
    understandsQawaemRole: false,
  });

  const handleWathqLookup = async (crOverride?: string) => {
    const targetCr = (crOverride ?? entity.crNumber).replace(/\D/g, '');
    if (targetCr.length !== 10) {
      setLookupError('يرجى إدخال رقم سجل تجاري مكون من 10 أرقام للتحقق عبر واثق.');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/wathq/lookup/${targetCr}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر جلب بيانات السجل التجاري.');
      }
      onUpdateEntity({
        ...entity,
        ...data.entity,
        fiscalYearLabel: entity.fiscalYearLabel || '2025',
        wathqVerified: true,
      });
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'تعذر الاتصال بخدمة واثق.'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const suggestClassificationFromMetrics = (
    revenueMillions: number,
    assetsMillions: number,
    employees: number
  ): CompanyClassification => {
    if (revenueMillions <= 3 && assetsMillions <= 3 && employees <= 5) {
      return 'micro';
    }
    if (revenueMillions <= 40 && assetsMillions <= 40 && employees <= 49) {
      return 'small';
    }
    return 'medium_large';
  };

  const handleMetricsChange = (
    patch: Partial<
      Pick<
        EntityProfile,
        'annualRevenueMillions' | 'totalAssetsMillions' | 'employeesCount'
      >
    >
  ) => {
    const nextRev = patch.annualRevenueMillions ?? entity.annualRevenueMillions;
    const nextAssets = patch.totalAssetsMillions ?? entity.totalAssetsMillions;
    const nextEmp = patch.employeesCount ?? entity.employeesCount;
    const suggested = suggestClassificationFromMetrics(
      nextRev,
      nextAssets,
      nextEmp
    );
    onUpdateEntity({
      ...entity,
      ...patch,
      classification: suggested,
    });
  };

  const exemption = getAuditorExemptionInfo(entity.classification);

  const step1Valid =
    accountOwner.fullName.trim().length >= 2 &&
    accountOwner.email.includes('@') &&
    entity.crNumber.trim().length === 10 &&
    entity.entityName.trim().length >= 3;

  const allChecklistConfirmed =
    readyChecklist.hasCrAndDocs &&
    readyChecklist.hasTrialBalanceOrFigures &&
    readyChecklist.understandsQawaemRole;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Minimal 3-Zone Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            قوائم برو
          </span>

          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <span>إعداد حساب منشأة جديد</span>
            <span aria-hidden="true">·</span>
            <span>متوافق مع معايير SOCPA ومنصة قوائم</span>
          </div>

          <button
            type="button"
            onClick={() => onCompleteOnboarding(1)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            تخطي إلى مساحة العمل
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Visual Progress Header */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">
                مرحباً بك في منصة قوائم برو لإعداد القوائم المالية
              </h1>
              <p className="text-sm text-slate-600">
                ثلاث خطوات تمهيدية لتعريف منشأتك وتحديد تصنيفها النظامي وفهم المتطلبات قبل البدء في الأرقام المالية.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0">
              الخطوة 0{step} من 03
            </div>
          </div>

          {/* 3-Step Visual Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ONBOARDING_STEPS.map((item) => {
              const isActive = step === item.step;
              const isDone = step > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    if (item.step < step || (item.step === 2 && step1Valid)) {
                      setStep(item.step);
                    }
                  }}
                  className={`p-3.5 rounded-lg border text-right flex items-center gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50/80 border-emerald-600 text-slate-900'
                      : isDone
                        ? 'bg-white border-emerald-200 text-slate-800 hover:border-emerald-400'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 tabular-nums ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : `0${item.step}`}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step Content + Contextual Guidance Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Step Form (8 cols) */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            {step === 1 && (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                    <span>01. تسجيل المستخدم وبيانات المنشأة</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    أدخل بيانات المفوض بإدارة الحساب، ثم استعلم عن السجل التجاري لتعبئة اسم المنشأة ونشاطها تلقائياً.
                  </p>
                </div>

                {/* User Account Fields */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    أولاً: بيانات مسؤول الحساب (المستخدم الجديد)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        value={accountOwner.fullName}
                        onChange={(e) =>
                          onUpdateOwner({
                            ...accountOwner,
                            fullName: e.target.value,
                          })
                        }
                        placeholder="خالد بن محمد العتيبي"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        الصفة الوظيفية
                      </label>
                      <select
                        value={accountOwner.jobTitle}
                        onChange={(e) =>
                          onUpdateOwner({
                            ...accountOwner,
                            jobTitle: e.target.value,
                          })
                        }
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="المدير العام / المالك">
                          المدير العام / المالك
                        </option>
                        <option value="الشريك المفوض">الشريك المفوض</option>
                        <option value="المدير المالي">المدير المالي</option>
                        <option value="محاسب المنشأة">محاسب المنشأة</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        البريد الإلكتروني للعمل
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={accountOwner.email}
                        onChange={(e) =>
                          onUpdateOwner({
                            ...accountOwner,
                            email: e.target.value,
                          })
                        }
                        placeholder="finance@company.sa"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        رقم الجوال (السعودي)
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        maxLength={10}
                        value={accountOwner.mobile}
                        onChange={(e) =>
                          onUpdateOwner({
                            ...accountOwner,
                            mobile: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        placeholder="0551234567"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Company CR Lookup */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-800">
                      ثانياً: بيانات المنشأة التجارية
                    </div>
                    {entity.wathqVerified && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>متحقق من السجل</span>
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          رقم السجل التجاري (10 أرقام)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={10}
                          value={entity.crNumber}
                          onChange={(e) =>
                            onUpdateEntity({
                              ...entity,
                              crNumber: e.target.value.replace(/\D/g, ''),
                              wathqVerified: false,
                            })
                          }
                          placeholder="1010543210"
                          className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={lookupLoading}
                        onClick={() => handleWathqLookup()}
                        className="h-11 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {lookupLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        <span>جلب تلقائي عبر واثق</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>أمثلة جاهزة للاختبار:</span>
                      {QUICK_CRS.map((item) => (
                        <button
                          key={item.cr}
                          type="button"
                          onClick={() => {
                            onUpdateEntity({ ...entity, crNumber: item.cr });
                            handleWathqLookup(item.cr);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {lookupError && (
                      <p className="text-xs font-medium text-red-600">
                        {lookupError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        اسم المنشأة الرسمي
                      </label>
                      <input
                        type="text"
                        value={entity.entityName}
                        onChange={(e) =>
                          onUpdateEntity({
                            ...entity,
                            entityName: e.target.value,
                          })
                        }
                        placeholder="شركة آفاق التقنية والتجارة المحدودة"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        الكيان القانوني
                      </label>
                      <select
                        value={entity.legalForm}
                        onChange={(e) =>
                          onUpdateEntity({
                            ...entity,
                            legalForm: e.target.value,
                          })
                        }
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="شركة ذات مسؤولية محدودة">
                          شركة ذات مسؤولية محدودة
                        </option>
                        <option value="شركة الشخص الواحد ذات مسؤولية محدودة">
                          شركة الشخص الواحد ذات مسؤولية محدودة
                        </option>
                        <option value="شركة مساهمة مبسطة">
                          شركة مساهمة مبسطة
                        </option>
                        <option value="مؤسسة فردية">مؤسسة فردية</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        النشاط الاقتصادي (ISIC4)
                      </label>
                      <input
                        type="text"
                        value={entity.isicDescription}
                        onChange={(e) =>
                          onUpdateEntity({
                            ...entity,
                            isicDescription: e.target.value,
                          })
                        }
                        placeholder="تصميم وبرمجة البرمجيات والتجارة"
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                    <span>02. اختيار تصنيف المنشأة وتحديد المتطلب النظامي</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    أدخل المؤشرات التقريبية لمنشأتك أو اختر التصنيف مباشرة، وسيحدد النظام مدى الحاجة لمراجع خارجي مرخص.
                  </p>
                </div>

                {/* Interactive Threshold Estimator */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="text-xs font-bold text-slate-900">
                    مؤشرات التصنيف التلقائي وفق نظام الشركات السعودي (منشآت)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        الإيرادات السنوية (مليون ر.س)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        dir="ltr"
                        value={entity.annualRevenueMillions}
                        onChange={(e) =>
                          handleMetricsChange({
                            annualRevenueMillions: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        إجمالي الأصول (مليون ر.س)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        dir="ltr"
                        value={entity.totalAssetsMillions}
                        onChange={(e) =>
                          handleMetricsChange({
                            totalAssetsMillions: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        عدد الموظفين بدوام كامل
                      </label>
                      <input
                        type="number"
                        min="0"
                        dir="ltr"
                        value={entity.employeesCount}
                        onChange={(e) =>
                          handleMetricsChange({
                            employeesCount: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* 3 Classification Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'micro' as const,
                      title: 'متناهية الصغر',
                      limits: 'إيرادات ≤ 3 مليون · أصول ≤ 3 مليون · موظفون ≤ 5',
                      badge: 'إعفاء كامل من المراجع الخارجي',
                    },
                    {
                      id: 'small' as const,
                      title: 'منشأة صغيرة',
                      limits: 'إيرادات ≤ 40 مليون · أصول ≤ 40 مليون · موظفون ≤ 49',
                      badge: 'إعفاء نظامي (ما لم ينص العقد)',
                    },
                    {
                      id: 'medium_large' as const,
                      title: 'متوسطة أو كبيرة',
                      limits: 'تتجاوز حدود المنشآت الصغيرة أعلاه',
                      badge: 'يتطلب اعتماد مراجع قانوني SOCPA',
                    },
                  ].map((card) => {
                    const active = entity.classification === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() =>
                          onUpdateEntity({
                            ...entity,
                            classification: card.id,
                          })
                        }
                        className={`p-4 rounded-xl border text-right flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-50/70 border-emerald-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">
                              {card.title}
                            </span>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {card.limits}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/70 text-[11px] font-semibold text-slate-700">
                          {card.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Resulting Regulatory Cue */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    exemption.exempt
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  {exemption.exempt ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <div className="font-bold">{exemption.label}</div>
                    <p className="text-slate-700 leading-relaxed">
                      {exemption.ruleSummary}
                    </p>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                    <span>03. فهم المتطلبات الأولية وجاهزية الإعداد</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    قبل الانتقال إلى إدخال الأرقام المالية، راجع المتطلبات التالية وتأكد من توفر المستندات الأساسية لديك.
                  </p>
                </div>

                {/* Required Documents Visual Grid */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    المستندات والأرقام المطلوبة خلال رحلة الإعداد:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">
                          السجل التجاري وعقد التأسيس
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          للتحقق من رأس المال المدفوع ونسبة الاحتياطي النظامي وبداية السنة المالية.
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">
                          ميزان المراجعة (Excel / CSV)
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          مستخرج من برنامجك المحاسبي (قيود، دفترة، أودو) للفحص الذكي والمطابقة الآلية.
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                      <Landmark className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">
                          أرصدة البنوك والزكاة نهاية العام
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          كشف الحساب البنكي بنهاية 12-31 وإقرارات ضريبة القيمة المضافة للتحقق من المطابقة.
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">
                          الحدود النظامية للإيداع الحكومي
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          المنصة تجهز القوائم وجدول النسخ لبوابة قوائم؛ الإيداع الرسمي يتم عبر النفاذ الوطني للمنشأة أو المراجع المعتمد.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Readiness Confirmation Checklist */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="text-xs font-bold text-slate-900">
                    قائمة التحقق الأولية (يرجى التأكيد للمتابعة):
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyChecklist.hasCrAndDocs}
                      onChange={(e) =>
                        setReadyChecklist((prev) => ({
                          ...prev,
                          hasCrAndDocs: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                    <span>
                      تتوفر لدي بيانات السجل التجاري وعقد التأسيس ونهاية السنة المالية المطلوبة للمنشأة.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyChecklist.hasTrialBalanceOrFigures}
                      onChange={(e) =>
                        setReadyChecklist((prev) => ({
                          ...prev,
                          hasTrialBalanceOrFigures: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                    <span>
                      لدي ميزان المراجعة بصيغة Excel/CSV أو الأرقام الإجمالية للإيرادات والمصروفات والأصول والالتزامات.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyChecklist.understandsQawaemRole}
                      onChange={(e) =>
                        setReadyChecklist((prev) => ({
                          ...prev,
                          understandsQawaemRole: e.target.checked,
                        }))
                      }
                      className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                    <span>
                      أدرك أن المنصة تعد القوائم وتفحص توازنها وفق معايير SOCPA وتوفر جدول الإدخال الإرشادي لبوابة قوائم الحكومية.
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* Step Navigation Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as OnboardingStep)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الخطوة السابقة</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  الحفظ التلقائي مفعل لجميع الحقول
                </span>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  disabled={step === 1 && !step1Valid}
                  onClick={() => setStep((step + 1) as OnboardingStep)}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>متابعة</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!allChecklistConfirmed}
                    onClick={() => onCompleteOnboarding(2)}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    الانتقال للإقرار والتوقيع الإلكتروني
                  </button>
                  <button
                    type="button"
                    disabled={!allChecklistConfirmed}
                    onClick={() => onCompleteOnboarding(4)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    الدخول مباشرة للمعالج المالي
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Contextual Guidance Sidebar (4 cols) */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>إرشادات هذه الخطوة</span>
              </div>

              {step === 1 && (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    يستخدم <strong className="text-slate-900">رقم السجل التجاري</strong> كمعرّف أساسي لربط القوائم المالية والبيانات الضريبية على صفحة الغلاف.
                  </p>
                  <p>
                    عند الضغط على <strong className="text-slate-900">جلب تلقائي عبر واثق</strong> يتم تعبئة الاسم الرسمي والكيان القانوني ورمز النشاط (ISIC4) لتفادي الأخطاء الإملائية.
                  </p>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                    تأكد من أن اسم المفوض بالصلاحية يطابق المدير العام أو الشريك المفوض في السجل التجاري.
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    تصنيف منشأتك يحدد تلقائياً ما إذا كنت بحاجة إلى <strong className="text-slate-900">مراجع حسابات قانوني (SOCPA)</strong> أم أن المنشأة معفاة وفق نظام الشركات.
                  </p>
                  <p>
                    تتحقق المنصة من ثلاثة معايير معاً: الإيرادات السنوية، إجمالي الأصول، وعدد الموظفين.
                  </p>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                    المنشآت المعفاة يمكنها الاعتماد على مسودة الإدارة وتصديرها مباشرة، بينما المنشآت غير المعفاة يُجهز لها ملف جاهز للمراجع القانوني.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    بعد إتمام هذه الخطوة، ستنتقل إلى <strong className="text-slate-900">مساحة العمل المحاسبية</strong> التي تحتوي على شريط التوازن اللحظي.
                  </p>
                  <p>
                    يمكنك إدخال الأرقام يدوياً بلغة غير محاسبية في <strong className="text-slate-900">المعالج التفاعلي</strong>، أو رفع ملف <strong className="text-slate-900">ميزان المراجعة</strong> ليقوم محرك الفحص الذكي بتسكين الحسابات ومطابقتها بالهللة.
                  </p>
                </div>
              )}
            </div>

            {/* Live Onboarding Summary Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold text-slate-900">
                ملخص الملف قيد الإنشاء
              </div>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between gap-2">
                  <dt className="text-slate-500">المستخدم</dt>
                  <dd className="font-semibold text-slate-900 truncate">
                    {accountOwner.fullName || 'غير مدخل'}
                  </dd>
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <dt className="text-slate-500">المنشأة</dt>
                  <dd className="font-semibold text-slate-900 truncate">
                    {entity.entityName || 'غير محددة'}
                  </dd>
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <dt className="text-slate-500">السجل التجاري</dt>
                  <dd className="font-mono-num text-slate-900">
                    {entity.crNumber || '—'}
                  </dd>
                </div>
                <div className="py-2 flex justify-between gap-2">
                  <dt className="text-slate-500">التصنيف</dt>
                  <dd className="font-semibold text-emerald-700">
                    {entity.classification === 'micro'
                      ? 'متناهية الصغر'
                      : entity.classification === 'small'
                        ? 'صغيرة'
                        : 'متوسطة / كبيرة'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
