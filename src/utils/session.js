// Tiny HMAC-signed session cookie. Avoids a JWT dep for what is
// literally one bit of state ("admin is logged in"). Payload is
// just { sub, exp }; signature is HMAC-SHA256(secret).
//
// Cookie format: base64url(payload).base64url(signature)

const crypto = require('crypto');

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64'
  );
}

function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest();
  return `${body}.${b64url(mac)}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = b64url(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
