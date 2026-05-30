type EnvValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
};

export function validateEnv(): EnvValidationResult {
  const required = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_APP_URL"] as const;
  const optional = ["NEXT_PUBLIC_APP_ENV"] as const;

  const missing = required.filter((key) => !process.env[key]);
  const warnings = optional
    .filter((key) => !process.env[key])
    .map((key) => `${key} is not set (optional)`);

  return { valid: missing.length === 0, missing, warnings };
}

export function assertEnv(): void {
  const { valid, missing } = validateEnv();
  if (!valid) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "development") {
      throw new Error(msg);
    } else {
      console.error(`[env] ${msg}`);
    }
  }
}

export const env = {
  get apiUrl() {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "";
  },
  get appEnv() {
    return (process.env.NEXT_PUBLIC_APP_ENV ?? "development") as
      | "development"
      | "staging"
      | "production";
  },
  get isDev() {
    return process.env.NODE_ENV === "development";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
} as const;
