import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface SIISPayload {
  title: string;
  content: string;
}

interface TroubleshootRequestBody {
  query: string;
  siis_response: SIISPayload;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ status: "ok", service: "node-backend" });
  });

  app.post("/api/troubleshoot", async (req: FastifyRequest<{ Body: TroubleshootRequestBody }>, reply: FastifyReply) => {
    const { query, siis_response } = req.body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return reply.status(422).send({
        error: "Unprocessable Entity",
        message: "Request must contain a valid non-empty 'query' string.",
      });
    }

    if (
      !siis_response ||
      typeof siis_response !== "object" ||
      !siis_response.title ||
      !siis_response.content
    ) {
      return reply.status(422).send({
        error: "Unprocessable Entity",
        message: "Request must contain a valid 'siis_response' object with 'title' and 'content'.",
      });
    }

    const aiGatewayUrl = process.env.AI_GATEWAY_URL || "http://127.0.0.1:8001";
    const targetEndpoint = `${aiGatewayUrl}/internal/troubleshoot`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const aiResponse = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, siis_response }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        return reply.status(aiResponse.status).send({
          error: "AI Gateway Error",
          message: errorText || "AI Gateway processing failed.",
        });
      }

      const data = await aiResponse.json();
      return reply.status(200).send(data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return reply.status(504).send({
          error: "Gateway Timeout",
          message: "AI Gateway timed out processing the request.",
        });
      }
      return reply.status(502).send({
        error: "Bad Gateway",
        message: `Failed to communicate with AI Gateway at ${targetEndpoint}: ${err.message}`,
      });
    }
  });
}
