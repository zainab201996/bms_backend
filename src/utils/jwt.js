const jwt = require("jsonwebtoken");

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || String(s).trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }
  return s;
}

/**
 * @param {{ id: number, type: string }} user
 */
function signSessionToken(user) {
  return jwt.sign({ sub: user.id, type: user.type }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });
}

function verifySessionToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = {
  signSessionToken,
  verifySessionToken
};
