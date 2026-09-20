import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { registerRoutes } from "./routes.js";

dotenv.config();

const app = Fastify({ logger: true });

const port = parseInt(process.env.PORT || process.env.NODE_PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

const start = async () => {
  try {
    await app.register(cors, {
      origin: frontendOrigin === "*" ? true : [frontendOrigin],
      methods: ["GET", "POST", "OPTIONS"],
    });

    await registerRoutes(app);

    await app.listen({ port, host });
    console.log(`Node backend listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

export { app };
