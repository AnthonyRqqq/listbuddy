const { GraphQLError } = require('graphql');
const jwt = require('jsonwebtoken');

const expiration = '2h';
function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return secret;
}

function requestIdentity(req) {
  const header = req.headers.authorization;
  if (!header) return {};
  try {
    const match = /^Bearer (\S+)$/i.exec(header);
    if (!match) throw new Error('Invalid authorization header.');
    const payload = jwt.verify(match[1], signingSecret(), { algorithms: ['HS256'] });
    if (!/^[a-f\d]{24}$/i.test(payload.data?._id) || !Number.isInteger(payload.exp)) throw new Error('Invalid token identity.');
    return { userId: payload.data._id };
  } catch {
    throw module.exports.AuthenticationError;
  }
}

module.exports = {
  signingSecret,
  requestIdentity,
  AuthenticationError: new GraphQLError('Could not authenticate user.', {
    extensions: {
      code: 'UNAUTHENTICATED',
    },
  }),
  signToken: function ({ email, username, _id }) {
    const payload = { email, username, _id };
    return jwt.sign({ data: payload }, signingSecret(), { expiresIn: expiration, algorithm: 'HS256' });
  },
};
