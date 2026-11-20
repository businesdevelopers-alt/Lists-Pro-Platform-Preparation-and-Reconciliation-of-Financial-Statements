import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QAWAEM_VALID_IDS = [
  'cash_and_equivalents',
  'accounts_receivable',
  'inventory',
  'prepaid_and_other_current_assets',
  'property_plant_equipment',
  'intangible_assets',
  'accounts_payable',
  'accrued_and_vat_liabilities',
  'zakat_payable',
  'short_term_loans',
  'long_term_loans',
  'end_of_service_benefits',
  'paid_up_capital',
  'statutory_reserve',
  'retained_earnings_beginning',
  'partners_current_account_net',
  'dividends_declared',
  'operating_revenue',
  'other_revenue',
  'cost_of_revenue',
  'salaries_and_wages',
  'rent_expense',
  'general_admin_expenses',
  'depreciation_expense',
  'finance_costs',
  'zakat_expense',
  'unmapped',
] as const;

const WATHQ_SAMPLE_REGISTRY: Record<
  string,
  {
    crNumber: string;
    unifiedNumber: string;
    entityName: string;
    legalForm: string;
    isicCode: string;
    isicDescription: string;
    paidUpCapitalSar: number;
    fiscalYearEnd: string;
    vatNumber: string;
    city: string;
    classification: 'micro' | 'small' | 'medium_large';
    annualRevenueMillions: number;
    totalAssetsMillions: number;
    employeesCount: number;
  }
