/**
 * P0 SEO 工具页元数据（单一口径来源）。
 *
 * 纯数据模块：不依赖 react-native，可被 Web 屏幕与
 * scripts/gen-seo-tool-shells.ts（Node 类型剥离）同时 import，
 * 保证屏幕内容与静态 HTML 的 title/description/FAQ schema 永远一致。
 *
 * 多语言（2026-10-05）：
 * - 英语文案平铺在 meta 上（title/description/h1/tagline/faqs），保持既有调用点不变；
 * - 西班牙语文案集中在 `es`，结构完全一致（见 toolPages.test.ts 的逐字段断言）；
 * - 运行时/生成脚本统一经 `getSeoToolPageCopy(page, lang)` 取文案，杜绝漂移。
 *
 * 约定：title ≤ 60 字符（含 ` | WattFlow` 品牌后缀，见 src/seo/brand.ts
 * 的 withBrandTitle）、description ≤ 160 字符（见 toolPages.test.ts 断言）。
 */

import { en, es } from '../i18n/dictionaries.ts';
import { DEFAULT_LANG, type Lang } from '../i18n/lang.ts';

export type SeoToolKey = 'offset' | 'saddle4' | 'shrink' | 'stubUp';

export interface SeoFaqItem {
  question: string;
  /** 纯文本答案（同一份文案用于页面展示与 FAQPage JSON-LD）。 */
  answer: string;
}

/** 单个语言下的页面文案。 */
export interface SeoToolPageCopy {
  /** <title>，含目标关键词，≤ 60 字符。 */
  title: string;
  /** <meta description>，含关键词，≤ 160 字符。 */
  description: string;
  /** 页面唯一 h1，含关键词。 */
  h1: string;
  /** 一句话说明：这个弯是什么、什么时候用。 */
  tagline: string;
  faqs: readonly SeoFaqItem[];
}

/** 英语为基准（平铺），西班牙语集中在 `es`（同结构）。 */
export interface SeoToolPageMeta extends SeoToolPageCopy {
  key: SeoToolKey;
  /** 无尾斜杠路由，如 `/offset`。 */
  path: string;
  /** 目录名（canonical 用），如 `offset`。 */
  slug: string;
  es: SeoToolPageCopy;
}

