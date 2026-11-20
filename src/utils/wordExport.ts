import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx';
import type {
  ComputedStatements,
  EntityProfile,
  FinancialInputsHalalas,
  LegalDeclaration,
  WizardDetailedLines,
} from '../types/qawaem';
import {
  buildOfficialQawaemOutput,
  formatQawaemAmount,
} from './officialQawaemOutput';

function rtlParagraph(
  text: string,
  options?: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacingAfter?: number;
    spacingBefore?: number;
    center?: boolean;
    underline?: boolean;
    pageBreakBefore?: boolean;
  }
): Paragraph {
  return new Paragraph({
    bidirectional: true,
    pageBreakBefore: options?.pageBreakBefore ?? false,
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
    spacing: {
      before: options?.spacingBefore ?? 0,
      after: options?.spacingAfter ?? 100,
    },
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        size: options?.size ?? 22,
        color: options?.color ?? '0F172A',
        font: 'Cairo',
        rightToLeft: true,
        underline: options?.underline
          ? { type: UnderlineType.SINGLE }
          : undefined,
      }),
    ],
  });
}

function buildOfficialHeader(params: {
  entityName: string;
  legalForm: string;
  statementTitle: string;
  periodLine: string;
}): Paragraph[] {
  return [
    new Paragraph({
      bidirectional: true,
      pageBreakBefore: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: params.entityName,
          bold: true,
          size: 24,
          font: 'Cairo',
          rightToLeft: true,
        }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 100 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
      },
      children: [
        new TextRun({
          text: `(${params.legalForm})`,
          size: 20,
          font: 'Cairo',
          rightToLeft: true,
        }),
      ],
    }),
    rtlParagraph(params.statementTitle, {
      bold: true,
      size: 24,
      spacingBefore: 100,
      spacingAfter: 30,
    }),
    rtlParagraph(params.periodLine, {
      bold: true,
      size: 20,
      spacingAfter: 30,
    }),
    rtlParagraph('(ريال سعودي)', {
      size: 20,
      spacingAfter: 160,
    }),
  ];
}

interface DocxRowDef {
  label: string;
  amount?: number | null;
  note?: string;
  variant?: 'section' | 'subsection' | 'line' | 'subtotal' | 'total';
}

function buildOfficialAccountingTable(
  periodHeader: string,
  rows: DocxRowDef[],
  includeNoteCol = true
): Table {
  const headerCells = [
    new TableCell({
      width: { size: includeNoteCol ? 60 : 72, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      children: [rtlParagraph('', { spacingAfter: 40 })],
    }),
  ];

  if (includeNoteCol) {
    headerCells.push(
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [
          rtlParagraph('إيضاح', {
            bold: true,
            size: 20,
            center: true,
            spacingAfter: 40,
          }),
        ],
      })
    );
  }

  headerCells.push(
    new TableCell({
      width: { size: includeNoteCol ? 26 : 28, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      children: [
        rtlParagraph(periodHeader, {
          bold: true,
          size: 18,
          center: true,
          spacingAfter: 40,
        }),
      ],
    })
  );

  const bodyRows = rows.map((row) => {
    const isSection = row.variant === 'section';
    const isSubsection = row.variant === 'subsection';
    const isSubtotal = row.variant === 'subtotal';
    const isTotal = row.variant === 'total';
    const amountText =
      row.amount === null || row.amount === undefined
        ? ''
        : formatQawaemAmount(row.amount);

    const amountBorders = isTotal
      ? {
          top: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
          bottom: { style: BorderStyle.DOUBLE, size: 6, color: '0F172A' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        }
      : isSubtotal
        ? {
            top: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          }
        : {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          };

    const noBorders = {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    };

    const cells: TableCell[] = [
      new TableCell({
        width: { size: includeNoteCol ? 60 : 72, type: WidthType.PERCENTAGE },
        borders: noBorders,
        children: [
          rtlParagraph(row.label, {
            bold: isSection || isSubsection || isSubtotal || isTotal,
            underline: isSection,
            size: 20,
            spacingBefore: isSection ? 120 : isSubsection ? 60 : 0,
            spacingAfter: 40,
          }),
        ],
      }),
    ];

    if (includeNoteCol) {
      cells.push(
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: row.note || '',
                  size: 19,
                  font: 'Cairo',
                }),
              ],
            }),
          ],
        })
      );
    }

    cells.push(
      new TableCell({
        width: { size: includeNoteCol ? 26 : 28, type: WidthType.PERCENTAGE },
        borders: amountBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: amountText,
                bold: isSubtotal || isTotal,
                size: 20,
                font: 'Cairo',
              }),
            ],
          }),
        ],
      })
    );

    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: headerCells }), ...bodyRows],
  });
}

