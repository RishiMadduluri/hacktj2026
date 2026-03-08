type AppUrlEnv = Record<string, string | undefined>;

const LOCALHOST_ORIGIN = "http://localhost:3000";

function normalizeOrigin(origin: string): string {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

export function getAppOrigin(env: AppUrlEnv = process.env): string {
  if (env.NEXT_PUBLIC_SITE_URL) {
    return normalizeOrigin(env.NEXT_PUBLIC_SITE_URL);
  }

  if (env.SITE_URL) {
    return normalizeOrigin(env.SITE_URL);
  }

  if (env.VERCEL_URL) {
    return normalizeOrigin(`https://${env.VERCEL_URL}`);
  }

  return LOCALHOST_ORIGIN;
}

export function buildPasswordResetRedirectUrl(
  env: AppUrlEnv = process.env,
): string {
  return `${getAppOrigin(env)}/protected/reset-password`;
}
