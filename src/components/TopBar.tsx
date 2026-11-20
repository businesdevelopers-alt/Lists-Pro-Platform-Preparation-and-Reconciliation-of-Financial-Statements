import React from 'react';
import type { MainStage } from '../types/qawaem';

interface TopBarProps {
  activeScreen: 'dashboard' | 'new_statement' | 'workspace';
  currentStage: MainStage;
  onSelectStage: (stage: MainStage) => void;
  onOpenDashboard: () => void;
  onOpenNewStatement: () => void;
  onOpenOnboarding: () => void;
  onOpenAuditTrail: () => void;
  onOpenTaxonomy: () => void;
  auditCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeScreen,
  currentStage,
  onSelectStage,
  onOpenDashboard,
  onOpenNewStatement,
  onOpenOnboarding,
  onOpenAuditTrail,
  onOpenTaxonomy,
  auditCount,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={onOpenDashboard}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors cursor-pointer"
        >
          قوائم برو
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={onOpenDashboard}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeScreen === 'dashboard'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            لوحة التحكم
          </button>
          <button
            type="button"
            onClick={() => onSelectStage(currentStage)}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeScreen === 'workspace'
                ? 'border-blue-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            مسار الإعداد
          </button>
          <button
            type="button"
            onClick={onOpenTaxonomy}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors cursor-pointer"
          >
            قاموس قوائم
          </button>
          <button
            type="button"
            onClick={onOpenAuditTrail}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors cursor-pointer"
          >
            سجل التعديلات ({auditCount})
          </button>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors cursor-pointer"
          >
            دليل التأسيس
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewStatement}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            قائمة مالية جديدة
          </button>
        </div>
      </div>
    </header>
  );
};
