import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server listening on http://127.0.0.1:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
