import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bearerAuth } from "./lib/auth.js";
import { registerTwitterTools } from "./tools/twitter.js";
import { registerLinkedInTools } from "./tools/linkedin.js";
import { registerInstagramTools } from "./tools/instagram.js";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
const TOOL_COUNT = 6;

const httpApp = express();
httpApp.use(express.json());

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "social-mcp-server",
    version: "0.1.0",
  });
  registerTwitterTools(server);
  registerLinkedInTools(server);
  registerInstagramTools(server);
  return server;
}

httpApp.post("/mcp", bearerAuth, async (req, res) => {
  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("finish", async () => {
    await transport.close();
    await server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body as unknown);
});

httpApp.get("/health", (_req, res) => {
  res.json({ status: "ok", tools: TOOL_COUNT, port: PORT });
});

httpApp.listen(PORT, () => {
  console.log(`social-mcp-server listening on port ${PORT}`);
});
