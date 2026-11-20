import React, { useState } from 'react';
import { History, Search, X } from 'lucide-react';
import type { AuditLogEntry } from '../types/qawaem';
import { QAWAEM_TAXONOMY } from '../utils/accounting';

interface AuditTrailModalProps {
  open: boolean;
  entries: AuditLogEntry[];
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  open,
  entries,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <History className="w-4 h-4 text-emerald-700" />
            <span>سجل التعديلات والرقابة (Audit Trail)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              لم يتم تسجيل أي تعديلات مالية أو مواءمات بعد. سيتم توثيق كل تعديل بعد الإقرار أو الفحص الذكي تلقائياً.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-right font-semibold">الوقت</th>
                  <th className="px-3 py-2 text-right font-semibold">البند</th>
                  <th className="px-3 py-2 text-left font-semibold">القيمة السابقة</th>
                  <th className="px-3 py-2 text-left font-semibold">القيمة الجديدة</th>
                  <th className="px-3 py-2 text-right font-semibold">المصدر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2.5 font-mono-num text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestampIso).toLocaleTimeString('ar-SA')}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900">
                      {entry.fieldLabel}
                    </td>
                    <td className="px-3 py-2.5 font-mono-num text-slate-500 text-left" dir="ltr">
                      {entry.oldValue}
                    </td>
                    <td className="px-3 py-2.5 font-mono-num font-bold text-emerald-700 text-left" dir="ltr">
                      {entry.newValue}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

interface TaxonomyModalProps {
  open: boolean;
  onClose: () => void;
}

export const TaxonomyModal: React.FC<TaxonomyModalProps> = ({
  open,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const filtered = QAWAEM_TAXONOMY.filter(
    (item) =>
      item.arabicLabel.includes(query) ||
      item.englishLabel.toLowerCase().includes(query.toLowerCase()) ||
      item.xbrlCode.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-900">
            قاموس بنود منصة قوائم القياسية (XBRL Taxonomy)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم البند العربي أو الإنجليزي أو رمز XBRL..."
              className="w-full h-10 pr-9 pl-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">الرمز</th>
                <th className="px-3 py-2 text-right font-semibold">البند العربي</th>
                <th className="px-3 py-2 text-right font-semibold">English Term</th>
                <th className="px-3 py-2 text-right font-semibold">الطبيعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2.5 font-mono-num text-slate-500">
                    {item.xbrlCode}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                    {item.arabicLabel}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {item.englishLabel}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {item.normalBalance === 'debit' ? 'مدين' : 'دائن'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