export const SEO_TOOL_PAGES: readonly SeoToolPageMeta[] = [
  {
    key: 'offset',
    path: '/offset',
    slug: 'offset',
    title: 'Conduit Offset Calculator — Spacing & Shrink | WattFlow',
    description:
      'Free conduit offset calculator for EMT and rigid conduit: enter offset height and bend angle to get mark spacing, shrink, and both mark locations.',
    h1: 'Conduit Offset Calculator',
    tagline:
      'An offset uses two equal bends in opposite directions to move conduit around an obstacle or up to box height. Enter the height and angle to mark it correctly the first time.',
    faqs: [
      {
        question: 'How do you calculate a conduit offset?',
        answer:
          'Mark spacing equals the offset height multiplied by the multiplier for your bend angle. At 30°, the multiplier is 2.0, so a 6" offset needs 12" between the two marks. Shrink equals the height multiplied by the shrink-per-inch value for that angle — 1/4" per inch at 30°, so the same 6" offset eats 1.5" of run length.',
      },
      {
        question: 'What is the multiplier for a 30 degree offset?',
        answer:
          'The 30-degree offset multiplier is 2.0. It is the cosecant of 30° (1 ÷ sin 30°), which makes the field math trivial: double the offset height to get the mark spacing. A 4" offset is 8" between marks, a 6" offset is 12".',
      },
      {
        question: 'How much does a 30 degree offset shrink the conduit?',
        answer:
          'A 30-degree offset shrinks the run by 1/4" for every inch of offset height. A 6" offset loses 1.5", a 8" offset loses 2". Add the shrink to your cut length before you cut, or the far end of the run lands short.',
      },
      {
        question: 'How far apart do you mark a 6 inch offset at 30 degrees?',
        answer:
          'Mark the two bends 12" apart: 6" offset height × 2.0 multiplier = 12". Put the bender arrow on the first mark, bend to 30°, flip the bender 180°, line the arrow up with the second mark, and bend back to 30°.',
      },
      {
        question: 'Does this calculator work for Rigid conduit (not just EMT)?',
        answer:
          'Yes. The offset calculator is bender-aware and supports both EMT and Rigid/IMC conduit, so spacing and shrink follow the material you select. Choose the material toggle and the marks match the bender spec in your hand.',
      },
    ],
    es: {
      title: 'Calculadora de desplazamiento de conducto | WattFlow',
      description:
        'Calculadora gratuita de desplazamientos para EMT y conducto rígido: introduce la altura y el ángulo para obtener las marcas, la distancia y la contracción.',
      h1: 'Calculadora de desplazamiento de conducto',
      tagline:
        'Un desplazamiento usa dos dobleces iguales en direcciones opuestas para llevar el conducto alrededor de un obstáculo o hasta la altura de una caja. Introduce la altura y el ángulo para marcar bien a la primera.',
      faqs: [
        {
          question: '¿Cómo se calcula un desplazamiento de conducto?',
          answer:
            'La distancia entre marcas es igual a la altura del desplazamiento multiplicada por el multiplicador de tu ángulo de doblado. A 30°, el multiplicador es 2,0, así que un desplazamiento de 6" necesita 12" entre las dos marcas. La contracción es igual a la altura multiplicada por la contracción por pulgada de ese ángulo: 1/4" por pulgada a 30°, así que el mismo desplazamiento de 6" consume 1,5" de longitud de tramo.',
        },
        {
          question: '¿Cuál es el multiplicador de un desplazamiento a 30 grados?',
          answer:
            'El multiplicador de un desplazamiento a 30° es 2,0. Es la cosecante de 30° (1 ÷ sen 30°), lo que hace la cuenta de campo muy sencilla: duplica la altura del desplazamiento para obtener la distancia entre marcas. Un desplazamiento de 4" son 8" entre marcas, y uno de 6", 12".',
        },
        {
          question: '¿Cuánto contrae el conducto un desplazamiento a 30 grados?',
          answer:
            'Un desplazamiento a 30° contrae el tramo 1/4" por cada pulgada de altura. Un desplazamiento de 6" pierde 1,5" y uno de 8" pierde 2". Suma la contracción a tu longitud de corte antes de cortar, o el extremo lejano del tramo quedará corto.',
        },
        {
          question: '¿A qué distancia se marcan 6 pulgadas de desplazamiento a 30 grados?',
          answer:
            'Marca los dos dobleces a 12" de distancia: altura de 6" × multiplicador 2,0 = 12". Coloca la flecha de la dobladora en la primera marca, dobla a 30°, gira la dobladora 180°, alinea la flecha con la segunda marca y vuelve a doblar a 30°.',
        },
        {
          question: '¿Esta calculadora funciona para conducto rígido (no solo EMT)?',
          answer:
            'Sí. La calculadora de desplazamientos tiene en cuenta la dobladora y admite tanto EMT como conducto rígido/IMC, así que la distancia entre marcas y la contracción siguen el material que elijas. Cambia el selector de material y los resultados coincidirán con las especificaciones de la dobladora que tienes en la mano.',
        },
      ],
    },
  },
  {
    key: 'saddle4',
    path: '/4-point-saddle',
    slug: '4-point-saddle',
    title: '4 Point Saddle Conduit Calculator | WattFlow',
    description:
      'Free 4-point saddle conduit calculator: enter obstacle height and width to get all four bend marks, spacing, and total shrink for EMT and rigid conduit.',
    h1: '4-Point Saddle Conduit Calculator',
    tagline:
      'A 4-point saddle is two matching offsets bent back to back — four bends total — that box conduit around a wide obstruction such as a duct or pipe rack.',
    faqs: [
      {
        question: 'What is a 4-point saddle in conduit bending?',
        answer:
          'A 4-point saddle is two offset bends placed back to back so the conduit rises over an obstruction, runs flat across the top, and comes back down. It takes its name from the four bend marks. Electricians use it for wide obstacles that a 3-point saddle cannot span cleanly.',
      },
      {
        question: 'How do you lay out a 4 point saddle?',
        answer:
          'Measure the obstruction height and width. Each half is a standard offset: the two outer marks sit one mark-spacing (height × multiplier) outside each obstacle edge, and the two inner marks land on the obstacle edges. Mark all four points before bending, keep one angle for all four bends, and test-fit before the final cut.',
      },
      {
        question: 'How much conduit does a 4 point saddle shrink?',
        answer:
          'Shrink applies twice on a 4-point saddle — once per offset. Two 4" offsets at 30° shrink the run by 2 × (4 × 1/4") = 2". Add the total shrink to your cut length before you cut the conduit.',
      },
      {
        question: 'When should I use a 4-point saddle instead of a 3-point saddle?',
        answer:
          'Use a 4-point saddle when the obstruction is wider than roughly 6", when the conduit must run flat across the top of the obstacle, or when you need the run to stay in the same plane on both sides. A 3-point saddle is faster for small, narrow obstacles.',
      },
      {
        question: 'Does this calculator work for Rigid conduit (not just EMT)?',
        answer:
          'Yes. The 4-point saddle calculator is bender-aware and supports both EMT and Rigid/IMC conduit, so the four marks and total shrink follow the material you select. Choose the material toggle and the layout matches the bender spec in your hand.',
      },
    ],
    es: {
      title: 'Calculadora de silla de 4 puntos | WattFlow',
      description:
        'Calculadora gratuita de silla de 4 puntos: introduce la altura y el ancho del obstáculo para obtener las cuatro marcas, la distancia y la contracción total.',
      h1: 'Calculadora de silla de conducto de 4 puntos',
      tagline:
        'Una silla de 4 puntos son dos desplazamientos iguales doblados uno a continuación del otro —cuatro dobleces en total— que rodean un obstáculo ancho, como un conducto o una bandeja.',
      faqs: [
        {
          question: '¿Qué es una silla de 4 puntos al doblar conducto?',
          answer:
            'Una silla de 4 puntos son dos dobleces de desplazamiento colocados uno a continuación del otro para que el conducto suba sobre un obstáculo, recorra plano la parte superior y vuelva a bajar. Recibe el nombre de las cuatro marcas de doblez. Los electricistas la usan para obstáculos anchos que una silla de 3 puntos no cubre bien.',
        },
        {
          question: '¿Cómo se traza una silla de 4 puntos?',
          answer:
            'Mide la altura y el ancho del obstáculo. Cada mitad es un desplazamiento estándar: las dos marcas exteriores quedan una distancia de marca (altura × multiplicador) fuera de cada borde del obstáculo, y las dos interiores caen sobre los bordes. Marca los cuatro puntos antes de doblar, mantén el mismo ángulo en los cuatro dobleces y comprueba el ajuste antes del corte final.',
        },
        {
          question: '¿Cuánto conducto contrae una silla de 4 puntos?',
          answer:
            'La contracción se aplica dos veces en una silla de 4 puntos, una por desplazamiento. Dos desplazamientos de 4" a 30° contraen el tramo 2 × (4 × 1/4") = 2". Suma la contracción total a tu longitud de corte antes de cortar el conducto.',
        },
        {
          question: '¿Cuándo debo usar una silla de 4 puntos en lugar de una de 3 puntos?',
          answer:
            'Usa una silla de 4 puntos cuando el obstáculo sea más ancho de unos 6", cuando el conducto deba recorrer plano la parte superior del obstáculo o cuando necesites que el tramo quede en el mismo plano a ambos lados. Una silla de 3 puntos es más rápida para obstáculos pequeños y estrechos.',
        },
        {
          question: '¿Esta calculadora funciona para conducto rígido (no solo EMT)?',
          answer:
            'Sí. La calculadora de silla de 4 puntos tiene en cuenta la dobladora y admite tanto EMT como conducto rígido/IMC, así que las cuatro marcas y la contracción total siguen el material que elijas. Cambia el selector de material y el trazado coincidirá con las especificaciones de la dobladora que tienes en la mano.',
        },
      ],
    },
  },
  {
    key: 'shrink',
    path: '/shrink',
    slug: 'shrink',
    title: 'Conduit Shrink Calculator — Offset & Saddle | WattFlow',
    description:
      'Free conduit shrink calculator for EMT and rigid conduit: find the length each offset or saddle bend eats by height and angle. Fractional or metric output.',
    h1: 'Conduit Shrink Calculator',
    tagline:
      'Shrink is the length a bend eats from your conduit run. Enter the height and angle to find how much shorter the finished run becomes before you cut.',
    faqs: [
      {
        question: 'What is shrink in conduit bending?',
        answer:
          'Shrink is the amount of run length a bend consumes. The bent path between two marks is longer than the straight-line distance the bend covers, so the finished run comes up shorter than the raw stick. For an offset, shrink equals the offset height multiplied by the shrink-per-inch value for the bend angle.',
      },
      {
        question: 'How do you calculate conduit shrink?',
        answer:
          'Multiply the offset height by the shrink per inch for your angle: 1/16" at 10°, 1/8" at 15°, 3/16" at 22.5°, 1/4" at 30°, 3/8" at 45°, and 1/2" at 60°. A 6" offset at 30° shrinks 6 × 1/4" = 1.5". Add the total for every bend in the stick before you cut.',
      },
      {
        question: 'How much does a 30 degree offset shrink?',
        answer:
          'A 30-degree offset shrinks 1/4" per inch of offset height. A 4" offset shrinks 1", a 6" offset shrinks 1.5", and an 8" offset shrinks 2". This is the most common offset angle, so it is worth memorizing.',
      },
      {
        question: 'Does a saddle shrink conduit twice?',
        answer:
          'A 4-point saddle does, because it is two offsets in one bend: each offset shrinks independently, so the total is double a single offset. A 3-point saddle has its own smaller center shrink. Enter the saddle mode in the calculator to get the right total instead of guessing.',
      },
      {
        question: 'Does this calculator work for Rigid conduit (not just EMT)?',
        answer:
          'Yes. The shrink calculator is bender-aware and supports both EMT and Rigid/IMC conduit, so the length each bend eats follows the material you select. Choose the material toggle and the numbers match the bender spec in your hand.',
      },
    ],
    es: {
      title: 'Calculadora de contracción de conducto | WattFlow',
      description:
        'Calculadora gratuita de contracción para EMT y conducto rígido: averigua cuánta longitud consume cada desplazamiento o silla según la altura y el ángulo.',
      h1: 'Calculadora de contracción de conducto',
      tagline:
        'La contracción es la longitud que un doblez le quita a tu tramo de conducto. Introduce la altura y el ángulo para saber cuánto más corto queda el tramo antes de cortar.',
      faqs: [
        {
          question: '¿Qué es la contracción al doblar conducto?',
          answer:
            'La contracción es la cantidad de longitud de tramo que consume un doblez. El recorrido doblado entre dos marcas es más largo que la distancia en línea recta que cubre el doblez, así que el tramo terminado queda más corto que el conducto sin doblar. En un desplazamiento, la contracción es igual a la altura del desplazamiento multiplicada por la contracción por pulgada del ángulo de doblado.',
        },
        {
          question: '¿Cómo se calcula la contracción del conducto?',
          answer:
            'Multiplica la altura del desplazamiento por la contracción por pulgada de tu ángulo: 1/16" a 10°, 1/8" a 15°, 3/16" a 22,5°, 1/4" a 30°, 3/8" a 45° y 1/2" a 60°. Un desplazamiento de 6" a 30° se contrae 6 × 1/4" = 1,5". Suma el total de cada doblez del tramo antes de cortar.',
        },
        {
          question: '¿Cuánto contrae un desplazamiento a 30 grados?',
          answer:
            'Un desplazamiento a 30° contrae 1/4" por pulgada de altura. Un desplazamiento de 4" contrae 1", uno de 6" contrae 1,5" y uno de 8" contrae 2". Es el ángulo de desplazamiento más común, así que vale la pena memorizarlo.',
        },
        {
          question: '¿Una silla contrae el conducto dos veces?',
          answer:
            'Una silla de 4 puntos sí, porque son dos desplazamientos en un mismo doblez: cada desplazamiento contrae de forma independiente, así que el total es el doble de un solo desplazamiento. Una silla de 3 puntos tiene su propia contracción central, más pequeña. Elige el modo silla en la calculadora para obtener el total correcto en lugar de estimarlo.',
        },
        {
          question: '¿Esta calculadora funciona para conducto rígido (no solo EMT)?',
          answer:
            'Sí. La calculadora de contracción tiene en cuenta la dobladora y admite tanto EMT como conducto rígido/IMC, así que la longitud que consume cada doblez sigue el material que elijas. Cambia el selector de material y los valores coincidirán con las especificaciones de la dobladora que tienes en la mano.',
        },
      ],
    },
  },
  {
    key: 'stubUp',
    path: '/stub-up',
    slug: 'stub-up',
    title: '90 Degree Stub Up Calculator — Take-Up Chart | WattFlow',
    description:
      'Free 90 degree stub up calculator for EMT and rigid conduit: enter stub height to get the mark location, plus the take-up chart for 1/2", 3/4", and 1".',
    h1: '90° Stub-Up Calculator',
    tagline:
      'A stub-up is a single 90° bend that brings conduit to an exact height out of a slab or into a panel. Mark at the target height minus the bender take-up.',
    faqs: [
      {
        question: 'How do you calculate a 90 degree stub up?',
        answer:
          'Subtract the bender take-up from the target height to find the mark. For 1/2" EMT with a 5" take-up and a 12" target stub, mark at 12" − 5" = 7" from the end of the conduit. Put the bender arrow on the mark, bend to 90°, and the back of the bend lands at the target height.',
      },
      {
        question: 'What is take-up on a conduit bender?',
        answer:
          'Take-up is how far the bender head starts the bend before the arrow mark, measured from the end of the conduit to the back of the finished 90°. It is a property of the bender head and conduit size, not a formula, which is why manufacturers stamp it on the bender.',
      },
      {
        question: 'How much take-up for 1/2 inch EMT?',
        answer:
          'A standard hand bender takes up 5" on 1/2" EMT. Take-up is 6" for 3/4" EMT and 8" for 1" EMT. Ideal and Klein hand benders agree on these values, but always confirm against the markings on the bender in your hands.',
      },
      {
        question: 'Why is my stub up too short or too tall?',
        answer:
          'A consistent error on every stub usually means the take-up value you used does not match your bender, or the arrow drifted off the mark while bending. Bend one test stub on scrap, measure the error, and apply that correction. If the conduit slipped, keep firmer foot pressure so the arrow stays on the mark.',
      },
      {
        question: 'Does this calculator work for Rigid conduit (not just EMT)?',
        answer:
          'Yes. The stub-up calculator is bender-aware and supports both EMT and Rigid/IMC conduit, so the take-up and mark location follow the material you select. Choose the material toggle and the stub matches the bender spec in your hand.',
      },
    ],
    es: {
      title: 'Calculadora de subida de 90° — Recogida | WattFlow',
      description:
        'Calculadora gratuita de subida de 90° para EMT y conducto rígido: introduce la altura y el tamaño para obtener la marca y la tabla de recogida.',
      h1: 'Calculadora de subida a 90°',
      tagline:
        'Una subida de 90° es un solo doblez que lleva el conducto a una altura exacta desde una losa o hasta un panel. Marca a la altura objetivo menos la recogida de la dobladora.',
      faqs: [
        {
          question: '¿Cómo se calcula una subida de 90 grados?',
          answer:
            'Resta la recogida de la dobladora a la altura objetivo para hallar la marca. Para EMT de 1/2" con una recogida de 5" y una subida objetivo de 12", marca a 12" − 5" = 7" desde el extremo del conducto. Coloca la flecha de la dobladora en la marca, dobla a 90° y la parte posterior del doblez quedará a la altura objetivo.',
        },
        {
          question: '¿Qué es la recogida en una dobladora de conducto?',
          answer:
            'La recogida es cuánto antes de la marca empieza el cabezal de la dobladora el doblez, medido desde el extremo del conducto hasta la parte posterior del codo de 90° terminado. Es una propiedad del cabezal y del tamaño del conducto, no una fórmula, por eso los fabricantes la graban en la dobladora.',
        },
        {
          question: '¿Cuánta recogida tiene el EMT de 1/2 pulgada?',
          answer:
            'Una dobladora manual estándar recoge 5" en EMT de 1/2". La recogida es 6" para EMT de 3/4" y 8" para EMT de 1". Las dobladoras manuales Ideal y Klein coinciden en estos valores, pero confírmalos siempre con las marcas de la dobladora que tienes en la mano.',
        },
        {
          question: '¿Por qué mi subida queda demasiado corta o demasiado alta?',
          answer:
            'Un error constante en todas las subidas suele significar que la recogida que usaste no coincide con tu dobladora, o que la flecha se movió de la marca al doblar. Dobla una subida de prueba en un recorte, mide el error y aplica esa corrección. Si el conducto resbaló, presiona con más firmeza con el pie para que la flecha no se mueva de la marca.',
        },
        {
          question: '¿Esta calculadora funciona para conducto rígido (no solo EMT)?',
          answer:
            'Sí. La calculadora de subida de 90° tiene en cuenta la dobladora y admite tanto EMT como conducto rígido/IMC, así que la recogida y la marca siguen el material que elijas. Cambia el selector de material y la subida coincidirá con las especificaciones de la dobladora que tienes en la mano.',
        },
      ],
    },
  },
] as const;

