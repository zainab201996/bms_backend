const { usersRepo } = require("../data/store");
const { verifyPassword } = require("../utils/security");
const { signSessionToken } = require("../utils/jwt");

async function loginUser({ username, password }) {
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  const repo = usersRepo();
  const user = await repo.findOne({
    where: { username: String(username).trim() }
  });
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const valid = verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    type: user.type
  };
  const token = signSessionToken(sessionUser);
  return { user: sessionUser, token };
}

module.exports = {
  loginUser
};
