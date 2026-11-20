import type {
  AlternativeMappingSuggestion,
  MappedAccountRow,
  QawaemFieldId,
  TrialBalanceRow,
} from '../types/qawaem';
import { TAXONOMY_BY_ID, sarToHalalas } from './accounting';

export function normalizeAccountText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[_\-/\\().,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface PriorityRule {
  fieldId: QawaemFieldId;
  priorityWeight: number; // higher = higher priority for common Saudi financial accounts
  coaPrefixes: string[];
  keywords: string[];
  reasonTemplate: string;
}

/**
 * Ordered by priority of common Saudi SME financial accounts in Qawaem submissions.
 */
const PRIORITY_ACCOUNT_RULES: PriorityRule[] = [
  {
    fieldId: 'cash_and_equivalents',
    priorityWeight: 100,
    coaPrefixes: ['1101', '111', '101'],
    keywords: [
      'نقديه',
      'نقد',
      'الصندوق',
      'صندوق',
      'بنك',
      'مصرف',
      'الراجحي',
      'الاهلي',
      'الإنماء',
      'الانماء',
      'البلاد',
      'الرياض',
      'ساب',
      'العربي',
      'الفرنسي',
      'العهد النقديه',
      'cash',
      'bank',
      'petty cash',
    ],
    reasonTemplate: 'حساب شائع: نقدية وأرصدة بنكية (أولوية مطابقة عالية)',
  },
  {
    fieldId: 'operating_revenue',
    priorityWeight: 98,
    coaPrefixes: ['41', '40'],
    keywords: [
      'مبيعات',
      'ايرادات النشاط',
      'ايرادات المبيعات',
      'ايراد مبيعات',
      'ايرادات الخدمات',
      'ايراد الخدمات',
      'المبيعات',
      'sales',
      'revenue',
      'operating revenue',
    ],
    reasonTemplate: 'حساب شائع: إيرادات النشاط الرئيسي / المبيعات',
  },
  {
    fieldId: 'cost_of_revenue',
    priorityWeight: 96,
    coaPrefixes: ['51', '50'],
    keywords: [
      'تكلفه المبيعات',
      'تكلفه البضاعه',
      'تكلفه الايرادات',
      'مشتريات',
      'المشتريات',
      'تكاليف مباشره',
      'cost of goods',
      'cost of sales',
      'cogs',
      'purchases',
    ],
    reasonTemplate: 'حساب شائع: تكلفة الإيرادات والمبيعات',
  },
  {
    fieldId: 'accounts_receivable',
    priorityWeight: 95,
    coaPrefixes: ['1102', '112', '102'],
    keywords: [
      'عملاء',
      'العملاء',
      'ذمم مدينه',
      'الذمم المدينه',
      'مدينون',
      'حسابات القبض',
      'receivable',
      'accounts receivable',
      'customers',
    ],
    reasonTemplate: 'حساب شائع: ذمم مدينة تجارية (العملاء)',
  },
  {
    fieldId: 'accounts_payable',
    priorityWeight: 94,
    coaPrefixes: ['2101', '211', '201'],
    keywords: [
      'موردين',
      'موردون',
      'الموردين',
      'ذمم دائنه',
      'الذمم الدائنه',
      'دائنون',
      'حسابات الدفع',
      'payable',
      'accounts payable',
      'suppliers',
      'vendors',
    ],
    reasonTemplate: 'حساب شائع: ذمم دائنة تجارية (الموردون)',
  },
  {
    fieldId: 'inventory',
    priorityWeight: 92,
    coaPrefixes: ['1103', '113', '103'],
    keywords: [
      'مخزون',
      'المخزون',
      'بضاعه',
      'مستودع',
      'inventory',
      'inventories',
      'stock',
    ],
    reasonTemplate: 'حساب شائع: المخزون السلعي',
  },
  {
    fieldId: 'salaries_and_wages',
    priorityWeight: 91,
    coaPrefixes: ['5201', '521', '5301'],
    keywords: [
      'رواتب',
      'اجور',
      'الرواتب',
      'مرتبات',
      'تامينات اجتماعيه',
      'gosi',
      'بدلات',
      'تذاكر',
      'اقامات',
      'salaries',
      'wages',
      'payroll',
    ],
    reasonTemplate: 'حساب شائع: رواتب وأجور ومنافع الموظفين',
  },
  {
    fieldId: 'accrued_and_vat_liabilities',
    priorityWeight: 90,
    coaPrefixes: ['2102', '212', '202'],
    keywords: [
      'ضريبه القيمه المضافه',
      'القيمه المضافه',
      'هيئه الزكاه والضريبه',
      'ضريبه مخرجات',
      'مصروفات مستحقه',
      'رواتب مستحقه',
      'مستحقات',
      'vat payable',
      'output vat',
      'accrued',
    ],
    reasonTemplate: 'حساب شائع: ضريبة القيمة المضافة والمصروفات المستحقة',
  },
  {
    fieldId: 'paid_up_capital',
    priorityWeight: 90,
    coaPrefixes: ['3101', '301', '31'],
    keywords: ['راس المال', 'راسمال', 'capital', 'paid up capital', 'share capital'],
    reasonTemplate: 'حساب شائع: رأس المال المدفوع',
  },
  {
    fieldId: 'property_plant_equipment',
    priorityWeight: 88,
    coaPrefixes: ['1201', '121', '15'],
    keywords: [
      'اثاث',
      'معدات',
      'سيارات',
      'مركبات',
      'اجهزه',
      'ممتلكات',
      'مباني',
      'اراضي',
      'اصول ثابته',
      'مجمع اهلاك',
      'ppe',
      'equipment',
      'furniture',
      'vehicles',
      'fixed assets',
    ],
    reasonTemplate: 'حساب شائع: ممتلكات وآلات ومعدات (أصول ثابتة)',
  },
  {
    fieldId: 'rent_expense',
    priorityWeight: 86,
    coaPrefixes: ['5202', '522'],
    keywords: ['ايجار', 'ايجارات', 'الايجار', 'rent', 'lease expense'],
    reasonTemplate: 'حساب شائع: مصروفات الإيجار',
  },
  {
    fieldId: 'zakat_payable',
    priorityWeight: 85,
    coaPrefixes: ['2103', '213'],
    keywords: ['مخصص الزكاه', 'زكاه مستحقه', 'الزكاه المستحقه', 'zakat payable'],
    reasonTemplate: 'حساب شائع: مخصص الزكاة المستحق',
  },
  {
    fieldId: 'zakat_expense',
    priorityWeight: 85,
    coaPrefixes: ['5401', '54', '59'],
    keywords: ['مصروف الزكاه', 'زكاه شرعيه', 'الزكاه للسنه', 'zakat expense'],
    reasonTemplate: 'حساب شائع: مصروف الزكاة الشرعية للسنة',
  },
  {
    fieldId: 'end_of_service_benefits',
    priorityWeight: 84,
    coaPrefixes: ['2202', '222'],
    keywords: [
      'نهايه الخدمه',
      'مكافاه نهايه',
      'منافع الموظفين',
      'eosb',
      'end of service',
    ],
    reasonTemplate: 'حساب شائع: مخصص مكافأة نهاية الخدمة',
  },
  {
    fieldId: 'retained_earnings_beginning',
    priorityWeight: 83,
    coaPrefixes: ['3103', '303', '33'],
    keywords: [
      'ارباح مبقاه',
      'الارباح المبقاه',
      'خسائر متراكمه',
      'ارباح مرحله',
      'retained earnings',
    ],
    reasonTemplate: 'حساب شائع: الأرباح المبقاة (المرحّلة)',
  },
  {
    fieldId: 'partners_current_account_net',
    priorityWeight: 82,
    coaPrefixes: ['3104', '304', '1105'],
    keywords: [
      'جاري الشركاء',
      'جاري المالك',
      'مسحوبات الشركاء',
      'تمويل الشركاء',
      'partner current',
      'shareholder current',
    ],
    reasonTemplate: 'حساب شائع: جاري الشركاء / المالك',
  },
  {
    fieldId: 'statutory_reserve',
    priorityWeight: 80,
    coaPrefixes: ['3102', '302'],
    keywords: ['احتياطي نظامي', 'الاحتياطي النظامي', 'statutory reserve'],
    reasonTemplate: 'حساب شائع: الاحتياطي النظامي',
  },
  {
    fieldId: 'dividends_declared',
    priorityWeight: 79,
    coaPrefixes: ['3105', '305'],
    keywords: ['توزيعات ارباح', 'ارباح موزعه', 'dividends'],
    reasonTemplate: 'حساب شائع: أرباح موزعة خلال السنة',
  },
  {
    fieldId: 'prepaid_and_other_current_assets',
    priorityWeight: 78,
    coaPrefixes: ['1104', '114'],
    keywords: [
      'مدفوعه مقدما',
      'مدفوع مقدما',
      'تامين طبي',
      'عهد',
      'سلف',
      'ضريبه مدخلات',
      'ارصده مدينه',
      'prepaid',
      'input vat',
      'advances',
    ],
    reasonTemplate: 'مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى',
  },
  {
    fieldId: 'depreciation_expense',
    priorityWeight: 78,
    coaPrefixes: ['5204', '524'],
    keywords: ['مصروف اهلاك', 'اهلاك', 'اطفاء', 'depreciation', 'amortization'],
    reasonTemplate: 'مصروف الإهلاك والإطفاء',
  },
  {
    fieldId: 'general_admin_expenses',
    priorityWeight: 76,
    coaPrefixes: ['5203', '523', '52'],
    keywords: [
      'عموميه',
      'اداريه',
      'تسويق',
      'دعايه',
      'كهرباء',
      'اتصالات',
      'انترنت',
      'صيانه',
      'قرطاسيه',
      'رسوم حكوميه',
      'استشارات',
      'g&a',
      'admin',
      'marketing',
      'utilities',
    ],
    reasonTemplate: 'مصروفات عمومية وإدارية وتسويقية',
  },
  {
    fieldId: 'finance_costs',
    priorityWeight: 75,
    coaPrefixes: ['5301', '53'],
    keywords: [
      'تمويل',
      'عمولات بنكيه',
      'فوائد بنكيه',
      'مرابحه',
      'bank charges',
      'finance cost',
      'interest expense',
    ],
    reasonTemplate: 'تكاليف التمويل والعمولات البنكية',
  },
  {
    fieldId: 'short_term_loans',
    priorityWeight: 74,
    coaPrefixes: ['2104', '214'],
    keywords: [
      'قروض قصيره',
      'تسهيلات قصيره',
      'مرابحه قصير',
      'سحب على المكشوف',
      'short term loan',
    ],
    reasonTemplate: 'قروض وتسهيلات قصيرة الأجل',
  },
  {
    fieldId: 'long_term_loans',
    priorityWeight: 74,
    coaPrefixes: ['2201', '221'],
    keywords: ['قرض تمويلي', 'قروض طويله', 'تمويل طويل', 'long term loan'],
    reasonTemplate: 'قروض طويلة الأجل',
  },
  {
    fieldId: 'intangible_assets',
    priorityWeight: 72,
    coaPrefixes: ['1202', '122'],
    keywords: [
      'برمجيات',
      'برامج',
      'تراخيص',
      'علامه تجاريه',
      'شهره',
      'حق استخدام',
      'intangible',
      'software',
      'license',
    ],
    reasonTemplate: 'أصول غير ملموسة وحق الاستخدام',
  },
  {
    fieldId: 'other_revenue',
    priorityWeight: 70,
    coaPrefixes: ['42', '49'],
    keywords: [
      'ايرادات اخرى',
      'ايرادات متنوعه',
      'ايرادات عرضيه',
      'فوائد دائنه',
      'other income',
      'other revenue',
    ],
    reasonTemplate: 'إيرادات أخرى غير أساسية',
  },
];

function scoreRuleForRow(row: TrialBalanceRow, rule: PriorityRule): number {
  const normName = normalizeAccountText(row.accountName);
  const cleanCode = row.accountCode.replace(/\s+/g, '');
  let score = 0;

  // Keyword hits (weighted heavily)
  let keywordHits = 0;
  for (const kw of rule.keywords) {
    const normKw = normalizeAccountText(kw);
    if (normName.includes(normKw)) {
      keywordHits += 1;
      // Exact or strong phrase bonus
      score += normKw.length >= 6 ? 45 : 30;
    }
  }

  // COA prefix match
  let prefixMatched = false;
  for (const prefix of rule.coaPrefixes) {
    if (cleanCode.startsWith(prefix)) {
      prefixMatched = true;
      score += prefix.length >= 4 ? 32 : 18;
      break;
    }
  }

  // Only apply priority bonus if at least one lexical or prefix clue matched
  if (keywordHits > 0 || prefixMatched) {
    score += Math.round(rule.priorityWeight * 0.15);
  }

  // Polarity sanity bonus/penalty (debit > 0 vs credit < 0)
  const taxonomy = TAXONOMY_BY_ID[rule.fieldId];
  if (row.endingNetHalalas !== 0) {
    const isDebitNet = row.endingNetHalalas > 0;
    if (
      (taxonomy.normalBalance === 'debit' && isDebitNet) ||
      (taxonomy.normalBalance === 'credit' && !isDebitNet)
    ) {
      score += 8;
    } else if (keywordHits === 0) {
      score -= 10;
    }
  }

  return score;
}

export function buildFallbackAlternatives(
  row: TrialBalanceRow,
  excludeFieldId?: QawaemFieldId | 'unmapped'
): AlternativeMappingSuggestion[] {
  const scored = PRIORITY_ACCOUNT_RULES.map((rule) => ({
    fieldId: rule.fieldId,
    score: scoreRuleForRow(row, rule),
    reason: rule.reasonTemplate,
  }))
    .filter((item) => item.fieldId !== excludeFieldId)
    .sort((a, b) => b.score - a.score);

  const positive = scored.filter((s) => s.score > 10).slice(0, 3);
  if (positive.length > 0) {
    return positive.map((p) => ({ fieldId: p.fieldId, reason: p.reason }));
  }

  // Pure COA digit & polarity fallback when name is completely ambiguous
  const firstDigit = row.accountCode.trim()[0];
  const isDebitNet = row.endingNetHalalas >= 0;

  let candidates: QawaemFieldId[] = [];
  if (firstDigit === '1') {
    candidates = [
      'prepaid_and_other_current_assets',
      'cash_and_equivalents',
      'property_plant_equipment',
    ];
  } else if (firstDigit === '2') {
    candidates = [
      'accrued_and_vat_liabilities',
      'accounts_payable',
      'short_term_loans',
    ];
  } else if (firstDigit === '3') {
    candidates = [
      'partners_current_account_net',
      'retained_earnings_beginning',
      'paid_up_capital',
    ];
  } else if (firstDigit === '4') {
    candidates = ['operating_revenue', 'other_revenue'];
  } else if (firstDigit === '5') {
    candidates = [
      'general_admin_expenses',
      'cost_of_revenue',
      'salaries_and_wages',
    ];
  } else if (isDebitNet) {
    candidates = [
      'general_admin_expenses',
      'prepaid_and_other_current_assets',
      'accounts_receivable',
    ];
  } else {
    candidates = [
      'accrued_and_vat_liabilities',
      'other_revenue',
      'accounts_payable',
    ];
  }

  return candidates
    .filter((id) => id !== excludeFieldId)
    .slice(0, 3)
    .map((fieldId) => ({
      fieldId,
      reason: `بديل مقترح بناءً على طبيعة الرصيد (${isDebitNet ? 'مدين' : 'دائن'})${firstDigit ? ` ورمز الحساب (${firstDigit}xxx)` : ''}`,
    }));
}

/**
 * Runs deterministic priority mapping for common Saudi financial accounts.
 * Returns mapped items + unmapped items with ranked alternative suggestions.
 */
export function mapTrialBalanceWithPriorityEngine(
  rows: TrialBalanceRow[],
  savedMappings?: Record<string, QawaemFieldId>
): MappedAccountRow[] {
  return rows.map((row) => {
    const normalizedKey = normalizeAccountText(row.accountName);
    const rememberedField =
      savedMappings?.[normalizedKey] ||
      savedMappings?.[row.accountName.trim().toLowerCase()];

    if (rememberedField && TAXONOMY_BY_ID[rememberedField]) {
      return {
        ...row,
        mappedFieldId: rememberedField,
        confidence: 'high',
        matchSource: 'priority_rule',
        aiReason:
          'تم الربط تلقائياً من ذاكرة الشركة المحفوظة (tb_mappings) من موازنة سابقة',
        alternatives: buildFallbackAlternatives(row, rememberedField),
        manualOverride: false,
      };
    }

    const scored = PRIORITY_ACCOUNT_RULES.map((rule) => ({
      rule,
      score: scoreRuleForRow(row, rule),
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score > 12)
      .map((s) => ({
        fieldId: s.rule.fieldId,
        reason: s.rule.reasonTemplate,
      }));

    if (best && best.score >= 42) {
      return {
        ...row,
        mappedFieldId: best.rule.fieldId,
        confidence: best.score >= 60 ? 'high' : 'medium',
        matchSource: 'priority_rule',
        aiReason: best.rule.reasonTemplate,
        alternatives:
          alternatives.length > 0
            ? alternatives
            : buildFallbackAlternatives(row, best.rule.fieldId),
        manualOverride: false,
      };
    }

    return {
      ...row,
      mappedFieldId: 'unmapped',
      confidence: 'low',
      matchSource: 'unmapped',
      aiReason:
        'لم يتطابق تلقائياً بثقة كافية مع الحسابات الشائعة؛ اختر من البدائل المقترحة أو شغّل التصنيف الذكي.',
      alternatives: buildFallbackAlternatives(row, 'unmapped'),
      manualOverride: false,
    };
  });
}

/**
 * Parses a pasted list of account names (optionally with code, debit, credit separated by tabs/commas).
 */
export function parseRawAccountNamesToRows(rawText: string): TrialBalanceRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split(/[\t,;]+/).map((p) => p.trim());
    if (parts.length >= 3) {
      const code = parts[0];
      const name = parts[1];
      const debit = sarToHalalas(parts[2] || '0');
      const credit = sarToHalalas(parts[3] || '0');
      return {
        id: `paste-${Date.now()}-${index}`,
        accountCode: code || `${1000 + index}`,
        accountName: name || line,
        openingBalanceHalalas: 0,
        debitHalalas: debit,
        creditHalalas: credit,
        endingNetHalalas: debit - credit,
      };
    }

    if (parts.length === 2 && /^\d+$/.test(parts[0])) {
      return {
        id: `paste-${Date.now()}-${index}`,
        accountCode: parts[0],
        accountName: parts[1],
        openingBalanceHalalas: 0,
        debitHalalas: 0,
        creditHalalas: 0,
        endingNetHalalas: 0,
      };
    }

    return {
      id: `paste-${Date.now()}-${index}`,
      accountCode: `ACC-${index + 1}`,
      accountName: line,
      openingBalanceHalalas: 0,
      debitHalalas: 0,
      creditHalalas: 0,
      endingNetHalalas: 0,
    };
  });
}
