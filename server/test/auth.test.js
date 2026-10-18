const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const { signToken, requestIdentity, signingSecret } = require('../utils/auth');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const user = { _id: '0123456789abcdef01234567', email: 'test@example.com' };

test('request identity verifies signed tokens and leaves anonymous requests unidentified', () => {
  assert.deepEqual(requestIdentity({ headers: {} }), {});
  assert.deepEqual(requestIdentity({ headers: { authorization: `Bearer ${signToken(user)}` } }), { userId: user._id });
});

test('request identity rejects expired, forged, malformed and incomplete tokens', () => {
  const secret = signingSecret();
  const tokens = [
    'malformed',
    jwt.sign({ data: user }, secret, { expiresIn: -1 }),
    jwt.sign({ data: user }, randomBytes(32).toString('hex'), { expiresIn: '1h' }),
    jwt.sign({ data: user }, secret),
    jwt.sign({ data: { _id: 'invalid' } }, secret, { expiresIn: '1h' }),
    jwt.sign({ data: user }, secret, { algorithm: 'HS384', expiresIn: '1h' }),
  ];
  for (const token of tokens) {
    assert.throws(() => requestIdentity({ headers: { authorization: `Bearer ${token}` } }), /authenticate/);
  }
  assert.throws(() => requestIdentity({ headers: { authorization: `Basic ${signToken(user)}` } }), /authenticate/);
});

test('missing or short signing secrets fail closed', () => {
  const previous = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(signingSecret, /JWT_SECRET/);
    process.env.JWT_SECRET = 'short';
    assert.throws(() => signToken(user), /JWT_SECRET/);
  } finally { process.env.JWT_SECRET = previous; }
});
