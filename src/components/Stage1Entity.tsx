import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { CompanyClassification, EntityProfile } from '../types/qawaem';
import { getAuditorExemptionInfo } from '../utils/accounting';

interface Stage1EntityProps {
  entity: EntityProfile;
  onChange: (updated: EntityProfile) => void;
  onNext: () => void;
}

const SAMPLE_CRS = [
  { cr: '1010543210', label: '1010543210 · شركة صغيرة' },
  { cr: '1010889900', label: '1010889900 · متناهية الصغر' },
  { cr: '2050112233', label: '2050112233 · متوسطة/كبيرة' },
];

export const Stage1Entity: React.FC<Stage1EntityProps> = ({
  entity,
  onChange,
  onNext,
}) => {
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleWathqLookup = async (crOverride?: string) => {
    const targetCr = (crOverride ?? entity.crNumber).replace(/\D/g, '');
    if (targetCr.length !== 10) {
      setLookupError('يرجى إدخال رقم سجل تجاري صحيح مكون من 10 أرقام.');
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
      onChange({
        ...entity,
        ...data.entity,
        fiscalYearLabel: entity.fiscalYearLabel || '2026',
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

  const exemption = getAuditorExemptionInfo(entity.classification);

  const classifications: Array<{
    id: CompanyClassification;
    title: string;
    criteria: string;
  }> = [
    {
      id: 'micro',
      title: 'منشأة متناهية الصغر',
      criteria: 'إيرادات ≤ 3 مليون ر.س · أصول ≤ 3 مليون · موظفون ≤ 5',
    },
    {
      id: 'small',
      title: 'منشأة صغيرة',
      criteria: 'إيرادات ≤ 40 مليون ر.س · أصول ≤ 40 مليون · موظفون ≤ 49',
    },
    {
      id: 'medium_large',
      title: 'منشأة متوسطة أو كبيرة',
      criteria: 'تتجاوز حدود المنشآت الصغيرة حسب تصنيف نظام الشركات',
    },
  ];

  const isFormValid =
    entity.crNumber.trim().length >= 10 && entity.entityName.trim().length > 2;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              المرحلة 1: بيانات المنشأة والسنة المالية
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              المعلومات الأساسية المطابقة للسجل التجاري، وتظهر كما هي في القوائم المالية.
            </p>
          </div>
          {entity.wathqVerified && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>مطابق للسجل التجاري</span>
            </div>
          )}
        </div>

        {/* Wathq CR Lookup Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="cr-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                رقم السجل التجاري (10 أرقام)
              </label>
              <input
                id="cr-input"
                type="text"
                dir="ltr"
                maxLength={10}
                value={entity.crNumber}
                onChange={(e) =>
                  onChange({
                    ...entity,
                    crNumber: e.target.value.replace(/\D/g, ''),
                    wathqVerified: false,
                  })
                }
                placeholder="1010543210"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
            <button
              type="button"
              onClick={() => handleWathqLookup()}
              disabled={lookupLoading}
              className="h-11 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lookupLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>جلب البيانات عبر واثق (Wathq)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>سجلات تجريبية سريعة:</span>
            {SAMPLE_CRS.map((sample) => (
              <button
                key={sample.cr}
                type="button"
                onClick={() => {
                  onChange({ ...entity, crNumber: sample.cr });
                  handleWathqLookup(sample.cr);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-500 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {lookupError && (
            <p className="text-xs font-medium text-red-600">{lookupError}</p>
          )}
        </div>

        {/* Entity Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اسم المنشأة
            </label>
            <input
              type="text"
              value={entity.entityName}
              onChange={(e) =>
                onChange({ ...entity, entityName: e.target.value })
              }
              placeholder="مثال: شركة آفاق التقنية والتجارة المحدودة"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الشكل القانوني
            </label>
            <select
              value={entity.legalForm}
              onChange={(e) =>
                onChange({ ...entity, legalForm: e.target.value })
              }
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="شركة ذات مسؤولية محدودة">
                شركة ذات مسؤولية محدودة
              </option>
              <option value="شركة الشخص الواحد ذات مسؤولية محدودة">
                شركة الشخص الواحد ذات مسؤولية محدودة
              </option>
              <option value="شركة مساهمة مبسطة">شركة مساهمة مبسطة</option>
              <option value="شركة مساهمة">شركة مساهمة</option>
              <option value="مؤسسة فردية">مؤسسة فردية</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              المدينة
            </label>
            <input
              type="text"
              value={entity.city}
              onChange={(e) => onChange({ ...entity, city: e.target.value })}
              placeholder="جدة"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              رأس المال المسجل (ريال سعودي)
            </label>
            <input
              type="number"
              dir="ltr"
              value={entity.paidUpCapitalSar}
              onChange={(e) =>
                onChange({
                  ...entity,
                  paidUpCapitalSar: Number(e.target.value) || 0,
                })
              }
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الممثل النظامي
            </label>
            <input
              type="text"
              value={entity.legalRepresentative}
              onChange={(e) =>
                onChange({ ...entity, legalRepresentative: e.target.value })
              }
              placeholder="مثال: خالد العتيبي — مدير الشركة"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              وصف النشاط الاقتصادي (ISIC4)
            </label>
            <input
              type="text"
              value={entity.isicDescription}
              onChange={(e) =>
                onChange({ ...entity, isicDescription: e.target.value })
              }
              placeholder="تصميم وبرمجة البرمجيات والتجارة"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الفترة المالية
            </label>
            <input
              type="text"
              value={entity.fiscalPeriodRange}
              onChange={(e) =>
                onChange({ ...entity, fiscalPeriodRange: e.target.value })
              }
              placeholder="من 01/01/2026 إلى 31/12/2026"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              نوع القائمة
            </label>
            <select
              value={entity.statementType}
              onChange={(e) =>
                onChange({
                  ...entity,
                  statementType: e.target.value as 'active' | 'dormant',
                })
              }
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="active">قائمة مالية بنشاط</option>
              <option value="dormant">قائمة مالية بدون نشاط (ساكنة)</option>
            </select>
          </div>
        </div>

        {/* Accounting Framework Banner */}
        <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong>الإطار المحاسبي المطبق:</strong> المعيار الدولي للتقرير
            المالي للمنشآت الصغيرة والمتوسطة (IFRS for SMEs) المعتمد في المملكة
            العربية السعودية، على أساس التكلفة التاريخية والاستحقاق، بالريال
            السعودي.
          </div>
        </div>

        {/* Company Size Classification */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">
              تصنيف المنشأة وفق نظام الشركات السعودي (لتحديد إلزامية المراجع الخارجي)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {classifications.map((cls) => {
              const active = entity.classification === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() =>
                    onChange({ ...entity, classification: cls.id })
                  }
                  className={`p-4 rounded-xl border text-right transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50/60 border-blue-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">
                    {cls.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {cls.criteria}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`p-4 rounded-lg border flex items-start gap-3 ${
              exemption.exempt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            {exemption.exempt ? (
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold">{exemption.label}</div>
              <p className="text-slate-600 leading-relaxed">
                {exemption.ruleSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            يتم حفظ جميع البيانات تلقائياً عند كل تعديل.
          </span>
          <button
            type="button"
            disabled={!isFormValid}
            onClick={onNext}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            متابعة إلى الإقرار النظامي
          </button>
        </div>
      </div>
    </div>
  );
};
