const keepMoneyCharacters = (value) => String(value ?? '').replace(/[^0-9.,]/g, '');

export const formatMoneyInput = (value) => {
  const raw = keepMoneyCharacters(value);
  if (!raw) return '';

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  const dotCount = (raw.match(/\./g) || []).length;
  let decimalIndex = -1;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalIndex = Math.max(lastComma, lastDot);
  } else if (lastComma >= 0) {
    decimalIndex = lastComma;
  } else if (lastDot >= 0) {
    const digitsAfterDot = raw.slice(lastDot + 1).replace(/\D/g, '').length;
    if (dotCount === 1 && digitsAfterDot <= 2) decimalIndex = lastDot;
  }

  const integerDigits = (decimalIndex >= 0 ? raw.slice(0, decimalIndex) : raw)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '') || '0';
  const groupedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimalIndex < 0) return groupedInteger;
  const decimals = raw.slice(decimalIndex + 1).replace(/\D/g, '').slice(0, 2);
  return `${groupedInteger},${decimals}`;
};

export const parseMoneyInput = (value) => {
  const formatted = formatMoneyInput(value);
  if (!formatted) return 0;
  const numeric = Number(formatted.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : 0;
};
