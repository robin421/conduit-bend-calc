/**
 * UI 文案字典（纯数据模块，可被 node --test 直接 import）。
 *
 * - `en` 是唯一键来源；`es` 用 `Record<TranslationKey, string>` 声明，
 *   缺任何键都会在 `npm run typecheck` 阶段报错（brief 要求「es 无缺 key」）。
 * - 插值用 `{name}` 占位，配合 `translate()` 做简单替换，不引入 i18n 库
 *   （保持首屏 Brotli <200KB）。
 * - 术语按现场电工口径：offset=desplazamiento、conduit=conducto、
 *   shrink=contracción、stub-up=subida de 90°、take-up=recogida。
 */

import { DEFAULT_LANG, type Lang } from './lang.ts';

export const en = {
  // 计算器导航 / 抽屉
  'nav.offset': 'Offset',
  'nav.saddle4': '4-Point Saddle',
  'nav.shrink': 'Shrink',
  'nav.stubUp': '90° Stub',
  'nav.home': 'All calculators',
  'nav.allCalculatorsLink': 'All conduit bending calculators',

  // 品牌栏 / 抽屉无障碍标签
  'brand.footer': 'Built by WattFlow for field crews.',
  'brand.menuLabel': 'Open calculator menu',
  'brand.closeMenuLabel': 'Close calculator menu',

  // 通用控件
  'common.units': 'Units',
  'common.unit.fractional': 'Fraction',
  'common.unit.decimal': 'Decimal',
  'common.unit.metric': 'Metric',
  'common.calculate': 'Calculate',
  'common.copy': 'Copy result',
  'common.copied': 'Copied to clipboard',
  'common.copyFailed': 'Copy failed',
  'common.recentCalculations': 'Recent calculations',
  'common.clearHistory': 'Clear history',
  'common.moreFreeTools': 'More free tools',
  'common.faq': 'Frequently asked questions',
  'common.refillLabel': 'Refill: {input}, {summary}',

  // 表格表头
  'table.angle': 'Angle',
  'table.multiplier': 'Multiplier',
  'table.shrinkPerInch': 'Shrink per inch',
  'table.conduitSize': 'Conduit size',
  'table.takeUp': 'Take-up',

  // 输入框校验 / 占位
  'input.invalidMetric': 'Invalid format, e.g. 150 mm',
  'input.invalidImperial': 'Invalid format, e.g. 2\' 3-1/2"',
  'input.mustBePositive': 'Must be greater than 0',
  'input.denominatorZero': 'Denominator cannot be 0',
  'input.placeholderMetric': 'e.g. 150 mm',
  'input.placeholderImperial': 'e.g. 2\' 3-1/2"',

  // 输入占位（按单位）
  'placeholder.mm100': 'e.g. 100 mm',
  'placeholder.mm150': 'e.g. 150 mm',
  'placeholder.mm300': 'e.g. 300 mm',
  'placeholder.inch4': 'e.g. 4"',
  'placeholder.inch6': 'e.g. 6"',
  'placeholder.inch12': 'e.g. 12"',

  // /offset
  'offset.hint': 'Enter height, pick an angle, tap Calculate.',
  'offset.heightLabel': 'Offset height (rise)',
  'offset.startLabel': 'Start of offset from conduit end (optional)',
  'offset.addStart': '+ Add start position (optional)',
  'offset.hideStart': '− Hide start position',
  'offset.markSpacing': 'Mark spacing',
  'offset.shrinkLabel': 'Shrink (add to cut length)',
  'offset.mark1to2': 'Mark 1 → Mark 2',
  'offset.whatTitle': 'What is an offset bend?',
  'offset.chartTitle': 'Offset multiplier and shrink chart',

  // /4-point-saddle
  'saddle.hint': 'Enter height and width, pick an angle, tap Calculate.',
  'saddle.heightLabel': 'Obstruction height',
  'saddle.widthLabel': 'Obstruction width',
  'saddle.markSpacing': 'Mark spacing (obstacle edge ↔ bend)',
  'saddle.span': 'Mark 1 → Mark 4 (total span)',
  'saddle.totalShrink': 'Total shrink (add to cut length)',
  'saddle.marksFromCenter': 'Marks left → right of center',
  'saddle.whatTitle': 'What is a 4-point saddle?',
  'saddle.chartTitle': 'Multiplier and shrink chart',

  // /shrink
  'shrink.hint': 'Pick offset or saddle, enter the height, tap Calculate.',
  'shrink.modeOffset': 'Offset',
  'shrink.modeSaddle': 'Saddle (4-point)',
  'shrink.heightLabel': 'Offset height (rise)',
  'shrink.totalShrink': 'Total shrink (two offsets)',
  'shrink.shrink': 'Shrink',
  'shrink.perInch': 'Shrink per inch of height',
  'shrink.lengthToAdd': 'Conduit length to add',
  'shrink.whatTitle': 'What is conduit shrink?',
  'shrink.chartTitle': 'Shrink chart',

  // /stub-up
  'stub.hint': 'Pick the conduit size, enter the target height, tap Calculate.',
  'stub.heightLabel': 'Target stub height',
  'stub.markLocation': 'Mark location (from conduit end)',
  'stub.targetHeight': 'Target height',
  'stub.takeUp': 'Take-up',
  'stub.tooShort': 'Target height must be greater than the {takeUp}" take-up.',
  'stub.takeUpHint': '{takeUp}" take-up',
  'stub.whatTitle': 'What is a stub-up?',
  'stub.chartTitle': 'Take-up chart (hand benders, EMT)',

  // feedback
  'feedback.cardTitle': 'Report a problem or suggest an improvement',
  'feedback.cardBody':
    'Open our in-app feedback form. App version, system and language are included. No calculations or payment details are sent. Individual replies are not guaranteed.',
  'feedback.sendButton': 'Send feedback',
  'feedback.openingButton': 'Opening feedback…',
  'feedback.openError':
    'Could not open the feedback form. Check your connection and try again. Your calculations are kept.',
  'feedback.title': 'Feedback',
  'feedback.back': 'Back',
  'feedback.subtitle':
    'Send a ticket directly to our engineering queue. Individual replies are not guaranteed.',
  'feedback.categoryLabel': 'Category',
  'feedback.catBug': 'Bug report',
  'feedback.catFeature': 'Feature request',
  'feedback.catFormula': 'Bender / Formula',
  'feedback.catOther': 'Other',
  'feedback.contentLabel': 'Details',
  'feedback.contentPlaceholder':
    'Describe what happened, what you expected, or what would help on the job…',
  'feedback.minCharsHint': 'Minimum {min} characters',
  'feedback.charCount': '{count} / {max}',
  'feedback.errorInvalidCategory': 'Please select a category.',
  'feedback.errorTooShort': 'Please enter at least {min} characters.',
  'feedback.errorTooLong': 'Feedback must be {max} characters or fewer.',
  'feedback.emailLabel': 'Email (Optional)',
  'feedback.emailPlaceholder': 'name@example.com',
  'feedback.diagnosticsTitle': 'Included diagnostics',
  'feedback.diagnosticsProduct': 'Product',
  'feedback.diagnosticsVersion': 'App Version',
  'feedback.diagnosticsOs': 'OS',
  'feedback.diagnosticsLang': 'Language',
  'feedback.diagnosticsNote':
    'No calculations, history, or payment details are included.',
  'feedback.submitButton': 'Submit feedback',
  'feedback.submittingButton': 'Submitting…',
  'feedback.submitErrorTitle': 'Could not send feedback',
  'feedback.submitErrorTimeout':
    'Request timed out. Check your connection and try again.',
  'feedback.submitErrorNetwork':
    'Network error. Check your connection and try again.',
  'feedback.retryButton': 'Retry',
  'feedback.successTitle': 'Feedback received',
  'feedback.successBody':
    'Your ticket has been added to our engineering queue. Thank you for helping improve Conduit Bend Calc.',
  'feedback.ticketIdLabel': 'Ticket ID',
  'feedback.doneButton': 'Done / Back',
  'feedback.submitAnotherButton': 'Submit another',
} as const;

