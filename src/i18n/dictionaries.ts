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
  'nav.stubUp': '90° Stub',
  'nav.saddle3': '3-Point Saddle',
  'nav.conduitFill': 'Conduit Fill',
  'nav.saddle4': '4-Point Saddle',
  'nav.shrink': 'Shrink',
  'nav.rollingOffset': 'Rolling Offset',
  'nav.kicked90': 'Kicked 90°',
  'nav.wireSize': 'Wire Size',
  'nav.voltageDrop': 'Voltage Drop',
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
  'placeholder.mm200': 'e.g. 200 mm',
  'placeholder.mm300': 'e.g. 300 mm',
  'placeholder.inch4': 'e.g. 4"',
  'placeholder.inch6': 'e.g. 6"',
  'placeholder.inch8': 'e.g. 8"',
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

  // /3-point-saddle
  'saddle3.seoHint': 'Enter obstacle height, pick 45° or 60° center bend, tap Save to history.',
  'saddle3.heightLabel': 'Obstacle height (OD)',
  'saddle3.preset45Hint': '22.5° sides · × 2.5',
  'saddle3.preset60Hint': '30° sides · × 2.0',
  'saddle3.markSpacing': 'Side mark spacing (from center)',
  'saddle3.totalSpan': 'Mark 1 → Mark 3 (total span)',
  'saddle3.centerShrink': 'Center mark shrink (add to center)',
  'saddle3.anglesLabel': 'Center / side bend angles',
  'saddle3.marksFromCenter': 'Marks left → right of center',
  'saddle3.whatTitle': 'What is a 3-point saddle?',
  'saddle3.chartTitle': '3-point saddle multiplier & shrink chart',
  'saddle3.tableCenter': 'Center bend',
  'saddle3.tableSides': 'Side bends',

  // /conduit-fill
  'conduitFill.seoHint': 'Pick raceway, trade size, and THHN wire size — enter wire count to check NEC fill %.',
  'conduitFill.racewayLabel': 'Raceway type',
  'conduitFill.tradeLabel': 'Trade size (inches)',
  'conduitFill.wireLabel': 'Wire size (THHN / THWN-2)',
  'conduitFill.countLabel': 'Number of wires (optional)',
  'conduitFill.countPlaceholder': 'e.g. 9',
  'conduitFill.countError': 'Enter a whole number of wires (1–999)',
  'conduitFill.maxConductorsHeadline': 'Max {wire} THHN in {trade}" {raceway}',
  'conduitFill.wiresUnit': '{count} wires',
  'conduitFill.yourFill': 'Your fill ({count} wires)',
  'conduitFill.allowedFill': 'NEC allowed fill',
  'conduitFill.racewayArea': 'Raceway area (100%)',
  'conduitFill.wireArea': 'One conductor area',
  'conduitFill.overfilled': 'Overfilled: {count} × {wire} THHN exceeds NEC limit ({allowed}%) for {trade}" {raceway}.',
  'conduitFill.zeroFit': 'Even one conductor of this size does not fit. Go up a trade size.',
  'conduitFill.necNote': 'NEC 2023 Chapter 9 Tables 1, 4 & 5 (PVC = Sch 40): 53% for 1 wire, 31% for 2 wires, 40% for 3+ wires (Note 7 rounding). Nipples ≤24" may fill to 60%.',
  'conduitFill.whatTitle': 'How NEC conduit fill works',
  'conduitFill.chartTitle': 'NEC Table C.1 quick chart (EMT, THHN)',
  'conduitFill.tableTrade': 'EMT size',

  // /rolling-offset
  'rolling.seoHint': 'Enter rise and roll, pick a bend angle, tap Calculate.',
  'rolling.riseLabel': 'Rise (vertical offset)',
  'rolling.rollLabel': 'Roll (horizontal shift)',
  'rolling.markSpacing': 'Mark spacing',
  'rolling.trueOffset': 'True offset √(rise² + roll²)',
  'rolling.shrinkLabel': 'Shrink (add to cut length)',
  'rolling.rotationAngle': 'Bender rotation angle',
  'rolling.whatTitle': 'What is a rolling offset?',
  'rolling.chartTitle': 'Rolling offset multiplier & shrink chart',

  // /kicked-90
  'kicked90.seoHint': 'Pick conduit size, enter stub height and kick height, pick kick angle, tap Calculate.',
  'kicked90.stubHeightLabel': 'Target 90° stub height',
  'kicked90.kickHeightLabel': 'Kick height (elevation)',
  'kicked90.kickAngleLabel': 'Kick angle',
  'kicked90.kickMarkHeadline': 'Kick mark (from back of 90°)',
  'kicked90.stubMarkRow': '90° stub mark (from end)',
  'kicked90.takeUpRow': 'Take-up deduct',
  'kicked90.totalGainRow': 'Total gain (90° + kick)',
  'kicked90.kickShrinkRow': 'Kick shrink',
  'kicked90.whatTitle': 'How to lay out a kicked 90° bend',
  'kicked90.chartTitle': 'Kicked 90° multiplier & EMT take-up chart',

  // /wire-size
  'wireSize.seoHint': 'Enter load amps, choose conductor material, temperature column, and continuous load.',
  'wireSize.ampsLabel': 'Load current (A)',
  'wireSize.ampsPlaceholder': 'e.g. 20',
  'wireSize.ampsError': 'Enter load current between 1 and 2000 A',
  'wireSize.metalLabel': 'Conductor material',
  'wireSize.copper': 'Copper',
  'wireSize.aluminum': 'Aluminum',
  'wireSize.continuousLabel': 'Continuous load (≥ 3 hr, ×125%)',
  'wireSize.continuousNo': 'No',
  'wireSize.continuousYes': 'Yes (×125%)',
  'wireSize.tempLabel': 'Temperature rating (NEC 310.16)',
  'wireSize.tempAuto': 'Auto ({col}°C)',
  'wireSize.tempAutoDefault': 'Auto (110.14(C))',
  'wireSize.headline': 'Minimum NEC wire size',
  'wireSize.ampacityRow': 'Ampacity at {col}°C',
  'wireSize.designLoadRow': 'Design load',
  'wireSize.materialRow': 'Conductor & rating',
  'wireSize.smallRuleNote': 'Sized up by NEC 240.4(D): 14 AWG Cu max 15 A, 12 AWG Cu max 20 A (15 A Al), 10 AWG Cu max 30 A (25 A Al).',
  'wireSize.temp90Warning': '90°C column is for derating only. Final ampacity is limited by 60°C or 75°C equipment terminations (NEC 110.14(C)).',
  'wireSize.over500Error': 'Exceeds 500 kcmil single conductor. Use parallel conductors per NEC 310.10(G).',
  'wireSize.necNote': 'NEC 2023 Table 310.16: up to 3 current-carrying conductors in raceway, 30°C ambient. Apply 310.15 correction factors for hotter ambient or >3 bundled wires.',
  'wireSize.whatTitle': 'How NEC Table 310.16 wire sizing works',
  'wireSize.chartTitle': 'NEC Table 310.16 ampacity chart (Cu & Al)',
  'wireSize.tableSize': 'Size',

  // /voltage-drop
  'voltageDrop.seoHint': 'Pick phase, voltage, conductor, and wire size — enter amps and one-way distance.',
  'voltageDrop.phaseLabel': 'System phase',
  'voltageDrop.phase1': '1φ Single-phase',
  'voltageDrop.phase3': '3φ Three-phase',
  'voltageDrop.voltageLabel': 'System voltage (V)',
  'voltageDrop.customVoltageLabel': 'Custom voltage (V)',
  'voltageDrop.customVoltagePlaceholder': 'e.g. 120',
  'voltageDrop.voltageError': 'Enter voltage between 1 and 1000 V',
  'voltageDrop.ampsLabel': 'Load current (A)',
  'voltageDrop.ampsPlaceholder': 'e.g. 16',
  'voltageDrop.ampsError': 'Enter load current between 1 and 5000 A',
  'voltageDrop.distanceLabel': 'One-way distance ({unit})',
  'voltageDrop.distancePlaceholderFt': 'e.g. 100',
  'voltageDrop.distancePlaceholderM': 'e.g. 30',
  'voltageDrop.distanceError': 'Enter a positive one-way distance',
  'voltageDrop.distanceUnitLabel': 'Distance unit',
  'voltageDrop.wireLabel': 'Wire size (AWG / kcmil)',
  'voltageDrop.limitLabel': 'NEC recommended limit',
  'voltageDrop.limitBranch': 'Branch 3%',
  'voltageDrop.limitTotal': 'Total 5%',
  'voltageDrop.headline': 'Voltage drop (%)',
  'voltageDrop.dropVoltsRow': 'Voltage drop',
  'voltageDrop.endVoltsRow': 'Voltage at load',
  'voltageDrop.statusRow': 'NEC {limit}% check',
  'voltageDrop.statusPass': 'Pass (≤ {limit}%)',
  'voltageDrop.statusFail': 'Over {limit}% limit',
  'voltageDrop.upsizeRow': 'Recommended wire (≤ {limit}%)',
  'voltageDrop.overLimitAlert': 'Over {limit}% NEC limit. Upsize to {wire} {metal} to stay within {limit}%.',
  'voltageDrop.over500Alert': 'Over {limit}% even with 500 kcmil. Shorten the run, raise voltage, or use parallel conductors.',
  'voltageDrop.necNote': 'NEC Chapter 9 Table 8 DC resistance at 75°C (1φ = 2·L·I·R/1000, 3φ = 1.732·L·I·R/1000). 3% branch / 5% total are NEC 210.19(A) Informational Note recommendations.',
  'voltageDrop.whatTitle': 'How NEC voltage drop is calculated',
  'voltageDrop.chartTitle': 'NEC Chapter 9 Table 8 resistance chart (Ω / 1,000 ft)',
  'voltageDrop.tableCu': 'Copper Ω/kft',
  'voltageDrop.tableAl': 'Aluminum Ω/kft',

  // Web SEO Value-First App CTA
  'appCta.eyebrow': 'FREE ANDROID APP · JOBSITE READY',
  'appCta.title': 'Take Conduit Bend Calc offline on the jobsite',
  'appCta.bullet1': '100% offline in basements, vaults, and electrical rooms — zero signal required.',
  'appCta.bullet2': 'Saved bend history on your phone for quick repeat offsets and stubs.',
  'appCta.bullet3': 'Custom bender shoe calibration for Ideal, Klein, and Greenlee heads.',
  'appCta.button': 'Get Free App on Google Play',

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
  'home.tool.guidedCalibration.descTryFree':
    'Measure your bender free · Save & apply with Pro',
  'home.tool.guidedCalibration.freeTryBadge': 'FREE TRY',
  'bender.freeTryBadge': 'Free test',
  'bender.dialInCardBody':
    'Test your bender with one 90° bend to see its real take-up — free to measure.',
  'bender.dialInCta': 'Measure My Bender Free',
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
  'history.limitHiddenTitleOne': '{count} bends saved · 1 older bend hidden',
  'history.limitHiddenTitleMany': '{count} bends saved · {hidden} older bends hidden',
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
  'paywall.personalCalibrationTitle': 'Save your {delta} bender calibration',
  'paywall.personalCalibrationIntro': 'Measured from your test bend for "{name}".',
  'paywall.personalCalibrationNote':
    'Your test bend · ready to save to all bend calculators',
  'paywall.demoDeltaLabel': 'Try a sample take-up offset',
  'paywall.tryFreeCalibrationCta': 'Measure my bender free →',
  'paywall.historyHiddenTitle': '{total} bends saved · {hidden} hidden',
  'paywall.historyHiddenNote':
    '{total} bends saved on this device · {hidden} hidden. Unlock Pro to view all {limit} and export.',
  'paywall.roiAnchor':
    'One saved stick of conduit pays for it — one-time purchase, no subscription.',
  'paywall.continue.saveAndApplyDraft': 'Save & Apply "{name}"',
  'paywall.readyDraftNote':
    'Your measured calibration "{name}" is ready. Tap below to save and apply it to all bend calculators.',

  // 校准向导与 Full Fingerprint
  'calibration.draftAppliedToast': 'Saved & applied "{name}" to all bend calculators',
  'calibration.chooser.intro':
    'Free calculators use standard bender values. Run a free test bend to measure your own tool — save & apply to all bend calculators with Pro.',
  'calibration.chooser.introUnlocked':
    'Free calculators use standard bender values. Use a test bend to match take-up or bend radius to your own tool. Have your bender, scrap conduit and tape measure ready.',
  'calibration.chooser.quickBadge': 'Recommended · 1 measurement',
  'calibration.chooser.quickTitle': 'Quick Check',
  'calibration.chooser.quickBody':
    'Bend one {mark} stub with your bender\'s standard take-up, enter the finished height, and see your real take-up immediately.',
  'calibration.chooser.quickCta': 'Start Quick Check',
  'calibration.chooser.fullTitle': 'Full Fingerprint',
  'calibration.chooser.fullBody':
    'Cut {length} of scrap, bend a 90° in the middle, measure both legs — the app derives your bender\'s true centerline radius.',
  'calibration.chooser.fullCta': 'Start Full Fingerprint',
  'calibration.guided.stepTitle1': 'Mark the conduit',
  'calibration.guided.stepTitle2': 'Bend 90°',
  'calibration.guided.stepTitle3': 'Measure the stub',
  'calibration.guided.stepTitle4': 'Save your bender',
  'calibration.guided.progress': 'Quick Check · Step {current} of {total} · {title}',
  'calibration.guided.calibrating': 'Calibrating: {name}',
  'calibration.guided.step1Heading': 'Mark {mark} from the end',
  'calibration.guided.step1Body':
    'Measure from the end of the conduit and make one clear mark. This is the only measurement you need before bending.',
  'calibration.guided.step1Diagram': 'End ─────●───── {mark} mark',
  'calibration.guided.step2Heading': 'Bend a 90° stub',
  'calibration.guided.step2Body':
    'Line the {datum} up with your mark, then bend a full 90° stub. Keep the conduit seated in the bender.',
  'calibration.guided.step2Diagram': '{datum} ▼\nEnd ─────●───── mark\n           90°',
  'calibration.guided.skipToMeasure': 'Already bent? Enter measurement →',
  'calibration.guided.step3Heading': 'Enter the finished stub height',
  'calibration.guided.step3Body':
    'Measure from the end of the conduit to the back of the bend. Type the finished height S below.',
  'calibration.guided.stubInputLabel': 'Finished stub height (S)',
  'calibration.guided.stubPlaceholderMetric': 'e.g. 440 mm',
  'calibration.guided.stubPlaceholderImperial': 'e.g. 17 3/8"',
  'calibration.guided.finishedHeightRow': 'Finished height (S)',
  'calibration.guided.deductRow': 'Deduct (S − {mark})',
  'calibration.guided.diagnosisTitle': 'Your bender diagnosis',
  'calibration.guided.standardTakeUp': 'Standard take-up',
  'calibration.guided.measuredTakeUp': 'Measured take-up',
  'calibration.guided.markCompareLabel': 'Mark for a {target} stub',
  'calibration.guided.step4Heading': 'Calibrated ✓',
  'calibration.guided.step4Body':
    'Your bender is matched to your test bend. Give it a name you will recognize on the job.',
  'calibration.guided.nameLabel': 'Profile name',
  'calibration.guided.defaultName': 'My {label}',
  'calibration.guided.defaultNameFallback': 'My bender',
  'calibration.guided.namePlaceholder': 'e.g. My {label}',
  'calibration.guided.namePlaceholderFallback': 'e.g. My bender',
  'calibration.guided.back': 'Back',
  'calibration.guided.next': 'Next',
  'calibration.guided.saveAndApply': 'Save & Apply to All Bend Calculators',
  'calibration.full.step1Title': 'Step 1: Pick the bender to calibrate',
  'calibration.full.step2Title': 'Step 2: Calibrate R with the gain method (optional)',
  'calibration.full.step2Hint':
    'Cut a scrap of conduit and measure its exact length L₀ ({length} is pre-filled — change it if yours differs). Bend a 90° in the middle, then measure each leg from the back of the bend to the end of the conduit: hook your tape on the back of the 90°, the trade method.',
  'calibration.full.scrapLength': 'Scrap length L₀',
  'calibration.full.legA': 'Leg A',
  'calibration.full.legB': 'Leg B',
  'calibration.full.gainRow': 'Gain (A+B−L₀)',
  'calibration.full.radiusRow': 'Calibrated radius R',
  'calibration.full.step3Title': 'Step 3: Calibrate take-up with the stub method (optional)',
  'calibration.full.step3Hint':
    'Bend a stub to the target height using the current take-up, then measure the actual height you got.',
  'calibration.full.targetHeight': 'Target height',
  'calibration.full.actualHeight': 'Actual height',
  'calibration.full.oldTakeUp': 'Old take-up ({name})',
  'calibration.full.calibratedTakeUp': 'Calibrated take-up',
  'calibration.full.step4Title': 'Step 4: Save as a custom bender',
  'calibration.full.step4Hint':
    'Uncalibrated values keep the Step 1 spec. Saved on this device and available in every calculator\'s bender picker.',
  'calibration.full.namePlaceholder': 'Name it, e.g. My Ideal (field-tested)',
  'calibration.full.saveButton': 'Save as Custom',
  'calibration.full.savingButton': 'Saving…',
  'calibration.full.savedMessage':
    'Saved "{name}": R={radius}, take-up={takeUp} — now selected as the bender for all calculators and available in every bender picker.',
  'calibration.full.placeholderExample': 'e.g. {value}',

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

  // 评分引导卡
  'rating.title': 'Rate Conduit Bend Calc',
  'rating.bodyWeb':
    'Use the Android app? Share your experience on Google Play.',
  'rating.bodyNative':
    'Share your experience on Google Play. Your review helps other electricians choose their tools.',
  'rating.button': 'Rate on Google Play',
  'rating.opening': 'Opening Google Play…',
  'rating.error':
    'Could not open Google Play. Check your connection and try again.',
} as const;

