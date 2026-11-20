import * as XLSX from 'xlsx';
import type { TrialBalanceRow } from '../types/qawaem';
import { sarToHalalas } from './accounting';

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // strip Arabic diacritics
    .replace(/\s+/g, ' ');
}

function parseCellNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val
      .replace(/[،,٬\s]/g, '')
      .replace(/ر\.س|sar/gi, '')
      .trim();
    if (!cleaned || cleaned === '-') return 0;
    // Handle parentheses negative notation (1,200.00)
    const parenMatch = cleaned.match(/^\((.+)\)$/);
    if (parenMatch) {
      const n = Number(parenMatch[1]);
      return Number.isFinite(n) ? -n : 0;
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function parseTrialBalanceFile(
  file: File
): Promise<TrialBalanceRow[]> {
  const lowerName = file.name.toLowerCase();
  const isPdfOrImage =
    file.type === 'application/pdf' ||
    file.type.startsWith('image/') ||
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp');

  const buffer = await file.arrayBuffer();

  if (isPdfOrImage) {
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(
        'حجم ملف PDF يتجاوز الحد المسموح به (15 ميجابايت). يرجى ضغط الملف أو تقسيمه ثم المحاولة مرة أخرى.'
      );
    }

    const mimeType =
      file.type ||
      (lowerName.endsWith('.pdf')
        ? 'application/pdf'
        : lowerName.endsWith('.png')
          ? 'image/png'
          : lowerName.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg');

    const base64Data = arrayBufferToBase64(buffer);
    const res = await fetch('/api/ai/extract-trial-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mimeType,
        base64Data,
        fileName: file.name,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json()
      : {
          error:
            res.status === 413
              ? 'حجم ملف PDF كبير جداً للمعالجة. يرجى رفع ملف أصغر من 15 ميجابايت.'
              : `تعذر قراءة ملف PDF (رمز الخطأ ${res.status}).`,
        };

    if (!res.ok) {
      throw new Error(
        data.error || 'تعذر قراءة حسابات ميزان المراجعة من ملف PDF / الصورة.'
      );
    }

    const extracted = Array.isArray(data.rows) ? data.rows : [];
    const totalLinePattern =
      /^(الإجمالي|الاجمالي|المجموع|إجمالي\s*الميزان|مجموع\s*الميزان|total|grand\s*total|subtotal)$/i;

    const mapped: TrialBalanceRow[] = extracted
      .filter((r: { accountName?: string }) => {
        const name = String(r?.accountName || '').trim();
        return Boolean(name) && !totalLinePattern.test(normalizeHeader(name));
      })
      .map(
        (
          r: {
            accountCode?: string;
            accountName: string;
            openingBalanceSar?: number;
            debitSar?: number;
            creditSar?: number;
          },
          idx: number
        ) => {
          let rawDebit = Number(r.debitSar) || 0;
          let rawCredit = Number(r.creditSar) || 0;
          if (rawDebit < 0 && rawCredit === 0) {
            rawCredit = Math.abs(rawDebit);
            rawDebit = 0;
          } else if (rawCredit < 0 && rawDebit === 0) {
            rawDebit = Math.abs(rawCredit);
            rawCredit = 0;
          }
          const debitHalalas = sarToHalalas(Math.abs(rawDebit));
          const creditHalalas = sarToHalalas(Math.abs(rawCredit));
          const openingBalanceHalalas = sarToHalalas(
            Number(r.openingBalanceSar) || 0
          );
          return {
            id: `tb-pdf-${idx + 1}`,
            accountCode: String(r.accountCode || `${idx + 1}`).trim(),
            accountName: String(r.accountName).trim(),
            openingBalanceHalalas,
            debitHalalas,
            creditHalalas,
            endingNetHalalas: debitHalalas - creditHalalas,
          };
        }
      )
      .filter(
        (row: TrialBalanceRow) =>
          row.debitHalalas !== 0 ||
          row.creditHalalas !== 0 ||
          row.openingBalanceHalalas !== 0
      );

    if (mapped.length === 0) {
      throw new Error(
        'لم يتم العثور على صفوف حسابات واضحة في ملف PDF أو الصورة المرفوعة. تأكد من أن الملف يحتوي على جدول ميزان مراجعة مقروء.'
      );
    }

    return mapped;
  }

  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('الملف لا يحتوي على أي أوراق عمل قابلة للقراءة.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });

  if (rawMatrix.length < 2) {
    throw new Error('الملف فارغ أو لا يحتوي على صفوف حسابات كافية.');
  }

  // Locate header row within first 10 rows
  let headerRowIdx = 0;
  let colMap = {
    code: -1,
    name: -1,
    opening: -1,
    debit: -1,
    credit: -1,
    net: -1,
  };

  for (let r = 0; r < Math.min(10, rawMatrix.length); r += 1) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    const candidateMap = {
      code: -1,
      name: -1,
      opening: -1,
      debit: -1,
      credit: -1,
      net: -1,
    };

    row.forEach((cell, idx) => {
      const h = normalizeHeader(String(cell ?? ''));
      if (!h) return;
      if (
        candidateMap.code === -1 &&
        (h.includes('رقم الحساب') ||
          h.includes('رمز الحساب') ||
          h === 'الكود' ||
          h.includes('account code') ||
          h === 'code' ||
          h === 'account_code')
      ) {
        candidateMap.code = idx;
      } else if (
        candidateMap.name === -1 &&
        (h.includes('اسم الحساب') ||
          h.includes('الحساب') ||
          h.includes('البيان') ||
          h.includes('account name') ||
          h === 'name' ||
          h === 'account')
      ) {
        candidateMap.name = idx;
      } else if (
        candidateMap.opening === -1 &&
        (h.includes('اول المدة') ||
          h.includes('أول المدة') ||
          h.includes('رصيد افتتاحي') ||
          h.includes('opening'))
      ) {
        candidateMap.opening = idx;
      } else if (
        candidateMap.debit === -1 &&
        (h.includes('مدين') || h.includes('debit') || h === 'dr')
      ) {
        candidateMap.debit = idx;
      } else if (
        candidateMap.credit === -1 &&
        (h.includes('دائن') || h.includes('credit') || h === 'cr')
      ) {
        candidateMap.credit = idx;
      } else if (
        candidateMap.net === -1 &&
        (h.includes('صافي') ||
          h.includes('اخر المدة') ||
          h.includes('آخر المدة') ||
          h.includes('الرصيد') ||
          h.includes('net') ||
          h.includes('balance'))
      ) {
        candidateMap.net = idx;
      }
    });

    if (
      candidateMap.name !== -1 &&
      (candidateMap.debit !== -1 || candidateMap.net !== -1)
    ) {
      headerRowIdx = r;
      colMap = candidateMap;
      break;
    }
  }

  // Fallback positional heuristic if headers weren't recognized
  if (colMap.name === -1) {
    colMap = {
      code: 0,
      name: 1,
      opening: -1,
      debit: 2,
      credit: 3,
      net: -1,
    };
  }

  const parsedRows: TrialBalanceRow[] = [];

  for (let r = headerRowIdx + 1; r < rawMatrix.length; r += 1) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    const accountName = String(row[colMap.name] ?? '').trim();
    const accountCode =
      colMap.code !== -1 ? String(row[colMap.code] ?? '').trim() : `${r}`;

    if (!accountName) continue;
    const normalizedName = normalizeHeader(accountName);
    if (
      normalizedName === 'الإجمالي' ||
      normalizedName === 'الاجمالي' ||
      normalizedName === 'المجموع' ||
      normalizedName === 'total'
    ) {
      continue;
    }

    const openingSar =
      colMap.opening !== -1 ? parseCellNumber(row[colMap.opening]) : 0;
    let debitSar = colMap.debit !== -1 ? parseCellNumber(row[colMap.debit]) : 0;
    let creditSar =
      colMap.credit !== -1 ? parseCellNumber(row[colMap.credit]) : 0;

    if (colMap.debit === -1 && colMap.credit === -1 && colMap.net !== -1) {
      const netSar = parseCellNumber(row[colMap.net]);
      if (netSar >= 0) debitSar = netSar;
      else creditSar = Math.abs(netSar);
    }

    if (debitSar === 0 && creditSar === 0 && openingSar === 0) continue;

    const debitHalalas = sarToHalalas(debitSar);
    const creditHalalas = sarToHalalas(creditSar);
    const openingBalanceHalalas = sarToHalalas(openingSar);
    const endingNetHalalas =
      colMap.net !== -1 && colMap.debit === -1
        ? sarToHalalas(parseCellNumber(row[colMap.net]))
        : debitHalalas - creditHalalas;

    parsedRows.push({
      id: `tb-row-${r}`,
      accountCode: accountCode || `ACC-${r}`,
      accountName,
      openingBalanceHalalas,
      debitHalalas,
      creditHalalas,
      endingNetHalalas,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error(
      'لم يتم العثور على صفوف حسابات صالحة في الملف. تأكد من وجود أعمدة (اسم الحساب، مدين، دائن).'
    );
  }

  return parsedRows;
}

export function exportQawaemCsv(
  rows: Array<{
    xbrlCode: string;
    arabicLabel: string;
    englishLabel: string;
    sarFormatted: string;
  }>,
  filename: string
): void {
  const worksheetData = [
    ['رمز البند (XBRL)', 'البند في منصة قوائم', 'English Label', 'القيمة (ريال سعودي)'],
    ...rows.map((r) => [r.xbrlCode, r.arabicLabel, r.englishLabel, r.sarFormatted]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Qawaem_Export');
  XLSX.writeFile(wb, filename);
}

export function exportWithholdingTaxReportExcel(params: {
  entityName: string;
  crNumber: string;
  vatNumber: string;
  fiscalYearLabel: string;
  transactions: Array<{
    accountCode: string;
    vendorName: string;
    accountName: string;
    serviceCategoryLabel: string;
    baseSar: string;
    ratePercent: number;
    deductedWhtSar: string;
    netAfterWhtSar: string;
  }>;
  totalBaseSar: string;
  totalExpectedWhtSar: string;
  recordedWhtSar: string;
  varianceSar: string;
  filename: string;
}): void {
  const rows: (string | number)[][] = [
    ['تقرير ضريبة الاستقطاع للموردين الدوليين (ZATCA Withholding Tax Report)'],
    ['اسم المنشأة', params.entityName, 'السجل التجاري', params.crNumber],
    [
      'الرقم الضريبي',
      params.vatNumber || 'غير مسجل',
      'السنة المالية',
      params.fiscalYearLabel,
    ],
    [],
    [
      'رمز الحساب',
      'المورد الدولي / الجهة',
      'اسم الحساب في ميزان المراجعة',
      'فئة الخدمة والنسبة النظامية',
      'قيمة المعاملة (ر.س)',
      'نسبة الاستقطاع (%)',
      'المبلغ المقتطع تلقائياً (ر.س)',
      'الصافي بعد الاستقطاع (ر.س)',
    ],
    ...params.transactions.map((t) => [
      t.accountCode,
      t.vendorName,
      t.accountName,
      t.serviceCategoryLabel,
      t.baseSar,
      `${t.ratePercent}%`,
      t.deductedWhtSar,
      t.netAfterWhtSar,
    ]),
    [],
    ['ملخص المطابقة الضريبية', '', '', '', '', '', '', ''],
    ['إجمالي المعاملات الدولية الخاضعة', params.totalBaseSar],
    ['إجمالي المبالغ المقتطعة المفترضة نظامياً', params.totalExpectedWhtSar],
    ['رصيد ضريبة الاستقطاع المسجل بميزان المراجعة', params.recordedWhtSar],
    ['فارق المطابقة (المسجل - المفترض)', params.varianceSar],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WHT_Report');
  XLSX.writeFile(wb, params.filename);
}
