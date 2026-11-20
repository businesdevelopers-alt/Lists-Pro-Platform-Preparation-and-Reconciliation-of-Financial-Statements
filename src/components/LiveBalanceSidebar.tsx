import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  History,
  ShieldCheck,
} from 'lucide-react';
import type {
  ComputedStatements,
  EntityProfile,
  MainStage,
} from '../types/qawaem';
import { formatSar, getAuditorExemptionInfo } from '../utils/accounting';

interface LiveBalanceSidebarProps {
  entity: EntityProfile;
  statements: ComputedStatements;
  lastSavedAtIso: string;
  auditCount: number;
  currentStage: MainStage;
  onOpenAuditTrail: () => void;
  onGoToStage: (stage: MainStage) => void;
}

export const LiveBalanceSidebar: React.FC<LiveBalanceSidebarProps> = ({
  entity,
  statements,
  lastSavedAtIso,
  auditCount,
  currentStage,
  onOpenAuditTrail,
  onGoToStage,
}) => {
  const exemption = getAuditorExemptionInfo(entity.classification);
  const savedTime = new Date(lastSavedAtIso).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasAnyNumbers =
    statements.totalAssets !== 0 ||
    statements.totalRevenue !== 0 ||
    statements.totalLiabilitiesAndEquity !== 0;

  return (
    <aside className="no-print w-full xl:w-80 shrink-0 space-y-4">
      {/* Live Balance Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              ملخص التوازن اللحظي
            </h2>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              حفظ تلقائي {savedTime}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {entity.entityName || 'منشأة قيد الإعداد'}
            {entity.crNumber ? ` · س.ت ${entity.crNumber}` : ''}
          </p>
        </div>

        {/* Equilibrium Banner (Icon + Label + Value) */}
        {!hasAnyNumbers ? (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-800">
                بانتظار إدخال الأرقام المالية
              </div>
              <div className="text-slate-500 mt-0.5">
                أكمل المعالج التفاعلي أو ارفع ميزان المراجعة لحساب التوازن فورياً.
              </div>
            </div>
          </div>
        ) : statements.isBalanced ? (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold">القائمة متوازنة</div>
              <div className="text-emerald-800 mt-0.5 font-mono-num">
                الفرق = 0.00 ر.س
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold">يوجد فرق في التوازن</div>
              <div className="text-red-800 mt-0.5 font-mono-num">
                الفرق = {formatSar(statements.balanceDiffHalalas)}
              </div>
            </div>
          </div>
        )}

        {/* 4 Core Live Totals */}
        <dl className="divide-y divide-slate-100 text-sm">
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-600">إجمالي الإيرادات</dt>
            <dd className="font-semibold text-slate-900 font-mono-num text-left" dir="ltr">
              {formatSar(statements.totalRevenue)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-600">
              {statements.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
            </dt>
            <dd
              className={`font-semibold font-mono-num text-left ${
                statements.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
              dir="ltr"
            >
              {formatSar(statements.netProfit)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-600">إجمالي الأصول</dt>
            <dd className="font-semibold text-slate-900 font-mono-num text-left" dir="ltr">
              {formatSar(statements.totalAssets)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-3">
            <dt className="text-xs text-slate-600">الخصوم وحقوق الملكية</dt>
            <dd className="font-semibold text-slate-900 font-mono-num text-left" dir="ltr">
              {formatSar(statements.totalLiabilitiesAndEquity)}
            </dd>
          </div>
        </dl>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          {currentStage !== 5 && (
            <button
              type="button"
              onClick={() => onGoToStage(5)}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              الانتقال إلى الفحص الذكي وميزان المراجعة
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAuditTrail}
            className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>سجل التعديلات والرقابة ({auditCount})</span>
          </button>
        </div>
      </div>

      {/* Regulatory Classification Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>الوضع النظامي للمراجع الخارجي</span>
        </div>
        <p className="text-xs font-semibold text-slate-800">{exemption.label}</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          {exemption.ruleSummary}
        </p>
      </div>
    </aside>
  );
};
