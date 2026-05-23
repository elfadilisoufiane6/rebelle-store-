const MA_PHONE_REGEX = /^(\+212|212|0)(6|7)\d{8}$/;

function validatePhone(raw) {
  if (typeof raw !== 'string') return false;
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return MA_PHONE_REGEX.test(cleaned);
}

function normalizePhone(raw) {
  let cleaned = String(raw).replace(/[\s\-().+]/g, '');
  if (cleaned.startsWith('00212')) cleaned = '212' + cleaned.slice(5);
  else if (cleaned.startsWith('212')) cleaned = cleaned;
  else if (cleaned.startsWith('0')) cleaned = '212' + cleaned.slice(1);
  return cleaned;
}

module.exports = { validatePhone, normalizePhone, MA_PHONE_REGEX };