function buildEquityMatrixTable(params: {
  yearLabel: string;
  rows: Array<{
    label: string;
    capital: number;
    reserve: number;
    retained: number;
    total: number;
    isClosing?: boolean;
  }>;
}): Table {
  const headerBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };
  const noBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };
  const closingBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '0F172A' },
    bottom: { style: BorderStyle.DOUBLE, size: 6, color: '0F172A' },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };

  const headers = [
    { text: `${params.yearLabel}م`, width: 32, align: AlignmentType.RIGHT },
    { text: 'رأس المال', width: 16, align: AlignmentType.CENTER },
    { text: 'احتياطي نظامي', width: 16, align: AlignmentType.CENTER },
    {
      text: 'أرباح مبقاة (خسائر متراكمة)',
      width: 20,
      align: AlignmentType.CENTER,
    },
    { text: 'الإجمالي', width: 16, align: AlignmentType.CENTER },
  ];

  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: h.width, type: WidthType.PERCENTAGE },
          borders: headerBorders,
          children: [
            new Paragraph({
              bidirectional: true,
              alignment: h.align,
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: h.text,
                  bold: true,
                  size: 19,
                  font: 'Cairo',
                  rightToLeft: true,
                }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = params.rows.map(
    (r) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              rtlParagraph(r.label, {
                bold: Boolean(r.isClosing),
                size: 19,
                spacingBefore: 40,
                spacingAfter: 40,
              }),
            ],
          }),
          ...[r.capital, r.reserve, r.retained, r.total].map((val, i) => {
            const widths = [16, 16, 20, 16];
            return new TableCell({
              width: { size: widths[i], type: WidthType.PERCENTAGE },
              borders: r.isClosing ? closingBorders : noBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: formatQawaemAmount(val),
                      bold: Boolean(r.isClosing),
                      size: 19,
                      font: 'Cairo',
                    }),
                  ],
                }),
              ],
            });
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  });
}

