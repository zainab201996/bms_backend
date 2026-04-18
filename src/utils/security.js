const crypto = require("crypto");

function hashPassword(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function verifyPassword(rawValue, hashedValue) {
  return hashPassword(rawValue) === hashedValue;
}

function randomSuffix() {
  return crypto.randomBytes(2).toString("hex");
}

function randomTempPassword() {
  return crypto.randomBytes(8).toString("hex");
}

function usernameFromCompany(name) {
  return `${name.toLowerCase().replace(/\s+/g, "_")}_${randomSuffix()}`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  randomTempPassword,
  usernameFromCompany
};