export function getSeoToolPage(key: SeoToolKey): SeoToolPageMeta {
  const page = SEO_TOOL_PAGES.find((p) => p.key === key);
  if (!page) {
    // 类型穷举保证不会发生；留作运行时保险。
    throw new Error(`Unknown SEO tool page: ${key}`);
  }
  return page;
}

/**
 * 取某页某语言的文案。英语平铺在 meta 上，直接返回；西班牙语取 `es`。
 * 返回值结构统一为 `SeoToolPageCopy`，供屏幕与 JSON-LD 共用。
 */
export function getSeoToolPageCopy(
  page: SeoToolPageMeta,
  lang: Lang = DEFAULT_LANG,
): SeoToolPageCopy {
  return lang === 'es' ? page.es : page;
}

/** 归一化 pathname（去尾斜杠、小写）后按路由找页面；非工具页返回 null。 */
export function findSeoToolPageByPath(pathname: string): SeoToolPageMeta | null {
  const normalized = pathname.trim().toLowerCase().replace(/\/+$/, '') || '/';
  return (
    SEO_TOOL_PAGES.find((page) => page.path.toLowerCase() === normalized) ?? null
  );
}

/** 所有工具页路由（无尾斜杠），用于链接与测试。 */
export const SEO_TOOL_PATHS: readonly string[] = SEO_TOOL_PAGES.map((p) => p.path);

