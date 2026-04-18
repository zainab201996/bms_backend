const { usersRepo } = require("../data/store");
const { verifySessionToken } = require("../utils/jwt");

async function auth(req, res, next) {
  try {
    const authHeader = req.header("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (!match) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    let payload;
    try {
      payload = verifySessionToken(match[1]);
    } catch (_err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = Number(payload.sub);
    const userType = payload.type;
    if (!userId || !userType) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const repo = usersRepo();
    const user = await repo.findOne({
      where: { id: userId, type: userType }
    });
    if (!user) {
      return res.status(403).json({ error: "Invalid user credentials" });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(500).json({ error: "Failed to authorize request" });
  }
}

function allowRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.type)) {
      return res.status(403).json({ error: "Access denied for this role" });
    }
    return next();
  };
}

module.exports = {
  auth,
  allowRoles
};
