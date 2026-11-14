import { translate } from '../i18n/dictionaries.ts';
import type { Lang } from '../i18n/lang.ts';
import { feedbackLanguage } from './feedbackLink.ts';

export type FeedbackCategory = 'bug' | 'feature' | 'formula' | 'other';

export interface FeedbackScreenCopy {
  title: string;
  backLabel: string;
  subtitle: string;
  categoryLabel: string;
  categories: Record<FeedbackCategory, string>;
  contentLabel: string;
  contentPlaceholder: string;
  minCharsHint: string;
  errorInvalidCategory: string;
  errorTooShort: string;
  errorTooLong: string;
  emailLabel: string;
  emailPlaceholder: string;
  diagnosticsTitle: string;
  diagnosticsProduct: string;
  diagnosticsVersion: string;
  diagnosticsOs: string;
  diagnosticsLang: string;
  diagnosticsNote: string;
  submitButton: string;
  submittingButton: string;
  submitErrorTitle: string;
  submitErrorTimeout: string;
  submitErrorNetwork: string;
  retryButton: string;
  successTitle: string;
  successBody: string;
  ticketIdLabel: string;
  doneButton: string;
  submitAnotherButton: string;
}

const MIN_CHARS = 3;
const MAX_CHARS = 1000;

function buildFromDictionary(lang: Lang): FeedbackScreenCopy {
  return {
    title: translate(lang, 'feedback.title'),
    backLabel: translate(lang, 'feedback.back'),
    subtitle: translate(lang, 'feedback.subtitle'),
    categoryLabel: translate(lang, 'feedback.categoryLabel'),
    categories: {
      bug: translate(lang, 'feedback.catBug'),
      feature: translate(lang, 'feedback.catFeature'),
      formula: translate(lang, 'feedback.catFormula'),
      other: translate(lang, 'feedback.catOther'),
    },
    contentLabel: translate(lang, 'feedback.contentLabel'),
    contentPlaceholder: translate(lang, 'feedback.contentPlaceholder'),
    minCharsHint: translate(lang, 'feedback.minCharsHint', { min: MIN_CHARS }),
    errorInvalidCategory: translate(lang, 'feedback.errorInvalidCategory'),
    errorTooShort: translate(lang, 'feedback.errorTooShort', { min: MIN_CHARS }),
    errorTooLong: translate(lang, 'feedback.errorTooLong', { max: MAX_CHARS }),
    emailLabel: translate(lang, 'feedback.emailLabel'),
    emailPlaceholder: translate(lang, 'feedback.emailPlaceholder'),
    diagnosticsTitle: translate(lang, 'feedback.diagnosticsTitle'),
    diagnosticsProduct: translate(lang, 'feedback.diagnosticsProduct'),
    diagnosticsVersion: translate(lang, 'feedback.diagnosticsVersion'),
    diagnosticsOs: translate(lang, 'feedback.diagnosticsOs'),
    diagnosticsLang: translate(lang, 'feedback.diagnosticsLang'),
    diagnosticsNote: translate(lang, 'feedback.diagnosticsNote'),
    submitButton: translate(lang, 'feedback.submitButton'),
    submittingButton: translate(lang, 'feedback.submittingButton'),
    submitErrorTitle: translate(lang, 'feedback.submitErrorTitle'),
    submitErrorTimeout: translate(lang, 'feedback.submitErrorTimeout'),
    submitErrorNetwork: translate(lang, 'feedback.submitErrorNetwork'),
    retryButton: translate(lang, 'feedback.retryButton'),
    successTitle: translate(lang, 'feedback.successTitle'),
    successBody: translate(lang, 'feedback.successBody'),
    ticketIdLabel: translate(lang, 'feedback.ticketIdLabel'),
    doneButton: translate(lang, 'feedback.doneButton'),
    submitAnotherButton: translate(lang, 'feedback.submitAnotherButton'),
  };
}

