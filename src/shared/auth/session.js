const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = globalThis?.atob
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const USER_ID_CLAIMS = [
  'id',
  'userId',
  'nameid',
  'sub',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
];

export const getTokenUserId = (token) => {
  const payload = decodeJwtPayload(token);
  for (const key of USER_ID_CLAIMS) {
    const value = Number(payload?.[key]);
    if (Number.isInteger(value) && value > 0) return value;
  }
  return 0;
};

export const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  return exp <= Math.floor(Date.now() / 1000) + 15;
};

export const normalizeAuthUser = (userData, token) => {
  if (!userData || typeof userData !== 'object') return null;

  const responseId = Number(userData.id ?? userData.userId ?? 0);
  const id = Number.isInteger(responseId) && responseId > 0
    ? responseId
    : getTokenUserId(token);

  return {
    ...userData,
    id,
  };
};
