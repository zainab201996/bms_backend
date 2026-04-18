const { loginUser } = require("../services/authService");

async function login(req, res) {
  try {
    const { user, token } = await loginUser({
      username: req.body?.username,
      password: req.body?.password
    });
    return res.json({ user, token });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

module.exports = {
  login
};
