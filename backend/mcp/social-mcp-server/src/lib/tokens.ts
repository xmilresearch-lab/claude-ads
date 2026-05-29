// Retrieves the OAuth access token for a provider from environment variables.
// In a multi-tenant deployment, replace this with a DB lookup:
//   SELECT credentials_decrypted FROM integrations
//   WHERE workspace_id = $workspaceId AND type = $provider AND status = 'active'
export async function getProviderToken(
  provider: string,
  _workspaceId: string
): Promise<string> {
  const key = `${provider.toUpperCase().replace(/-/g, "_")}_ACCESS_TOKEN`;
  const token = process.env[key];
  if (!token) {
    throw new Error(
      `No active ${provider} integration found. Connect it at /integrations.`
    );
  }
  return token;
}
