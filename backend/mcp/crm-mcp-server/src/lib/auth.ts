import type { Request, Response, NextFunction } from "express";

const MCP_AUTH_TOKEN = process.env["MCP_AUTH_TOKEN"] ?? "";

export function bearerAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!MCP_AUTH_TOKEN) {
    next();
    return;
  }
  const header = req.headers["authorization"] ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== MCP_AUTH_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