const ZH_COPY: Record<'zh' | 'zh-tw', FeedbackScreenCopy> = {
  zh: {
    title: '问题反馈',
    backLabel: '返回',
    subtitle: '直接提交工单至研发排期队列，通常不提供一对一回复。',
    categoryLabel: '反馈分类',
    categories: {
      bug: '问题反馈',
      feature: '功能建议',
      formula: '弯管器 / 公式',
      other: '其他',
    },
    contentLabel: '详细描述',
    contentPlaceholder: '请描述遇到的问题、期望行为或现场使用需求…',
    minCharsHint: `至少输入 ${MIN_CHARS} 个字符`,
    errorInvalidCategory: '请选择反馈分类。',
    errorTooShort: `请至少输入 ${MIN_CHARS} 个字符。`,
    errorTooLong: `反馈内容不能超过 ${MAX_CHARS} 个字符。`,
    emailLabel: '联系邮箱（可选）',
    emailPlaceholder: 'name@example.com',
    diagnosticsTitle: '随工单附带的诊断信息',
    diagnosticsProduct: '产品',
    diagnosticsVersion: '应用版本',
    diagnosticsOs: '系统',
    diagnosticsLang: '语言',
    diagnosticsNote: '不包含任何计算输入、历史记录或支付信息。',
    submitButton: '提交反馈',
    submittingButton: '正在提交…',
    submitErrorTitle: '提交失败',
    submitErrorTimeout: '请求超时，请检查网络连接后重试。',
    submitErrorNetwork: '网络异常，请检查网络连接后重试。',
    retryButton: '重试',
    successTitle: '已收到您的反馈',
    successBody: '工单已进入研发排期队列，感谢您帮助改进 Conduit Bend Calc。',
    ticketIdLabel: '工单编号',
    doneButton: '完成 / 返回',
    submitAnotherButton: '再提交一条',
  },
  'zh-tw': {
    title: '意見回饋',
    backLabel: '返回',
    subtitle: '直接提交工單至研發排程佇列，通常不提供一對一回覆。',
    categoryLabel: '回饋分類',
    categories: {
      bug: '問題回報',
      feature: '功能建議',
      formula: '彎管器 / 公式',
      other: '其他',
    },
    contentLabel: '詳細描述',
    contentPlaceholder: '請描述遇到的問題、預期行為或現場使用需求…',
    minCharsHint: `至少輸入 ${MIN_CHARS} 個字元`,
    errorInvalidCategory: '請選擇回饋分類。',
    errorTooShort: `請至少輸入 ${MIN_CHARS} 個字元。`,
    errorTooLong: `回饋內容不能超過 ${MAX_CHARS} 個字元。`,
    emailLabel: '聯絡信箱（選填）',
    emailPlaceholder: 'name@example.com',
    diagnosticsTitle: '隨工單附帶的診斷資訊',
    diagnosticsProduct: '產品',
    diagnosticsVersion: 'App 版本',
    diagnosticsOs: '系統',
    diagnosticsLang: '語言',
    diagnosticsNote: '不包含任何計算輸入、歷史紀錄或付款資訊。',
    submitButton: '提交回饋',
    submittingButton: '正在提交…',
    submitErrorTitle: '提交失敗',
    submitErrorTimeout: '請求逾時，請檢查網路連線後重試。',
    submitErrorNetwork: '網路異常，請檢查網路連線後重試。',
    retryButton: '重試',
    successTitle: '已收到您的回饋',
    successBody: '工單已進入研發排程佇列，感謝您協助改進 Conduit Bend Calc。',
    ticketIdLabel: '工單編號',
    doneButton: '完成 / 返回',
    submitAnotherButton: '再提交一則',
  },
};

/** 根据当前语言/locale 返回内置反馈页多语言文案（en/es 与 dictionaries.ts 严格一致，保留 zh/zh-tw 支持）。 */
export function getFeedbackScreenCopy(locale?: string): FeedbackScreenCopy {
  let resolved = locale ?? 'en';
  if (!locale) {
    try {
      resolved = Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      resolved = 'en';
    }
  }
  const lang = feedbackLanguage(resolved);
  if (lang === 'zh' || lang === 'zh-tw') {
    return ZH_COPY[lang];
  }
  if (lang === 'es') {
    return buildFromDictionary('es');
  }
  return buildFromDictionary('en');
}
