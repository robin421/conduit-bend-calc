function parseValueToken(raw: string): number | null {
  const token = raw.trim();
  if (!token) {
    return 0;
  }

  const wholeAndFraction = token.match(/^(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)$/);
  if (wholeAndFraction) {
    const denominator = Number(wholeAndFraction[3]);
    if (denominator === 0) {
      return null;
    }
    return Number(wholeAndFraction[1]) + Number(wholeAndFraction[2]) / denominator;
  }

  const fractionOnly = token.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionOnly) {
    const denominator = Number(fractionOnly[2]);
    if (denominator === 0) {
      return null;
    }
    return Number(fractionOnly[1]) / denominator;
  }

  const decimal = token.match(/^\d+(?:\.\d+)?$/);
  if (decimal) {
    return Number(token);
  }

  return null;
}

/**
 * 解析英制 ft-in-fraction 输入为英寸数。
 * 支持："2' 3-1/2"" / '6"' / '1/2"' / "2' 3 1/2"" / "2'3-1/2"" / '3.5"' / '3'。
 * 非法输入（含字母、负数、分母为 0 等）返回 null，不抛异常。
 */
export function parseImperial(input: string): number | null {
  if (typeof input !== 'string') {
    return null;
  }

  let text = input.trim().toLowerCase();
  if (!text) {
    return null;
  }

  text = text.replace(/[\u2032\u2019]/g, "'").replace(/[\u2033\u201D]/g, '"');
  text = text
    .replace(/\b(?:feet|foot|ft)\b/g, "'")
    .replace(/\b(?:inches|inch|in)\b/g, '"');
  text = text.replace(/\s+/g, ' ').trim();

  if (!/\d/.test(text)) {
    return null;
  }
  if (!/^[0-9./'"\s-]+$/.test(text)) {
    return null;
  }
  if (text.startsWith('-')) {
    return null;
  }

  let feet = 0;
  let remainder = text;

  const feetQuoteIndex = text.indexOf("'");
  if (feetQuoteIndex !== -1) {
    if (text.indexOf("'", feetQuoteIndex + 1) !== -1) {
      return null;
    }
    const feetText = text.slice(0, feetQuoteIndex).trim();
    const feetValue = parseValueToken(feetText);
    if (feetValue === null) {
      return null;
    }
    feet = feetValue;
    remainder = text.slice(feetQuoteIndex + 1).trim();
  }

  const quoteCount = (remainder.match(/"/g) ?? []).length;
  if (quoteCount > 1 || (quoteCount === 1 && !remainder.endsWith('"'))) {
    return null;
  }
  remainder = remainder.replace(/"/g, '').trim();

  const inches = parseValueToken(remainder);
  if (inches === null) {
    return null;
  }

  return feet * 12 + inches;
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

/**
 * 将英寸数格式化为英制 ft-in-fraction 字符串，分数按 1/denominator 就近取整并约分。
 * 例：27.5 → `2' 3-1/2"`；6 → `6"`；12 → `1'`。
 */
export function formatImperial(inches: number, denominator = 16): string {
  if (!Number.isFinite(inches) || denominator <= 0) {
    return '';
  }

  const sign = inches < 0 ? '-' : '';
  const total = Math.abs(inches);
  const totalUnits = Math.round(total * denominator);
  const feet = Math.floor(totalUnits / (12 * denominator));
  const remainder = totalUnits - feet * 12 * denominator;
  const inchWhole = Math.floor(remainder / denominator);
  const numerator = remainder - inchWhole * denominator;

  const feetPart = feet > 0 ? `${feet}'` : '';
  const inchesPart: string[] = [];

  if (inchWhole > 0 || numerator > 0 || feet === 0) {
    if (numerator > 0) {
      const divisor = gcd(numerator, denominator);
      const num = numerator / divisor;
      const den = denominator / divisor;
      const wholePrefix = inchWhole > 0 ? `${inchWhole}-` : '';
      inchesPart.push(`${wholePrefix}${num}/${den}"`);
    } else {
      inchesPart.push(`${inchWhole}"`);
    }
  }

  const body = [feetPart, ...inchesPart].filter(Boolean).join(' ');
  return `${sign}${body}`;
}
