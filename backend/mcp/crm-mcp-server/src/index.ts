import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bearerAuth } from "./lib/auth.js";
import { registerHubSpotTools } from "./tools/hubspot.js";
import { registerSalesforceTools } from "./tools/salesforce.js";

const PORT = parseInt(process.env["PORT"] ?? "3003", 10);
const TOOL_COUNT = 7;

const httpApp = express();
httpApp.use(express.json());

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "crm-mcp-server",
    version: "0.1.0",
  });
  registerHubSpotTools(server);
  registerSalesforceTools(server);
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
  console.log(`crm-mcp-server listening on port ${PORT}`);
});
