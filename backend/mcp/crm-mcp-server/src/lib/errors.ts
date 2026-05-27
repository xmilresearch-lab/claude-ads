export interface McpError {
  code: string;
  message: string;
  suggestion: string;
}

export function errorResponse(
  code: string,
  message: string,
  suggestion: string
): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const payload: McpError = { code, message, suggestion };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError: true,
  };
}
