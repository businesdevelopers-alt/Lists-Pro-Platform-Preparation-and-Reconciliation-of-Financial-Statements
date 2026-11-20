import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  ComputedStatements,
  EntityProfile,
  LegalDeclaration,
} from '../types/qawaem';
import { formatNumber, getAuditorExemptionInfo } from './accounting';

function rtlParagraph(
  text: string,
  options?: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacingAfter?: number;
    spacingBefore?: number;
    center?: boolean;
  }
): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
    spacing: {
      before: options?.spacingBefore ?? 0,
      after: options?.spacingAfter ?? 120,
    },
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        size: options?.size ?? 22, // half-points (22 = 11pt)
        color: options?.color ?? '0F172A',
        font: 'Cairo',
        rightToLeft: true,
      }),
    ],
  });
}

function buildStatementTable(
  rows: Array<{ label: string; amount: string; highlight?: boolean }>
): Table {
  const tableRows = rows.map(
    (r) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: r.highlight ? { fill: 'F1F5F9' } : undefined,
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: r.label,
                    bold: Boolean(r.highlight),
                    size: 20,
                    font: 'Cairo',
                    rightToLeft: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: r.highlight ? { fill: 'F1F5F9' } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: `${r.amount} ر.س`,
                    bold: Boolean(r.highlight),
                    size: 20,
                    font: 'Cairo',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    rows: tableRows,
  });
}

