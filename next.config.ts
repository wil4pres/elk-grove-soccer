import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the generated matching report is bundled with the server deployment
  outputFileTracingIncludes: {
    '/api/admin/matching-report': ['./matching/report.html'],
  },
  env: {
    DYNAMO_ACCESS_KEY_ID: process.env.DYNAMO_ACCESS_KEY_ID ?? '',
    DYNAMO_SECRET_ACCESS_KEY: process.env.DYNAMO_SECRET_ACCESS_KEY ?? '',
    DYNAMO_REGION: process.env.DYNAMO_REGION ?? 'us-east-1',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? '',
    SESSION_SECRET: process.env.SESSION_SECRET ?? '',
    ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? '',
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '',
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  },
};

export default nextConfig;
