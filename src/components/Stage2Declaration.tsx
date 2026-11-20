import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eraser,
  FileSignature,
  KeyRound,
} from 'lucide-react';
import type { EntityProfile, LegalDeclaration } from '../types/qawaem';

interface Stage2DeclarationProps {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  onChange: (updated: LegalDeclaration) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Stage2Declaration: React.FC<Stage2DeclarationProps> = ({
  entity,
  declaration,
  onChange,
  onPrev,
  onNext,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingIp, setVerifyingIp] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (declaration.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = declaration.signatureDataUrl;
    }
  }, []);

  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({
      ...declaration,
      signatureDataUrl: canvas.toDataURL('image/png'),
    });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange({
      ...declaration,
      signatureDataUrl: '',
    });
  };

  const handleSendOtp = () => {
    setOtpError(null);
    if (!declaration.signatoryMobile.trim()) {
      setOtpError('يرجى إدخال رقم الجوال لإرسال رمز التحقق.');
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    if (otpInput.trim() !== '1234') {
      setOtpError('رمز التحقق غير صحيح. استخدم الرمز التجريبي 1234 للمتابعة.');
      return;
    }

    setVerifyingIp(true);
    try {
      const res = await fetch('/api/legal/ip');
      const data = await res.json();
      onChange({
        ...declaration,
        otpVerified: true,
        signedAtIso: data.timestampIso || new Date().toISOString(),
        clientIp: data.ip || '127.0.0.1',
      });
    } catch {
      onChange({
        ...declaration,
        otpVerified: true,
        signedAtIso: new Date().toISOString(),
        clientIp: '127.0.0.1',
      });
    } finally {
      setVerifyingIp(false);
    }
  };

  const isComplete =
    declaration.acceptedTerms &&
    declaration.signatoryName.trim().length > 2 &&
    Boolean(declaration.signatureDataUrl) &&
    declaration.otpVerified;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-xl font-bold text-slate-900">
          المرحلة 2: الإقرار والتعهد النظامي
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {entity.entityName || 'المنشأة'} — السنة المالية{' '}
          <span className="font-mono-num">{entity.fiscalYearLabel}</span>. يقرّ
          الممثل النظامي بصحة البيانات ويوقّع إلكترونياً.
        </p>
      </div>

      {/* 6-Point Legal Declaration Box */}
      <div className="p-5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3 text-sm text-slate-700 leading-relaxed">
        <div className="font-bold text-slate-900">
          إقرار وتعهّد بصحة البيانات
        </div>
        <p className="text-xs font-semibold text-slate-800">
          أنا الموقع أدناه، بصفتي الممثل النظامي للمنشأة، أقرّ وأتعهّد بما يلي:
        </p>
        <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
          <li>
            أن جميع الأرقام والمعلومات التي أدخلتها في المنصة صحيحة وكاملة، ومستمدة من السجلات والمستندات الفعلية للمنشأة.
          </li>
          <li>
            أنني أتحمل المسؤولية الكاملة عن هذه البيانات أمام الجهات المختصة.
          </li>
          <li>
            أنني أعلم أن القوائم المالية تُعدّ آلياً بواسطة المنصة بناءً على ما أدخلته من بيانات، وأنها قوائم معدّة من قبل الإدارة وغير مراجعة، ولا تُعدّ مراجعة أو فحصاً مهنياً، ولا تُغني عن تعيين مراجع حسابات في الحالات التي يوجب فيها النظام ذلك.
          </li>
          <li>أنني مفوّض نظاماً بالتوقيع نيابةً عن المنشأة.</li>
          <li>
            أنني أوافق على أن توقيعي الإلكتروني هذا ملزم لي وللمنشأة، وله الحجية المقررة للتوقيع الخطي وفقاً لنظام التعاملات الإلكترونية في المملكة العربية السعودية.
          </li>
          <li>
            أن المنصة لا تتحمل أي مسؤولية عن الأخطاء أو النتائج المترتبة على بيانات غير صحيحة أو غير مكتملة أدخلتها.
          </li>
        </ol>

        <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={declaration.acceptedTerms}
            onChange={(e) =>
              onChange({ ...declaration, acceptedTerms: e.target.checked })
            }
            className="mt-1 w-4 h-4 accent-blue-700 rounded cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-900">
            أوافق على كافة البنود أعلاه وأتحمل المسؤولية النظامية عن صحة البيانات.
          </span>
        </label>
      </div>

      {/* Signatory Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            اسم الموقع (الممثل النظامي)
          </label>
          <input
            type="text"
            value={declaration.signatoryName}
            onChange={(e) =>
              onChange({ ...declaration, signatoryName: e.target.value })
            }
            placeholder="خالد بن محمد العتيبي"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            الصفة
          </label>
          <select
            value={declaration.signatoryRole}
            onChange={(e) =>
              onChange({ ...declaration, signatoryRole: e.target.value })
            }
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="مدير الشركة">مدير الشركة</option>
            <option value="المدير العام">المدير العام</option>
            <option value="الشريك المفوض">الشريك المفوض</option>
            <option value="رئيس مجلس المديرين">رئيس مجلس المديرين</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            رقم الهوية الوطنية / الإقامة
          </label>
          <input
            type="text"
            dir="ltr"
            maxLength={10}
            value={declaration.signatoryId}
            onChange={(e) =>
              onChange({
                ...declaration,
                signatoryId: e.target.value.replace(/\D/g, ''),
              })
            }
            placeholder="1088776655"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            رقم الجوال (لإرسال رمز التحقق OTP)
          </label>
          <input
            type="text"
            dir="ltr"
            maxLength={10}
            value={declaration.signatoryMobile}
            onChange={(e) =>
              onChange({
                ...declaration,
                signatoryMobile: e.target.value.replace(/\D/g, ''),
              })
            }
            placeholder="0551234567"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Signature Canvas & OTP Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileSignature className="w-4 h-4 text-slate-600" />
              <span>التوقيع الإلكتروني</span>
            </label>
            <button
              type="button"
              onClick={clearSignature}
              className="text-xs text-slate-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>إعادة التوقيع</span>
            </button>
          </div>
          <div className="border border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={520}
              height={170}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-44 touch-none cursor-crosshair bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            ارسم توقيعك المعتمد داخل المربع أعلاه.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-blue-700" />
              <span>توثيق الهوية برمز التحقق (OTP)</span>
            </div>
            {declaration.otpVerified && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم توقيع وتوثيق الإقرار</span>
              </span>
            )}
          </div>

          {!declaration.otpVerified ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSendOtp}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {otpSent
                  ? 'إعادة إرسال رمز التحقق للجوال'
                  : 'إرسال رمز التحقق (OTP) إلى الجوال'}
              </button>

              {otpSent && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs text-slate-600">
                    أدخل رمز التحقق المرسل (الرمز التجريبي:{' '}
                    <span className="font-mono-num font-bold text-slate-900">
                      1234
                    </span>
                    )
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="1234"
                      className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono-num text-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      disabled={verifyingIp}
                      onClick={handleVerifyOtp}
                      className="px-4 h-10 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      تحقق وتوثيق
                    </button>
                  </div>
                </div>
              )}

              {otpError && (
                <p className="text-xs font-medium text-red-600">{otpError}</p>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <div className="font-bold">تم توقيع الإقرار الإلكتروني بنجاح</div>
              <div className="text-slate-600 font-mono-num">
                التاريخ: {new Date(declaration.signedAtIso).toLocaleString('ar-SA')}
              </div>
              <div className="text-slate-600 font-mono-num">
                عنوان IP الموثق: {declaration.clientIp}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          السابق
        </button>
        <button
          type="button"
          disabled={!isComplete}
          onClick={onNext}
          className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          متابعة إلى رفع المستندات
        </button>
      </div>
    </div>
  );
};
