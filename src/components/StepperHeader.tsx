import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import type { MainStage } from '../types/qawaem';

export const WORKFLOW_STAGES: Array<{
  stage: MainStage;
  title: string;
}> = [
  { stage: 1, title: 'بيانات المنشأة' },
  { stage: 2, title: 'الإقرار النظامي' },
  { stage: 3, title: 'رفع المستندات' },
  { stage: 4, title: 'البيانات المالية' },
  { stage: 5, title: 'الفحص الذكي' },
  { stage: 6, title: 'الدفع والفاتورة' },
  { stage: 7, title: 'الإصدار والتصدير' },
];

interface StepperHeaderProps {
  currentStage: MainStage;
  completedStages: Record<MainStage, boolean>;
  onSelectStage: (stage: MainStage) => void;
}

export const StepperHeader: React.FC<StepperHeaderProps> = ({
  currentStage,
  completedStages,
  onSelectStage,
}) => {
  return (
    <div className="no-print bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 py-3.5 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 min-w-max">
          {WORKFLOW_STAGES.map((item, idx) => {
            const isActive = currentStage === item.stage;
            const isCompleted = completedStages[item.stage];

            return (
              <React.Fragment key={item.stage}>
                <button
                  type="button"
                  onClick={() => onSelectStage(item.stage)}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 tabular-nums transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      item.stage
                    )}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isActive
                        ? 'font-bold text-blue-800'
                        : isCompleted
                          ? 'font-semibold text-emerald-700'
                          : 'font-medium text-slate-500'
                    }`}
                  >
                    {item.title}
                  </span>
                </button>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <ArrowLeft
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-slate-300 shrink-0"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