export async function downloadFinancialStatementsDocx(params: {
  entity: EntityProfile;
  declaration: LegalDeclaration;
  statements: ComputedStatements;
}): Promise<void> {
  const { entity, declaration, statements } = params;
  const exemption = getAuditorExemptionInfo(entity.classification);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          rtlParagraph('القوائم المالية السنوية (SOCPA - IFRS for SMEs)', {
            bold: true,
            size: 28,
            color: '1D4ED8',
            center: true,
            spacingAfter: 100,
          }),
          rtlParagraph(entity.entityName, {
            bold: true,
            size: 32,
            center: true,
            spacingAfter: 80,
          }),
          rtlParagraph(
            `${entity.legalForm} · سجل تجاري رقم: ${entity.crNumber} · ${entity.city}`,
            { size: 20, color: '475569', center: true, spacingAfter: 80 }
          ),
          rtlParagraph(
            `للفترة المالية: ${entity.fiscalPeriodRange} (${entity.fiscalYearLabel}) — بالريال السعودي`,
            { size: 20, color: '475569', center: true, spacingAfter: 240 }
          ),

          rtlParagraph(
            'تنبيه نظامي هام: هذه القوائم المالية معدّة من قِبل الإدارة استناداً إلى السجلات والبيانات المدخلة من المنشأة، وهي غير مراجعة من مراجع حسابات قانوني خارجي وتقع مسؤولية صحتها على الإدارة وفق نظام الشركات السعودي.',
            { bold: true, size: 20, color: '92400E', spacingAfter: 240 }
          ),

          rtlParagraph(`الوضع النظامي للمراجعة: ${exemption.label}`, {
            bold: true,
            size: 20,
            spacingAfter: 160,
          }),

          // 1. Balance Sheet
          rtlParagraph('1. قائمة المركز المالي', {
            bold: true,
            size: 26,
            color: '0F172A',
            spacingBefore: 180,
            spacingAfter: 120,
          }),
          buildStatementTable([
            {
              label: 'النقدية بالصندوق ولدى البنوك',
              amount: formatNumber(statements.cashAndEquivalents),
            },
            {
              label: 'الذمم المدينة التجارية بالصافي',
              amount: formatNumber(statements.accountsReceivable),
            },
            {
              label: 'المخزون السلعي',
              amount: formatNumber(statements.inventory),
            },
            {
              label: 'مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى',
              amount: formatNumber(statements.prepaidAndOtherCurrentAssets),
            },
            {
              label: 'مجموع الأصول المتداولة',
              amount: formatNumber(statements.totalCurrentAssets),
              highlight: true,
            },
            {
              label: 'الممتلكات والآلات والمعدات بالصافي',
              amount: formatNumber(statements.propertyPlantEquipment),
            },
            {
              label: 'الأصول غير الملموسة وحق الاستخدام',
              amount: formatNumber(statements.intangibleAssets),
            },
            {
              label: 'إجمالي الأصول',
              amount: formatNumber(statements.totalAssets),
              highlight: true,
            },
            {
              label: 'الذمم الدائنة التجارية',
              amount: formatNumber(statements.accountsPayable),
            },
            {
              label: 'مصروفات مستحقة وضريبة قيمة مضافة',
              amount: formatNumber(statements.accruedAndVatLiabilities),
            },
            {
              label: 'مخصص الزكاة المستحق',
              amount: formatNumber(statements.zakatPayable),
            },
            {
              label: 'قروض قصيرة وطويلة الأجل',
              amount: formatNumber(
                statements.shortTermLoans + statements.longTermLoans
              ),
            },
            {
              label: 'مخصص مكافأة نهاية الخدمة',
              amount: formatNumber(statements.endOfServiceBenefits),
            },
            {
              label: 'مجموع الالتزامات',
              amount: formatNumber(statements.totalLiabilities),
              highlight: true,
            },
            {
              label: 'مجموع حقوق الملكية',
              amount: formatNumber(statements.totalEquity),
              highlight: true,
            },
            {
              label: 'إجمالي الالتزامات وحقوق الملكية',
              amount: formatNumber(statements.totalLiabilitiesAndEquity),
              highlight: true,
            },
          ]),

          // 2. Income Statement
          rtlParagraph('2. قائمة الدخل', {
            bold: true,
            size: 26,
            color: '0F172A',
            spacingBefore: 260,
            spacingAfter: 120,
          }),
          buildStatementTable([
            {
              label: 'إيرادات النشاط الرئيسي',
              amount: formatNumber(statements.operatingRevenue),
            },
            {
              label: 'تكلفة الإيرادات',
              amount: `(${formatNumber(statements.costOfRevenue)})`,
            },
            {
              label: 'مجمل الربح',
              amount: formatNumber(statements.grossProfit),
              highlight: true,
            },
            {
              label: 'إيرادات تشغيلية أخرى',
              amount: formatNumber(statements.otherRevenue),
            },
            {
              label: 'الرواتب والأجور ومنافع الموظفين',
              amount: `(${formatNumber(statements.salariesAndWages)})`,
            },
            {
              label: 'مصروفات الإيجار',
              amount: `(${formatNumber(statements.rentExpense)})`,
            },
            {
              label: 'مصروفات عمومية وإدارية وتسويقية',
              amount: `(${formatNumber(statements.generalAdminExpenses)})`,
            },
            {
              label: 'مصروف الإهلاك والإطفاء',
              amount: `(${formatNumber(statements.depreciationExpense)})`,
            },
            {
              label: 'تكاليف التمويل',
              amount: `(${formatNumber(statements.financeCosts)})`,
            },
            {
              label: 'مخصص الزكاة الشرعية للسنة',
              amount: `(${formatNumber(statements.zakatExpense)})`,
            },
            {
              label: 'صافي الربح / (الخسارة) للسنة',
              amount: formatNumber(statements.netProfit),
              highlight: true,
            },
          ]),

          // 3. Equity Statement
          rtlParagraph('3. قائمة التغيرات في حقوق الملكية', {
            bold: true,
            size: 26,
            color: '0F172A',
            spacingBefore: 260,
            spacingAfter: 120,
          }),
          buildStatementTable([
            {
              label: 'رأس المال المدفوع',
              amount: formatNumber(statements.paidUpCapital),
            },
            {
              label: 'الاحتياطي النظامي',
              amount: formatNumber(statements.statutoryReserve),
            },
            {
              label: 'الأرباح المبقاة أول المدة',
              amount: formatNumber(statements.retainedEarningsBeginning),
            },
            {
              label: 'صافي ربح / (خسارة) السنة',
              amount: formatNumber(statements.netProfit),
            },
            {
              label: 'توزيعات الأرباح',
              amount: `(${formatNumber(statements.dividendsDeclared)})`,
            },
            {
              label: 'جاري الشركاء (صافي)',
              amount: formatNumber(statements.partnersCurrentAccountNet),
            },
            {
              label: 'إجمالي حقوق الملكية',
              amount: formatNumber(statements.totalEquity),
              highlight: true,
            },
          ]),

          // 4. Cash Flow Statement
          rtlParagraph('4. قائمة التدفقات النقدية (الطريقة غير المباشرة)', {
            bold: true,
            size: 26,
            color: '0F172A',
            spacingBefore: 260,
            spacingAfter: 120,
          }),
          buildStatementTable([
            {
              label: 'صافي التدفق من الأنشطة التشغيلية',
              amount: formatNumber(statements.cashFlowOperating),
            },
            {
              label: 'صافي التدفق من الأنشطة الاستثمارية',
              amount: formatNumber(statements.cashFlowInvesting),
            },
            {
              label: 'صافي التدفق من الأنشطة التمويلية',
              amount: formatNumber(statements.cashFlowFinancing),
            },
            {
              label: 'صافي التغير في النقدية خلال السنة',
              amount: formatNumber(statements.netChangeInCash),
              highlight: true,
            },
            {
              label: 'النقدية وما في حكمها نهاية السنة',
              amount: formatNumber(statements.cashAndEquivalents),
              highlight: true,
            },
          ]),

          // 5. Signatory & Declaration Footer
          rtlParagraph('5. التوثيق والإقرار الإلكتروني للإدارة', {
            bold: true,
            size: 24,
            color: '0F172A',
            spacingBefore: 240,
            spacingAfter: 80,
          }),
          rtlParagraph(
            `الممثل النظامي المفوض: ${declaration.signatoryName || entity.legalRepresentative}`,
            { size: 20, spacingAfter: 60 }
          ),
          rtlParagraph(
            `حالة الإقرار: ${declaration.otpVerified ? 'موثق إلكترونياً' : 'قيد الاعتماد'} · الطابع الزمني: ${declaration.signedAtIso || '—'} · عنوان IP: ${declaration.clientIp || '—'}`,
            { size: 18, color: '475569', spacingAfter: 120 }
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SOCPA_Statements_${entity.crNumber || 'entity'}_${entity.fiscalYearLabel}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
