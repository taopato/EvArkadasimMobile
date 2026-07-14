const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

export const getTurkishMobileDigits = (value) => {
  let digits = onlyDigits(value);
  if (digits.startsWith('0090')) digits = digits.slice(4);
  else if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

export const formatTurkishMobile = (value) => {
  const digits = getTurkishMobileDigits(value);
  if (!digits) return '';

  const area = digits.slice(0, 3);
  const first = digits.slice(3, 6);
  const second = digits.slice(6, 8);
  const last = digits.slice(8, 10);
  let formatted = `(${area}`;
  if (area.length === 3) formatted += ')';
  if (first) formatted += ` ${first}`;
  if (second) formatted += ` ${second}`;
  if (last) formatted += ` ${last}`;
  return formatted;
};

export const isValidTurkishMobile = (value) => /^5\d{9}$/.test(getTurkishMobileDigits(value));

export const toTurkishMobileE164 = (value) => {
  const digits = getTurkishMobileDigits(value);
  return digits ? `+90${digits}` : '';
};

export const getTurkishIbanDigits = (value) => {
  let normalized = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.startsWith('TR')) normalized = normalized.slice(2);
  return onlyDigits(normalized).slice(0, 24);
};

export const formatTurkishIbanDigits = (value) => {
  const digits = getTurkishIbanDigits(value);
  if (!digits) return '';
  const groups = [];
  groups.push(digits.slice(0, 2));
  for (let index = 2; index < digits.length; index += 4) {
    groups.push(digits.slice(index, index + 4));
  }
  return groups.filter(Boolean).join(' ');
};

export const toCanonicalTurkishIban = (value) => {
  const digits = getTurkishIbanDigits(value);
  return digits ? `TR${digits}` : '';
};

export const isValidIbanChecksum = (value) => {
  const iban = String(value || '').replace(/\s/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return false;

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const numeric = /\d/.test(character)
      ? character
      : String(character.charCodeAt(0) - 55);
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
};

export const isValidTurkishIban = (value) => isValidIbanChecksum(toCanonicalTurkishIban(value));