> = {
  '1010543210': {
    crNumber: '1010543210',
    unifiedNumber: '7001543210',
    entityName: 'شركة آفاق التقنية والتجارة المحدودة',
    legalForm: 'شركة ذات مسؤولية محدودة',
    isicCode: '620101',
    isicDescription: 'تصميم وبرمجة البرمجيات الخاصة والتجارة الإلكترونية',
    paidUpCapitalSar: 500000,
    fiscalYearEnd: '12-31',
    vatNumber: '310154321000003',
    city: 'الرياض',
    classification: 'small',
    annualRevenueMillions: 2.48,
    totalAssetsMillions: 1.76,
    employeesCount: 14,
  },
  '1010889900': {
    crNumber: '1010889900',
    unifiedNumber: '7002889900',
    entityName: 'مؤسسة ركيزة للخدمات اللوجستية',
    legalForm: 'شركة الشخص الواحد ذات مسؤولية محدودة',
    isicCode: '492301',
    isicDescription: 'النقل البري للبضائع والخدمات اللوجستية',
    paidUpCapitalSar: 100000,
    fiscalYearEnd: '12-31',
    vatNumber: '310288990000003',
    city: 'جدة',
    classification: 'micro',
    annualRevenueMillions: 1.2,
    totalAssetsMillions: 0.85,
    employeesCount: 4,
  },
  '2050112233': {
    crNumber: '2050112233',
    unifiedNumber: '7003112233',
    entityName: 'شركة النخبة الصناعية المساهمة المبسطة',
    legalForm: 'شركة مساهمة مبسطة',
    isicCode: '251101',
    isicDescription: 'تصنيع الهياكل المعدنية والمعدات الصناعية',
    paidUpCapitalSar: 5000000,
    fiscalYearEnd: '12-31',
    vatNumber: '310311223300003',
    city: 'الدمام',
    classification: 'medium_large',
    annualRevenueMillions: 48.5,
    totalAssetsMillions: 31.2,
    employeesCount: 68,
  },
};

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/legal/ip', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || '127.0.0.1';

    res.json({
      ip: rawIp.replace(/^::ffff:/, ''),
      timestampIso: new Date().toISOString(),
    });
  });

  app.get('/api/wathq/lookup/:cr', (req, res) => {
    const cr = req.params.cr.replace(/\D/g, '');
    if (cr.length !== 10) {
      res.status(400).json({
        error: 'رقم السجل التجاري يجب أن يتكون من 10 أرقام.',
      });
      return;
    }

    const known = WATHQ_SAMPLE_REGISTRY[cr];
    if (known) {
      res.json({ source: 'wathq-sandbox', entity: known });
      return;
    }

    res.json({
      source: 'wathq-sandbox',
      entity: {
        crNumber: cr,
        unifiedNumber: `700${cr.slice(3)}`,
        entityName: `شركة المنشأة التجارية (${cr.slice(-4)}) المحدودة`,
        legalForm: 'شركة ذات مسؤولية محدودة',
        isicCode: '469001',
        isicDescription: 'تجارة الجملة والتجزئة والخدمات المساندة',
        paidUpCapitalSar: 250000,
        fiscalYearEnd: '12-31',
        vatNumber: `310${cr}03`,
        city: 'الرياض',
        classification: 'small',
        annualRevenueMillions: 2.1,
        totalAssetsMillions: 1.4,
        employeesCount: 9,
      },
    });
  });

  app.post('/api/ai/map-accounts', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          'مفتاح Gemini API غير مهيأ على الخادم. يرجى التحقق من Settings > Secrets.',
      });
      return;
    }

    const accounts = req.body?.accounts as
      | Array<{
          id: string;
          accountCode: string;
          accountName: string;
          endingNetSar: number;
        }>
      | undefined;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      res.status(400).json({
        error: 'لا توجد حسابات في ميزان المراجعة لتسكينها.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `أنت محاسب قانوني سعودي خبير في معايير SOCPA وتصنيف منصة قوائم السعودية (XBRL Taxonomy).
مهمتك تصنيف كل حساب من ميزان المراجعة وربطه بأقرب بند قياسي من القائمة المحددة (mappedFieldId) مع إعطاء الأولوية للحسابات المالية الشائعة (النقدية والبنوك، العملاء، الموردون، المبيعات، تكلفة المبيعات، الرواتب، الإيجار، الضريبة، الزكاة، رأس المال، الأرباح المبقاة، جاري الشركاء).
بالإضافة إلى ذلك، قدم دائماً قائمة من 2 إلى 3 بدائل مقترحة مرتبة بالأولوية في حقل alternativeFieldIds (خاصة إذا كان الحساب مبهماً أو غامضاً أو غير مصنف unmapped). لا تقم بأي عمليات حسابية.

قائمة البنود القياسية المعتمدة في منصة قوائم:
- cash_and_equivalents: النقدية بالصندوق ولدى البنوك
- accounts_receivable: الذمم المدينة التجارية (العملاء)
- inventory: المخزون السلعي
- prepaid_and_other_current_assets: مصروفات مدفوعة مقدماً وأرصدة مدينة أخرى (تشمل العهد وضريبة المدخلات)
- property_plant_equipment: الممتلكات والآلات والمعدات بالصافي
- intangible_assets: الأصول غير الملموسة وحق الاستخدام (برمجيات، علامات)
- accounts_payable: الذمم الدائنة التجارية (الموردون)
- accrued_and_vat_liabilities: مصروفات مستحقة وضريبة القيمة المضافة المستحقة
- zakat_payable: مخصص الزكاة المستحق
- short_term_loans: قروض وتسهيلات قصيرة الأجل
- long_term_loans: قروض طويلة الأجل
- end_of_service_benefits: مخصص مكافأة نهاية الخدمة
- paid_up_capital: رأس المال المدفوع
- statutory_reserve: الاحتياطي النظامي
- retained_earnings_beginning: الأرباح المبقاة (أول المدة)
- partners_current_account_net: جاري الشركاء (دائن أو مدين)
- dividends_declared: أرباح موزعة خلال السنة
- operating_revenue: إيرادات النشاط الرئيسي (المبيعات)
- other_revenue: إيرادات أخرى
- cost_of_revenue: تكلفة الإيرادات / المبيعات
- salaries_and_wages: الرواتب والأجور ومنافع الموظفين والتأمينات
- rent_expense: مصروفات الإيجار
- general_admin_expenses: مصروفات عمومية وإدارية وتسويقية
- depreciation_expense: مصروف الإهلاك والإطفاء
- finance_costs: تكاليف التمويل والفوائد والعمولات البنكية
- zakat_expense: مصروف الزكاة الشرعية التقديري
- unmapped: إذا كان الحساب مبهماً تماماً ولا يمكن تصنيفه بثقة

بيانات الحسابات المطلوب تصنيفها:
${JSON.stringify(accounts)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Return strictly valid JSON matching the schema. Classify each account by its Arabic/English name and Saudi COA code prefix (1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expenses), prioritizing common Saudi financial accounts and always providing 2-3 candidate alternativeFieldIds.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                mappedFieldId: {
                  type: Type.STRING,
                  enum: [...QAWAEM_VALID_IDS],
                },
                confidence: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low'],
                },
                reason: { type: Type.STRING },
                alternativeFieldIds: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                    enum: QAWAEM_VALID_IDS.filter((id) => id !== 'unmapped'),
                  },
                },
              },
              required: [
                'id',
                'mappedFieldId',
                'confidence',
                'reason',
                'alternativeFieldIds',
              ],
            },
          },
        },
      });

      const rawText = (response.text ?? '[]').trim();
      const mappings = JSON.parse(rawText);
      res.json({ mappings });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'فشل الاتصال بمحرك التصنيف الذكي.';
      console.error('Gemini mapping error:', error);
      res.status(502).json({
        error: `تعذر تصنيف الحسابات عبر محرك الذكاء الاصطناعي: ${message}`,
      });
    }
  });

  app.post('/api/ai/extract-trial-balance', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          'مفتاح Gemini API غير مهيأ على الخادم لقراءة ملفات PDF والصور. يرجى التحقق من Settings > Secrets.',
      });
      return;
    }

    const mimeType = req.body?.mimeType as string | undefined;
    const base64Data = req.body?.base64Data as string | undefined;
    const fileName = (req.body?.fileName as string | undefined) || 'trial-balance.pdf';

    if (!mimeType || !base64Data) {
      res.status(400).json({
        error: 'بيانات الملف مطلوبة لاستخراج حسابات ميزان المراجعة.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const extractionPrompt = `أنت محاسب قانوني سعودي خبير في قراءة موازين المراجعة بصيغة PDF والصور من جميع الأنظمة المحاسبية (قيود، زوهو، دفترة، وافق، أودو، سماك، الأمين، SAP، QuickBooks).
استخرج جميع صفوف الحسابات التفصيلية من ملف ميزان المراجعة المرفق (${fileName}) عبر كافة الصفحات بدقة محاسبية تامة.

قواعد استخراج إلزامية:
1. تجاهل تماماً صفوف العناوين الرئيسية للأقسام وصفوف الإجماليات والمجاميع الفرعية والنهائية (مثل: الإجمالي، المجموع، Total، Grand Total، Subtotal، صافي الربح، مجموع الأصول، مجموع الالتزامات) حتى لا تتكرر الأرصدة.
2. إذا كان الميزان يحتوي على عدة أعمدة (رصيد أول المدة / الحركة خلال الفترة / رصيد آخر المدة)، استخرج فقط **أرصدة آخر المدة (Ending / Closing Balance)** في حقلي debitSar و creditSar.
3. إذا كان الميزان يعرض عمود رصيد صافي واحد فقط (Net Balance)، فضع القيمة الموجبة (أو التي تحمل Dr / مدين) في debitSar، والقيمة السالبة أو بين قوسين (أو التي تحمل Cr / دائن) كرقم موجب في creditSar.
4. حوّل الأرقام العربية الهندية (٠١٢٣٤٥٦٧٨٩) وفواصل الآلاف إلى أرقام قياسية عشرية موجبة، وتجاهل الحسابات التي رصيدها المدين 0 والدائن 0.
5. لكل حساب استخرج:
   - accountCode: رقم أو رمز الحساب كما يظهر في المستند (أو تسلسل رقمي إن لم يوجد)
   - accountName: اسم الحساب بالضبط كما ورد (عربي أو إنجليزي)
   - openingBalanceSar: رصيد أول المدة الصافي إن وجد (وإلا 0)
   - debitSar: رصيد آخر المدة المدين كرقم موجب (أو 0)
   - creditSar: رصيد آخر المدة الدائن كرقم موجب (أو 0)`;

      let lastErr: unknown = null;
      let rawText = '[]';

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: extractionPrompt,
                },
              ],
            },
            config: {
              systemInstruction:
                'Return strictly valid JSON array matching the schema. Extract only leaf account rows with non-zero closing debit or credit balances; never include category subtotal or grand total rows.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accountCode: { type: Type.STRING },
                    accountName: { type: Type.STRING },
                    openingBalanceSar: { type: Type.NUMBER },
                    debitSar: { type: Type.NUMBER },
                    creditSar: { type: Type.NUMBER },
                  },
                  required: [
                    'accountCode',
                    'accountName',
                    'debitSar',
                    'creditSar',
                  ],
                },
              },
            },
          });

          rawText = (response.text ?? '[]').trim();
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      const cleanedJson = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleanedJson);
      const rows = Array.isArray(parsed) ? parsed : [];
      res.json({ rows });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'تعذر قراءة ملف ميزان المراجعة.';
      console.error('Gemini TB extraction error:', error);
      res.status(502).json({
        error: `تعذر استخراج الحسابات من ملف PDF عبر الذكاء الاصطناعي: ${message}`,
      });
    }
  });

  app.post('/api/ai/interpret-statements', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error:
          'مفتاح Gemini API غير مهيأ على الخادم لتشغيل القراءة الذكية. يرجى التحقق من Settings > Secrets.',
      });
      return;
    }

    const entity = req.body?.entity;
    const summary = req.body?.summary;
    if (!entity || !summary) {
      res.status(400).json({
        error: 'بيانات المنشأة وملخص القوائم المالية مطلوبة لإجراء القراءة التفسيرية.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `أنت مستشار مالي ومحاسبي خبير في معايير SOCPA السعودية ومنصة قوائم.
مهمتك تقديم "قراءة تفسيرية للأرقام فقط" دون تغيير أو تعديل أي رقم أو اقتراح قيود تغيّر الأرقام الفعلية.

بيانات المنشأة:
${JSON.stringify(entity, null, 2)}

ملخص القوائم المالية بالريال السعودي (جميع الأرقام محسوبة مسبقاً ومثبتة):
${JSON.stringify(summary, null, 2)}

المطلوب:
أنتج من 3 إلى 6 ملاحظات تحليلية دقيقة باللغة العربية الفصحى المهنية بالضبط وفق ما تظهره الأرقام الفعلية أعلاه:
- استخدم type = "warning" للمخاطر والمؤشرات التي تستحق المراجعة (مثل: صافي خسارة مقارنة برأس المال أو المصاريف الإدارية المرتفعة، حقوق ملكية سالبة، إيرادات أخرى أكبر من النشاط الرئيسي، مصاريف أخرى مرتفعة أو مقاربة للإيرادات، ضغط على السيولة قصيرة الأجل مقارنة بالالتزامات المتداولة، ارتفاع جاري الشركاء أو غياب مخصص الزكاة رغم وجود ربح).
- استخدم type = "positive" لنقاط القوة المالية الفعلية في الأرقام (مثل: هامش مجمل ربح جيد، سيولة نقدية تغطي الالتزامات قصيرة الأجل، نمو/ربحية إيجابية، كفاءة هيكل التمويل).
- اذكر الأرقام والنسب التقريبية الحقيقية المشتقة فقط من الملخص أعلاه (لا تخترع أرقاماً غير موجودة).
- لا تكرر قواعد التوازن الحسابي الأربعة بل ركز على المعنى المالي والرقابي والتشغيلي للأرقام.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      enum: ['warning', 'positive'],
                    },
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['type', 'title', 'detail'],
                },
              },
            },
            required: ['insights'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      const insights = Array.isArray(parsed.insights) ? parsed.insights : [];
      res.json({ insights });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'فشل توليد القراءة التفسيرية عبر الذكاء الاصطناعي.';
      console.error('Gemini interpret statements error:', error);
      res.status(502).json({
        error: `تعذر إتمام القراءة التفسيرية عبر الذكاء الاصطناعي: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Qawaem SaaS server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