export async function downloadFinancialStatementsDocx(params: {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  financials: FinancialInputsHalalas;
  detailedLines?: WizardDetailedLines;
  statements: ComputedStatements;
}): Promise<void> {
  const { entity, declaration, financials, detailedLines, statements } = params;
  const data = buildOfficialQawaemOutput(
    entity,
    financials,
    detailedLines,
    statements
  );
  const bs = data.balanceSheet;
  const inc = data.incomeStatement;
  const eq = data.equityStatement;
  const cf = data.cashFlowStatement;

  const signatoryName =
    declaration.signatoryName ||
    entity.legalRepresentative.split('—')[0]?.trim() ||
    'مدير الشركة';
  const signatoryRole = declaration.signatoryRole || 'مدير الشركة';
  const cleanShortName = data.entityName.replace(/^شركة\s+/, '').trim();

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // PAGE 1: Statutory Exemption Declaration (Article 19)
          rtlParagraph(
            'إقرار سنوي بعدم سريان متطلب تعيين مراجع حسابات للشركة متناهية الصغر أو صغيرة',
            {
              bold: true,
              underline: true,
              size: 26,
              center: true,
              spacingBefore: 120,
              spacingAfter: 240,
            }
          ),
          rtlParagraph(`شركة: ${cleanShortName}`, {
            bold: true,
            size: 22,
            spacingAfter: 80,
          }),
          rtlParagraph(
            `الرقم الموحد للسجل التجاري: ${data.unifiedCrNumber}`,
            {
              bold: true,
              size: 22,
              spacingAfter: 160,
            }
          ),
          rtlParagraph(
            `أقر أنا: ${signatoryRole}، بأن الشركة بنهاية العام المالي المنتهي في (${data.exemptionPeriodEndLabel}) هي شركة متناهية الصغر أو صغيرة وفقاً لنص المادة التاسعة عشرة من نظام الشركات والمادة السابعة من اللائحة التنفيذية للنظام.`,
            { size: 22, spacingAfter: 160 }
          ),
          rtlParagraph('وتكمن دفوعنا في:', {
            bold: true,
            size: 22,
            spacingAfter: 100,
          }),
          rtlParagraph(
            '1. عدم تجاوز مجموع إيراداتها السنوية مبلغ عشرة ملايين ريال سعودي.',
            { size: 22, spacingAfter: 80 }
          ),
          rtlParagraph(
            '2. عدم تجاوز أصولها مبلغ عشرة ملايين ريال سعودي.',
            { size: 22, spacingAfter: 80 }
          ),
          rtlParagraph(
            '3. عدم تجاوز مجموع عدد موظفيها تسعة وأربعين موظفاً.',
            { size: 22, spacingAfter: 160 }
          ),
          rtlParagraph(
            'عدم انطباق الاستثناءات الواردة في الفقرة من المادة التاسعة عشرة من نظام الشركات على الشركة.',
            { size: 22, spacingAfter: 120 }
          ),
          rtlParagraph(
            'وعدم تقدم أي شريك أو مساهم أو أكثر ممن يمثلون النسبة المقررة الواردة في نص الفقرة (3) من المادة التاسعة عشرة من نظام الشركات بطلب تعيين مراجع حسابات وفقاً للضوابط المنصوص عليها في المادة (الثامنة) من اللائحة التنفيذية لنظام الشركات.',
            { size: 22, spacingAfter: 160 }
          ),
          rtlParagraph(
            'وبناءً على ما سبق، لا يسري على الشركة متطلب تعيين مراجع حسابات للسنة المالية المذكورة أعلاه، وأتعهد بصحة البيانات والإقرارات الواردة أعلاه، وأتحمل كافة المسؤولية والتبعات النظامية حال ثبوت خلاف ذلك.',
            { size: 22, spacingAfter: 260 }
          ),
          rtlParagraph(`الاسم: ${signatoryName}`, {
            bold: true,
            size: 22,
            spacingAfter: 80,
          }),
          rtlParagraph(`الصفة: ${signatoryRole}`, {
            bold: true,
            size: 22,
            spacingAfter: 160,
          }),
          rtlParagraph('التوقيع: ________________________', {
            bold: true,
            size: 22,
            spacingAfter: 80,
          }),

          // PAGE 2: Balance Sheet
          ...buildOfficialHeader({
            entityName: data.entityName,
            legalForm: data.legalForm,
            statementTitle: 'قائمة المركز المالي',
            periodLine: data.asOfDateLabel,
          }),
          buildOfficialAccountingTable(data.periodColumnLabel, [
            { label: 'الموجودات', variant: 'section' },
            { label: 'الموجودات غير المتداولة', variant: 'subsection' },
            { label: 'ممتلكات وآلات ومعدات', amount: bs.propertyPlantEquipment },
            {
              label: 'موجودات غير ملموسة باستثناء الشهرة',
              amount: bs.intangibleAssets,
            },
            { label: 'العقارات الاستثمارية', amount: bs.investmentProperties },
            {
              label: 'الاستثمارات المحتسبة باستخدام طريقة حقوق الملكية',
              amount: bs.equityMethodInvestments,
            },
            {
              label: 'موجودات غير متداولة أخرى',
              amount: bs.otherNonCurrentAssets,
            },
            {
              label: 'إجمالي الموجودات غير المتداولة',
              amount: bs.totalNonCurrentAssets,
              variant: 'subtotal',
            },
            { label: 'الموجودات المتداولة', variant: 'subsection' },
            {
              label: 'مصاريف مدفوعة مقدماً وأرصدة مدينة أخرى',
              amount: bs.prepaidAndOtherDebitBalances,
            },
            { label: 'ذمم مدينة تجارية', amount: bs.tradeReceivables },
            { label: 'نقد وما في حكمه', amount: bs.cashAndCashEquivalents },
            { label: 'مخزون', amount: bs.inventory },
            {
              label: 'استثمارات القيمة العادلة من خلال الأرباح والخسائر',
              amount: bs.fvtplInvestments,
            },
            { label: 'أصول متداولة أخرى', amount: bs.otherCurrentAssets },
            {
              label: 'مطلوب من أطراف ذات علاقة',
              amount: bs.dueFromRelatedParties,
            },
            {
              label: 'إجمالي الموجودات المتداولة',
              amount: bs.totalCurrentAssets,
              variant: 'subtotal',
            },
            {
              label: 'إجمالي الموجودات',
              amount: bs.totalAssets,
              variant: 'total',
            },
            { label: 'حقوق الملكية والمطلوبات', variant: 'section' },
            { label: 'حقوق الملكية', variant: 'subsection' },
            { label: 'رأس المال', amount: bs.shareCapital },
            { label: 'احتياطي نظامي', amount: bs.statutoryReserve },
            {
              label: 'أرباح مبقاة (خسائر متراكمة)',
              amount: bs.retainedEarningsEnding,
            },
            { label: 'عناصر أخرى لحقوق الملكية', amount: bs.otherEquityItems },
            {
              label: 'حقوق الملكية المتعلقة بملاك الشركة الأم',
              amount: bs.equityAttributableToParent,
            },
            {
              label: 'حقوق الملكية غير المسيطرة',
              amount: bs.nonControllingInterest,
            },
            {
              label: 'إجمالي حقوق الملكية',
              amount: bs.totalEquity,
              variant: 'subtotal',
            },
            { label: 'المطلوبات غير المتداولة', variant: 'subsection' },
            {
              label: 'التزام منافع الموظفين',
              amount: bs.employeeBenefitsObligation,
            },
            {
              label: 'سندات دين وقروض لأجل وقروض وصكوك مصدرة، غير متداولة',
              amount: bs.nonCurrentLoansAndSukuk,
            },
            {
              label: 'مطلوبات ضريبية مؤجلة',
              amount: bs.deferredTaxLiabilities,
            },
            {
              label: 'مطلوبات غير متداولة أخرى',
              amount: bs.otherNonCurrentLiabilities,
            },
            {
              label: 'إجمالي المطلوبات غير المتداولة',
              amount: bs.totalNonCurrentLiabilities,
              variant: 'subtotal',
            },
            { label: 'المطلوبات المتداولة', variant: 'subsection' },
            {
              label: 'سندات دين وقروض لأجل وقروض وصكوك مصدرة، متداولة',
              amount: bs.currentLoansAndSukuk,
            },
            { label: 'الزكاة مستحقة الدفع', amount: bs.zakatPayable },
            { label: 'الضرائب مستحقة الدفع', amount: bs.taxesPayable },
            {
              label: 'مطلوب إلى أطراف ذات علاقة',
              amount: bs.dueToRelatedParties,
            },
            {
              label: 'المبالغ المستحقة للموردين والبائعين',
              amount: bs.tradePayables,
            },
            {
              label: 'مصاريف مستحقة وأرصدة دائنة أخرى',
              amount: bs.accruedAndOtherCreditBalances,
            },
            {
              label: 'مطلوبات متداولة أخرى',
              amount: bs.otherCurrentLiabilities,
            },
            {
              label: 'إجمالي المطلوبات المتداولة',
              amount: bs.totalCurrentLiabilities,
              variant: 'subtotal',
            },
            {
              label: 'إجمالي المطلوبات',
              amount: bs.totalLiabilities,
              variant: 'subtotal',
            },
            {
              label: 'إجمالي حقوق الملكية والمطلوبات',
              amount: bs.totalEquityAndLiabilities,
              variant: 'total',
            },
          ]),

          // PAGE 3: Comprehensive Income Statement
          ...buildOfficialHeader({
            entityName: data.entityName,
            legalForm: data.legalForm,
            statementTitle: 'قائمة الدخل الشامل',
            periodLine: data.periodSubtitleLabel,
          }),
          buildOfficialAccountingTable(data.periodColumnLabel, [
            { label: 'مبيعات/ الإيرادات', amount: inc.salesRevenue },
            {
              label: 'تكلفة المبيعات',
              amount: inc.costOfSales === 0 ? 0 : -Math.abs(inc.costOfSales),
            },
            { label: 'مجمل الربح', amount: inc.grossProfit, variant: 'subtotal' },
            {
              label: 'مصاريف إدارية وعمومية',
              amount:
                inc.generalAndAdminExpenses === 0
                  ? 0
                  : -Math.abs(inc.generalAndAdminExpenses),
            },
            {
              label: 'مصاريف بيع وتوزيع',
              amount:
                inc.sellingAndDistributionExpenses === 0
                  ? 0
                  : -Math.abs(inc.sellingAndDistributionExpenses),
            },
            {
              label: 'مصاريف أخرى',
              amount:
                inc.otherExpenses === 0 ? 0 : -Math.abs(inc.otherExpenses),
            },
            {
              label: 'الأرباح (الخسائر) من استبعاد الاستثمارات',
              amount: inc.gainLossOnDisposalOfInvestments,
            },
            {
              label: 'الأرباح (الخسائر) من استبعاد العقارات الاستثمارية',
              amount: inc.gainLossOnDisposalOfInvestmentProperties,
            },
            {
              label: 'حصة الشركة في ربح (خسارة) شركات زميلة',
              amount: inc.shareOfAssociatesProfitLoss,
            },
            { label: 'دخل آخر', amount: inc.otherIncome },
            {
              label: 'صافي ربح الفترة قبل ضريبة الدخل',
              amount: inc.profitBeforeTax,
              variant: 'subtotal',
            },
            {
              label: 'تكلفة مصروف التمويل',
              amount: inc.financeCost === 0 ? 0 : -Math.abs(inc.financeCost),
            },
            {
              label: 'الزكاة',
              amount: inc.zakatExpense === 0 ? 0 : -Math.abs(inc.zakatExpense),
            },
            {
              label: 'ضريبة الدخل',
              amount:
                inc.incomeTaxExpense === 0
                  ? 0
                  : -Math.abs(inc.incomeTaxExpense),
            },
            {
              label: 'صافي ربح الفترة',
              amount: inc.netProfitForPeriod,
              variant: 'subtotal',
            },
            {
              label: 'الربح (الخسارة)، المتعلقة بحقوق الملكية غير المسيطرة',
              amount: inc.profitNonControlling,
            },
            {
              label: 'الربح (الخسارة)، المتعلقة بمساهمي الشركة الأم',
              amount: inc.profitAttributableToParent,
              variant: 'subtotal',
            },
            {
              label: 'الدخل الشامل الآخر',
              amount: inc.otherComprehensiveIncome,
            },
            {
              label: 'إجمالي الربح الشامل للفترة',
              amount: inc.totalComprehensiveIncome,
              variant: 'total',
            },
          ]),

          // PAGE 4: Statement of Changes in Equity (5-Column Matrix)
          ...buildOfficialHeader({
            entityName: data.entityName,
            legalForm: data.legalForm,
            statementTitle: 'قائمة التغيرات في حقوق الملكية',
            periodLine: data.periodSubtitleLabel,
          }),
          buildEquityMatrixTable({
            yearLabel: data.fiscalYearLabel,
            rows: [
              {
                label: data.openingBalanceLabel,
                capital: eq.openingCapital,
                reserve: eq.openingStatutoryReserve,
                retained: eq.openingRetainedEarnings,
                total: eq.openingTotal,
              },
              ...(eq.paidInCapitalMovement !== 0
                ? [
                    {
                      label: 'رأس المال المدفوع',
                      capital: eq.paidInCapitalMovement,
                      reserve: 0,
                      retained: 0,
                      total: eq.paidInCapitalMovement,
                    },
                  ]
                : []),
              {
                label:
                  eq.netProfitMovement < 0
                    ? 'صافي خسارة الفترة'
                    : 'صافي ربح الفترة',
                capital: 0,
                reserve: 0,
                retained: eq.netProfitMovement,
                total: eq.netProfitMovement,
              },
              ...(eq.dividendsMovement !== 0
                ? [
                    {
                      label: 'توزيعات الأرباح',
                      capital: 0,
                      reserve: 0,
                      retained: eq.dividendsMovement,
                      total: eq.dividendsMovement,
                    },
                  ]
                : []),
              {
                label: 'الدخل الشامل الآخر',
                capital: 0,
                reserve: 0,
                retained: 0,
                total: eq.otherComprehensiveIncome,
              },
              {
                label: data.closingBalanceDateLabel,
                capital: eq.closingCapital,
                reserve: eq.closingStatutoryReserve,
                retained: eq.closingRetainedEarnings,
                total: eq.closingTotal,
                isClosing: true,
              },
            ],
          }),

          // PAGE 5: Cash Flow Statement
          ...buildOfficialHeader({
            entityName: data.entityName,
            legalForm: data.legalForm,
            statementTitle: 'قائمة التدفقات النقدية',
            periodLine: data.periodSubtitleLabel,
          }),
          buildOfficialAccountingTable(
            data.periodColumnLabel,
            [
              { label: 'الأنشطة التشغيلية', variant: 'section' },
              {
                label: 'صافي ربح الفترة قبل ضريبة الدخل',
                amount: cf.profitBeforeTax,
              },
              {
                label: 'التعديلات لتسوية البنود غير النقدية :',
                variant: 'subsection',
              },
              {
                label: 'استهلاك ممتلكات وآلات ومعدات',
                amount: cf.depreciationAdjustment,
              },
              {
                label: 'المكون من مخصص التزامات منافع الموظفين',
                amount: cf.employeeBenefitsProvision,
              },
              {
                label: '',
                amount: cf.operatingBeforeWorkingCapital,
                variant: 'subtotal',
              },
              {
                label: 'التغير في الموجودات والمطلوبات التشغيلية :',
                variant: 'subsection',
              },
              {
                label: 'مصاريف مدفوعة مقدماً وأرصدة مدينة أخرى',
                amount: cf.changeInPrepaidAndOtherDebit,
              },
              {
                label: 'ذمم مدينة تجارية',
                amount: cf.changeInTradeReceivables,
              },
              ...(cf.changeInInventory !== 0
                ? [{ label: 'المخزون', amount: cf.changeInInventory }]
                : []),
              {
                label: 'مصاريف مستحقة وأرصدة دائنة أخرى',
                amount: cf.changeInAccruedAndPayables,
              },
              {
                label: 'صافي النقد الناتج من الأنشطة التشغيلية',
                amount: cf.netCashFromOperating,
                variant: 'subtotal',
              },
              { label: 'الأنشطة الاستثمارية', variant: 'section' },
              {
                label: 'إضافة ممتلكات وآلات ومعدات',
                amount: cf.additionsToPpe,
              },
              {
                label: 'صافي النقد المستخدم في الأنشطة الاستثمارية',
                amount: cf.netCashFromInvesting,
                variant: 'subtotal',
              },
              { label: 'الأنشطة التمويلية', variant: 'section' },
              {
                label: 'إضافة رأس المال',
                amount: cf.capitalContribution,
              },
              {
                label: 'مطلوب إلى أطراف ذات علاقة',
                amount: cf.netRelatedPartyFinancing,
              },
              ...(cf.loansFinancing !== 0
                ? [{ label: 'قروض وتسهيلات تمويلية', amount: cf.loansFinancing }]
                : []),
              {
                label: 'صافي النقد الناتج من الأنشطة التمويلية',
                amount: cf.netCashFromFinancing,
                variant: 'subtotal',
              },
              {
                label: 'صافي التغير في النقد وما في حكمه',
                amount: cf.netChangeInCash,
              },
              {
                label: 'النقد وما في حكمه في بداية الفترة',
                amount: cf.beginningCash,
              },
              {
                label: 'النقد وما في حكمه في نهاية الفترة',
                amount: cf.endingCash,
                variant: 'total',
              },
            ],
            false
          ),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Qawaem_SOCPA_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
