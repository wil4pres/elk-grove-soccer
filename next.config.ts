import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next",
  env: {
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? 'us-east-1',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? '',
    SESSION_SECRET: process.env.SESSION_SECRET ?? '',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? '',
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '',
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    ORS_API_KEY: process.env.ORS_API_KEY ?? '',
    MATCHING_QUEUE_URL: process.env.MATCHING_QUEUE_URL ?? '',
  },
};

export default nextConfig;
