import path from "path";
import dotenv from "dotenv";

// load the .env from the repo root so the tests can find MONGO_URI_TEST
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

process.env.JWT_SECRET = "test-secret-only-for-tests";
