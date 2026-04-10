/**
 * Display formatting for phone numbers (Polish workshop default).
 * - International: +48 XXX XXX XXX (and optional extension digits spaced in triples)
 * - National 9 digits (PL mobile): +48 XXX XXX XXX
 * - Leading national trunk 0: 0XXXXXXXXX → +48 XXX XXX XXX
 * - Other lengths: digit groups of 3 for readability (no country guess)
 */

function groupDigitsInThrees(s: string): string {
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return parts.join(" ");
}

function formatNineDigits(nine: string): string {
  if (nine.length !== 9) return groupDigitsInThrees(nine);
  return `${nine.slice(0, 3)} ${nine.slice(3, 6)} ${nine.slice(6, 9)}`;
}

function formatAfter48(rest: string, originalTrimmed: string): string {
  if (rest.length >= 9) {
    const n9 = rest.slice(0, 9);
    const extra = rest.slice(9);
    let out = `+48 ${formatNineDigits(n9)}`;
    if (extra) {
      out += ` ${groupDigitsInThrees(extra)}`;
    }
    return out;
  }
  if (rest.length > 0) {
    return `+48 ${groupDigitsInThrees(rest)}`;
  }
  return originalTrimmed;
}

export function formatPolishPhoneDisplay(raw: string | null | undefined): string {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) {
    return trimmed;
  }

  if (digits.startsWith("0048")) {
    return formatAfter48(digits.slice(4), trimmed);
  }

  if (digits.startsWith("48")) {
    return formatAfter48(digits.slice(2), trimmed);
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    const national = digits.slice(1);
    if (national.length === 9) {
      return `+48 ${formatNineDigits(national)}`;
    }
  }

  if (digits.length === 9) {
    return `+48 ${formatNineDigits(digits)}`;
  }

  if (digits.length <= 6) {
    return trimmed;
  }

  return groupDigitsInThrees(digits);
}
