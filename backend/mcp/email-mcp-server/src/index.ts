import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bearerAuth } from "./lib/auth.js";
import { registerGmailTools } from "./tools/gmail.js";
import { registerSendGridTools } from "./tools/sendgrid.js";
import { registerZendeskTools } from "./tools/zendesk.js";

const PORT = parseInt(process.env["PORT"] ?? "3002", 10);

const httpApp = express();
httpApp.use(express.json());

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "email-mcp-server",
    version: "0.1.0",
  });
  registerGmailTools(server);
  registerSendGridTools(server);
  registerZendeskTools(server);
  return server;
}

// Each POST is a stateless request — new server+transport per call
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
  res.json({ status: "ok", service: "email-mcp-server", port: PORT });
});

httpApp.listen(PORT, () => {
  console.log(`email-mcp-server listening on port ${PORT}`);
});
