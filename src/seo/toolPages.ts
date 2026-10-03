/**
 * P0 SEO 工具页元数据（单一口径来源）。
 *
 * 纯数据模块：不依赖 react-native，可被 Web 屏幕与
 * scripts/gen-seo-tool-shells.ts（Node 类型剥离）同时 import，
 * 保证屏幕内容与静态 HTML 的 title/description/FAQ schema 永远一致。
 *
 * 约定：title ≤ 60 字符，description ≤ 160 字符（见 toolPages.test.ts 断言）。
 */

export type SeoToolKey = 'offset' | 'saddle4' | 'shrink' | 'stubUp';

export interface SeoFaqItem {
  question: string;
  /** 纯文本答案（同一份文案用于页面展示与 FAQPage JSON-LD）。 */
  answer: string;
}

export interface SeoToolPageMeta {
  key: SeoToolKey;
  /** 无尾斜杠路由，如 `/offset`。 */
  path: string;
  /** 目录名（canonical 用），如 `offset`。 */
  slug: string;
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

export const SEO_TOOL_PAGES: readonly SeoToolPageMeta[] = [
  {
    key: 'offset',
    path: '/offset',
    slug: 'offset',
    title: 'Conduit Offset Calculator — Mark Spacing & Shrink',
    description:
      'Free conduit offset calculator: enter offset height and bend angle to get mark spacing, shrink, and both mark locations in fractions, decimals, or metric.',
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
        question: 'What angle should I use for a conduit offset?',
        answer:
          'Use 30° for everyday offsets: the multiplier is a clean 2.0 and shrink stays moderate. Go shallower (22.5°, 15°, or 10°) on long runs where shrink must be minimized, and steeper (45° or 60°) when you must clear a tall obstacle in a short distance.',
      },
    ],
  },
  {
    key: 'saddle4',
    path: '/4-point-saddle',
    slug: '4-point-saddle',
    title: '4 Point Saddle Conduit Calculator',
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
        question: 'What angle do you use for a 4-point saddle?',
        answer:
          '30° is the standard choice because the multiplier is exactly 2.0, which keeps the mark spacing simple. Use all four bends at the same angle so both ends of the run stay parallel. Shallower angles such as 22.5° reduce shrink on long runs.',
      },
    ],
  },
  {
    key: 'shrink',
    path: '/shrink',
    slug: 'shrink',
    title: 'Conduit Shrink Calculator — Offset & Saddle',
    description:
      'Free conduit shrink calculator: find how much length each offset or saddle bend eats by height and angle. Offset and saddle modes, fractional or metric output.',
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
        question: 'Is shrink the same as take-up?',
        answer:
          'No. Shrink is run length eaten by the bend geometry. Take-up is how far the bend starts before the arrow mark on the bender, which is why you mark a stub-up at target height minus take-up. Both shorten the finished run, but they are different numbers used for different steps.',
      },
    ],
  },
  {
    key: 'stubUp',
    path: '/stub-up',
    slug: 'stub-up',
    title: '90 Degree Stub Up Calculator — Take-Up Chart',
    description:
      'Free 90 degree stub up calculator: enter stub height and conduit size to get the mark location, plus the take-up chart for 1/2", 3/4", and 1" EMT.',
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
        question: 'Where do you measure stub up height?',
        answer:
          'Measure from the end of the conduit to the back (outside) of the 90° bend — not the inside corner. That is the same reference the take-up number is defined against, so the mark math stays consistent.',
      },
    ],
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

/** 所有工具页路由（无尾斜杠），用于链接与测试。 */
export const SEO_TOOL_PATHS: readonly string[] = SEO_TOOL_PAGES.map((p) => p.path);

/**
 * 判断路径是否属于 SEO 工具页（容忍尾斜杠与大小写）。
 * 静态 shell 目录名与 toolPages.path 一致，两者共用本函数避免漂移。
 */
export function isSeoToolPath(pathname: string): boolean {
  const normalized = pathname.trim().toLowerCase().replace(/\/+$/, '') || '/';
  return SEO_TOOL_PATHS.some(
    (path) => path.toLowerCase() === normalized,
  );
}

/* ---------- 站点 URL 与 Schema.org JSON-LD ---------- */

export const SEO_SITE_URL = 'https://bendcalc.wattflow.net';

export interface JsonLdObject {
  [key: string]: unknown;
}

/** canonical / 屏幕自身 URL：如 https://bendcalc.wattflow.net/offset/ */
export function buildCanonicalUrl(
  page: SeoToolPageMeta,
  siteUrl: string = SEO_SITE_URL,
): string {
  return `${siteUrl.replace(/\/$/, '')}/${page.slug}/`;
}

/** WebApplication schema：页面是免费、纯前端、无登录的在线工具。 */
export function buildWebApplicationJsonLd(
  page: SeoToolPageMeta,
  siteUrl: string = SEO_SITE_URL,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.h1,
    url: buildCanonicalUrl(page, siteUrl),
    description: page.description,
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
export function buildFaqPageJsonLd(page: SeoToolPageMeta): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
