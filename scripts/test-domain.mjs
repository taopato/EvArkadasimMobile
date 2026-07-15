import assert from 'node:assert/strict';
import {
  formatTurkishIbanDigits,
  formatTurkishMobile,
  getTurkishMobileDigits,
  isValidTurkishIban,
  isValidTurkishMobile,
  toCanonicalTurkishIban,
  toTurkishMobileE164,
} from '../src/shared/validation/profileValidation.js';
import { formatMoneyInput, parseMoneyInput } from '../src/shared/format/money.js';
import { normalizeExpenseCategoryKey } from '../src/constants/ExpenseEnums.js';
import { getTokenUserId, isTokenExpired, normalizeAuthUser } from '../src/shared/auth/session.js';

assert.equal(getTurkishMobileDigits('0554 361 75 75'), '5543617575');
assert.equal(getTurkishMobileDigits('+90 (554) 361 75 75'), '5543617575');
assert.equal(formatTurkishMobile('5543617575'), '(554) 361 75 75');
assert.equal(toTurkishMobileE164('05543617575'), '+905543617575');
assert.equal(isValidTurkishMobile('5543617575'), true);
assert.equal(isValidTurkishMobile('4543617575'), false);

const validIban = 'TR330006100519786457841326';
assert.equal(toCanonicalTurkishIban(validIban), validIban);
assert.equal(formatTurkishIbanDigits(validIban), '33 0006 1005 1978 6457 8413 26');
assert.equal(isValidTurkishIban(validIban), true);
assert.equal(isValidTurkishIban('TR330006100519786457841327'), false);

assert.equal(formatMoneyInput('1234567,89'), '1.234.567,89');
assert.equal(formatMoneyInput('1.234.567,89'), '1.234.567,89');
assert.equal(parseMoneyInput('1.234.567,89'), 1234567.89);
assert.equal(parseMoneyInput('850'), 850);

assert.equal(normalizeExpenseCategoryKey('Electricity'), 'Electricity');
assert.equal(normalizeExpenseCategoryKey(2), 'Electricity');
assert.equal(normalizeExpenseCategoryKey('6'), 'Gas');
assert.equal(normalizeExpenseCategoryKey('unknown'), null);

const makeToken = (payload) => {
  const part = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${part}.signature`;
};
const validToken = makeToken({
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': '25',
  exp: Math.floor(Date.now() / 1000) + 3600,
});
assert.equal(getTokenUserId(validToken), 25);
assert.deepEqual(normalizeAuthUser({ email: 'test@example.com' }, validToken), {
  email: 'test@example.com',
  id: 25,
});
assert.equal(normalizeAuthUser({ id: 7 }, validToken).id, 7);
assert.equal(isTokenExpired(validToken), false);
assert.equal(isTokenExpired(makeToken({ exp: 1 })), true);

console.log('Roomora domain tests passed.');
