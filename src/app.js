const express = require("express");
const cors = require("cors");
const { auth } = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const { patchUser, removeUser } = require("./controllers/userController");
const { allowRoles } = require("./middleware/auth");
const { USER_TYPES } = require("./constants/enums");
const backupRoutes = require("./routes/backupRoutes");
const logRoutes = require("./routes/logRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

app.use(auth);

// Register before /api/users router so DELETE/PATCH always match (avoids 404 if sub-router order changes).
app.patch("/api/users/:id", allowRoles(USER_TYPES.ADMIN), patchUser);
app.delete("/api/users/:id", allowRoles(USER_TYPES.ADMIN), removeUser);

app.use("/api/users", userRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/logs", logRoutes);
app.use("/api", dashboardRoutes);
app.use("/", dashboardRoutes);

module.exports = app;
