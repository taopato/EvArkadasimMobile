const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;
const SIX_DIGIT_CODE_REGEX = /^\d{6}$/;

export const PASSWORD_RULES_TEXT =
  'Şifre en az 8 karakter olmalı; büyük harf, küçük harf, rakam ve özel karakter içermelidir.';

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmail(value));

export const isStrongPassword = (value) => PASSWORD_REGEX.test(String(value || ''));

export const isSixDigitCode = (value) => SIX_DIGIT_CODE_REGEX.test(String(value || '').trim());

export const getPasswordValidationErrors = (value) => {
  const password = String(value || '');
  const errors = [];

  if (password.length < 8) {
    errors.push('Şifreniz en az 8 karakter olmalıdır.');
  }
  if (password.length > 64) {
    errors.push('Şifreniz en fazla 64 karakter olabilir.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Şifreniz en az 1 büyük harf içermelidir.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Şifreniz en az 1 küçük harf içermelidir.');
  }
  if (!/\d/.test(password)) {
    errors.push('Şifreniz en az 1 rakam içermelidir.');
  }
  if (!/[^A-Za-z\d]/.test(password)) {
    errors.push('Şifreniz en az 1 özel karakter içermelidir.');
  }

  return errors;
};

export const validateRegistrationForm = ({ fullName, email, password, confirm }) => {
  const trimmedName = String(fullName || '').trim();
  if (!trimmedName || !email || !password || !confirm) {
    return 'Lütfen tüm alanları doldurun.';
  }
  if (trimmedName.length < 3) {
    return 'Ad soyad en az 3 karakter olmalı.';
  }
  if (!isValidEmail(email)) {
    return 'Geçerli bir e-posta giriniz.';
  }

  const passwordErrors = getPasswordValidationErrors(password);
  if (passwordErrors.length > 0 || !isStrongPassword(password)) {
    return passwordErrors[0] || PASSWORD_RULES_TEXT;
  }
  if (password !== confirm) {
    return 'Şifreler eşleşmiyor.';
  }
  return null;
};