export type TranslationKey = keyof typeof en;

/**
 * 西班牙语（美国电工习惯，非机翻）。术语：desplazamiento / conducto /
 * contracción / ángulo de doblado / distancia entre marcas / subida de 90°.
 */
export const es: Record<TranslationKey, string> = {
  'nav.offset': 'Desplazamiento',
  'nav.stubUp': 'Subida de 90°',
  'nav.saddle3': 'Silla 3 pts',
  'nav.conduitFill': 'Llenado NEC',
  'nav.saddle4': 'Silla de 4 puntos',
  'nav.shrink': 'Contracción',
  'nav.rollingOffset': 'Compuesto',
  'nav.kicked90': '90° con kick',
  'nav.wireSize': 'Calibre AWG',
  'nav.voltageDrop': 'Caída tensión',
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
  'placeholder.mm200': 'p. ej. 200 mm',
  'placeholder.mm300': 'p. ej. 300 mm',
  'placeholder.inch4': 'p. ej. 4"',
  'placeholder.inch6': 'p. ej. 6"',
  'placeholder.inch8': 'p. ej. 8"',
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

  // /3-point-saddle
  'saddle3.seoHint': 'Ingresa la altura del obstáculo, elige centro de 45° o 60° y guarda en el historial.',
  'saddle3.heightLabel': 'Altura del obstáculo (DE)',
  'saddle3.preset45Hint': 'lados 22.5° · × 2.5',
  'saddle3.preset60Hint': 'lados 30° · × 2.0',
  'saddle3.markSpacing': 'Distancia lateral (desde el centro)',
  'saddle3.totalSpan': 'Marca 1 → Marca 3 (largo total)',
  'saddle3.centerShrink': 'Contracción central (sumar al centro)',
  'saddle3.anglesLabel': 'Ángulos centro / lados',
  'saddle3.marksFromCenter': 'Marcas de izquierda a derecha del centro',
  'saddle3.whatTitle': '¿Qué es una silla de 3 puntos?',
  'saddle3.chartTitle': 'Tabla de multiplicador y contracción (3 puntos)',
  'saddle3.tableCenter': 'Doblez central',
  'saddle3.tableSides': 'Doblez lateral',

  // /conduit-fill
  'conduitFill.seoHint': 'Elige conducto, tamaño comercial y calibre THHN — agrega cantidad de cables para verificar el % NEC.',
  'conduitFill.racewayLabel': 'Tipo de conducto',
  'conduitFill.tradeLabel': 'Tamaño comercial (pulg.)',
  'conduitFill.wireLabel': 'Calibre del cable (THHN / THWN-2)',
  'conduitFill.countLabel': 'Cantidad de cables (opcional)',
  'conduitFill.countPlaceholder': 'p. ej. 9',
  'conduitFill.countError': 'Ingresa un número entero de cables (1–999)',
  'conduitFill.maxConductorsHeadline': 'Máx. {wire} THHN en {trade}" {raceway}',
  'conduitFill.wiresUnit': '{count} cables',
  'conduitFill.yourFill': 'Tu llenado ({count} cables)',
  'conduitFill.allowedFill': 'Llenado permitido NEC',
  'conduitFill.racewayArea': 'Área del conducto (100%)',
  'conduitFill.wireArea': 'Área de un conductor',
  'conduitFill.overfilled': 'Excedido: {count} × {wire} THHN supera el límite NEC ({allowed}%) para {trade}" {raceway}.',
  'conduitFill.zeroFit': 'Ni siquiera un conductor de este calibre cabe. Sube al siguiente tamaño comercial.',
  'conduitFill.necNote': 'NEC 2023 Cap. 9 Tablas 1, 4 y 5 (PVC = Cédula 40): 53% para 1 cable, 31% para 2, 40% para 3 o más (redondeo Nota 7). Niples ≤24" permiten hasta 60%.',
  'conduitFill.whatTitle': 'Cómo funciona el llenado de conducto NEC',
  'conduitFill.chartTitle': 'Tabla rápida NEC C.1 (EMT, THHN)',
  'conduitFill.tableTrade': 'Tamaño EMT',

  // /rolling-offset
  'rolling.seoHint': 'Ingresa subida y avance lateral, elige un ángulo y pulsa Calcular.',
  'rolling.riseLabel': 'Subida (desplazamiento vertical)',
  'rolling.rollLabel': 'Avance lateral (roll)',
  'rolling.markSpacing': 'Distancia entre marcas',
  'rolling.trueOffset': 'Desplazamiento real √(subida² + avance²)',
  'rolling.shrinkLabel': 'Contracción (sumar al largo de corte)',
  'rolling.rotationAngle': 'Ángulo de rotación de dobladora',
  'rolling.whatTitle': '¿Qué es un desplazamiento compuesto?',
  'rolling.chartTitle': 'Tabla de multiplicador y contracción',

  // /kicked-90
  'kicked90.seoHint': 'Elige el tamaño del conducto, ingresa altura de subida y del kick, ángulo y pulsa Calcular.',
  'kicked90.stubHeightLabel': 'Altura objetivo de subida de 90°',
  'kicked90.kickHeightLabel': 'Altura del kick (elevación)',
  'kicked90.kickAngleLabel': 'Ángulo del kick',
  'kicked90.kickMarkHeadline': 'Marca del kick (desde atrás del 90°)',
  'kicked90.stubMarkRow': 'Marca de subida 90° (desde extremo)',
  'kicked90.takeUpRow': 'Recogida (take-up)',
  'kicked90.totalGainRow': 'Ganancia total (90° + kick)',
  'kicked90.kickShrinkRow': 'Contracción del kick',
  'kicked90.whatTitle': 'Cómo trazar un codo de 90° con kick',
  'kicked90.chartTitle': 'Tabla de multiplicadores de kick y recogida EMT',

  // /wire-size
  'wireSize.seoHint': 'Ingresa la corriente de carga, elige material, columna de temperatura y carga continua.',
  'wireSize.ampsLabel': 'Corriente de carga (A)',
  'wireSize.ampsPlaceholder': 'p. ej. 20',
  'wireSize.ampsError': 'Ingresa una corriente entre 1 y 2000 A',
  'wireSize.metalLabel': 'Material del conductor',
  'wireSize.copper': 'Cobre',
  'wireSize.aluminum': 'Aluminio',
  'wireSize.continuousLabel': 'Carga continua (≥ 3 h, ×125%)',
  'wireSize.continuousNo': 'No',
  'wireSize.continuousYes': 'Sí (×125%)',
  'wireSize.tempLabel': 'Columna de temperatura (NEC 310.16)',
  'wireSize.tempAuto': 'Auto ({col}°C)',
  'wireSize.tempAutoDefault': 'Auto (110.14(C))',
  'wireSize.headline': 'Calibre mínimo NEC',
  'wireSize.ampacityRow': 'Ampacidad a {col}°C',
  'wireSize.designLoadRow': 'Corriente de diseño',
  'wireSize.materialRow': 'Conductor y temperatura',
  'wireSize.smallRuleNote': 'Ajustado por NEC 240.4(D): 14 AWG Cu máx. 15 A, 12 AWG Cu máx. 20 A (15 A Al), 10 AWG Cu máx. 30 A (25 A Al).',
  'wireSize.temp90Warning': 'La columna de 90°C es solo para factores de corrección. Las terminales limitan la ampacidad final a 60°C o 75°C (NEC 110.14(C)).',
  'wireSize.over500Error': 'Supera un solo conductor de 500 kcmil. Usa conductores en paralelo según NEC 310.10(G).',
  'wireSize.necNote': 'NEC 2023 Tabla 310.16: hasta 3 conductores portadores en conducto a 30°C ambiente. Aplica factores NEC 310.15 con mayor temperatura o más de 3 cables.',
  'wireSize.whatTitle': 'Cómo funciona la selección de calibre NEC 310.16',
  'wireSize.chartTitle': 'Tabla de ampacidad NEC 310.16 (Cobre y Aluminio)',
  'wireSize.tableSize': 'Calibre',

  // /voltage-drop
  'voltageDrop.seoHint': 'Elige fases, voltaje, conductor y calibre — ingresa amperios y distancia de ida.',
  'voltageDrop.phaseLabel': 'Sistema eléctrico',
  'voltageDrop.phase1': '1φ Monofásico',
  'voltageDrop.phase3': '3φ Trifásico',
  'voltageDrop.voltageLabel': 'Voltaje del sistema (V)',
  'voltageDrop.customVoltageLabel': 'Voltaje personalizado (V)',
  'voltageDrop.customVoltagePlaceholder': 'p. ej. 120',
  'voltageDrop.voltageError': 'Ingresa un voltaje entre 1 y 1000 V',
  'voltageDrop.ampsLabel': 'Corriente de carga (A)',
  'voltageDrop.ampsPlaceholder': 'p. ej. 16',
  'voltageDrop.ampsError': 'Ingresa una corriente entre 1 y 5000 A',
  'voltageDrop.distanceLabel': 'Distancia de ida ({unit})',
  'voltageDrop.distancePlaceholderFt': 'p. ej. 100',
  'voltageDrop.distancePlaceholderM': 'p. ej. 30',
  'voltageDrop.distanceError': 'Ingresa una distancia de ida mayor que 0',
  'voltageDrop.distanceUnitLabel': 'Unidad de distancia',
  'voltageDrop.wireLabel': 'Calibre del cable (AWG / kcmil)',
  'voltageDrop.limitLabel': 'Límite recomendado NEC',
  'voltageDrop.limitBranch': 'Derivado 3%',
  'voltageDrop.limitTotal': 'Total 5%',
  'voltageDrop.headline': 'Caída de tensión (%)',
  'voltageDrop.dropVoltsRow': 'Caída en voltios',
  'voltageDrop.endVoltsRow': 'Voltaje en la carga',
  'voltageDrop.statusRow': 'Revisión NEC {limit}%',
  'voltageDrop.statusPass': 'Cumple (≤ {limit}%)',
  'voltageDrop.statusFail': 'Excede límite {limit}%',
  'voltageDrop.upsizeRow': 'Calibre sugerido (≤ {limit}%)',
  'voltageDrop.overLimitAlert': 'Supera el {limit}% NEC. Sube a {wire} {metal} para mantenerte bajo {limit}%.',
  'voltageDrop.over500Alert': 'Supera el {limit}% incluso con 500 kcmil. Acorta el conducto, eleva el voltaje o usa cables en paralelo.',
  'voltageDrop.necNote': 'Resistencia CC Tabla 8 Cap. 9 NEC a 75°C (1φ = 2·L·I·R/1000, 3φ = 1,732·L·I·R/1000). 3% derivado / 5% total son recomendaciones de NEC 210.19(A).',
  'voltageDrop.whatTitle': 'Cómo se calcula la caída de tensión NEC',
  'voltageDrop.chartTitle': 'Tabla de resistencia NEC Cap. 9 Tabla 8 (Ω / 1.000 ft)',
  'voltageDrop.tableCu': 'Cobre Ω/kft',
  'voltageDrop.tableAl': 'Aluminio Ω/kft',

  // Web SEO Value-First App CTA
  'appCta.eyebrow': 'APP ANDROID GRATIS · LISTA PARA OBRA',
  'appCta.title': 'Lleva Conduit Bend Calc sin conexión a la obra',
  'appCta.bullet1': '100% sin conexión en sótanos y cuartos eléctricos — sin señal.',
  'appCta.bullet2': 'Historial de dobleces guardado en tu teléfono para repetir al instante.',
  'appCta.bullet3': 'Calibración personalizada de tu doblador Ideal, Klein o Greenlee.',
  'appCta.button': 'Descargar app gratis en Google Play',

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
  'home.tool.guidedCalibration.descTryFree':
    'Mide tu doblador gratis · Guarda y aplica con Pro',
  'home.tool.guidedCalibration.freeTryBadge': 'GRATIS',
  'bender.freeTryBadge': 'Prueba gratis',
  'bender.dialInCardBody':
    'Prueba tu doblador con un doblez de 90° para ver su recogida real — medición gratis.',
  'bender.dialInCta': 'Medir mi doblador gratis',
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
  'history.limitHiddenTitleOne': '{count} dobleces guardados · 1 anterior oculto',
  'history.limitHiddenTitleMany': '{count} dobleces guardados · {hidden} anteriores ocultos',
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
  'paywall.personalCalibrationTitle': 'Guarda tu calibración de {delta}',
  'paywall.personalCalibrationIntro':
    'Medido con tu doblez de prueba para "{name}".',
  'paywall.personalCalibrationNote':
    'Tu doblez de prueba · listo para guardar en todas las calculadoras de doblado',
  'paywall.demoDeltaLabel': 'Prueba una desviación de recogida',
  'paywall.tryFreeCalibrationCta': 'Medir mi doblador gratis →',
  'paywall.historyHiddenTitle': '{total} dobleces guardados · {hidden} ocultos',
  'paywall.historyHiddenNote':
    '{total} dobleces guardados en este dispositivo · {hidden} ocultos. Desbloquea Pro para ver los {limit} y exportar.',
  'paywall.roiAnchor':
    'Ahorra un solo conducto y se paga solo — pago único, sin suscripción.',
  'paywall.continue.saveAndApplyDraft': 'Guardar y aplicar "{name}"',
  'paywall.readyDraftNote':
    'Tu calibración medida "{name}" está lista. Toca abajo para guardarla y aplicarla a todas las calculadoras de doblado.',

  // 校准向导与 Full Fingerprint
  'calibration.draftAppliedToast':
    '"{name}" guardado y aplicado a todas las calculadoras de doblado',
  'calibration.chooser.intro':
    'Las calculadoras gratuitas usan valores estándar. Haz un doblez de prueba gratis para medir tu herramienta — guarda y aplica en todas las calculadoras de doblado con Pro.',
  'calibration.chooser.introUnlocked':
    'Las calculadoras usan valores estándar. Usa un doblez de prueba para ajustar la recogida o el radio a tu herramienta. Ten a mano tu doblador, un tramo sobrante de conducto y cinta métrica.',
  'calibration.chooser.quickBadge': 'Recomendado · 1 medida',
  'calibration.chooser.quickTitle': 'Verificación rápida',
  'calibration.chooser.quickBody':
    'Dobla una subida de {mark} con la recogida estándar de tu doblador, ingresa la altura final y ve tu recogida real al instante.',
  'calibration.chooser.quickCta': 'Iniciar verificación rápida',
  'calibration.chooser.fullTitle': 'Huella completa',
  'calibration.chooser.fullBody':
    'Corta {length} de conducto sobrante, dobla 90° en el centro y mide ambos lados — la app calcula el radio real de tu doblador.',
  'calibration.chooser.fullCta': 'Iniciar huella completa',
  'calibration.guided.stepTitle1': 'Marca el conducto',
  'calibration.guided.stepTitle2': 'Dobla 90°',
  'calibration.guided.stepTitle3': 'Mide la subida',
  'calibration.guided.stepTitle4': 'Guarda tu doblador',
  'calibration.guided.progress':
    'Verificación rápida · Paso {current} de {total} · {title}',
  'calibration.guided.calibrating': 'Calibrando: {name}',
  'calibration.guided.step1Heading': 'Marca {mark} desde el extremo',
  'calibration.guided.step1Body':
    'Mide desde el extremo del conducto y haz una marca clara. Es la única medida que necesitas antes de doblar.',
  'calibration.guided.step1Diagram': 'Extremo ─────●───── marca {mark}',
  'calibration.guided.step2Heading': 'Dobla una subida de 90°',
  'calibration.guided.step2Body':
    'Alinea {datum} con tu marca y dobla una subida completa de 90°. Mantén el conducto bien asentado en el doblador.',
  'calibration.guided.step2Diagram':
    '{datum} ▼\nExtremo ─────●───── marca\n           90°',
  'calibration.guided.skipToMeasure': '¿Ya doblaste? Ingresa la medida →',
  'calibration.guided.step3Heading': 'Ingresa la altura final de la subida',
  'calibration.guided.step3Body':
    'Mide desde el extremo del conducto hasta la espalda del doblez. Escribe la altura final S abajo.',
  'calibration.guided.stubInputLabel': 'Altura final de la subida (S)',
  'calibration.guided.stubPlaceholderMetric': 'p. ej. 440 mm',
  'calibration.guided.stubPlaceholderImperial': 'p. ej. 17 3/8"',
  'calibration.guided.finishedHeightRow': 'Altura final (S)',
  'calibration.guided.deductRow': 'Recogida (S − {mark})',
  'calibration.guided.diagnosisTitle': 'Diagnóstico de tu doblador',
  'calibration.guided.standardTakeUp': 'Recogida estándar',
  'calibration.guided.measuredTakeUp': 'Recogida medida',
  'calibration.guided.markCompareLabel': 'Marca para una subida de {target}',
  'calibration.guided.step4Heading': 'Calibrado ✓',
  'calibration.guided.step4Body':
    'Tu doblador ya coincide con tu doblez de prueba. Ponle un nombre fácil de reconocer en obra.',
  'calibration.guided.nameLabel': 'Nombre del perfil',
  'calibration.guided.defaultName': 'Mi {label}',
  'calibration.guided.defaultNameFallback': 'Mi doblador',
  'calibration.guided.namePlaceholder': 'p. ej. Mi {label}',
  'calibration.guided.namePlaceholderFallback': 'p. ej. Mi doblador',
  'calibration.guided.back': 'Atrás',
  'calibration.guided.next': 'Siguiente',
  'calibration.guided.saveAndApply':
    'Guardar y aplicar a todas las calculadoras de doblado',
  'calibration.full.step1Title': 'Paso 1: Elige el doblador a calibrar',
  'calibration.full.step2Title':
    'Paso 2: Calibra R con el método de ganancia (opcional)',
  'calibration.full.step2Hint':
    'Corta un tramo sobrante de conducto y mide su largo exacto L₀ ({length} viene prellenado — cámbialo si el tuyo es distinto). Dobla 90° en el centro y mide cada lado desde la espalda del doblez hasta el extremo del conducto.',
  'calibration.full.scrapLength': 'Largo sobrante L₀',
  'calibration.full.legA': 'Lado A',
  'calibration.full.legB': 'Lado B',
  'calibration.full.gainRow': 'Ganancia (A+B−L₀)',
  'calibration.full.radiusRow': 'Radio calibrado R',
  'calibration.full.step3Title':
    'Paso 3: Calibra la recogida con una subida (opcional)',
  'calibration.full.step3Hint':
    'Dobla una subida a la altura objetivo usando la recogida actual y luego mide la altura real obtenida.',
  'calibration.full.targetHeight': 'Altura objetivo',
  'calibration.full.actualHeight': 'Altura real',
  'calibration.full.oldTakeUp': 'Recogida anterior ({name})',
  'calibration.full.calibratedTakeUp': 'Recogida calibrada',
  'calibration.full.step4Title': 'Paso 4: Guardar como doblador personalizado',
  'calibration.full.step4Hint':
    'Los valores sin calibrar conservan el ajuste del Paso 1. Se guarda en este dispositivo y queda disponible en todas las calculadoras.',
  'calibration.full.namePlaceholder':
    'Ponle nombre, p. ej. Mi Ideal (probado en obra)',
  'calibration.full.saveButton': 'Guardar como personalizado',
  'calibration.full.savingButton': 'Guardando…',
  'calibration.full.savedMessage':
    'Guardado "{name}": R={radius}, recogida={takeUp} — seleccionado para todas las calculadoras y disponible en el selector de dobladores.',
  'calibration.full.placeholderExample': 'p. ej. {value}',

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

  // 评分引导卡
  'rating.title': 'Califica Conduit Bend Calc',
  'rating.bodyWeb':
    '¿Usas la app de Android? Comparte tu experiencia en Google Play.',
  'rating.bodyNative':
    'Comparte tu experiencia en Google Play. Tu reseña ayuda a otros electricistas a elegir sus herramientas.',
  'rating.button': 'Calificar en Google Play',
  'rating.opening': 'Abriendo Google Play…',
  'rating.error':
    'No se pudo abrir Google Play. Revisa tu conexión e inténtalo de nuevo.',
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