export type TranslationKey = keyof typeof en;

/**
 * 西班牙语（美国电工习惯，非机翻）。术语：desplazamiento / conducto /
 * contracción / ángulo de doblado / distancia entre marcas / subida de 90°.
 */
export const es: Record<TranslationKey, string> = {
  'nav.offset': 'Desplazamiento',
  'nav.saddle4': 'Silla de 4 puntos',
  'nav.shrink': 'Contracción',
  'nav.stubUp': 'Subida de 90°',
  'nav.home': 'Todas las calculadoras',
  'nav.allCalculatorsLink':
    'Todas las calculadoras de doblado de conducto',

  'brand.footer': 'Creado por WattFlow para cuadrillas de campo.',
  'brand.menuLabel': 'Abrir el menú de calculadoras',
  'brand.closeMenuLabel': 'Cerrar el menú de calculadoras',

  'common.units': 'Unidades',
  'common.unit.fractional': 'Fracción',
  'common.unit.decimal': 'Decimal',
  'common.unit.metric': 'Métrico',
  'common.calculate': 'Calcular',
  'common.copy': 'Copiar resultado',
  'common.copied': 'Copiado al portapapeles',
  'common.copyFailed': 'No se pudo copiar',
  'common.recentCalculations': 'Cálculos recientes',
  'common.clearHistory': 'Borrar historial',
  'common.moreFreeTools': 'Más herramientas gratuitas',
  'common.faq': 'Preguntas frecuentes',
  'common.refillLabel': 'Rellenar: {input}, {summary}',

  'table.angle': 'Ángulo',
  'table.multiplier': 'Multiplicador',
  'table.shrinkPerInch': 'Contracción por pulgada',
  'table.conduitSize': 'Tamaño del conducto',
  'table.takeUp': 'Recogida',

  'input.invalidMetric': 'Formato no válido, p. ej. 150 mm',
  'input.invalidImperial': 'Formato no válido, p. ej. 2\' 3-1/2"',
  'input.mustBePositive': 'Debe ser mayor que 0',
  'input.denominatorZero': 'El denominador no puede ser 0',
  'input.placeholderMetric': 'p. ej. 150 mm',
  'input.placeholderImperial': 'p. ej. 2\' 3-1/2"',

  'placeholder.mm100': 'p. ej. 100 mm',
  'placeholder.mm150': 'p. ej. 150 mm',
  'placeholder.mm300': 'p. ej. 300 mm',
  'placeholder.inch4': 'p. ej. 4"',
  'placeholder.inch6': 'p. ej. 6"',
  'placeholder.inch12': 'p. ej. 12"',

  'offset.hint': 'Ingrese la altura, elija un ángulo y pulse Calcular.',
  'offset.heightLabel': 'Altura del desplazamiento (subida)',
  'offset.startLabel':
    'Inicio del desplazamiento desde el extremo del conducto (opcional)',
  'offset.addStart': '+ Agregar posición inicial (opcional)',
  'offset.hideStart': '− Ocultar posición inicial',
  'offset.markSpacing': 'Distancia entre marcas',
  'offset.shrinkLabel': 'Contracción (sumar al largo de corte)',
  'offset.mark1to2': 'Marca 1 → Marca 2',
  'offset.whatTitle': '¿Qué es un desplazamiento?',
  'offset.chartTitle':
    'Tabla de multiplicador y contracción del desplazamiento',

  'saddle.hint':
    'Ingrese la altura y el ancho, elija un ángulo y pulse Calcular.',
  'saddle.heightLabel': 'Altura del obstáculo',
  'saddle.widthLabel': 'Ancho del obstáculo',
  'saddle.markSpacing': 'Distancia entre marcas (borde del obstáculo ↔ doblez)',
  'saddle.span': 'Marca 1 → Marca 4 (largo total)',
  'saddle.totalShrink': 'Contracción total (sumar al largo de corte)',
  'saddle.marksFromCenter': 'Marcas de izquierda a derecha del centro',
  'saddle.whatTitle': '¿Qué es una silla de 4 puntos?',
  'saddle.chartTitle': 'Tabla de multiplicador y contracción',

  'shrink.hint':
    'Elija desplazamiento o silla, ingrese la altura y pulse Calcular.',
  'shrink.modeOffset': 'Desplazamiento',
  'shrink.modeSaddle': 'Silla (4 puntos)',
  'shrink.heightLabel': 'Altura del desplazamiento (subida)',
  'shrink.totalShrink': 'Contracción total (dos desplazamientos)',
  'shrink.shrink': 'Contracción',
  'shrink.perInch': 'Contracción por pulgada de altura',
  'shrink.lengthToAdd': 'Longitud de conducto a agregar',
  'shrink.whatTitle': '¿Qué es la contracción del conducto?',
  'shrink.chartTitle': 'Tabla de contracción',

  'stub.hint':
    'Elija el tamaño del conducto, ingrese la altura objetivo y pulse Calcular.',
  'stub.heightLabel': 'Altura objetivo de la subida',
  'stub.markLocation': 'Ubicación de la marca (desde el extremo del conducto)',
  'stub.targetHeight': 'Altura objetivo',
  'stub.takeUp': 'Recogida',
  'stub.tooShort':
    'La altura objetivo debe ser mayor que la recogida de {takeUp}".',
  'stub.takeUpHint': 'recogida de {takeUp}"',
  'stub.whatTitle': '¿Qué es una subida de 90°?',
  'stub.chartTitle': 'Tabla de recogida (dobladores manuales, EMT)',

  // feedback
  'feedback.cardTitle': 'Reportar un problema o sugerir una mejora',
  'feedback.cardBody':
    'Abre nuestro formulario de comentarios en la app. Se incluyen la versión, el sistema y el idioma. No se envían cálculos ni datos de pago. No se garantizan respuestas individuales.',
  'feedback.sendButton': 'Enviar comentarios',
  'feedback.openingButton': 'Abriendo formulario…',
  'feedback.openError':
    'No se pudo abrir el formulario de comentarios. Revisa tu conexión e inténtalo de nuevo. Tus cálculos se conservan.',
  'feedback.title': 'Comentarios',
  'feedback.back': 'Atrás',
  'feedback.subtitle':
    'Envía un ticket directamente a nuestra cola de desarrollo. No se garantizan respuestas individuales.',
  'feedback.categoryLabel': 'Categoría',
  'feedback.catBug': 'Reporte de error',
  'feedback.catFeature': 'Sugerencia',
  'feedback.catFormula': 'Dobladora / Fórmula',
  'feedback.catOther': 'Otro',
  'feedback.contentLabel': 'Detalles',
  'feedback.contentPlaceholder':
    'Describe qué ocurrió, qué esperabas o qué te ayudaría en obra…',
  'feedback.minCharsHint': 'Mínimo {min} caracteres',
  'feedback.charCount': '{count} / {max}',
  'feedback.errorInvalidCategory': 'Por favor selecciona una categoría.',
  'feedback.errorTooShort': 'Ingresa al menos {min} caracteres.',
  'feedback.errorTooLong': 'El comentario debe tener {max} caracteres o menos.',
  'feedback.emailLabel': 'Correo electrónico (Opcional)',
  'feedback.emailPlaceholder': 'nombre@ejemplo.com',
  'feedback.diagnosticsTitle': 'Diagnóstico incluido',
  'feedback.diagnosticsProduct': 'Producto',
  'feedback.diagnosticsVersion': 'Versión de la app',
  'feedback.diagnosticsOs': 'Sistema',
  'feedback.diagnosticsLang': 'Idioma',
  'feedback.diagnosticsNote':
    'No se incluyen cálculos, historial ni datos de pago.',
  'feedback.submitButton': 'Enviar comentarios',
  'feedback.submittingButton': 'Enviando…',
  'feedback.submitErrorTitle': 'No se pudo enviar el comentario',
  'feedback.submitErrorTimeout':
    'Tiempo de espera agotado. Revisa tu conexión e inténtalo de nuevo.',
  'feedback.submitErrorNetwork':
    'Error de red. Revisa tu conexión e inténtalo de nuevo.',
  'feedback.retryButton': 'Reintentar',
  'feedback.successTitle': 'Comentarios recibidos',
  'feedback.successBody':
    'Tu ticket se agregó a nuestra cola de desarrollo. Gracias por ayudar a mejorar Conduit Bend Calc.',
  'feedback.ticketIdLabel': 'ID de ticket',
  'feedback.doneButton': 'Listo / Volver',
  'feedback.submitAnotherButton': 'Enviar otro',
};

export const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = {
  en,
  es,
};

export type TranslationParams = Record<string, string | number>;

/**
 * 取词：未知 key 回退到英语、再回退到 key 本身（不抛异常）。
 * 支持 `{name}` 插值，未提供的占位原样保留。
 */
export function translate(
  lang: Lang,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const dictionary = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANG];
  const template = dictionary[key] ?? en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match,
  );
}

/** 列出某语言缺失（或空）的 key；供单测断言 es 完整。 */
export function missingKeys(lang: Lang): TranslationKey[] {
  const dictionary = DICTIONARIES[lang];
  return (Object.keys(en) as TranslationKey[]).filter(
    (key) => !dictionary || !dictionary[key] || dictionary[key].trim() === '',
  );
}
