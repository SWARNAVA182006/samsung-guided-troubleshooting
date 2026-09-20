import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { registerRoutes } from "./routes.js";

describe("Fastify Application Backend Routes", () => {
  it("GET /api/health should return status ok", async () => {
    const app = Fastify();
    await registerRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "node-backend" });
  });

  it("POST /api/troubleshoot without query should return 422", async () => {
    const app = Fastify();
    await registerRoutes(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/troubleshoot",
      payload: {
        siis_response: { title: "Title", content: "Content" },
      },
    });

    expect(response.statusCode).toBe(422);
  });
});