/**
 * 判断路径是否属于 SEO 工具页（容忍尾斜杠与大小写）。
 * 静态 shell 目录名与 toolPages.path 一致，两者共用本函数避免漂移。
 */
export function isSeoToolPath(pathname: string): boolean {
  return findSeoToolPageByPath(pathname) !== null;
}

/* ---------- 相关计算器内链（屏幕 / 静态 shell 同源） ---------- */

export interface SeoRelatedLink {
  /** 工具页 key；首页为 'home'。 */
  key: SeoToolKey | 'home';
  /** SPA 路由，无尾斜杠（首页为 `/`）。 */
  path: string;
  /** 链接标题（工具页用 h1，首页用「全部计算器」文案）。 */
  title: string;
  /** 一句话说明（工具页用 tagline）；首页没有说明，为 null。 */
  description: string | null;
}

const RELATED_SECTION_TITLE: Record<Lang, string> = {
  en: 'Related calculators',
  es: 'Calculadoras relacionadas',
};

/** 「Related calculators」区块标题（en/es），屏幕与静态 shell 共用。 */
export function getRelatedCalculatorsTitle(lang: Lang = DEFAULT_LANG): string {
  return RELATED_SECTION_TITLE[lang];
}

/**
 * 生成当前工具页的相关内链：其余 3 个工具页（各带一句话 tagline）
 * 加一条回首页 `/` 的链接。顺序与 SEO_TOOL_PAGES 一致，天然排除当前页。
 * 屏幕（RN）与静态 shell 生成器都调用本函数，杜绝文案漂移。
 */
