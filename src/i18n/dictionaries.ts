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
  'common.saveToHistory': 'Save to history',
  'common.enterMeasurement': 'Enter a measurement to calculate',
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
  'shrink.perMetric': 'Shrink per 25.4 mm (1")',
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
  'stub.tooShortFormatted': 'Target height must be greater than the {takeUp} take-up.',
  'stub.takeUpHint': '{takeUp}" take-up',
  'stub.takeUpHintFormatted': '{takeUp} take-up',
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

  // 通用补充
  'common.clear': 'Clear',
  'common.cancel': 'Cancel',
  'common.language': 'Language',
  'common.unit.short.fractional': 'Frac',
  'common.unit.short.decimal': 'Dec',
  'common.unit.short.metric': 'mm',

  // 底部 Tab 与页面标题
  'tabs.calculate': 'Calculate',
  'tabs.reference': 'Reference',
  'tabs.history': 'History',
  'tabs.myBender': 'My Bender',
  'nav.fullFingerprint': 'Full Fingerprint',
  'nav.benderSetup': 'Bender Setup',

  // 首页
  'home.group.bending': 'Conduit bending',
  'home.group.electrical': 'Electrical calculators',
  'home.group.bender': 'My bender',
  'home.tool.offset.name': 'Offset Bend',
  'home.tool.offset.desc': 'Move the run around an obstacle',
  'home.tool.stub.name': '90° Stub',
  'home.tool.stub.desc': 'Turn up to a measured height',
  'home.tool.saddle3.name': '3-Point Saddle',
  'home.tool.saddle3.desc': 'Cross a narrow obstacle with three bends',
  'home.tool.saddle4.name': '4-Point Saddle',
  'home.tool.saddle4.desc': 'Cross a wide obstacle with a flat top',
  'home.tool.rollingOffset.name': 'Rolling Offset',
  'home.tool.rollingOffset.desc': 'Move the run both up and sideways',
  'home.tool.kicked90.name': 'Kicked 90°',
  'home.tool.kicked90.desc': 'Combine a 90° bend with an offset',
  'home.tool.conduitFill.name': 'Conduit Fill',
  'home.tool.conduitFill.desc': 'How many THHN wires fit (NEC Ch. 9)',
  'home.tool.voltageDrop.name': 'Voltage Drop',
  'home.tool.voltageDrop.desc': 'Drop % and wire size for 3% / 5%',
  'home.tool.wireSize.name': 'Wire Size',
  'home.tool.wireSize.desc': 'Minimum AWG from amps (NEC 310.16)',
  'home.tool.guidedCalibration.name': 'Dial In My Bender',
  'home.tool.guidedCalibration.desc':
    'Match take-up or bend radius to your actual bender',
  'home.continueLast': 'Continue last calculation',
  'home.continueLastA11y': 'Continue last calculation: {title}',
  'home.proReadyTitle': 'Pro is ready — continue your task',
  'home.proPendingTitle': 'Your purchase is not complete yet',
  'home.proReadyBody': 'Your saved inputs are kept. Open your next step when ready.',
  'home.proPendingBody':
    'Keep using the free calculators while Google Play confirms payment.',
  'home.proContinueButton': 'Continue with Pro',
  'home.proCheckStatusButton': 'Check purchase status',
  'home.quickCalcOpen': 'Open quick calculator',
  'home.quickCalcHide': 'Hide quick calculator',

  // 历史记录页
  'history.export': 'Export',
  'history.clear': 'Clear',
  'history.clearTitle': 'Clear history',
  'history.clearConfirm': 'Delete all history entries?',
  'history.exportErrorTitle': 'Could not export',
  'history.exportErrorToast': 'Could not export: {message}',
  'history.tryAgain': 'Please try again.',
  'history.emptyTitle': 'No calculations yet',
  'history.emptyBody': 'Calculations you run will be recorded here',
  'history.entryCountOne': '{count} entry',
  'history.entryCountMany': '{count} entries',
  'history.limitTitle': 'Viewing 5 of {count} recent bends',
  'history.limitSubtitle':
    'The latest {limit} bends are saved on this device. Pro shows all {limit} and enables export.',
  'history.limitCta': 'Unlock {limit}-Bend History & Export',

  // Paywall
  'paywall.eyebrow': 'PRO · LIFETIME ACCESS',
  'paywall.scene.calibration.title': 'Dial in your own bender',
  'paywall.scene.feasibility.title': 'Plan your bend with confidence',
  'paywall.scene.history.title': 'Keep your recent work handy',
  'paywall.sceneTab.calibration': 'Bender',
  'paywall.sceneTab.feasibility': 'Bend checks',
  'paywall.sceneTab.history': 'History',
  'paywall.sceneTabA11y': '{label} example',
  'paywall.unlockedRestoredTitle': 'Your Pro is restored',
  'paywall.unlockedReadyTitle': 'Your Pro is ready',
  'paywall.unlockedSubtitle':
    'Your inputs and saved settings are ready. Continue when you are.',
  'paywall.defaultSubtitle':
    'A personal setup for your bender, with more confidence on every job.',
  'paywall.readyOnDevice': 'Ready to use on this device',
  'paywall.readyCalibrationNote':
    'Have your bender, scrap conduit and tape measure ready. Settings change only when you save.',
  'paywall.readyDefaultNote':
    'Your original calculation and recent history are kept.',
  'paywall.benefit1.title': 'Personal calibration',
  'paywall.benefit1.desc': 'Use your own take-up and bend radius.',
  'paywall.benefit2.title': 'Detailed bend checks',
  'paywall.benefit2.desc': 'Check clearance and explore alternatives.',
  'paywall.benefit3.title': 'History & text export',
  'paywall.benefit3.desc': 'Keep your latest {limit} bends and share them.',
  'paywall.freePromise': 'All nine calculators and safety warnings stay free.',
  'paywall.hideExample': 'Hide example −',
  'paywall.showExample': 'See Pro in practice +',
  'paywall.exampleHeader': 'Illustrative example · settings unchanged',
  'paywall.exampleCalibrationIntro':
    'A test bend marked at {mark} finishes at {measured}.',
  'paywall.exampleStandardTakeUp': 'Standard take-up',
  'paywall.exampleMeasuredTakeUp': 'Measured take-up',
  'paywall.exampleMarkLabel': 'Mark for the same target stub',
  'paywall.exampleCalibrationNote':
    'Use your own measured result after unlocking. Quick Check changes take-up; Full Fingerprint derives bend radius.',
  'paywall.exampleFeasibilityTitle': 'Example: tight bend clearance',
  'paywall.exampleFeasibilityFallback': 'The selected bend needs more space.',
  'paywall.exampleFeasibilityNext': 'Pro adds a next step',
  'paywall.exampleFeasibilityNote':
    'Preview only. Check your actual dimensions and selected bender; free risk warnings remain visible.',
  'paywall.exampleFreeLabel': 'Free',
  'paywall.exampleFreeValue': 'Latest 5',
  'paywall.exampleProLabel': 'Pro',
  'paywall.exampleProValue': 'Latest {limit}',
  'paywall.exampleExportTitle': 'Text export example',
  'paywall.exampleExportSample':
    'Offset · {height} · 30°\nSpacing {spacing} · shrink {shrink}',
  'paywall.exampleHistoryNote':
    'The latest {limit} bends stay on this device. Export before older entries are replaced. No unlimited storage or cloud backup is included.',
  'paywall.faqHeading': 'Good to know',
  'paywall.faq1.q': 'Is this a subscription?',
  'paywall.faq1.a':
    'No. Pro is a one-time purchase for this app. There are no recurring charges.',
  'paywall.faq2.q': 'What stays free?',
  'paywall.faq2.a':
    'All nine calculators, standard bender values, basic diagrams and safety warnings stay free. Pro adds personal calibration, detailed bend options, saved bender profiles and recent-history export.',
  'paywall.faq3.q': 'What do I need to calibrate?',
  'paywall.faq3.a':
    'Bring your bender, scrap conduit and a tape measure. Quick Check uses one finished-height measurement. Full Fingerprint uses both legs of a 90° test bend to derive bend radius.',
  'paywall.faq4.q': 'Can I restore my purchase?',
  'paywall.faq4.a':
    'Yes. On Android, use the same Google Play account and choose Restore purchase. Previously unlocked Pro keeps working offline on this device. Bender profiles and recent history are stored on this device.',
  'paywall.statusPending':
    'Payment pending. Pro unlocks after Google Play confirms it. Please do not buy again.',
  'paywall.statusPurchasing':
    'Waiting for Google Play. You can keep using the free calculators.',
  'paywall.statusRestoring': 'Checking purchases for your store account…',
  'paywall.statusLoading': 'Checking your purchase and local price…',
  'paywall.openingTask': 'Opening your task…',
  'paywall.continue.calibration': 'Start bender calibration',
  'paywall.continue.feasibility': 'See my bend alternatives',
  'paywall.continue.history': 'View my recent bends',
  'paywall.continue.export': 'Export my recent bends',
  'paywall.continue.bender': 'Continue adding my bender',
  'paywall.webCaption':
    'Pro is available in the Android app. Google Play shows your local price.',
  'paywall.getAndroidApp': 'Get the Android app',
  'paywall.checkingPurchase': 'Checking purchase…',
  'paywall.checkPurchaseStatus': 'Check purchase status',
  'paywall.restoringPurchase': 'Restoring purchase…',
  'paywall.loadingPrice': 'Loading price…',
  'paywall.oneTimeNote': 'One-time · No subscription',
  'paywall.unlockCta': 'Unlock Pro Lifetime',
  'paywall.storeUnavailableCaption':
    'Unable to load your store price. Free calculators are still available.',
  'paywall.retryStore': 'Retry store connection',
  'paywall.restorePurchase': 'Restore purchase',
  'paywall.backToCalculators': 'Back to calculators',
  'paywall.continueWithFree': 'Continue with Free',
  'paywall.notNow': 'Not now',
  'paywall.actionError': 'Unable to complete this action. Please try again.',

  // 核心计算器公共与 4 大高频计算器
  'calc.bender': 'Bender',
  'calc.benderA11y': 'Bender: {name}. Tap to change',
  'calc.conduitMaterial': 'Conduit material',
  'calc.conduitMaterialA11y': 'Conduit material {option}',
  'calc.usingProfile': 'Using {name}',
  'calc.standardBenderNotice': 'Calculated using standard bender values.',
  'calc.obstacleHeight': 'Obstacle height',
  'calc.obstacleWidth': 'Obstacle width',
  'calc.bendAngle': 'Bend angle',
  'calc.enterValuesHint': 'Enter values to see results',
  'calc.presets': 'Presets:',
  'calc.viewAll': 'View all →',
  'calc.center': 'Center',
  'calc.bendSpacing': 'Bend spacing',
  'calc.markLayoutSpan': 'Mark layout · total span {span}',
  'offset.guideSummary':
    'Space the two marks {distance} apart. Align each mark with the arrow and bend {angle}° in opposite directions.',
  'stub.quickEmtPresets': 'Quick EMT Size Presets',
  'stub.markLocationShort': 'Mark location',
  'stub.mustExceedTakeUp': 'Target height must exceed take-up',
  'stub.datumHook': 'front of the hook',
  'stub.datumArrow': 'arrow',
  'stub.guideSummary':
    'Measure {mark} from the conduit end. Align the mark with the {datum} and bend 90°.',
  'stub.recentBends': 'Recent 90° Bends (Tap to refill)',
  'saddle3.bendSpacing': 'Bend spacing (center ↔ sides)',
  'saddle3.centerMarkShrink': 'Center mark shrink',
  'saddle3.addToCenterMark': 'Add to the center mark',
  'saddle4.bendSpacing': 'Bend spacing (edge ↔ bend)',
  'saddle4.clearanceNote':
    'Leave about {clearance} past the inner marks so the conduit clears the obstacle.',
  'saddle4.fixedPointNote':
    'Measuring from a fixed point? Add {shrink} shrink to find the true center.',
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
  'common.saveToHistory': 'Guardar en el historial',
  'common.enterMeasurement': 'Ingresa una medida para calcular',
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
  'shrink.perMetric': 'Contracción por 25.4 mm (1")',
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
  'stub.tooShortFormatted':
    'La altura objetivo debe ser mayor que la recogida de {takeUp}.',
  'stub.takeUpHint': 'recogida de {takeUp}"',
  'stub.takeUpHintFormatted': 'recogida de {takeUp}',
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

  // 通用补充
  'common.clear': 'Borrar',
  'common.cancel': 'Cancelar',
  'common.language': 'Idioma',
  'common.unit.short.fractional': 'Frac',
  'common.unit.short.decimal': 'Dec',
  'common.unit.short.metric': 'mm',

  // 底部 Tab 与页面标题
  'tabs.calculate': 'Calcular',
  'tabs.reference': 'Referencia',
  'tabs.history': 'Historial',
  'tabs.myBender': 'Mi doblador',
  'nav.fullFingerprint': 'Huella completa',
  'nav.benderSetup': 'Ajuste de doblador',

  // 首页
  'home.group.bending': 'Doblado de conducto',
  'home.group.electrical': 'Calculadoras eléctricas',
  'home.group.bender': 'Mi doblador',
  'home.tool.offset.name': 'Desplazamiento',
  'home.tool.offset.desc': 'Desvía el conducto alrededor de un obstáculo',
  'home.tool.stub.name': 'Subida de 90°',
  'home.tool.stub.desc': 'Sube el conducto a una altura medida',
  'home.tool.saddle3.name': 'Silla de 3 puntos',
  'home.tool.saddle3.desc': 'Cruza un obstáculo angosto con tres dobleces',
  'home.tool.saddle4.name': 'Silla de 4 puntos',
  'home.tool.saddle4.desc': 'Cruza un obstáculo ancho con parte superior plana',
  'home.tool.rollingOffset.name': 'Desplazamiento compuesto',
  'home.tool.rollingOffset.desc': 'Desvía el conducto hacia arriba y hacia un lado',
  'home.tool.kicked90.name': '90° con patada',
  'home.tool.kicked90.desc': 'Combina un doblez de 90° con un desplazamiento',
  'home.tool.conduitFill.name': 'Llenado de conducto',
  'home.tool.conduitFill.desc': 'Cuántos cables THHN caben (NEC Cap. 9)',
  'home.tool.voltageDrop.name': 'Caída de voltaje',
  'home.tool.voltageDrop.desc': '% de caída y calibre de cable para 3% / 5%',
  'home.tool.wireSize.name': 'Calibre de cable',
  'home.tool.wireSize.desc': 'AWG mínimo según amperios (NEC 310.16)',
  'home.tool.guidedCalibration.name': 'Calibrar mi doblador',
  'home.tool.guidedCalibration.desc':
    'Ajusta la recogida o el radio a tu doblador real',
  'home.continueLast': 'Continuar último cálculo',
  'home.continueLastA11y': 'Continuar último cálculo: {title}',
  'home.proReadyTitle': 'Pro está listo — continúa tu tarea',
  'home.proPendingTitle': 'Tu compra aún no se completa',
  'home.proReadyBody':
    'Tus datos guardados se conservan. Abre el siguiente paso cuando quieras.',
  'home.proPendingBody':
    'Sigue usando las calculadoras gratuitas mientras Google Play confirma el pago.',
  'home.proContinueButton': 'Continuar con Pro',
  'home.proCheckStatusButton': 'Verificar estado de compra',
  'home.quickCalcOpen': 'Abrir calculadora rápida',
  'home.quickCalcHide': 'Ocultar calculadora rápida',

  // 历史记录页
  'history.export': 'Exportar',
  'history.clear': 'Borrar',
  'history.clearTitle': 'Borrar historial',
  'history.clearConfirm': '¿Eliminar todos los registros del historial?',
  'history.exportErrorTitle': 'No se pudo exportar',
  'history.exportErrorToast': 'No se pudo exportar: {message}',
  'history.tryAgain': 'Inténtalo de nuevo.',
  'history.emptyTitle': 'Aún no hay cálculos',
  'history.emptyBody': 'Los cálculos que hagas aparecerán aquí',
  'history.entryCountOne': '{count} registro',
  'history.entryCountMany': '{count} registros',
  'history.limitTitle': 'Viendo 5 de {count} dobleces recientes',
  'history.limitSubtitle':
    'Los últimos {limit} dobleces se guardan en este dispositivo. Pro muestra los {limit} y permite exportar.',
  'history.limitCta': 'Desbloquear historial de {limit} y exportación',

  // Paywall
  'paywall.eyebrow': 'PRO · ACCESO DE POR VIDA',
  'paywall.scene.calibration.title': 'Calibra tu propio doblador',
  'paywall.scene.feasibility.title': 'Planifica tu doblez con confianza',
  'paywall.scene.history.title': 'Ten a mano tus cálculos recientes',
  'paywall.sceneTab.calibration': 'Doblador',
  'paywall.sceneTab.feasibility': 'Verificaciones',
  'paywall.sceneTab.history': 'Historial',
  'paywall.sceneTabA11y': 'Ejemplo de {label}',
  'paywall.unlockedRestoredTitle': 'Tu Pro fue restaurado',
  'paywall.unlockedReadyTitle': 'Tu Pro está listo',
  'paywall.unlockedSubtitle':
    'Tus datos y ajustes guardados están listos. Continúa cuando quieras.',
  'paywall.defaultSubtitle':
    'Ajuste personal para tu doblador, con más precisión en cada trabajo.',
  'paywall.readyOnDevice': 'Listo para usar en este dispositivo',
  'paywall.readyCalibrationNote':
    'Ten a mano tu doblador, un tramo de conducto sobrante y cinta métrica. Los ajustes solo cambian al guardar.',
  'paywall.readyDefaultNote':
    'Tu cálculo original y el historial reciente se conservan.',
  'paywall.benefit1.title': 'Calibración personal',
  'paywall.benefit1.desc': 'Usa tu propia recogida y radio de doblez.',
  'paywall.benefit2.title': 'Verificaciones detalladas',
  'paywall.benefit2.desc': 'Revisa el espacio libre y explora alternativas.',
  'paywall.benefit3.title': 'Historial y exportación de texto',
  'paywall.benefit3.desc': 'Guarda tus últimos {limit} dobleces y compártelos.',
  'paywall.freePromise':
    'Las nueve calculadoras y las alertas de seguridad siguen siendo gratuitas.',
  'paywall.hideExample': 'Ocultar ejemplo −',
  'paywall.showExample': 'Ver Pro en práctica +',
  'paywall.exampleHeader': 'Ejemplo ilustrativo · sin cambiar tus ajustes',
  'paywall.exampleCalibrationIntro':
    'Un doblez de prueba marcado en {mark} termina en {measured}.',
  'paywall.exampleStandardTakeUp': 'Recogida estándar',
  'paywall.exampleMeasuredTakeUp': 'Recogida medida',
  'paywall.exampleMarkLabel': 'Marca para la misma subida objetivo',
  'paywall.exampleCalibrationNote':
    'Usa tu propia medición tras desbloquear. Verificación rápida ajusta la recogida; Huella completa calcula el radio de doblez.',
  'paywall.exampleFeasibilityTitle': 'Ejemplo: espacio ajustado entre dobleces',
  'paywall.exampleFeasibilityFallback':
    'El doblez seleccionado necesita más espacio.',
  'paywall.exampleFeasibilityNext': 'Pro agrega el siguiente paso',
  'paywall.exampleFeasibilityNote':
    'Solo vista previa. Verifica tus medidas reales y el doblador elegido; las alertas de riesgo gratuitas siguen visibles.',
  'paywall.exampleFreeLabel': 'Gratis',
  'paywall.exampleFreeValue': 'Últimos 5',
  'paywall.exampleProLabel': 'Pro',
  'paywall.exampleProValue': 'Últimos {limit}',
  'paywall.exampleExportTitle': 'Ejemplo de exportación de texto',
  'paywall.exampleExportSample':
    'Desplazamiento · {height} · 30°\nDistancia {spacing} · contracción {shrink}',
  'paywall.exampleHistoryNote':
    'Los últimos {limit} dobleces se guardan en este dispositivo. Exporta antes de que se reemplacen los anteriores. No incluye almacenamiento ilimitado ni respaldo en la nube.',
  'paywall.faqHeading': 'Información útil',
  'paywall.faq1.q': '¿Es una suscripción?',
  'paywall.faq1.a':
    'No. Pro es una compra única para esta app. No hay cargos recurrentes.',
  'paywall.faq2.q': '¿Qué sigue siendo gratis?',
  'paywall.faq2.a':
    'Las nueve calculadoras, valores estándar de dobladores, diagramas básicos y alertas de seguridad siguen siendo gratis. Pro agrega calibración personal, opciones detalladas de doblez, perfiles guardados y exportación del historial reciente.',
  'paywall.faq3.q': '¿Qué necesito para calibrar?',
  'paywall.faq3.a':
    'Necesitas tu doblador, un tramo de conducto sobrante y cinta métrica. Verificación rápida usa una medida de altura final. Huella completa usa ambos lados de un doblez de prueba de 90° para calcular el radio.',
  'paywall.faq4.q': '¿Puedo restaurar mi compra?',
  'paywall.faq4.a':
    'Sí. En Android, usa la misma cuenta de Google Play y elige Restaurar compra. Si ya desbloqueaste Pro, sigue funcionando sin conexión en este dispositivo. Los perfiles de doblador y el historial reciente se guardan localmente.',
  'paywall.statusPending':
    'Pago pendiente. Pro se desbloqueará cuando Google Play lo confirme. No vuelvas a comprar.',
  'paywall.statusPurchasing':
    'Esperando a Google Play. Puedes seguir usando las calculadoras gratuitas.',
  'paywall.statusRestoring': 'Verificando compras de tu cuenta…',
  'paywall.statusLoading': 'Consultando tu compra y el precio local…',
  'paywall.openingTask': 'Abriendo tu tarea…',
  'paywall.continue.calibration': 'Iniciar calibración del doblador',
  'paywall.continue.feasibility': 'Ver alternativas de doblez',
  'paywall.continue.history': 'Ver mis dobleces recientes',
  'paywall.continue.export': 'Exportar mis dobleces recientes',
  'paywall.continue.bender': 'Seguir agregando mi doblador',
  'paywall.webCaption':
    'Pro está disponible en la app de Android. Google Play muestra tu precio local.',
  'paywall.getAndroidApp': 'Obtener la app de Android',
  'paywall.checkingPurchase': 'Verificando compra…',
  'paywall.checkPurchaseStatus': 'Verificar estado de compra',
  'paywall.restoringPurchase': 'Restaurando compra…',
  'paywall.loadingPrice': 'Cargando precio…',
  'paywall.oneTimeNote': 'Pago único · Sin suscripción',
  'paywall.unlockCta': 'Desbloquear Pro de por vida',
  'paywall.storeUnavailableCaption':
    'No se pudo cargar el precio de la tienda. Las calculadoras gratuitas siguen disponibles.',
  'paywall.retryStore': 'Reintentar conexión con la tienda',
  'paywall.restorePurchase': 'Restaurar compra',
  'paywall.backToCalculators': 'Volver a calculadoras',
  'paywall.continueWithFree': 'Seguir con Gratis',
  'paywall.notNow': 'Ahora no',
  'paywall.actionError':
    'No se pudo completar esta acción. Inténtalo de nuevo.',

  // 核心计算器公共与 4 大高频计算器
  'calc.bender': 'Doblador',
  'calc.benderA11y': 'Doblador: {name}. Toca para cambiar',
  'calc.conduitMaterial': 'Material del conducto',
  'calc.conduitMaterialA11y': 'Material del conducto {option}',
  'calc.usingProfile': 'Usando {name}',
  'calc.standardBenderNotice':
    'Calculado con valores estándar de doblador.',
  'calc.obstacleHeight': 'Altura del obstáculo',
  'calc.obstacleWidth': 'Ancho del obstáculo',
  'calc.bendAngle': 'Ángulo de doblez',
  'calc.enterValuesHint': 'Ingresa valores para ver los resultados',
  'calc.presets': 'Preajustes:',
  'calc.viewAll': 'Ver todo →',
  'calc.center': 'Centro',
  'calc.bendSpacing': 'Distancia entre dobleces',
  'calc.markLayoutSpan': 'Trazado de marcas · largo total {span}',
  'offset.guideSummary':
    'Separa las dos marcas {distance}. Alinea cada marca con la flecha y dobla {angle}° en direcciones opuestas.',
  'stub.quickEmtPresets': 'Tamaños EMT rápidos',
  'stub.markLocationShort': 'Ubicación de la marca',
  'stub.mustExceedTakeUp': 'La altura objetivo debe superar la recogida',
  'stub.datumHook': 'el frente del gancho',
  'stub.datumArrow': 'la flecha',
  'stub.guideSummary':
    'Mide {mark} desde el extremo del conducto. Alinea la marca con {datum} y dobla 90°.',
  'stub.recentBends': 'Subidas de 90° recientes (toca para rellenar)',
  'saddle3.bendSpacing': 'Distancia entre dobleces (centro ↔ lados)',
  'saddle3.centerMarkShrink': 'Contracción de la marca central',
  'saddle3.addToCenterMark': 'Sumar a la marca central',
  'saddle4.bendSpacing': 'Distancia entre dobleces (borde ↔ doblez)',
  'saddle4.clearanceNote':
    'Deja aproximadamente {clearance} después de las marcas interiores para que el conducto libre el obstáculo.',
  'saddle4.fixedPointNote':
    '¿Mides desde un punto fijo? Suma {shrink} de contracción para hallar el centro real.',
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
