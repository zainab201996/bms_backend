const app = require("./app");
const { AppDataSource } = require("./data-source");
const { seedInitialUsers } = require("./data/store");
const { ensureDatabaseExists } = require("./db-init");

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await ensureDatabaseExists();
    await AppDataSource.initialize();
    await seedInitialUsers();

    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log("Seeded admin credentials -> username: admin, password: Test@1234");
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

bootstrap();