export function buildRelatedLinks(
  page: SeoToolPageMeta,
  lang: Lang = DEFAULT_LANG,
): SeoRelatedLink[] {
  const others: SeoRelatedLink[] = SEO_TOOL_PAGES.filter(
    (candidate) => candidate.key !== page.key,
  ).map((candidate) => {
    const copy = getSeoToolPageCopy(candidate, lang);
    return {
      key: candidate.key,
      path: candidate.path,
      title: copy.h1,
      description: copy.tagline,
    };
  });
  return [
    ...others,
    {
      key: 'home',
      path: '/',
      title: lang === 'es' ? es['nav.allCalculatorsLink'] : en['nav.allCalculatorsLink'],
      description: null,
    },
  ];
}

/* ---------- 站点 URL 与 Schema.org JSON-LD ---------- */

export const SEO_SITE_URL = 'https://bendcalc.wattflow.net';

export interface JsonLdObject {
  [key: string]: unknown;
}

/**
 * canonical / 屏幕自身 URL：如 https://bendcalc.wattflow.net/offset/。
 * 非默认语言追加 `?lang=es`。
 */
export function buildCanonicalUrl(
  page: SeoToolPageMeta,
  siteUrl: string = SEO_SITE_URL,
  lang: Lang = DEFAULT_LANG,
): string {
  const base = `${siteUrl.replace(/\/$/, '')}/${page.slug}/`;
  return lang === DEFAULT_LANG ? base : `${base}?lang=${lang}`;
}

/** WebApplication schema：页面是免费、纯前端、无登录的在线工具。 */
export function buildWebApplicationJsonLd(
  page: SeoToolPageMeta,
  siteUrl: string = SEO_SITE_URL,
  lang: Lang = DEFAULT_LANG,
): JsonLdObject {
  const copy = getSeoToolPageCopy(page, lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: copy.h1,
    url: buildCanonicalUrl(page, siteUrl, lang),
    description: copy.description,
    inLanguage: lang,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/** FAQPage schema：问题与答案与页面展示同源。 */
export function buildFaqPageJsonLd(
  page: SeoToolPageMeta,
  lang: Lang = DEFAULT_LANG,
): JsonLdObject {
  const copy = getSeoToolPageCopy(page, lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: copy.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
